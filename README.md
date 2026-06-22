# PromptPass (Release 1.1.0) 🎓🤖

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google--Gemini-API-orange.svg)](https://ai.google.dev/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/)

PromptPass is an elite, full-stack AI-powered certification learning room and interactive tutor workspace. Designed as a modern exam prep application, it allows users to import question banks (PDFs, text files), organize active study plans, test their knowledge, and learn interactively with AI-driven grading, contextual explanations, and a real-time chatbot using Google’s state-of-the-art Gemini API models.

---

## 🚀 Quick Start (Local Setup)

Want to run PromptPass on your local machine or server? Follow these simple steps:

### 1. Prerequisites
- **Node.js** (v18.x or later recommended)
- **NPM** or **Yarn**

### 2. Clone and Setup
```bash
# Clone the repository (or extract key workspace zip contents)
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

## 🎉 What's New in Release 1.1.0

### 🛡️ Smart Rate-Limit & Quota Fallback
Under intensive study sessions (e.g., rapid continuous questions or interactive tutoring chats), free-tier API quotas can sometimes experience temporary minute-based limits (`429 RESOURCE_EXHAUSTED`). PromptPass handles this with an intelligent multi-tier system:
- **Active Gemini Model Selector**: Choose your model on the fly directly in the sidebar settings.
  - **Gemini 3.5 Flash** (Default - Balanced, fast and smart)
  - **Gemini 3.1 Flash Lite** (High-Efficiency - **Recommended for 200+ continuous daily evaluations**)
  - **Gemini 3.1 Pro** (Expert level reasoning for elaborate certifications)
- **Automatic Elegant Downscaling**: If any active query (like parsing, evaluating, or follow-up chatting) encounters a `429` rate limit, the backend automatically and seamlessly swaps down to the ultra-efficient `gemini-3.1-flash-lite` model for that request, ensuring no learning or study downtime.
- **Persistent Selection**: Your chosen model is preserved persistently in the local storage workspace across restarts.

---

## ⚙️ Core Architecture & Features

### 📁 High-Quality Modular Folder Layout
```text
promptpass/
├── src/
│   ├── components/
│   │   └── PracticeSession.tsx  # Dynamic multi-panel study environment, hotkeys & chats
│   ├── types.ts                 # Explicit, strict TypeScript type & schema declarations
│   ├── parser.ts                # Deterministic Regex & Gemini Fallback file parser
│   ├── ai_service.ts            # Server-side official Gemini SDK pipeline & Stream generator
│   ├── db.ts                    # Ultra-light JSON-based persistent file engine
│   ├── offlineCache.ts          # LocalStorage safety net caching client configurations
│   ├── main.tsx                 # Web client setup & React DOM roots
│   └── index.css                # Global styles with direct @import tailwindcss
├── uploads/                     # Secure server staging for uploaded question banks
├── server.ts                    # Backend Express service serving client and mounting APIs
├── package.json                 # Core dependencies, metadata and build scripts
└── README.md                    # Project blueprint and guidelines
```

### 🎯 Key Interactive Learning Features
- **Aesthetic Page Number Filtering**: Strip cluttering headers/footers (e.g. `"-- Page 12 of 150 --"`) from parsed option text so your workspace remains focused.
- **Interactive Exam Controls**: Key-in your answers via mouse clicks, intuitive radio panels, or physical keyboard hotkeys (`1-4` for fast selections, `←`/`→` for navigation, and `Enter` for validation).
- **Concise Confirmation vs. Rich Explanations**: Correct answers provide only a concise confirmation, while incorrect submissions display clean code snippets, option breakdown markdown, and custom study insights.
- **Follow-up Tutor Chats**: Stuck on a difficult AWS or PMP scenario? Highlight the question and talk directly to the AI chatbot regarding that question.
- **Strict Device Workspace Isolation**: All documents, session states, and progress metrics are fully sandboxed using random device-state identifiers. Separate users or browsers won't leak or affect tablet/laptop activity.
- **Aero-Styled UI**: Deep charcoal dark mode workspace highlighting the PromptPass logo, constructed with fluid layouts, ample margins, high line-height typography, and smooth transitions.

---

## 🤝 Contributing & License

PromptPass is licensed under the terms of the [MIT License](LICENSE). Contributions, bug reports, and suggestions are always welcome! Feel free to fork or suggest updates.

*Happy learning, and pass your prompts with confidence!* 🚀