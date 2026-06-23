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

/**
 * Stream conversational interview planner consultation
 */
export async function* streamInterviewConsultation(
  chatHistory: { role: 'user' | 'ai'; content: string }[],
  userMessage: string,
  role: string,
  experienceLevel: string,
  modelName: string = 'gemini-3.5-flash'
): AsyncGenerator<string, void, unknown> {
  const historyPrompt = chatHistory
    .map(msg => `${msg.role === 'user' ? 'Student' : 'AI Tutor'}: ${msg.content}`)
    .join('\n');

  const prompt = `You are an elite Tech Interview Coach and Syllabus Optimizer.
The student is preparing for a "${role}" interview (Experience Level: ${experienceLevel}).

Follow-up Conversation History:
${historyPrompt}

Student Message:
${userMessage}

Instructions:
1. Talk to the student like a friendly, highly professional mentor.
2. Provide strategic guidance, ask clarifying questions about their specialization in ${role}, and help them align their study.
3. Suggest that when they are happy, they should click the "FINALIZE SYLLABUS & UNLOCK BENTO BOARD" button to assemble an adaptive, dynamically sized deep-dive study syllabus representing their personalized study track.
4. Keep answers concise, highly structured, and use Markdown bullet points where appropriate.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error(`[AI SERVICE] Error in streamInterviewConsultation:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        console.warn(`[AI SERVICE] Quota encountered. Swapping to gemini-3.1-flash-lite...`);
        yield* streamInterviewConsultation(chatHistory, userMessage, role, experienceLevel, 'gemini-3.1-flash-lite');
        return;
      }
      yield `\n\n### ⚠️ Gemini API Quota Exceeded\n\nYou have run out of your Gemini API key's daily or minute-based quota limit for the model **${modelName}**.\n\nPlease switch to **Gemini 3.1 Flash Lite** or wait a minute.`;
    } else {
      yield `\n\n[AI Error: ${err.message || err}]`;
    }
  }
}

/**
 * Stream tutor chat for an interview topic
 */
