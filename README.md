# PromptPass (Release 1.0.0)

PromptPass is an AI-powered certification learning room and interactive tutor workspace migrated to a React + Express.js TypeScript Full-stack architecture, running with Google GenAI capabilities.

## 🎉 Release 1.0.0 Features & Enhancements

Key features shipped in **Release 1**:
*   **Aesthetic Page Number Filtering**: Strips cluttering headers/footers (e.g. "-- Page 12 of 150 --") from parsed question and option texts so you see only clean content.
*   **Structured AI Evaluations**: Correct answers give only a concise confirmation (few words); incorrect answers display the right code clearly and explain why succinctly.
*   **Response Persistence**: AI evaluation replies are saved directly to the database mapped across your specific device workspace, preserving explanations across page reloads.
*   **Robust iPad & Tablet Responsiveness**: Optimized sidebar breakpoints (`lg`) convert desktop layouts into elegant off-canvas sliders, avoiding squeezed center columns on modern tablets.
*   **Strict Device Isolation**: Different physical devices or browsers stay completely independent. PDF uploads on Phone 1 won't leak or affect tablet/laptop progress.


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
*   **Offline Mode & Resilience**: Features a rich offline review engine matching custom localStorage structures. When network drops, users can freely browse questions, solve pattern options, examine active recall flashcards, and navigate the syllabus freely with locally cached study plans (`src/offlineCache.ts`).
*   **Backend Server**: Express.js compiling smoothly to a self-contained production bundle using `esbuild` (`dist/server.cjs`).
*   **Reliable Database Store**: JSON-based file module (`src/db.json` cache) that operates on the fly. Free from native binding errors, highly performant, and persistent.
*   **Google GenAI SDK**: Implements the official `@google/genai` TypeScript SDK using `gemini-3.5-flash` with optimized structured schema constraints for error-free parsing and streaming tutoring.

## 📱 Responsiveness & Device Isolation Upgrades

*   **iPad & Tablet Optimizations**: Sidebars automatically convert into off-canvas sliding drawers on portrait/landscape tablet screens (using the upgraded `lg` breakpoint), protecting the middle canvas from being squeezed down and giving you ample space to read and answer.
*   **Aesthetic Page Number Filters**: A robust deterministic and fallback AI parser regex cleanly strips page footers and headers (e.g. `-- 3 of 249 --`) to keep questions and options short, beautiful, and distraction-free.
*   **Strict Device Workspace Isolation**: All documents, session activities, and progress metrics are fully sandboxed using secure, random device-state identifiers, ensuring that uploading a PDF on Phone 1 will not affect or pollute other paired or separate devices.


