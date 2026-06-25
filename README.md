# PrepMaster AI (Version 2.4.0) 🎓💼🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/)

PrepMaster AI is an elite, full-stack AI-powered prep suite for certifications and interviews, newly updated with specialized features for **Generative AI Developers** and **Data Science Professionals**. Built using React, Express, TypeScript, and Google Gemini API, PrepMaster AI is a comprehensive workspace designed to optimize study habits, elevate recall, and build core professional confidence.

---

## 🚀 Quick Start (Local Setup)

Want to run PrepMaster AI on your local machine or server? Follow these simple steps:

### 1. Prerequisites
- **Node.js** (v18.x or later recommended)
- **NPM** or **Yarn**

### 2. Clone and Setup
```bash
# Enter the workspace directory
cd prepmaster

# Install dependencies
npm install
```

### 3. Configure Environments
Create a `.env` file in the root directory (using `.env.example` as a starting guide):
```env
# Get credit free-tier keys at https://aistudio.google.com/
GEMINI_API_KEY="your_google_gemini_api_key_here"

# Configure the local runtime URL 
APP_URL="http://localhost:3000"
```

### 4. Running the App
```bash
# Run in Hot-Reloading Development Mode
npm run dev

# Compile full production build (Web App + Bundled Node server)
npm run build

# Start the compiled self-contained production environment
npm run start
```
Go to **`http://localhost:3000`** in your browser to start studying!

---

## 🏛️ What's New in PrepMaster AI (AI & Data Science Edition) 🌟

PrepMaster AI has evolved into a dual-engine preparation ecosystem with **Exam Certification Rooms** and the **AI Interview Preparation Suite**, now optimized for modern AI practitioners:

### 1. Advanced 4-Step Recruiter Wizard
*   **Step 1: Context & CV Intake**: Paste a biography or drag-and-drop plain-text resumes (`.txt`/`.md`).
*   **Step 2: Recruiter Suggestions & Locked Fit**: Our simulated recruiter evaluates match parameters (such as Junior, Mid, Senior, and Principal levels) for specialized roles like **Generative AI Engineer**, **Lead Data Scientist**, and **AI Solutions Architect**.
*   **Step 3: Co-Pilot Prep Consultation**: Chat interactively with the AI Path Builder Coach (adjusting heights dynamically if messages stack up) or upload custom preplanned syllabi. Tweak constraints like Google @google/genai SDK, RAG pipelines, or LLM evaluation.
*   **Dynamic Role-Topic Alignments**: Placeholders and suggested keywords dynamically adjust with your selected role (e.g., Generative AI Engineer, Data Scientist, or Solutions Architect) to ensure all prompts remain highly context-relevant.
*   **Auto-Resetting Inputs**: Form textareas and text inputs automatically clear and reset after each successful execution to maintain a clean workspace.
*   **Step 4: Compilation Lock & Success Ready**: Saves conversation snapshots permanently and compiles **8 to 15 key chapters** with nested subtopics. Swaps out state parameters and triggers a direct-link gate button to enter the main cockpit.

### 2. Live AI Syllabus Re-writing & Modifying
*   **Roadmap Adaptability**: Active roadmap lists are fully dynamic instead of static.
*   **Tweak with AI Coach**: On the Bento Board page, input simple textual directives (e.g. *"Focus more on fine-tuning LLMs with LoRA"*, *"Add a non-technical module for STAR behavioral interviews"*, or *"Tweak Topic 4 to cover Pandas data pipeline optimizations"*). 
*   **Persistent Modification**: The AI intercepts the request, modifies/appears topics, and rewrites the bento board structures in-db seamlessly!

### 3. Zero-Uptime Fallback & Free Thinking Models
*   Compiles custom syllabi using free-tier high-intelligence thinking models (`gemini-3.5-flash`/`gemini-2.5-flash`) that balance intense technical deep-dives with critical non-technical competencies (situational judgment, STAR communication, managing feedback).
*   **High-Availability Error Insulation (v2.4.1)**: Built with an advanced transparent model redirection system. In case of API rate-limiting, daily quota exhaustions (e.g., 20 requests/day limit on Gemini 3.5 Flash free-tier), or 503 Service Unavailable/Overloaded events, the system automatically redirects the query to `gemini-3.1-flash-lite` in the background. It isolates primary errors as simple system warnings, completely preventing false-positive server crashes and ensuring a flawless, zero-downtime student workspace. This failover shield covers live playbook expansions, quiz creations, syllabus generation, and CV analyses.

### 4. Unified Home Hub Navigation
*   Choose between **Exam Preparation** and **AI Interview Preparation** seamlessly from the home page.
*   Unlocked dashboards track and organize histories isolated for each practice workspace.

### 5. Unified Dual-Theme Engine (Dark & Light Mode Sync)
*   **Fully Unified Theme State**: Governed globally at the root layout context and synchronized seamlessly across all sub-apps (Certification Exam Rooms, AI Placement Preparation Bento Board, Interactive Quizzes, and Chat Terminals).
*   **Global Theme Toggles**: Every single workspace view, panel, desktop header, and mobile responsive topbar exposes high-visibility, single-tap theme switches (`Moon` and `Sun` indicators).
*   **Persistent Preferences**: Saves visual preferences instantly to `localStorage` to persist across refreshes, tab changes, and application reboots.
*   **Optimal Visual Design**: Automatically pairing midnight **Cosmic Dark Theme** with crisp, high-contrast text and a clean, elegant **Daylight Light Theme** to eliminate eye fatigue and optimize visual ergonomics during intense study sessions.