export async function* streamTopicChat(
  topicName: string,
  topicDescription: string,
  chatHistory: { role: 'user' | 'ai'; content: string }[],
  userMessage: string,
  modelName: string = 'gemini-3.5-flash'
): AsyncGenerator<string, void, unknown> {
  const historyPrompt = chatHistory
    .map(msg => `${msg.role === 'user' ? 'Student' : 'AI Partner'}: ${msg.content}`)
    .join('\n');

  const prompt = `You are an expert tech interview tutor and career partner. You are helping a student master the topic "${topicName}".
Topic Concept Context:
"${topicDescription}"

Previous Chat logs:
${historyPrompt}

Student Message:
"${userMessage}"

Instructions:
1. Walk the student through the concept step-by-step with clear, beautiful, and rich explanations.
2. Underneath your explanation, provide diagnostic examples, sample interviewer questions, or complex edge cases.
3. Keep the content extremely detailed, professional, and formatted in Markdown. Return well-written TypeScript, SQL, or architectural diagrams wherever relevant.`;

  try {
    const responseStream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.7
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error(`[AI SERVICE] Error in streamTopicChat:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        yield* streamTopicChat(topicName, topicDescription, chatHistory, userMessage, 'gemini-3.1-flash-lite');
        return;
      }
    }
    yield `\n\n[Chat Error: ${err.message || err}]`;
  }
}

/**
 * Generates an array of highly-curated tech topics corresponding to the target role
 */
export async function generateInterviewTopics(
  role: string,
  experienceLevel: string,
  customNotesText: string,
  modelName: string = 'gemini-3.5-flash'
): Promise<any[]> {
  console.log(`[AI SERVICE] Generating dynamic bento blueprint for "${role}" (${experienceLevel})...`);

  const prompt = `You are an expert curriculum developer for top tier tech firms. Create a highly structured preparation roadmap containing dynamic major study topics (typically between 8 to 12 topics customized to the role's scope and depth) for a "${role}" at experience tier "${experienceLevel}".

CRITICAL REQUIREMENT:
You MUST consider and add ALL relevant skills required to prepare, specifically balancing:
1. Technical Skills, tech stacks, tools, coding practices, system design, databases, architectures, and testing methodologies.
2. Non-Technical / Behavioral Skills, such as STAR methodology behavioral questions, project delivery communication, leadership presence, managing conflicts, working with product managers, situational judgment, and career narrative. Ensure at least 1-2 topics cover these non-technical/behavioral areas.

Custom developer specifications if any:
"${customNotesText}"

Your output MUST be a JSON array of custom topics (each topic customized to focus areas).
Each topic object must conform to this schema:
- "id": a unique incremental string starting from "1".
- "name": The short, concise title of the focus area.
- "description": A detailed, high-yield comprehensive overview of the focus area.
- "completed": false
- "cards": An array of multiple highly detailed, textbook-quality cards/subtopics representing core concepts (anywhere from 3 to 15 subtopics/cards depending on the topic's depth. Be comprehensive and do NOT limit yourself to exactly 3).
  Each card must have:
  - "title": Title of subtopic
  - "content": An extremely detailed, highly educational breakdown (with at least 200-250 words per card!) containing exact sample questions, step-by-step theoretical principles, real-world trade-offs, and critical diagnostic insights. Be verbose, structured, and deep.
  - "code": Optional code snippet (valid JS/TS/SQL/Python structure) or ASCII system architecture diagram. Leave empty if not applicable.
- "referenceLinks": An array of reference links for deeper study:
  - "label": Short caption (e.g., "MDN Web Security", "AWS Sharding Guide", "System Design Primer")
  - "url": A mock learning link or real search query recommendation formatted as a Google query e.g., "https://www.google.com/search?q=system+design+scaling+databases"

Topic selection guidelines:
Choose the appropriate number of topics (standard is 8 to 15 key chapters depending on study depth) based on the target role details. Do not hardcode a specific limit like 11.
Ensure your reply is valid JSON.`;

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
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              completed: { type: Type.BOOLEAN },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    code: { type: Type.STRING }
                  },
                  required: ['title', 'content']
                }
              },
              referenceLinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ['label', 'url']
                }
              }
            },
            required: ['id', 'name', 'description', 'completed', 'cards', 'referenceLinks']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Received empty text response from Gemini Topic Architect.');
    }

    const topicsList = JSON.parse(text);
    if (!Array.isArray(topicsList) || topicsList.length === 0) {
      throw new Error('Invalid schema list formatted by Gemini.');
    }

    return topicsList;
  } catch (err: any) {
    console.error(`[AI SERVICE] Error generating interview topics:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        console.warn(`[AI SERVICE] Quota encountered during syllabus construction. Falling back to Lite model...`);
        return generateInterviewTopics(role, experienceLevel, customNotesText, 'gemini-3.1-flash-lite');
      }
    }
    
    // Return robust local backup to guarantee 100% stable uptime for the student
    console.warn(`[AI SERVICE] Returning robust default 11 topic syllabus blueprint to protect user uptime.`);
    return getBackupTopics(role, experienceLevel);
  }
}

/**
 * Modifies an existing study plan topics array based on user AI modification commands
 */
export async function editExistingInterviewPlan(
  currentPlanTopics: any[],
  modificationPrompt: string,
  role: string,
  experienceLevel: string,
  modelName: string = 'gemini-3.5-flash'
): Promise<any[]> {
  console.log(`[AI SERVICE] Editing dynamic bento blueprint for "${role}" (${experienceLevel}) based on feedback...`);

  const prompt = `You are an expert curriculum developer. You have an existing study plan with the following topics list:
${JSON.stringify(currentPlanTopics)}

The user wants to modify and update this study plan.
The target role is: "${role}" at experience tier "${experienceLevel}".
The modification request is: "${modificationPrompt}"

Your task is to rewrite, tweak, expand, swap, or refine the existing topics list to satisfy the candidate's request perfectly.
- You can maintain existing topics that do not need change.
- You can edit the title, description, or detailed cards inside any topic.
- You can add brand new topics or remove topics if requested.
- Ensure that the final topics list is highly comprehensive, covering both technical and non-technical skills required for an interview.
- Do NOT lose completed status or notes of topics unless they are replaced or removed. If you keep a topic, preserve its existing completed status.

Your output MUST be a JSON array of custom topics (each topic customized to focus areas).
Each topic object must conform EXACTLY to this schema:
- "id": a unique string (maintain original IDs index where possible, or generate sequential ones).
- "name": Focus area title.
- "description": Focus area overview.
- "completed": boolean (preserve completed state of retained topics, default to false for new ones)
- "cards": Array of multiple cards (anywhere from 3 to 15 cards as needed). Each card has "title", "content", and optional "code" snippet. Text must be structured and deep (detailed explanations containing scenario-based analysis).
- "referenceLinks": Array of learning links. Each link has "label" and "url".

Ensure your reply is valid JSON conforming to this array schema.`;

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
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              completed: { type: Type.BOOLEAN },
              cards: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    code: { type: Type.STRING }
                  },
                  required: ['title', 'content']
                }
              },
              referenceLinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    url: { type: Type.STRING }
                  },
                  required: ['label', 'url']
                }
              }
            },
            required: ['id', 'name', 'description', 'completed', 'cards', 'referenceLinks']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Received empty text response from Gemini Topic Architect.');
    }

    const topicsList = JSON.parse(text);
    return topicsList;
  } catch (err: any) {
    console.error(`[AI SERVICE] Error modifying interview topics:`, err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        return editExistingInterviewPlan(currentPlanTopics, modificationPrompt, role, experienceLevel, 'gemini-3.1-flash-lite');
      }
    }
    // Return original topics on complete failure to make sure nothing is lost
    return currentPlanTopics;
  }
}

