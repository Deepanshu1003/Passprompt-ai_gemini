# PrepMaster AI (Version 2.2.0) 🎓💼🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/)

PrepMaster AI is an elite, full-stack AI-powered prep suite for certifications and interviews. Built using React, Express, TypeScript, and Google Gemini API, PrepMaster AI is a comprehensive workspace designed to optimize study habits, elevate recall, and build core professional confidence.

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

## 🏛️ What's New in PrepMaster AI 🌟

PrepMaster AI has evolved into a dual-engine preparation ecosystem with **Exam Certification Rooms** and the **AI Interview Preparation Suite**.

### 1. Advanced 4-Step Recruiter Wizard
*   **Step 1: Context & CV Intake**: Paste a biography or drag-and-drop plain-text resumes (`.txt`/`.md`).
*   **Step 2: Recruiter Suggestions & Locked Fit**: Our simulated recruiter evaluates match parameters (such as Junior, Mid, Senior, and Principal levels) and explains the fit reasoning, key mastery skills highlights, and keywords.
*   **Step 3: Co-Pilot Prep Consultation**: Chat interactively with the AI Path Builder Coach (adjusting heights dynamically if messages stack up) or upload custom preplanned syllabi. Tweak constraints like Vitest requirements or STAR behavior methods.
*   **Step 4: Compilation Lock & Success Ready**: Saves conversation snapshots permanently and compiles **8 to 15 key chapters** with nested subtopics. Swaps out state parameters and triggers a direct-link gate button to enter the main cockpit.

### 2. Live AI Syllabus Re-writing & Modifying
*   **Roadmap Adaptability**: Active roadmap lists are fully dynamic instead of static.
*   **Tweak with AI Coach**: On the Bento Board page, input simple textual directives (e.g. *"Focus more on concurrent React 19 testing"*, *"Add a non-technical module for STAR behavioral interviews"*, or *"Tweak Topic 4 to cover Postgres sharding"*). 
*   **Persistent Modification**: The AI intercepts the request, modifies/appears topics, and rewrites the bento board structures in-db seamlessly!

### 3. Zero-Uptime Fallback & Free Thinking Models
*   Compiles custom syllabi using free-tier high-intelligence thinking models (`gemini-3.5-flash`/`gemini-2.5-flash`) that balance intense technical deep-dives with critical non-technical competencies (situational judgment, STAR communication, managing feedback).
*   Configured with automatic transparent fallback to `gemini-3.1-flash-lite` in case of rate-limiting or quota exhaustion to keep students practicing 24/7/365.

### 4. Unified Home Hub Navigation
*   Choose between **Exam Preparation** and **AI Interview Preparation** seamlessly from the home page.
*   Unlocked dashboards track and organize histories isolated for each practice workspace.

### 5. Dual UI Themes (Dark & Light Mode Toggle)
*   Added an easily accessible global navbar toggle to switch seamlessly between a midnight **Cosmic Dark Theme** and a clean, elegant **Daylight Light Theme**.
*   Perfect for diverse study situations and eyes, automatically optimizing backgrounds, cards, inputs, and code snippets natively.

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

---

## ⚙️ Folder Layout

```text
prepmaster/
├── src/
│   ├── components/
│   │   ├── PracticeSession.tsx  # Dynamic certification exams, hotkeys, multiselects & chats
│   │   └── InterviewPrep.tsx    # Version 2 core suite: Bento grid, Coach chats, notes & quizzes
│   ├── types.ts                 # Type schemas for Exam and Interview states
│   ├── parser.ts                # Deterministic Regex & Gemini file parser
│   ├── ai_service.ts            # Server-side Gemini SDK consultation, syllabus, & quiz models
│   ├── db.ts                    # Light JSON persistence file database engine
│   ├── offlineCache.ts          # LocalStorage safety cache variables
│   ├── main.tsx                 # Web app mount entry
│   └── index.css                # Global CSS styling
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
