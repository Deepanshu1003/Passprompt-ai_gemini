import { GoogleGenAI, Type } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('[AI SERVICE] Warning: GEMINI_API_KEY environment variable is not defined.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export interface ExtractedQuestion {
  question_number: number;
  text: string;
  options: Record<string, string>;
}

export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  const errMsg = String(err?.message || '');
  const errString = String(err);
  let detailString = '';
  try {
    detailString = JSON.stringify(err);
  } catch (e) {}

  const combined = (errMsg + ' ' + errString + ' ' + detailString).toLowerCase();
  
  return (
    combined.includes('429') || 
    combined.includes('resource_exhausted') || 
    combined.includes('quota exceeded') ||
    combined.includes('quota') ||
    combined.includes('rate limit') ||
    err?.status === 429 ||
    err?.code === 429 ||
    err?.error?.code === 429 ||
    err?.error?.status === 'RESOURCE_EXHAUSTED'
  );
}

/**
 * Parses raw text from files and extracts clean, schema-guided test questions using Gemini
 */
export async function parseQuestionsWithGemini(fullText: string, modelName: string = 'gemini-3.5-flash'): Promise<ExtractedQuestion[]> {
  console.log(`[AI SERVICE] Re-routing parsing request to Gemini (${modelName}) for clean schema extraction (${fullText.length} characters)...`);

  if (!fullText.trim()) {
    return [];
  }

  // Ensure prompt asks for structured JSON object representing questions
  const prompt = `You are an expert competitive-exam document parser. Your goal is to read the raw extracted text of the exam paper below and identify every exam question with its multiple choice options.

Raw Extracted Text:
"""
${fullText}
"""

Instructions:
1. Find all questions and extract them in sequential order.
2. For each question, extract the question number, the prompt/content text of the question, and the list of options.
3. The options MUST be returned as a key-value object of strings (like {"A": "First choice description...", "B": "Second choice description..."}).
4. Keep the question prompts verbatim and cleanly formatted. Strip out any trailing or leading Page Numbers (e.g. "Page 15 of 200", "page no. 5") or document headers/footers completely. Do NOT let page numbers bleed into the text or options.
5. If some questions don't have multiple choice options (e.g., they are open text), represent options as empty or {"TEXT": "Write your text response here."}.
6. Ensure that the returned output strictly complies with the JSON format schema. Do not skip any questions.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_number: {
                type: Type.INTEGER,
                description: 'The physical question index/number.'
              },
              text: {
                type: Type.STRING,
                description: 'The core text of the question prompt.'
              },
              options: {
                type: Type.ARRAY,
                description: 'The selectable multiple-choice options.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      description: 'The identifier for the option, e.g., "A", "B", "C", "D".'
                    },
                    value: {
                      type: Type.STRING,
                      description: 'The text value or description of the option.'
                    }
                  },
                  required: ['key', 'value']
                }
              }
            },
            required: ['question_number', 'text', 'options']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      console.error('[AI SERVICE] No text response received from Gemini parser.');
      return [];
    }

    interface RawExtractedQuestion {
      question_number: number;
      text: string;
      options: { key: string; value: string }[];
    }

    const tempParsed = JSON.parse(text) as RawExtractedQuestion[];
    const parsed: ExtractedQuestion[] = tempParsed.map(q => {
      const optionsRecord: Record<string, string> = {};
      if (Array.isArray(q.options)) {
        q.options.forEach(opt => {
          if (opt && opt.key) {
            optionsRecord[opt.key] = opt.value || '';
          }
        });
      }
      return {
        question_number: q.question_number,
        text: q.text,
        options: optionsRecord
      };
    });

    console.log(`[AI SERVICE] Successfully parsed ${parsed.length} questions using Gemini.`);
    return parsed;
  } catch (err: any) {
    console.error(`[AI SERVICE] Critical error parsing questions with Gemini:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        console.warn(`[AI SERVICE] Quota encountered for model "${modelName}". Automatically falling back to robust "gemini-3.1-flash-lite"...`);
        return parseQuestionsWithGemini(fullText, 'gemini-3.1-flash-lite');
      }
      throw new Error(`Gemini API Quota Exceeded (429): You have run out of your daily or per-minute free-tier limit for model "${modelName}". Please wait a bit or try again later!`);
    }
    throw err;
  }
}