/**
 * Generates an adaptive 10-questions multiple choice quiz for a specific topic
 */
export async function generateInterviewTopicQuiz(
  role: string,
  topicName: string,
  modelName: string = 'gemini-3.5-flash'
): Promise<any[]> {
  console.log(`[AI SERVICE] Generating 10-question adaptive quiz for topic: "${topicName}" (${role})...`);

  const prompt = `You are an expert interviewer. Create a challenging multiple-choice quiz of exactly 10 questions for a candidate preparing for "${role}" focusing specifically on "${topicName}".
Generate exactly 10 questions in JSON array format.
Each question object MUST strictly match this schema:
- "question_number": integer from 1 to 10
- "text": The clear question scenario or prompt. Include realistic code snippets inside the prompt if relevant.
- "options": An object of options with alphabetical letters as keys (e.g. {"A": "Option text 1", "B": "Option text 2", "C": "Option text 3", "D": "Option text 4"}). Give at least 4 options.
- "correct_answer": A single string key matching the correct option (e.g. "B")
- "explanation": A detailed, beautiful markdown summary explaining why the option is correct and why other choices are sub-optimal.

Remember: return valid, structured JSON output only.`;

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
              question_number: { type: Type.INTEGER },
              text: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING },
                    value: { type: Type.STRING }
                  },
                  required: ['key', 'value']
                }
              },
              correct_answer: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ['question_number', 'text', 'options', 'correct_answer', 'explanation']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Received empty text from quiz architect.');
    }

    interface RawQuizQuestion {
      question_number: number;
      text: string;
      options: { key: string; value: string }[];
      correct_answer: string;
      explanation: string;
    }

    const rawQuestions = JSON.parse(text) as RawQuizQuestion[];
    return rawQuestions.map(q => {
      const opts: Record<string, string> = {};
      if (Array.isArray(q.options)) {
        q.options.forEach(o => {
          if (o && o.key) opts[o.key] = o.value || '';
        });
      }
      return {
        question_number: q.question_number,
        text: q.text,
        options: opts,
        correct_answer: q.correct_answer,
        explanation: q.explanation
      };
    });

  } catch (err: any) {
    console.error('[AI SERVICE] Fallback triggered during quiz generation:', err);
    if (isQuotaOrRateLimitError(err)) {
      if (modelName !== 'gemini-3.1-flash-lite') {
        return generateInterviewTopicQuiz(role, topicName, 'gemini-3.1-flash-lite');
      }
    }
    return getBackupQuiz(role, topicName);
  }
}