### 6. Dynamic Topic Bento Board Matrix (Flexible Cutouts)
*   Spawns customized bento-style topic cards (normally between 8 to 15 dynamically depending on target role depth, instead of a locked hardcoded count).
*   Click any topic card to reveal:
    *   **Comprehensive Key Concept Cards**: Textbook-style detailed guides (verbose summaries, common follow-up trap questions, and robust technical trade-offs).
    *   **Companion Study Notes**: Write and persist custom notes for each domain within your active study roadmap.
    *   **Durable Study Anchors**: Direct query-grounded Google Search links corresponding precisely to specialized concepts.

### 7. Interactive Per-Topic AI Chat Partner
*   Study and converse side-by-side! A dedicated, live-streaming tech mentor chat box is integrated directly inside each topic classroom view, allowing students to ask follow-up questions, debug codes, or request technical deep-dives on the fly.

### 8. Interactive Per-Topic MCQ Quizzes
*   In-depth, topic-specific **10-question multiple-choice quizzes** generated on the fly.
    *   Features **complete query persistence**: Current question indexes, selected answers, submission progress, and score counters are saved in real-time to the database, ensuring you can navigate or refresh without losing progress!

### 9. Triple-Memory Engine ("Record Everything")
Our advanced context subsystem structures study patterns permanently under three distinct scopes of recollection:
*   **Short-Term Contextual Memory**: Logs conversations with your Virtual Career Coach to preserve continuous context.
- **Structured Semantic Memory**: Encapsulates overall syllabus layouts, finished labels, topic chat history logs, and custom-written topic companion notes in the database.
- **Episodic Memory Logs**: Evaluates performance over time, logging the date, accuracy percentage, and score of every single 10-question quiz completed.

### 10. Minimizable & Collapsible Side-Panels & Live Playbook Expansion (Responsive Workspace)
Optimized the 3-column classroom screen to be fully fluid and elegant on all device screens:
*   **Collapsible Left Panel (Syllabus Concept Map)**: Minimize the lesson syllabus with a single click. Collapses into an ultra-sleek, vertical icon-stripe on desktop or a slim horizontal bar on mobile, clearing visual overhead instantly.
*   **Collapsible Right Panel (Companion Labs)**: Easily toggle the AI Tutor Chat, Spot Quizzes, and Recall Notes out of view. Shrinks into a low-profile vertical dock, maximizing the space of the central study guide.
*   **Desktop & Mobile-First Fluidity**: On desktop, collapsing a panel dynamically increases the center content's col-span to maximize readability. On mobile, collapsed panels act as compact rows to prevent long vertical scrolling.
*   **Live AI Playbook Expander**: Generates 10-15 textbook-quality detailed concept cards for any selected section on-demand (custom-tailored for your placement role with advanced technical principles, realistic scenarios, and optimization patterns).
*   **Optimized Workspace Layout**: Positions the Live AI Playbook Expander at the top of the study screen directly above the concept card selectors for immediate accessibility and seamless playbook generation.
*   **Adaptive Code Themes**: Styled technical schema blocks to natively adapt to both light and dark modes with high contrast for superb readability.
*   **Custom Concept Card Builder**: Allows students to manually construct their own study cards (title, explanation, and code/design blocks) with instant persistent database saving.

---

## ⚙️ Folder Layout

```text
prepmaster/
├── src/
├── components/
│   ├── PracticeSession.tsx  # Dynamic certification exams, hotkeys, multiselects & chats
│   └── InterviewPrep.tsx    # Version 2 core suite: Bento grid, Coach chats, notes & quizzes
├── types.ts                 # Type schemas for Exam and Interview states
├── parser.ts                # Deterministic Regex & Gemini file parser
├── ai_service.ts            # Server-side Gemini SDK consultation, syllabus, & quiz models
├── db.ts                    # Light JSON persistence file database engine
├── offlineCache.ts          # LocalStorage safety cache variables
├── main.tsx                 # Web app mount entry
└── index.css                # Global CSS styling
├── server.ts                    # Backend Express service exposing endpoints
├── package.json                 # Core dependencies and build scripts
└── README.md                    # Project blueprint and guidelines
```

---

## 💼 LinkedIn Copy Snippet

Want to share your study experience with PrepMaster AI on LinkedIn? Use this short template:

```text
🚀 Designing fully custom full-stack applications in a weekend! 

I recently explored Google AI Studio and free AI tools to build PrepMaster AI V2, an elite preparation simulator. 

Features I integrated in Version 2.0:
1️⃣ Unified Home Portal: Standard Exam Certifications + Placement Prep.
2️⃣ Customized Syllabus Coach: Live consultations with Gemini to build modular 11-topic Bento Board maps.
3️⃣ Adaptive Quizzing: Spot-testing with interactive 10-question scenario sets.
4️⃣ Triple Memory Persistence: Locally synced Contextual, Semantic (study notes), and Chronological Episodic memory grids to log progress.

Built 100% full-stack with React 19, Express, TypeScript, Tailwind CSS, and the Google Gemini SDK. 

🔗 Explore: https://github.com/prepmaster-ai/prepmaster
```

*Happy learning, and pass your prompts with confidence!* 🚀