/**
 * Stream evaluation of a student's answer for a question
 */
export async function* streamEvaluation(
  questionText: string,
  options: Record<string, string>,
  selectedAnswer: string,
  modelName: string = 'gemini-3.5-flash'
): AsyncGenerator<string, void, unknown> {
  const prompt = `You are an expert competitive-exam evaluator.

Question:
${questionText}

Options:
${JSON.stringify(options, null, 2)}

Student Selected Answer:
${selectedAnswer}

Instructions:

1. Determine whether the answer is correct or incorrect.
2. Start your response EXACTLY with:

GRADE: CORRECT

(if correct)
OR:

GRADE: INCORRECT

(if incorrect)

3. Format the evaluation response according to the grade:
   - If the answer is CORRECT:
     Provide only a very brief summary/confirmation in just a few words (max 15-20 words). Keep it extremely concise (e.g., "Correct! Excellent understanding of the concept."). Do NOT write any structured detailed sections, redundant explanations, or tips.
   - If the answer is INCORRECT:
     Clearly identify the correct option (e.g., "The correct answer is B.") and expand in just a few words explaining why (max 50 words). Keep it digestible and direct.

Use Markdown formatting.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.2
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error(`[AI SERVICE] Error in streamEvaluation:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        console.warn(`[AI SERVICE] Quota encountered for model "${modelName}". Automatically falling back to "gemini-3.1-flash-lite"...`);
        yield* streamEvaluation(questionText, options, selectedAnswer, 'gemini-3.1-flash-lite');
        return;
      }
      yield `\n\n### ⚠️ Gemini API Quota Exceeded\n\nYou have run out of your Gemini API key's daily or minute-based quota limit for the model **${modelName}**.\n\n* **Immediate Solution**: Please use the **Active Gemini Model** selector in the left sidebar to change your model to **Gemini 3.1 Flash Lite** (the highly efficient Lite model) and try again!\n* **Alternative**: Wait a short moment or provide a custom API key in Settings if you have one.`;
    } else {
      yield `\n\n[AI Error: ${err.message || err}]`;
    }
  }
}

/**
 * Stream tutor chat for a follow-up query
 */
export async function* streamChat(
  questionText: string,
  aiExplanation: string,
  userMessage: string,
  modelName: string = 'gemini-3.5-flash'
): AsyncGenerator<string, void, unknown> {
  const prompt = `You are an expert AI tutor helping a student.

Question:
${questionText}

Previous Explanation:
${aiExplanation}

Student Follow-up Question:
${userMessage}

Instructions:

- Answer clearly.
- Be concise.
- Use Markdown.
- Give examples when helpful.
- Focus on helping the student understand the concept.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.8
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error(`[AI SERVICE] Error in streamChat:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        console.warn(`[AI SERVICE] Quota encountered for model "${modelName}". Automatically falling back to "gemini-3.1-flash-lite"...`);
        yield* streamChat(questionText, aiExplanation, userMessage, 'gemini-3.1-flash-lite');
        return;
      }
      yield `\n\n### ⚠️ Gemini API Quota Exceeded\n\nYou have run out of your Gemini API key's daily or minute-based quota limit for the model **${modelName}**.\n\n* **Immediate Solution**: Please use the **Active Gemini Model** selector in the left sidebar to change your model to **Gemini 3.1 Flash Lite** (the highly efficient Lite model) and try again!\n* **Alternative**: Wait a short moment or provide a custom API key in Settings if you have one.`;
    } else {
      yield `\n\n[AI Error: ${err.message || err}]`;
    }
  }
}