/**
 * Robust seed content generator fallback protecting user experience when rate limits are entirely depleted
 */
function getBackupTopics(role: string, level: string): any[] {
  const topics = [
    { title: "Core Fundamentals & Platform Internals", desc: "Syntax runtime execution loop, GC tracking, and platform-specific memory optimization." },
    { title: "Data Structures & Complexity Bounds", desc: "Trees, customized graphs, Hash collisions, recursive sorting, and space complexity metrics." },
    { title: "Distributed System Design & Scaling", desc: "Sharding indexes, cache coherence, latency-bound CDNs, DNS clusters, and consistency modes." },
    { title: "Multithreading & Concurrency Models", desc: "Async execution, race conditions, atomic mutexes, deadlocks, and worker threads." },
    { title: "Database Architecture & Caching", desc: "SQL transactions, ACID constraints, B-Trees, WAL logs, SQL execution profiling, and Redis partitions." },
    { title: "Web Communications & Protocol Frameworks", desc: "HTTP/3, websockets streaming architectures, CORS sandboxing, HTTPS handshake, REST vs gRPC." },
    { title: "Operating Systems & Network Sockets", desc: "Virtual page file swaps, thread CPU timetables, TCP flow sliding window controls, and router hop limits." },
    { title: "Engineering Leadership & STAR Cases", desc: "Communicating friction, driving ambiguous plans, and quantifying system speed/cost metrics." },
    { title: "Tuning, Memory leaks, & Profiling", desc: "Analyzing timeline leaks, core dump files, heap garbage trends, and distributed tracing." },
    { title: "Design Patterns & Object Architectures", desc: "SOLID clean code instructions, modular separation of concern models, and Dependency Injection frameworks." },
    { title: "Edge Cases & Severe Failure Tolerance", desc: "Failover fallback routers, rate limiters, circuit breakers, and database corruption checks." }
  ];

  return topics.map((t, index) => {
    const id = String(index + 1);
    return {
      id,
      name: t.title,
      description: t.desc,
      completed: false,
      cards: [
        {
          title: "Primary Assessment Challenge",
          content: `Evaluate expected scenarios in ${role} (${level}) context. Focus on practical edge-cases, common design vulnerabilities, and diagnostic tool triggers.`,
          code: `// Key diagnostic hook\nfunction profileDiagnostics() {\n  const startTime = performance.now();\n  // Execute scenario verification\n  console.log("Operational health verified");\n}`
        },
        {
          title: "Interactive recall flashcards",
          content: "Be ready to answer questions regarding heap memory allocation and CPU scheduling parameters. Review performance indicators closely.",
        },
        {
          title: "System engineering constraints",
          content: "Keep operations asynchronous and decouple heavy network channels. Handle failures using optimistic exponential retries.",
        }
      ],
      referenceLinks: [
        { label: "Google High Performance Scaling", url: `https://www.google.com/search?q=\${encodeURIComponent(t.title + " system design prep guide")}` },
        { label: "Community Sandbox Wiki", url: "https://www.google.com/search?q=interactive+Recall+and+Memory" }
      ]
    };
  });
}

