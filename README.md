# PromptPass (Version 2.0.0) 🎓💼🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/)

PromptPass is an elite, full-stack AI-powered prep suite for certifications and interviews. Built using React, Express, TypeScript, and Google Gemini API, PromptPass is a comprehensive workspace designed to optimize study habits, elevate recall, and build core professional confidence.

---

## 🚀 Quick Start (Local Setup)

Want to run PromptPass on your local machine or server? Follow these simple steps:

### 1. Prerequisites
- **Node.js** (v18.x or later recommended)
- **NPM** or **Yarn**

### 2. Clone and Setup
```bash
# Enter the workspace directory
cd promptpass

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

## 🏛️ What's New in Version 2.0.0

PromptPass has evolved into a dual-engine preparation ecosystem with **Exam Certification Rooms** and the **AI Interview Preparation Suite**.

### 1. Unified Home Hub Navigation
- Choose between **Exam Preparation** and **AI Interview Preparation** seamlessly from the home page.
- Unlocked dashboards track and organize histories isolated for each practice workspace.

### 2. Multi-Select Certification Quoting
- For certification exams, questions with more than 4 options are automatically mapped as **Multi-select items**.
- UI switches form checks to rounded checkboxes, allowing candidates to check, adjust, and review complex multiple-option questions interactively.

### 3. Customized Career Syllabus Coach
- Consultation module: Consult with an AI Tech Interview Coach to refine specialized study tracks on any career role (e.g. Frontend Engineer, Product Manager, DevOps Leader) and experience tier (Junior, Mid, Senior, Principal).
- Syllabus parsing: Paste custom job descriptions, external syllabi, or study notes. The AI harmonizes this context to model a dynamic workspace.

### 4. Topic Bento Board Matrix (11 Cutouts)
- Spawns exactly **11 highly customized modular topics** in an interactive study grid.
- Click any topic card to reveal:
  - **Key Concept Study Cards**: High-yield core components, practice instructions, and visual ASCII architecture blocks.
  - **Companion Study Notes**: Write and persist custom notes for each domain within your active study roadmap.
  - **Durable Study Anchors**: Direct query-grounded Google Search links corresponding precisely to specialized concepts.

### 5. Adaptive Topic Quiz Testing
- Instantly generate challenging, topic-specific **10-question multiple-choice quizzes** on the fly.
- Features real-time grade checking, color-coded option responses, and detailed AI critiques explaining why wrong choices are sub-optimal.

### 6. Triple-Memory Engine ("Record Everything")
Our advanced context subsystem structures study patterns permanently under three distinct scopes of recollection:
- **Short-Term Contextual Memory**: Logs conversations with your Virtual Career Coach to preserve continuous context.
- **Structured Semantic Memory**: Encapsulates overall syllabus layouts, finished labels, and custom-written topic companion notes in the database.
- **Episodic Memory Logs**: Evaluates performance over time, logging the date, accuracy percentage, and score of every single 10-question quiz completed.

---

## ⚙️ Folder Layout

```text
promptpass/
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

Want to share your study experience with PromptPass on LinkedIn? Use this short template:

```text
🚀 Designing fully custom full-stack applications in a weekend! 

I recently explored Google AI Studio and free AI tools to build PromptPass V2, an elite preparation simulator. 

Features I integrated in Version 2.0:
1️⃣ Unified Home Portal: Standard Exam Certifications + Placement Prep.
2️⃣ Customized Syllabus Coach: Live consultations with Gemini to build modular 11-topic Bento Board maps.
3️⃣ Adaptive Quizzing: Spot-testing with interactive 10-question scenario sets.
4️⃣ Triple Memory Persistence: Locally synced Contextual, Semantic (study notes), and Chronological Episodic memory grids to log progress.

Built 100% full-stack with React 19, Express, TypeScript, Tailwind CSS, and the Google Gemini SDK. 

🔗 Explore: https://github.com/promptpass/promptpass
```

*Happy learning, and pass your prompts with confidence!* 🚀
