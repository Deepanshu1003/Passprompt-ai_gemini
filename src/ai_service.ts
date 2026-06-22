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

/**
 * Parses raw text from files and extracts clean, schema-guided test questions using Gemini
 */
export async function parseQuestionsWithGemini(fullText: string): Promise<ExtractedQuestion[]> {
  console.log(`[AI SERVICE] Re-routing parsing request to Gemini for clean schema extraction (${fullText.length} characters)...`);

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
4. Keep the question prompts verbatim and cleanly formatted.
5. If some questions don't have multiple choice options (e.g., they are open text), represent options as empty or {"TEXT": "Write your text response here."}.
6. Ensure that the returned output strictly complies with the JSON format schema. Do not skip any questions.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
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
                type: Type.OBJECT,
                description: 'The select choices map. Key is the choice letter (e.g. A, B, C, D), value is the choice description.',
                properties: {}
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

    const parsed = JSON.parse(text) as ExtractedQuestion[];
    console.log(`[AI SERVICE] Successfully parsed ${parsed.length} questions using Gemini.`);
    return parsed;
  } catch (err: any) {
    console.error(`[AI SERVICE] Critical error parsing questions with Gemini:`, err);
    return [];
  }
}

/**
 * Stream evaluation of a student's answer for a question
 */
export async function* streamEvaluation(
  questionText: string,
  options: Record<string, string>,
  selectedAnswer: string
): AsyncGenerator<string, void, unknown> {
  const prompt = `You are an expert competitive-exam evaluator.

Question:
${questionText}

Options:
${JSON.stringify(options, null, 2)}

Student Selected Answer:
${selectedAnswer}

Instructions:

1. Determine whether the answer is correct.
2. Start your response EXACTLY with:

GRADE: CORRECT

OR

GRADE: INCORRECT

3. Explain the reasoning.
4. Explain why other options are incorrect.
5. Mention the key concept tested.
6. Give one exam-preparation tip.

Use Markdown formatting.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
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
    yield `\n\n[AI Error: ${err.message || err}]`;
  }
}

/**
 * Stream tutor chat for a follow-up query
 */
export async function* streamChat(
  questionText: string,
  aiExplanation: string,
  userMessage: string
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
      model: 'gemini-3.5-flash',
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
    yield `\n\n[AI Error: ${err.message || err}]`;
  }
}