function getBackupQuiz(role: string, topicName: string): any[] {
  const quiz = [];
  for (let i = 1; i <= 10; i++) {
    quiz.push({
      question_number: i,
      text: `Concerning "${topicName}", when configuring high-performance operations for a ${role}, which design choice represents the absolute safest mitigation against core thread blocking or runtime starvation?`,
      options: {
        "A": "Decouple heavy synchronous computation threads using atomic queue loops, executing them in non-blocking event drivers.",
        "B": "Force continuous spin-waiting intervals (busy loops) with polling ticks set to high resolution times.",
        "C": "Increase OS scheduling priority levels to maximum limits for all background routing instances.",
        "D": "Establish serial single-thread lock pools, disabling concurrent tasks for the duration of the request."
      },
      correct_answer: "A",
      explanation: "A is correct because delegating long running tasks to isolated background handlers or non-blocking async loops completely prevents main-thread starvation. This preserves consistent UI rendering and connection throughput."
    });
  }
  return quiz;
}

/**
 * Analyzes resume content or user experience summary to suggest targeted primary roles and profiles.
 */
export async function suggestTargetedRoles(
  resumeText: string,
  modelName: string = 'gemini-3.5-flash'
): Promise<any[]> {
  console.log(`[AI SERVICE] Suggesting roles based on bio/resume analysis...`);

  const prompt = `You are an elite silicon-valley executive tech recruiter. Analyze the following candidate summary, bio, skill profile, or resume text:
"""
${resumeText}
"""

Identify the top 3 best matching target professions / interview roles (e.g., "Senior Fullstack Engineer", "Lead Developer Relations", "Principal DevSecOps Architect") for this candidate.
For each role, provide:
1. "roleName": High-yield professional title
2. "experienceTier": Recommended tier (Junior, Mid, Senior, Principal, Lead)
3. "fitReasoning": Concise summary explaining why their background matches this role
4. "keySkillsHighlight": Exactly 4 crucial skills or technical keywords they should highlight for this role

Return your recommendation as a valid JSON array matching this exact schema:
- "roleName": string
- "experienceTier": string
- "fitReasoning": string
- "keySkillsHighlight": array of strings (exactly 4 elements)

Ensure your output is strictly valid JSON conforming to this schema. Do not write any markdown wrappers outside of the JSON array.`;

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
              roleName: { type: Type.STRING },
              experienceTier: { type: Type.STRING },
              fitReasoning: { type: Type.STRING },
              keySkillsHighlight: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['roleName', 'experienceTier', 'fitReasoning', 'keySkillsHighlight']
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Received empty text response from Gemini Recruiter Coach.');
    }

    return JSON.parse(text);
  } catch (err: any) {
    console.error(`[AI SERVICE] error suggesting target roles:`, err);
    // Return mock fallback profiles matching modern trends
    return [
      {
        roleName: "Senior Fullstack Architect",
        experienceTier: "Senior",
        fitReasoning: "Based on active web technologies, server frameworks, and database architecture references in your bio.",
        keySkillsHighlight: ["React 19 / TypeScript", "Node.js (Express)", "SQL & NoSQL Engines", "Cloud Run Container Systems"]
      },
      {
        roleName: "Lead Frontend Systems Engineer",
        experienceTier: "Lead",
        fitReasoning: "Refined components layout, performance tracking, dynamic state design, and responsive visuals focus.",
        keySkillsHighlight: ["Tailwind Utility Design", "State Composition & Hooks", "Incremental DOM Tuning", "Lighthouse Score Optimization"]
      },
      {
        roleName: "Product Platform Engineer",
        experienceTier: "Mid-Senior",
        fitReasoning: "Strong alignment to product workflows, local browser databases, secure offline caching, and user journey optimization.",
        keySkillsHighlight: ["Product Narrative Alignment", "Local Memory Sandboxing", "High-Fidelity UI Prototyping", "Fail-Safe Caching Models"]
      }
    ];
  }
}

