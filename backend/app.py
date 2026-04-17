from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import csv
import pandas as pd
import re
from dotenv import load_dotenv
from train_model import train as retrain_model

# Load .env file (works locally; on servers set env vars directly)
load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'spam_model.pkl')
VEC_PATH   = os.path.join(BASE_DIR, 'vectorizer.pkl')
CSV_PATH   = os.path.join(BASE_DIR, 'spam.csv')

# ===== Groq AI Configuration =====
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
groq_client = None

def init_groq():
    """Initialize the Groq AI client for summarization."""
    global groq_client
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("[OK] Groq AI client initialized successfully (llama-3.3-70b-versatile)")
        return True
    except Exception as e:
        print(f"[WARN] Groq AI initialization failed: {e}")
        print("       Summarizer will use extractive fallback.")
        return False

# Load spam detection model and vectorizer
def load_models():
    global model, tv
    print("Loading Naive Bayes Model...")
    model = pickle.load(open(MODEL_PATH, 'rb'))
    tv = pickle.load(open(VEC_PATH, 'rb'))

load_models()
init_groq()


# ===== Health Check =====
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "spam_model": "loaded",
        "groq": "ready" if groq_client else "unavailable"
    })


# ===== Spam Prediction =====
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        if not text.strip():
             return jsonify({
                 "prediction": "Safe",
                 "confidence": 0  # FIX #18: 0 not 100 — empty text is not confidently safe
             })
             
        transformed_text = tv.transform([text])
        prediction = model.predict(transformed_text)[0]
        confidence = max(model.predict_proba(transformed_text)[0]) * 100
        
        return jsonify({
            "prediction": "Spam" if prediction == 1 else "Safe",
            "confidence": round(confidence, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ===== Active Learning Report =====
@app.route('/report', methods=['POST'])
def report():
    try:
        data = request.json
        if not data or 'text' not in data or 'label' not in data:
            return jsonify({"error": "Missing fields"}), 400
            
        text = data['text'].strip()
        label = data['label'].lower()
        
        if not text or label not in ['spam', 'ham']:
            return jsonify({"error": "Invalid data"}), 400
            
        print("Applying user correction — retraining model...")  # FIX #16: accurate log message
        
        # 1. Add to persistent storage (Append to csv 50 times for weight)
        with open(CSV_PATH, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for _ in range(50):
                writer.writerow([label, text])
            
        # 2. Retrain model with the updated dataset
        retrain_model()  # FIX #17: use top-level import

        # 3. Reload models so the next prediction uses the updated model
        load_models()
        
        return jsonify({"success": True, "message": "Done! AI updated using the stable model."})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ===== Email Summarization =====
@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400

        text = data['text'].strip()
        if not text:
            return jsonify({"summary": "(Empty email)"})

        # Try Groq AI first for smart abstractive summarization
        groq_summary = groq_summarize(text)
        if groq_summary:
            return jsonify({"summary": groq_summary})

        # Fallback: smart extractive summarization
        print("[WARN] Groq failed, using extractive fallback...")
        return jsonify({"summary": extractive_summarize(text)})
    except Exception as e:
        print(f"Summarize endpoint error: {e}")
        return jsonify({"error": str(e)}), 500


# ---------- Groq AI Summarizer ----------
def groq_summarize(text):
    """Use Groq AI (llama-3.3-70b) for clear, adaptive email summarization."""
    global groq_client

    if not groq_client:
        if not init_groq():
            return None

    try:
        prompt = (
            "You are an intelligent email assistant. "
            "Summarize the email below in clear, easy-to-understand bullet points. "
            "Use as many or as few bullet points as needed to cover everything important — "
            "let the content decide the length, not a word limit. "
            "Focus on: key actions, deadlines, dates, decisions, requests, and any important information. "
            "Write in simple, plain language that anyone can quickly understand. "
            "No greetings, no sign-offs, no filler phrases. "
            "Use a bullet character (•) at the start of each point.\n\n"
            f"Email:\n{text[:4000]}"
        )

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert email summarizer. "
                        "Your goal is clarity and completeness. "
                        "Write summaries that are easy to read and cover all important points. "
                        "Do not truncate important information. Be natural and clear."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=512,
            top_p=0.9,
        )

        result = response.choices[0].message.content.strip()
        result = result.replace('**', '').replace('```', '')
        if len(result) > 10:
            print(f"[OK] Groq summarized successfully ({len(result)} chars)")
            return result

        return None
    except Exception as e:
        print(f"[ERROR] Groq Summarizer error: {e}")
        return None


# ---------- Fallback Extractive Summarizer ----------
def extractive_summarize(text):
    """Smart extractive summary using sentence scoring."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]

    if len(sentences) <= 2:
        return text[:300]

    from collections import Counter
    words = re.findall(r'\w+', text.lower())
    stopwords = {'the','a','an','is','are','was','were','be','been','being','have','has','had',
                 'do','does','did','will','would','could','should','may','might','shall','can',
                 'to','of','in','for','on','with','at','by','from','as','into','through','during',
                 'before','after','above','below','between','out','off','over','under','again',
                 'further','then','once','here','there','when','where','why','how','all','each',
                 'every','both','few','more','most','other','some','such','no','nor','not','only',
                 'own','same','so','than','too','very','just','because','but','and','or','if',
                 'this','that','these','those','i','me','my','we','our','you','your','he','him',
                 'his','she','her','it','its','they','them','their','what','which','who','whom'}
    filtered = [w for w in words if w not in stopwords and len(w) > 2]
    freq = Counter(filtered)

    scored = []
    for sent in sentences:
        sent_words = re.findall(r'\w+', sent.lower())
        score = sum(freq.get(w, 0) for w in sent_words if w not in stopwords)
        # Bonus for sentences with dates, times, locations
        if re.search(r'\d{1,2}[:/]\d{2}|\d{1,2}\s*(am|pm|AM|PM)', sent):
            score *= 1.5
        if re.search(r'(deadline|due|submit|exam|assignment|tomorrow|today|urgent)', sent, re.I):
            score *= 1.3
        scored.append((score, sent))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_sents = [s[1] for s in scored[:3]]
    ordered = [s for s in sentences if s in top_sents]
    return ' '.join(ordered)[:400]



# ===== AI Chat Endpoint =====
@app.route('/chat', methods=['POST'])
def chat():
    """
    Body: { "messages": [{"role": "user"|"assistant", "content": "..."}] }
    Returns: { "reply": "..." }
    """
    try:
        data = request.json
        if not data or 'messages' not in data:
            return jsonify({"error": "No messages provided"}), 400

        history = data['messages']
        if not isinstance(history, list) or not history:
            return jsonify({"error": "messages must be a non-empty list"}), 400

        system_prompt = (
            "You are NeuroDesk AI, a smart, friendly productivity assistant built into "
            "the NeuroDesk Chrome extension. You help users with:\n"
            "  • Email management and spam awareness\n"
            "  • Summarizing and understanding emails\n"
            "  • Sticky notes, to-do lists, and checklists\n"
            "  • Time management, Pomodoro technique, and focus strategies\n"
            "  • General productivity tips and lifestyle advice\n"
            "  • Answering general knowledge questions\n\n"
            "Guidelines:\n"
            "  - Be concise, warm, and practical — get to the point quickly.\n"
            "  - Use bullet points and short paragraphs for readability.\n"
            "  - If the user asks something technical, explain it in simple terms.\n"
            "  - Never mention being an AI built by Groq/Meta — you are NeuroDesk AI.\n"
            "  - If unsure, be honest and suggest what the user could do next."
        )

        messages_payload = [{"role": "system", "content": system_prompt}] + history[-20:]

        global groq_client
        if not groq_client:
            if not init_groq():
                return jsonify({"reply": "⚠️ AI chat is temporarily unavailable. Please ensure the backend is running and the Groq API key is valid."}), 200

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_payload,
            temperature=0.65,
            max_tokens=700,
            top_p=0.9,
        )
        reply = response.choices[0].message.content.strip()
        return jsonify({"reply": reply})

    except Exception as e:
        print(f"[ERROR] /chat endpoint: {e}")
        return jsonify({"reply": f"⚠️ Sorry, something went wrong: {str(e)}"}), 200


if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  NeuroDesk AI -- Backend")
    print("=" * 50)
    print(f"  Spam Model  : [OK] Loaded")
    print(f"  Groq AI     : {'[OK] Ready' if groq_client else '[WARN] Unavailable'}")
    print(f"  Server      : http://127.0.0.1:5000")
    print("=" * 50)
    print("")
    app.run(debug=True, port=5000)
