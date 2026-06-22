# PromptPass

PromptPass is an AI-powered certification learning room and interactive tutor workspace migrated to a React + Express.js TypeScript Full-stack architecture, running with Google GenAI capabilities.

## 🎨 Visual Identity & Aesthetic Selection

*   **Header Navigation**: Modern slate-colored dark style (`#0f172a`), highlighting the clean PromptPass logo—a visual fusion of the brain neural network and open knowledge pages.
*   **Workspace Dashboard**: Minimal off-whites with generous negative space and micro-interactions (staggered hover translation cards and hover delete status indicators).
*   **Aesthetic Typography**: Inter font matching high line-height pairings with monospace fonts representing code segments and status panels.

## 🚀 Key Learning Features

*   **Automated Question Extraction**: Upload your AWS, PMP, or general syllabus questions in PDF or plaintext formatting. The backend `parser.ts` extracts questions and choices dynamically.
*   **Instant AI Evaluation**: Select your answer from the custom radio panel (or use hotkeys **1-4**), submit, and watch the AI tutor stream a response.
*   **Graded Correctness**: The AI starts evaluations with `GRADE: CORRECT` or `GRADE: INCORRECT`, yielding real-time stats (Total, Done, Correct, and Inaccurate metrics).
*   **Option-by-Option Explanations**: Custom render markdown detailing why choices are right or wrong, mapping primary tested concepts and daily test tips.
*   **Follow-Up Tutor Chat**: Interactively converse with the AI chatbot directly regarding that specific problem.
*   **Review Modals**: Click your "Correct" or "Wrong" statistics to view corresponding question subsets.
*   **Keyboard Hotkeys**: Navigate, options-select, and stream chats using intuitive physical keyboard shortcuts:
    *   `←` or `→`: Navigate questions.
    *   `1` to `6`: Match choice options.
    *   `Enter`: Evaluate.
    *   `Cmd / Ctrl + Enter`: Submit follow-up messages.

## 🛠 Full-Stack Architecture

*   **Frontend Client**: React (v19) running standard SPA, leveraging custom styled components, `react-markdown` for typography parsers, and custom Event-Stream reader pipelines.
*   **Backend Server**: Express.js compiling smoothly to a self-contained production bundle using `esbuild` (`dist/server.cjs`).
*   **Reliable Database Store**: JSON-based file module (`src/db.json` cache) that operates on the fly. Free from native binding errors, highly performant, and persistent.
*   **Google GenAI SDK**: Implements the official `@google/genai` TypeScript SDK using `gemini-3.5-flash` for streaming tutoring, minimizing latency.
