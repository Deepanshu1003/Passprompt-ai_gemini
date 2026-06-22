# PromptPass - Complete Application & Engineering Specification
*Drafted for Google AI Studio Build & Code Generator Agents*

This document provides a highly detailed, comprehensive roadmap of the **PromptPass** full-stack ecosystem. By feeding this specification to any modern language model or the Google AI Studio builder, a duplicate or upgraded version of the system can be generated with absolute parity.

---

## 1. Product Identity & Core Philosophy

**PromptPass** is an elegant, full-stack, AI-powered preparation suite for high-stakes certification examinations (e.g., AWS Certified Solutions Architect, PMP, Scrum Master). The system is built around several unique, student-first constraints:

1. **Anti-Clutter Layout**: Avoid traditional overbearing controls in favor of an immersive "learning theater".
2. **Device-Isolated Workspaces**: By default, different devices or browser tabs run within a custom, secure sandbox (driven by a unique workspace token `x-device-id` passed in request headers). Users can pair devices manually via a "Sync / Swap" control if they wish, but uploads on one device never pollute another.
3. **Resilient Offline Continuity**: If network integrity is lost, users can continue studying, testing, and self-evaluating off cached questions, options, flashcards, and historical scores, synchronizing seamlessly once connectivity returns.
4. **Distraction-Free Parsing**: Page numbers, footer timestamps, and text fragments generated during document parses are aggressively stripped out using a standardized deterministic pattern.

---

## 2. Technical Stack Overview

* **Frontend Framework**: React 19 (TypeScript, functional components with hooks, custom client-side cache and event-stream hook processing).
* **Styling**: Tailwind CSS utilizing deep off-whites, modern slate dark colors (`bg-slate-900`/`bg-slate-850`), rich emerald feedback tags, and precise spacing grids.
* **Backend Server**: Express.js with custom SSE (Server-Sent Events) streaming pipelines. Production build compiles into a single CommonJS bundled file `dist/server.cjs` via `esbuild`.
* **Database**: High-speed JSON flat-file storage engine (`src/db.json` with a structured `dbStore` helper class in `src/db.ts`), supporting local multi-tenant workspaces through a `device_id` filter.
* **LLM Core**: Google GenAI TypeScript SDK (`@google/genai`) using `gemini-3.5-flash`.
* **Animations**: Pure styled transitions with clean hover-states and smooth viewport entrance animations.
* **Iconography**: Clean vector glyphs exclusively imported from `lucide-react`.

---

## 3. Database Schema (`src/db.json` & `src/types.ts`)

The raw flat-file DB maps three primary collections under separate keys, filtered dynamically by client-provided `x-device-id` headers to maintain independent sandboxing:

```typescript
export interface ExamPlan {
  id: string;          // Cryptographic random UUID
  name: string;        // E.g., "AWS Solutions Architect Associate"
  created_at: string;  // ISO timestamp string
  device_id: string;   // Device/browser sandbox binding identifier
}

export interface Question {
  id: string;               // Cryptographic random UUID
  exam_plan_id: string;     // Foreign key pointing to ExamPlan
  question_number: number;  // 1-indexed problem selector
  question_text: string;    // Clean question body (no page numbers)
  options: Record<string, string>; // Key-value map (e.g. {"A": "Val", "B": "Val"})
  correct_answer?: string;  // Single character correct choice (e.g. "B")
}

export interface UserAttempt {
  id: string;               // Cryptographic random UUID
  question_id: string;      // Foreign key pointing to Question
  device_id: string;        // Active device sandbox ownership
  selected_answer: string;  // Choice letter submitted by user (e.g. "A")
  is_correct: boolean;      // Evaluation outcome
  explanation: string;      // Persistent AI evaluation text response
  attempted_at: string;     // ISO timestamp string
}
```

---

## 4. REST & Streaming API Endpoints (`server.ts`)

The Express backend services request parameters accompanied by an optional / mandatory `'x-device-id'` header:

### `GET /api/plans`
* **Response**: `ExamPlan[]`
* **Logic**: Returns all exam plans belonging strictly to the client's `x-device-id`. If no header is provided, returns an empty array.

### `POST /api/upload`
* **Payload**: Form-data containing a `file` field (plaintext or PDF).
* **Headers**: `x-device-id` (Required)
* **Logic**: Generates a new `ExamPlan` with the uploaded file name. Calls the document parser, extracts structured questions with clean Regex-based page-number scrubbing, and stores them under the newly created plan ID for that device sandbox.

### `GET /api/plans/:planId/questions`
* **Response**: `Question[]`
* **Logic**: Retrieves the complete array of parsed questions matching the plan ID, verifying device sandbox ownership.

