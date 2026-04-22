# NeuroDesk — AI-Powered Email Spam Detection, Smart Sticky Notes & Chatbot

## Complete Project Report & Documentation

---

## 📑 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Objectives](#3-objectives)
4. [System Architecture](#4-system-architecture)
5. [Technology Stack](#5-technology-stack)
6. [Features Overview](#6-features-overview)
7. [Module-Wise Detailed Explanation](#7-module-wise-detailed-explanation)
   - 7.1 Backend — Flask API Server
   - 7.2 ML Spam Detection Pipeline
   - 7.3 AI Email Summarizer
   - 7.4 AI Chatbot (NeuroDesk AI)
   - 7.5 Active Learning System
   - 7.6 Chrome Extension — Content Script
   - 7.7 Chrome Extension — Sticky Notes System
   - 7.8 Chrome Extension — Background Service Worker
8. [Dataset Details](#8-dataset-details)
9. [Machine Learning Model Details](#9-machine-learning-model-details)
10. [API Endpoints](#10-api-endpoints)
11. [File Structure & Code Overview](#11-file-structure--code-overview)
12. [Installation & Setup Guide](#12-installation--setup-guide)
13. [How to Use the Extension](#13-how-to-use-the-extension)
14. [Security & Privacy](#14-security--privacy)
15. [Future Scope](#15-future-scope)
16. [Conclusion](#16-conclusion)

---

## 1. Project Overview

**NeuroDesk** is a full-stack, AI-powered Chrome extension that enhances Gmail and general browser productivity. It combines machine learning-based email spam detection, AI-driven email summarization, a cross-tab persistent sticky notes system, an AI chatbot assistant, a Pomodoro focus timer, and smart reminders — all within a single Chrome extension.

The project consists of two main components:

| Component | Technology | Purpose |
|---|---|---|
| **Backend Server** | Python Flask | Hosts the ML model, serves API endpoints for spam prediction, email summarization, AI chat, and active learning |
| **Chrome Extension** | Vanilla JavaScript (Manifest V3) | Provides the user-facing UI — spam badges on Gmail, the sticky notes widget, chatbot sidebar, Pomodoro timer, and reminders on every webpage |

---

## 2. Problem Statement

Email users face several productivity challenges:

1. **Spam & Phishing** — Despite built-in email filters, sophisticated spam and phishing emails still reach inboxes. Users need an additional, intelligent layer of protection.
2. **Email Overload** — Professionals receive dozens/hundreds of emails daily and need quick summaries to prioritize action items without reading every email fully.
3. **Note-Taking Fragmentation** — Users frequently switch between email, browser tabs, and separate note-taking apps, breaking their workflow.
4. **Focus & Time Management** — There is no integrated tool that combines task management, reminders, and focus timers directly within the browser workspace.

**NeuroDesk addresses all four challenges** within a single, unified Chrome extension backed by AI.

---

## 3. Objectives

1. Build a high-accuracy ML-based spam classifier that operates in real-time on Gmail emails.
2. Implement AI-powered abstractive email summarization using large language models.
3. Create a cross-tab, persistent sticky note system with checklists, themes, reminders, and export.
4. Integrate an AI chatbot for general productivity assistance.
5. Include a Pomodoro focus timer and smart reminders.
6. Implement an active learning feedback loop that allows the model to improve from user corrections.
7. Ensure privacy by processing data locally wherever possible.

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────┐
│             Chrome Extension (Frontend)          │
│                                                  │
│  ┌───────────────┐  ┌──────────────────────────┐ │
│  │  content.js   │  │      sticky.js           │ │
│  │               │  │                          │ │
│  │ • Gmail DOM   │  │ • Sticky Notes (CRUD)    │ │
│  │   scanning    │  │ • Pomodoro Timer         │ │
│  │ • Spam badge  │  │ • Reminders              │ │
│  │ • Summarize   │  │ • Checklists             │ │
│  │   button      │  │ • Theme System           │ │
│  │ • Attachment   │  │ • AI Chatbot Sidebar     │ │
│  │   risk scan   │  │ • FAB Speed-Dial         │ │
│  │ • Active      │  │ • Cross-Tab Sync         │ │
│  │   Learning    │  │ • Note Export (.txt)      │ │
│  │   feedback    │  │                          │ │
│  └───────┬───────┘  └──────────┬───────────────┘ │
│          │                     │                  │
│  ┌───────┴─────────────────────┴───────────────┐ │
│  │           background.js (Service Worker)     │ │
│  │                                              │ │
│  │  • Script injection on all tabs              │ │
│  │  • Cross-tab note sync broadcasting          │ │
│  │  • Context menu handling                     │ │
│  │  • chrome.alarms for persistent reminders    │ │
│  │  • CORS proxy for /chat requests             │ │
│  │  • chrome.notifications for alerts           │ │
│  └──────────────────┬──────────────────────────┘ │
└─────────────────────┼──────────────────────────── ┘
                      │  HTTP (localhost:5000)
                      ▼
┌─────────────────────────────────────────────────┐
│             Flask Backend (Python)                │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  /predict    │  │  /summarize              │  │
│  │  Naive Bayes/│  │  Groq llama-3.3-70b      │  │
│  │  Logistic    │  │  + extractive fallback   │  │
│  │  Regression  │  │                          │  │
│  │  + TF-IDF    │  └──────────────────────────┘  │
│  └──────────────┘                                │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  /report     │  │  /chat                   │  │
│  │  Active      │  │  Groq llama-3.3-70b      │  │
│  │  Learning    │  │  AI Chatbot              │  │
│  │  + Retrain   │  │                          │  │
│  └──────────────┘  └──────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐   │
│  │  train_model.py — Multi-Dataset Pipeline  │   │
│  │  12 CSV datasets → clean → TF-IDF → LR   │   │
│  └───────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**Data Flow:**

1. **User opens a Gmail email** → `content.js` extracts the email text → sends to `/predict` → receives `Spam` or `Safe` with confidence → displays a coloured badge.
2. **User clicks Summarize** → email text is sent to `/summarize` → Groq AI generates bullet-point summary → summary appears in a new sticky note.
3. **User opens AI Chat** → message history is proxied through `background.js` → `/chat` endpoint → Groq AI responds → reply appears in sidebar.
4. **User provides feedback** ("Wrong? → Spam/Safe") → `/report` endpoint → text is appended to training CSV (50× for weight) → model is retrained → model reloaded.

---

## 5. Technology Stack

### Backend

| Technology | Version / Details | Purpose |
|---|---|---|
| **Python** | 3.9+ | Core backend language |
| **Flask** | Latest | Lightweight web framework for REST API |
| **Flask-CORS** | Latest | Enables cross-origin requests from the extension |
| **Scikit-Learn** | Latest | Machine learning (TF-IDF + Logistic Regression) |
| **Pandas** | Latest | Data loading, cleaning, and preprocessing |
| **Groq SDK** | Latest | API client for llama-3.3-70b AI model |
| **python-dotenv** | Latest | Environment variable management |
| **Pickle** | Built-in | Model serialization/deserialization |

### Frontend (Chrome Extension)

| Technology | Details | Purpose |
|---|---|---|
| **JavaScript** | Vanilla ES6+, no frameworks | All extension logic |
| **Chrome Extension Manifest V3** | Latest standard | Extension configuration |
| **chrome.storage.local** | Built-in API | Persistent note storage |
| **chrome.alarms** | Built-in API | Persistent reminder scheduling |
| **chrome.notifications** | Built-in API | System-level reminder alerts |
| **chrome.scripting** | Built-in API | Dynamic script injection |
| **Google Fonts (Inter)** | External CDN | Premium typography |

### AI Models

| Task | Model |
|---|---|
| Spam Detection | Logistic Regression + TF-IDF (trained locally on 12 datasets) |
| Email Summarization | `llama-3.3-70b-versatile` via Groq Cloud API |
| AI Chatbot | `llama-3.3-70b-versatile` via Groq Cloud API |

---

## 6. Features Overview

| # | Feature | Description |
|---|---|---|
| 1 | 🛡️ **Real-Time Spam Detection** | Opens any Gmail email and automatically classifies it as Spam or Safe with confidence percentage |
| 2 | 🔍 **Risky Attachment Scanner** | Detects dangerous file types (.exe, .bat, .scr, .docm, etc.) in email attachments and shows warnings |
| 3 | 📧 **AI Email Summarizer** | One-click email summarization into clear bullet points using Groq llama-3.3-70b |
| 4 | 🔄 **Active Learning** | Users can correct wrong predictions; the model retrains automatically and improves over time |
| 5 | 📌 **Smart Sticky Notes** | Draggable, resizable, persistent notes with glassmorphism design across all browser tabs |
| 6 | 📋 **Interactive Checklists** | Toggle any note into a to-do checklist with checkboxes and progress tracking |
| 7 | 🧠 **AI Chatbot** | Floating sidebar chatbot (NeuroDesk AI) for productivity help, Q&A, and email tips |
| 8 | 🍅 **Pomodoro Timer** | Built-in 25/5 focus timer with pause/resume, work/break switching, and session tracking |
| 9 | ⏰ **Smart Reminders** | Set timed reminders with custom labels; fires full-screen animated alerts and system notifications |
| 10 | 🎨 **4 Premium Themes** | Violet, Rose, Ocean, and Forest dark glass themes for sticky notes |
| 11 | ⬇️ **Note Export** | Download any note as a formatted `.txt` file |
| 12 | 🔄 **Cross-Tab Sync** | Notes appear instantly on all open tabs without refresh |
| 13 | 📋 **Context Menu** | Right-click any selected text → "Add to sticky note" |

---

## 7. Module-Wise Detailed Explanation

### 7.1 Backend — Flask API Server (`backend/app.py`)

**What it does:**
The Flask server is the central backend of the system. It loads the trained ML model and TF-IDF vectorizer on startup, initializes the Groq AI client for summarization and chat, and exposes four HTTP API endpoints.

**Key Components:**

- **Model Loading** (`load_models()`): Deserializes `spam_model.pkl` and `vectorizer.pkl` using Python's `pickle` module at server startup.
- **Groq Initialization** (`init_groq()`): Creates a Groq API client using the API key from the `.env` file. If the key is missing or invalid, the system gracefully falls back to extractive summarization.
- **CORS** (`flask-cors`): Enables the Chrome extension (running on Gmail's origin) to make API calls to `localhost:5000`.

**How it works:**
```
Server Start → load_models() → init_groq() → Flask app.run(port=5000)
                    ↓                ↓
           spam_model.pkl      Groq API Client
           vectorizer.pkl      (llama-3.3-70b)
```

---

### 7.2 ML Spam Detection Pipeline (`backend/train_model.py`)

**What it does:**
This is the multi-dataset machine learning training pipeline. It merges 12 heterogeneous email/SMS spam datasets, cleans and deduplicates the combined data, vectorizes text using TF-IDF, and trains a Logistic Regression classifier.

**Step-by-Step Process:**

1. **Dataset Loading** (Step 1/5):
   - Reads all 12 CSV files from the `datasets spam/` folder.
   - Each dataset has different column names and label formats — the `DATASETS` descriptor array maps them uniformly.
   - Also loads any active-learning feedback from `spam.csv`.

2. **Text Cleaning** (Step 2/5):
   - Converts text to lowercase.
   - Replaces URLs with the token `url` and email addresses with `email`.
   - Removes all punctuation and special characters.
   - Collapses multiple whitespaces.
   - Drops rows with fewer than 10 characters.
   - Deduplicates based on cleaned text.

3. **TF-IDF Vectorization** (Step 3/5):
   - Uses `TfidfVectorizer` with:
     - `sublinear_tf=True` — applies `log(1+tf)` to dampen high-frequency terms.
     - `max_df=0.85` — ignores terms appearing in >85% of documents.
     - `min_df=3` — ignores extremely rare terms.
     - `ngram_range=(1, 2)` — captures both unigrams and bigrams.
     - `max_features=150,000` — vocabulary cap.
     - Built-in English stop word removal.

4. **Model Training** (Step 4/5):
   - Splits into 85% training / 15% test (stratified).
   - Trains `LogisticRegression` with:
     - `C=5.0` — inverse regularization strength.
     - `solver='saga'` — efficient for large datasets.
     - `class_weight='balanced'` — handles class imbalance automatically.
     - `max_iter=1000`.

5. **Evaluation** (Step 5/5):
   - Calculates overall accuracy.
   - Generates classification report (precision, recall, F1 for both Ham and Spam).
   - Saves `spam_model.pkl` and `vectorizer.pkl` via pickle serialization.

**Why Logistic Regression over Naive Bayes?**
While Naive Bayes is faster, Logistic Regression provides significantly better F1-scores on large, heterogeneous datasets because it can learn complex decision boundaries and handle feature correlations that Naive Bayes's independence assumption cannot capture.

---

### 7.3 AI Email Summarizer

**What it does:**
Provides one-click email summarization using two approaches:

**Primary: Groq AI Abstractive Summarization** (`groq_summarize()`):
- Sends the email text (truncated to 4000 chars) to `llama-3.3-70b-versatile` with a carefully crafted prompt.
- System prompt instructs the model to act as an "expert email summarizer" focusing on clarity and completeness.
- User prompt requests bullet-point summaries focusing on key actions, deadlines, dates, decisions, and requests.
- Parameters: `temperature=0.4` (focused), `max_tokens=512`, `top_p=0.9`.
- Post-processing strips markdown artifacts (`**`, ` ``` `).

**Fallback: Extractive Summarization** (`extractive_summarize()`):
- If Groq is unavailable (no API key, rate limit, network error), falls back to a local extractive algorithm.
- Splits text into sentences using regex.
- Scores each sentence based on term frequency.
- Bonus scoring for sentences containing dates/times (1.5×) or urgent keywords (1.3×).
- Returns the top 3 highest-scored sentences in original order, capped at 400 characters.

---

### 7.4 AI Chatbot — NeuroDesk AI

**What it does:**
A full conversational AI chatbot accessible via a sliding sidebar panel. It maintains conversation history and responds to any user query.

**Backend (`/chat` endpoint):**
- Accepts a `messages` array (chat history) from the client.
- Prepends a system prompt that defines NeuroDesk AI's personality: friendly, concise, productivity-focused.
- Sends the last 20 messages (to stay within token limits) to `llama-3.3-70b-versatile`.
- Parameters: `temperature=0.65` (balanced creativity), `max_tokens=700`, `top_p=0.9`.
- Returns the AI's reply.

**Frontend (`sticky.js` chatbot section):**
- Sliding sidebar with glassmorphism design (dark glass, blur, gradients).
- Chat message bubbles with user/assistant differentiation.
- Typing indicator with animated dots.
- Markdown rendering (bold, code, bullet points).
- Chat is proxied through `background.js` because MV3 content scripts are subject to CORS but service workers are not.

---

### 7.5 Active Learning System

**What it does:**
Allows users to correct wrong spam/safe predictions. The correction feeds back into the training data, and the model is retrained in real-time.

**How it works:**

1. User sees "AI: Spam (95%)" on an email.
2. User clicks "👍 Safe" (disagreeing with the prediction).
3. Frontend sends `{text: emailBody, label: "ham"}` to `/report`.
4. Backend appends the text + label to `spam.csv` **50 times** (to give user corrections sufficient weight against the massive training corpus).
5. Backend calls `retrain_model()` — re-executes the full training pipeline.
6. Backend calls `load_models()` — reloads the newly trained model into memory.
7. Frontend re-scans the email with the updated model.

**Why 50× duplication?**
With ~500K+ rows in the training data, a single correction would have negligible impact. Duplicating it 50 times ensures the correction has meaningful weight in the next training cycle, effectively oversampling the corrected example.

---

### 7.6 Chrome Extension — Gmail Content Script (`extension/content.js`)

**What it does:**
Runs automatically on `https://mail.google.com/*`. Detects when the user opens an email, extracts the email content, and interacts with the backend for spam prediction.

**Key Components:**

1. **Email Content Extraction** (`extractEmailContent()`):
   - Targets Gmail's DOM class `.a3s.aiL` (the email body container).
   - Extracts `innerText` for clean, tag-free content.
   - Also captures the header element (`.ha`) for badge placement.

2. **Spam Badge Display** (`showBadge()`):
   - Creates an inline badge showing `AI: Spam (95%)` or `AI: Safe (99%)`.
   - Colour-coded: red for Spam, green for Safe, grey for scanning/error.
   - Includes inline action buttons:
     - **Wrong? → 👍 Safe / 👎 Spam**: Active learning feedback.
     - **📝 Summarize**: Triggers AI summarization.
     - **📌 Add Sticky**: Creates a sticky note from email content.

3. **Risky Attachment Detection** (`checkAttachments()`):
   - Scans Gmail's attachment DOM elements for 25+ dangerous file extensions.
   - Detects `.exe`, `.bat`, `.msi`, `.scr`, `.docm`, `.xlsm`, `.pptm`, `.jar`, `.apk`, `.iso`, etc.
   - Also flags `.zip`/`.rar` archives with suspicious names (containing words like "password", "invoice", "urgent").
   - Shows a prominent red warning banner if risky attachments are found.

4. **Smart Scanning** (`scanEmail()`):
   - Uses `data-scanned` attribute to prevent re-scanning the same email.
   - Debounced `MutationObserver` watches for DOM changes (new emails being opened) with a 600ms delay.
   - Also listens for `hashchange` events (Gmail's SPA navigation).

---

### 7.7 Chrome Extension — Sticky Notes System (`extension/sticky.js`)

**What it does:**
This is the largest module (~1975 lines). It implements the entire sticky notes widget system, chatbot sidebar, Pomodoro timer, reminders, and FAB speed-dial. It runs on **all webpages** (not just Gmail).

**Key Components:**

1. **Theme System (`STICKY_THEMES`):**
   - 4 premium dark glassmorphism themes: Violet, Rose, Ocean, Forest.
   - Each theme defines: gradient, glow color, glass background, border, text color, accent, and dot color.
   - Users cycle themes via the 🎨 button.

2. **Note Rendering (`renderNote()`):**
   - Dynamically creates DOM elements with fixed positioning.
   - Glassmorphism styling: `backdrop-filter: blur(16px) saturate(180%)`.
   - Draggable via mouse events on the header.
   - Resizable via CSS `resize: both` + `ResizeObserver` to persist dimensions.
   - Z-index management: clicked notes come to front.

3. **Content Types:**
   - **Text** (`renderTextarea()`): Simple textarea with placeholder motivational quotes.
   - **Checklist** (`renderChecklist()`): Interactive checklist with checkbox toggles, inline editing, add/delete items.
   - **Pomodoro** (`renderPomodoro()`): Full timer with 25min work / 5min break cycle, progress bar, session counter, pause/resume/reset, mode switching.

4. **Reminder System (Two-Layer):**
   - **Layer 1: `setTimeout`** — fires within the content script if the tab stays open. Works for sub-1-minute timers.
   - **Layer 2: `chrome.alarms`** — persistent alarm set via background.js. Fires even after tab is closed/refreshed.
   - Double-fire prevention via `reminderFired` flag.
   - 5-minute grace window for past-due reminders.
   - Full-screen animated alert with confetti, glowing bell, and ripple animations.

5. **Cross-Tab Sync:**
   - `chrome.storage.onChanged` listener detects changes from other tabs.
   - `handleStorageSync()` reconciles the DOM: removes deleted notes, adds new notes, updates existing notes.
   - Background service worker broadcasts `SYNC_NOTES` messages to all tabs for instant sync.

6. **Note Minimize:** Collapses a note into a small draggable dot (📌) that can be restored on click.

7. **Note Export:** Downloads note content as a formatted `.txt` file with header, content, and footer.

8. **FAB Speed-Dial:**
   - Floating action button (✦) in the bottom-right corner with pulse animation.
   - Three options: ✏️ New Sticky Note, 📋 Recent Note, 🧠 NeuroDesk AI Chat.
   - Smooth open/close animations with staggered entrance.

---

### 7.8 Chrome Extension — Background Service Worker (`extension/background.js`)

**What it does:**
The service worker acts as the always-running backbone of the extension. It handles tasks that persist across page navigations and tab contexts.

**Key Responsibilities:**

1. **Script Injection (3 layers):**
   - **onInstalled**: Injects `sticky.js` into all already-open HTTP/HTTPS tabs.
   - **tabs.onUpdated**: Injects when any tab finishes loading a new page.
   - **tabs.onActivated**: Injects when user switches to any tab.
   - Safe injection — `sticky.js` has a guard (`aiStickySystemInitialized`) to prevent double-init.

2. **Cross-Tab Note Broadcasting:**
   - `chrome.storage.onChanged` listener detects note changes.
   - `broadcastSync()` sends `SYNC_NOTES` messages to every open HTTP/HTTPS tab.
   - Falls back to script injection if a tab hasn't loaded `sticky.js` yet.

3. **Context Menu:**
   - "Add to sticky note" — captures selected text.
   - "Create new sticky note" — creates a blank note.

4. **Chat CORS Proxy:**
   - Content scripts in MV3 are subject to CORS restrictions.
   - The `CHAT_REQUEST` message handler fetches `http://127.0.0.1:5000/chat` from the service worker (exempt from CORS for `host_permissions` URLs).
   - Returns the AI reply to the requesting content script.

5. **Alarm-Based Reminders:**
   - `SET_ALARM` message handler creates `chrome.alarms`.
   - `onAlarm` listener fires when a reminder is due.
   - Reads the note from storage, builds the alert message, marks as fired.
   - Shows a system `chrome.notification` (works even without open tabs).
   - Sends `SHOW_REMINDER_ALERT` to the active tab for the in-page animated alert.

---

## 8. Dataset Details

The spam detection model is trained on **12 diverse, real-world datasets** totaling hundreds of thousands of emails and SMS messages:

| # | Dataset | Rows (approx.) | Type |
|---|---|---|---|
| 1 | `CEAS_08.csv` | ~68K | Email spam (academic conference) |
| 2 | `Enron.csv` | ~46K | Corporate email (Enron corpus) |
| 3 | `Ling.csv` | ~9K | Linguistic spam dataset |
| 4 | `Nazario.csv` | ~8K | Phishing emails |
| 5 | `Nigerian_Fraud.csv` | ~9K | 419/Nigerian fraud scams |
| 6 | `SpamAssasin.csv` | ~15K | SpamAssassin corpus |
| 7 | `datamail.csv` | ~140K | Large email dataset |
| 8 | `enron_spam_data.csv` | ~52K | Extended Enron corpus |
| 9 | `mail_data.csv` | ~5K | SMS spam collection |
| 10 | `mailss.csv` | ~9K | Email text classification |
| 11 | `messages.csv` | ~9K | Message classification |
| 12 | `phishing_email.csv` | ~107K | Phishing email detection |

**Total: ~470K+ raw rows** before deduplication.

Each dataset has a different schema (column names, label formats). The `DATASETS` descriptor in `train_model.py` maps each dataset's columns to a uniform `(label, message)` format, handling both string labels (`ham`/`spam`) and integer labels (`0`/`1`).

---

## 9. Machine Learning Model Details

### Text Preprocessing

```python
def clean_text(text):
    text = text.lower()                           # Lowercase
    text = re.sub(r'http\S+|www\.\S+', ' url ', text)   # Replace URLs
    text = re.sub(r'\S+@\S+', ' email ', text)          # Replace emails
    text = re.sub(r'[^a-z0-9\s]', ' ', text)            # Remove punctuation
    text = re.sub(r'\s+', ' ', text).strip()             # Collapse whitespace
    return text
```

### Feature Extraction: TF-IDF

**TF-IDF (Term Frequency — Inverse Document Frequency)** converts raw text into numerical feature vectors:

- **Term Frequency (TF)**: How often a word appears in a document. With `sublinear_tf=True`, uses `log(1 + tf)` to prevent long documents from dominating.
- **Inverse Document Frequency (IDF)**: Penalizes words that appear in too many documents (common words contribute less).
- **Bigrams**: `ngram_range=(1, 2)` captures two-word phrases like "free offer" or "click here", which are strong spam indicators.
- **Vocabulary**: Capped at 150,000 features for memory efficiency.

### Classifier: Logistic Regression

| Parameter | Value | Rationale |
|---|---|---|
| `C` | 5.0 | Higher C = less regularization = model fits more closely to data |
| `solver` | `saga` | Efficient for large datasets, supports `class_weight` |
| `max_iter` | 1000 | Ensures convergence |
| `class_weight` | `balanced` | Automatically adjusts weights for class imbalance |
| `n_jobs` | -1 | Uses all CPU cores for parallel training |

### Prediction Flow

```
Email Text → clean_text() → TF-IDF vectorize → Logistic Regression → {prediction, confidence}
                                                        ↓
                                          model.predict() → 0 (Ham) or 1 (Spam)
                                          model.predict_proba() → [P(ham), P(spam)]
                                          confidence = max(proba) × 100
```

---

## 10. API Endpoints

### `GET /health`
**Purpose:** Server health check.

**Response:**
```json
{
    "status": "online",
    "spam_model": "loaded",
    "groq": "ready"
}
```

---

### `POST /predict`
**Purpose:** Classify email text as Spam or Safe.

**Request:**
```json
{
    "text": "Congratulations! You have won a free iPhone..."
}
```

**Response:**
```json
{
    "prediction": "Spam",
    "confidence": 97.82
}
```

**Logic:**
- Empty text → returns `Safe` with confidence `0`.
- TF-IDF transforms the text → model predicts → returns class + max probability.

---

### `POST /summarize`
**Purpose:** Summarize email content into bullet points.

**Request:**
```json
{
    "text": "Dear Team, Please find attached the Q4 report..."
}
```

**Response:**
```json
{
    "summary": "• Q4 financial report is attached for review\n• Key metrics show 12% YoY growth\n• Board meeting scheduled for Jan 15th"
}
```

**Logic:**
- Tries Groq AI (abstractive) first.
- Falls back to extractive summarization on failure.

---

### `POST /chat`
**Purpose:** AI chatbot conversation.

**Request:**
```json
{
    "messages": [
        {"role": "user", "content": "How can I be more productive?"}
    ]
}
```

**Response:**
```json
{
    "reply": "Here are some productivity tips:\n• Use the Pomodoro technique (25 min focus + 5 min break)..."
}
```

---

### `POST /report`
**Purpose:** Active learning — user correction of wrong predictions.

**Request:**
```json
{
    "text": "Meeting at 3pm tomorrow in Conference Room B.",
    "label": "ham"
}
```

**Response:**
```json
{
    "success": true,
    "message": "Done! AI updated using the stable model."
}
```

**Logic:**
- Appends correction to `spam.csv` (50× for weight).
- Retrains the model.
- Reloads updated model into memory.

---

## 11. File Structure & Code Overview

```
gmail_spam_detection/
│
├── 📄 README.md                    # Project documentation
├── 📄 .gitignore                   # Git ignore rules
│
├── 📂 extension/                   # Chrome Extension (Frontend)
│   ├── 📄 manifest.json            # MV3 config — permissions, content scripts, service worker
│   │                                  (689 bytes)
│   ├── 📄 content.js               # Gmail page integration — spam detection, attachment scan,
│   │                                  summarize/sticky buttons, active learning feedback
│   │                                  (377 lines, 14KB)
│   ├── 📄 sticky.js                # Full sticky notes system, chatbot sidebar, Pomodoro,
│   │                                  reminders, FAB, cross-tab sync, theme engine
│   │                                  (1,975 lines, 87KB — the largest file)
│   └── 📄 background.js            # Service worker — injection, sync, CORS proxy, alarms,
│                                      context menus, notifications
│                                      (193 lines, 8KB)
│
├── 📂 backend/                     # Python Flask Backend
│   ├── 📄 app.py                   # Main Flask app — all 4 API endpoints, model loading,
│   │                                  Groq AI init, extractive summarizer
│   │                                  (307 lines, 12KB)
│   ├── 📄 train_model.py           # Multi-dataset ML pipeline — load, clean, TF-IDF, train,
│   │                                  evaluate, save
│   │                                  (216 lines, 9KB)
│   ├── 📄 requirements.txt         # Python dependencies (7 packages)
│   ├── 📄 setup.bat                # First-time setup script (venv, install, train)
│   ├── 📄 start.bat                # Server launcher script
│   ├── 📄 .env.example             # API key template
│   ├── 📄 .env                     # Actual API key (gitignored)
│   ├── 📄 import_dataset.py        # Legacy dataset merger utility
│   ├── 📄 download_dataset.py      # UCI SMS dataset downloader
│   ├── 📄 verify_model.py          # Quick model verification script
│   ├── 📄 spam_model.pkl           # Trained model (~1.2MB)
│   ├── 📄 vectorizer.pkl           # TF-IDF vectorizer (~6.2MB)
│   ├── 📄 spam.csv                 # Active learning feedback data (~150MB)
│   └── 📂 venv/                    # Python virtual environment
│
└── 📂 datasets spam/               # Raw training datasets (12 CSV files)
    ├── 📄 CEAS_08.csv              # ~68MB
    ├── 📄 Enron.csv                # ~46MB
    ├── 📄 datamail.csv             # ~140MB
    ├── 📄 phishing_email.csv       # ~107MB
    ├── 📄 enron_spam_data.csv      # ~52MB
    ├── 📄 SpamAssasin.csv          # ~15MB
    ├── 📄 mail_data.csv            # ~486KB
    ├── 📄 Nigerian_Fraud.csv       # ~8MB
    ├── 📄 Nazario.csv              # ~8MB
    ├── 📄 Ling.csv                 # ~9MB
    ├── 📄 mailss.csv               # ~9MB
    └── 📄 messages.csv             # ~9MB
```

---

## 12. Installation & Setup Guide

### Prerequisites
- **Python 3.9+** — [python.org/downloads](https://www.python.org/downloads/) (check "Add Python to PATH")
- **Google Chrome** — [google.com/chrome](https://www.google.com/chrome/)
- **Groq API Key (free)** — [console.groq.com](https://console.groq.com)

### Step 1: Backend Setup (First Time Only)

```bash
cd backend
setup.bat
```

This script will:
1. Create a Python virtual environment (`venv/`)
2. Install dependencies: `flask, flask-cors, pandas, scikit-learn, groq, python-dotenv, requests`
3. Copy `.env.example` → `.env`
4. Train the spam detection model (may take several minutes)

### Step 2: Configure API Key

Open `backend/.env` and add your Groq API key:
```
GROQ_API_KEY=gsk_your_actual_key_here
```

### Step 3: Start Backend Server

```bash
cd backend
start.bat
```
Server runs at `http://127.0.0.1:5000`. Keep the terminal open.

### Step 4: Load Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Pin the extension from the puzzle icon

### Step 5: Verify

- Visit `http://127.0.0.1:5000/health` — should return JSON with status "online"
- Open any Gmail email — an AI spam badge should appear

---

## 13. How to Use the Extension

| Feature | Steps |
|---|---|
| **Check Spam** | Open any email in Gmail → the AI badge (green/red) appears automatically in the subject line |
| **Correct AI** | If the prediction is wrong, click "👍 Safe" or "👎 Spam" → the model retrains and re-scans |
| **Summarize** | Click "📝 Summarize" in the badge bar → a sticky note appears with the AI-generated bullet summary |
| **Add to Sticky** | Click "📌 Add Sticky" → creates a note with the email content |
| **Create Note** | Click the ✦ FAB (bottom-right on any page) → "✏️ New Sticky Note" |
| **Open Chat** | Click ✦ FAB → "🧠 NeuroDesk AI Chat" → type any question |
| **Recent Note** | Click ✦ FAB → "📋 Recent Note" → restores the most recently created note |
| **Switch Theme** | Click 🎨 in the note toolbar → cycles through Violet, Rose, Ocean, Forest |
| **Checklist** | Click 📋 in the note toolbar → toggles between text and checklist mode |
| **Pomodoro** | Click 🍅 in the note toolbar → starts a 25/5 Pomodoro timer in the note |
| **Reminder** | Click ⏰ in the note toolbar → set minutes + custom label → animated alert fires when due |
| **Download** | Click ⬇ in the note toolbar → downloads note as a `.txt` file |
| **Minimize** | Click — (dash) in the note toolbar → collapses to a draggable 📌 dot |
| **Delete** | Click ✕ in the note toolbar → permanently deletes the note |
| **Context Menu** | Select any text on any page → right-click → "Add to sticky note" |
| **Drag/Resize** | Drag the note header to move; drag the bottom-right corner to resize |

---

## 14. Security & Privacy

| Aspect | Implementation |
|---|---|
| **Email Processing** | All spam detection happens **locally** via the ML model on your machine |
| **Data Storage** | Notes are stored in `chrome.storage.local` — data never leaves your browser |
| **Third-Party Access** | Only Groq receives email data, and **only** when you explicitly click Summarize or use the Chatbot |
| **API Key** | Stored in a local `.env` file, never committed to git (included in `.gitignore`) |
| **Attachment Scanning** | Done entirely client-side by scanning DOM elements — no files are uploaded |
| **No Telemetry** | The extension does not track, log, or transmit any user data |

---

## 15. Future Scope

1. **Multi-Language Support** — Extend spam detection to support Hindi, French, Spanish, etc.
2. **Phishing URL Detection** — Scan email links for known phishing domains in real-time.
3. **Cloud Sync** — Optional Google Drive or Firebase sync for notes across devices.
4. **Email Templates** — AI-generated reply templates based on email content.
5. **Advanced Analytics Dashboard** — Show spam statistics, productivity metrics, Pomodoro history.
6. **Mobile Companion App** — Android/iOS app to view and edit sticky notes.
7. **Calendar Integration** — Automatically create calendar events from detected dates in emails.
8. **Multi-Model Ensemble** — Combine Logistic Regression, Random Forest, and SVM for even higher accuracy.
9. **Browser Extension Store Publishing** — Publish to Chrome Web Store for public distribution.

---

## 16. Conclusion

NeuroDesk is a comprehensive AI-powered productivity extension that demonstrates the practical application of machine learning, natural language processing, and modern web technologies. By combining multiple AI capabilities — spam detection, email summarization, conversational AI — with a rich, interactive sticky notes system, it provides a unified productivity experience directly within the browser.

**Key Technical Achievements:**

- Trained a spam classifier on **470K+ emails** from 12 diverse datasets, achieving high accuracy.
- Implemented **real-time active learning** where user feedback immediately retrains and improves the model.
- Built a complete **production-quality Chrome Extension** using Manifest V3 with cross-tab synchronization, persistent storage, and system-level notifications.
- Integrated **Groq's llama-3.3-70b** model for both summarization and conversational AI with graceful fallbacks.
- Designed a premium **glassmorphism UI** with 4 themes, micro-animations, and responsive interactions — all in vanilla JavaScript without any CSS framework.

The project showcases full-stack development skills spanning Python backend development, machine learning pipelines, RESTful API design, browser extension architecture, and modern frontend engineering.

---

*Built with ❤️ — **NeuroDesk AI***
