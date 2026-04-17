# 🧠 NeuroDesk — AI Email Spam + Notes

> A premium Chrome Extension that supercharges your Gmail and browser experience with AI-powered spam detection, smart email summarization, a cross-tab sticky note system, a built-in AI chatbot, Pomodoro timer, and smart reminders.

![Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome)
![Python](https://img.shields.io/badge/Backend-Python%20Flask-green?logo=python)
![AI](https://img.shields.io/badge/AI-Groq%20llama--3.3--70b-purple?logo=openai)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🛡️ **Spam Detection** | ML-powered (Naive Bayes + TF-IDF) real-time Gmail spam classifier with active learning |
| 📧 **AI Email Summarizer** | One-click email summary using Groq llama-3.3-70b into clear bullet points |
| 📌 **Smart Sticky Notes** | Draggable, resizable, cross-tab persistent notes with 4 premium dark glass themes |
| 🧠 **AI Chatbot** | Floating sidebar chatbot (NeuroDesk AI) for productivity help, Q&A, and email tips |
| 🍅 **Pomodoro Timer** | Built-in focus timer with pause/resume, work/break switching, session tracking |
| ⏰ **Reminders** | Persistent chrome.alarms reminders with full-screen notification animations |
| 📋 **Checklists** | Interactive to-do checklists inside sticky notes |
| ⬇️ **Note Export** | Download any note as a `.txt` file |
| 🔄 **Cross-tab Sync** | Notes appear instantly on all tabs without refresh |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐     ┌──────────────────────────────┐
│     Chrome Extension            │     │   Flask Backend (localhost)   │
│                                 │     │                              │
│  content.js  ──► Gmail UI      │     │  /predict  — Spam detection  │
│  sticky.js   ──► Notes/Chat    │◄───►│  /summarize — Email summary  │
│  background.js ─► Proxy/Alarms │     │  /chat     — AI chatbot      │
│                                 │     │  /report   — Active learning │
└─────────────────────────────────┘     └──────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.9+**
- **Google Chrome**
- **Free Groq API key** → [console.groq.com](https://console.groq.com)

---

### 1️⃣ Backend Setup

```bash
cd backend

# First-time only: run the setup script
setup.bat          # Windows
```

This will:
- Create a Python virtual environment
- Install all dependencies
- Copy `.env.example` → `.env`
- Train the spam detection model

**Then add your API key:**
```
# backend/.env
GROQ_API_KEY=your_groq_api_key_here
```

**Start the backend:**
```bash
start.bat          # Windows
# OR manually:
python app.py
```

The server runs at `http://127.0.0.1:5000`

---

### 2️⃣ Chrome Extension Setup

1. Open Chrome → navigate to `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. Pin **NeuroDesk** from the extensions toolbar

---

### 3️⃣ Usage

| Action | How |
|---|---|
| Check email spam | Open any Gmail email — the AI badge appears automatically |
| Summarize email | Click **✨ Summarize** in the Gmail toolbar |
| Create sticky note | Click the **✦** FAB button (bottom-right) → **✏️ New Sticky Note** |
| Open AI chat | Click **✦** FAB → **🧠 NeuroDesk AI Chat** |
| Recent note | Click **✦** FAB → **📋 Recent Note** |
| Switch themes | Click **🎨** in the note toolbar (4 themes: Violet, Rose, Ocean, Forest) |
| Set reminder | Click **⏰** in the note toolbar |
| Start Pomodoro | Click **🍅** in the note toolbar |
| Download note | Click **⬇** in the note toolbar |

---

## 📁 Project Structure

```
gmail_spam_detection/
├── extension/              # Chrome Extension
│   ├── manifest.json       # Extension config (MV3)
│   ├── content.js          # Gmail spam detection & UI injection
│   ├── sticky.js           # Sticky notes, chatbot, Pomodoro, reminders
│   └── background.js       # Service worker: alarms, sync, API proxy
│
├── backend/                # Python Flask API
│   ├── app.py              # Main Flask app (all endpoints)
│   ├── train_model.py      # Spam model training (Naive Bayes + TF-IDF)
│   ├── requirements.txt    # Python dependencies
│   ├── setup.bat           # First-time setup script (Windows)
│   ├── start.bat           # Launch backend server (Windows)
│   └── .env.example        # API key template
│
└── README.md
```

---

## ⚙️ Backend API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Server status check |
| `/predict` | POST | `{text}` → spam or safe prediction |
| `/summarize` | POST | `{text}` → AI bullet-point summary |
| `/chat` | POST | `{messages}` → AI chat reply |
| `/report` | POST | `{text, label}` → active learning feedback |

---

## 🔑 Environment Variables

Create `backend/.env` (copy from `.env.example`):

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get a free key with generous rate limits at [console.groq.com](https://console.groq.com).

---

## 🤖 AI Models Used

| Task | Model |
|---|---|
| Spam Detection | Naive Bayes + TF-IDF (Scikit-Learn, trained locally) |
| Email Summarization | `llama-3.3-70b-versatile` via Groq |
| AI Chat | `llama-3.3-70b-versatile` via Groq |

---

## 📦 Dependencies

### Python (backend)
```
flask, flask-cors, pandas, scikit-learn, groq, python-dotenv
```

### Chrome Extension
Pure vanilla JS — no npm, no build step required.

---

## 🛡️ Privacy

- All email analysis happens **locally** via your own backend
- No email data is sent to any third-party except Groq (only for summarization/chat, when you explicitly trigger it)
- Notes are stored in `chrome.storage.local` — never leaves your browser

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<p align="center">Built with ❤️ — <strong>NeuroDesk AI</strong></p>