### `GET /api/plans/:planId/progress`
* **Response**: `ProgressItem[]`
* **Logic**: Compiles real-time evaluation status for the plan.
* **Structured Payload**:
  ```typescript
  export interface ProgressItem {
    question_id: string;
    question_number: number;
    status: 'green' | 'red' | 'gray'; // green = correct, red = incorrect, gray = incomplete
    selected_answer?: string;         // The user's chosen options
    explanation?: string;             // Saved AI response string
  }
  ```

### `POST /api/evaluate`
* **Payload**: `{ question_id: string, selected_answer: string }`
* **Headers**: `x-device-id` (Required)
* **Response**: Streaming SSE connection where chunk updates write the AI response.
* **Logic**: Formulates Gemini API evaluation prompt. Evaluates correctness, returns a standard `GRADE: CORRECT` or `GRADE: INCORRECT` marker, stream-pipes the concise explanation to the client, and writes the complete `UserAttempt` securely into the DB flat file on conclusion to guarantee future reload state persistence.

### `POST /api/plans/:planId/delete`
* **Logic**: Safely purges an examination plan and all associated questions and attempts linked with that ID for the requested device.

---

## 5. Clean Question & Option Text Filters (`src/parser.ts`)

To avoid "page number bleed-through" in options (e.g., options ending in `page no. 12` or `-- 12 of 200 --`), the string processor scrubs incoming text using a twin-phase strategy:

```typescript
// Deterministic page footer cleaner regex patterns:
const pageCleanup = /(?:--|-|\[)?\s*\d+\s+(?:of|OF)\s+\d+\s*(?:--|-|\])?|\b(?:page|Page|PAGE|pg\.?|Pg\.?)\s*(?:no|num|number|#)?\.?\s*\d+\s*(?:of\s*\d+)?\b/gi;

// Clean text outputs cleanly inside parsing blocks:
let questionText = rawText.replace(pageCleanup, '').trim().replace(/--\s*$/, '').trim();
let optionValue = rawValue.replace(pageCleanup, '').replace(/--\s*$/, '').replace(/\s+/g, ' ').trim();
```

---

## 6. Prompt Engineering System (`src/ai_service.ts`)

The application configures specific context envelopes for Gemini prompts, ensuring outputs remain optimized for clear, concise, and focused training:

### Strict AI Evaluation Prompt Rules
```text
Evaluate the user's selected choice against the given exam question.

Instructions:
1. Determine whether the answer is correct or incorrect.
2. Start your response EXACTLY with:
   GRADE: CORRECT (if correct)
   OR
   GRADE: INCORRECT (if incorrect)

3. Format the evaluation response according to the grade:
   - If the answer is CORRECT:
     Provide only a very brief summary/confirmation in just a few words (max 15-20 words). Keep it extremely concise (e.g., "Correct! Excellent understanding of the concept."). Do NOT write any structured detailed sections, redundant explanations, or tips.
   - If the answer is INCORRECT:
     Clearly identify the correct option (e.g., "The correct answer is B.") and expand in just a few words explaining why (max 50 words). Keep it digestible and direct.

Use Markdown formatting.
```

---

## 7. Interactive Keyboard Mappings (`src/components/PracticeSession.tsx`)

Students can move rapidly through practice reviews using physically intuitive key bindings, bound to keydown events:

* **ArrowRight (`→`) / ArrowLeft (`←`)**: Jumps to the immediate next or preceding question in the numerical map.
* **Keys `1` through `6`**: Directly toggles multiple-choice select nodes (`A` through `F`).
* **`Enter`**: Submits the selected answer instantly to trigger the AI streaming evaluation.
* **`Ctrl + Enter` / `Cmd + Enter`**: Sends active follow-up questions to the smart chatbot companion directly.

---

## 8. Client Offline Synchronization Rules (`src/offlineCache.ts`)

To protect user progress in unstable environments, the active state mirrors metadata to `localStorage` under independent key blocks:

```typescript
export const getOrCreateDeviceId = (): string => {
  let id = localStorage.getItem('promptpass_device_id');
  if (!id) {
    id = 'DEV_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    localStorage.setItem('promptpass_device_id', id);
  }
  return id;
};

// Mirroring targets hook to preserve:
// - getCachedPlans / cachePlans
// - getCachedQuestions / cacheQuestions
// - getCachedProgress / cacheProgress
```

---

## 9. Tablet & iPad Adaptability Setup

To guarantee pristine visibility on any tablet screen standard viewport size, the visual framework shifts breakpoints selectively:

* Sidebars transition to overlay drawers using the modern `lg` (1024px) breakpoint rather than the default `md` (768px). This grants iPad users operating in portrait or landscape orientations full, un-squeezed reading rows for complex exam scenarios.
* Sliding panels use pure CSS slide-out drawers, accessible instantly through a hamburger menu on tablet screens.
