"""
train_model.py — AI Gmail Spam Detector (Multi-Dataset Edition)
================================================================
Merges all 12 heterogeneous datasets from the 'datasets spam' folder,
cleans and deduplicates them, then trains a high-accuracy
Logistic Regression model with an optimised TF-IDF pipeline.
Called automatically by app.py during active-learning retraining.
"""

import os
import re
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from sklearn.naive_bayes import MultinomialNB

# ─────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DATASETS_DIR = os.path.join(BASE_DIR, '..', 'datasets spam')
MODEL_PATH   = os.path.join(BASE_DIR, 'spam_model.pkl')
VEC_PATH     = os.path.join(BASE_DIR, 'vectorizer.pkl')
SPAM_CSV     = os.path.join(BASE_DIR, 'spam.csv')   # active-learning feedback file

# ─────────────────────────────────────────────────────────
# Dataset descriptors
# (file, label_col, text_cols, label_map)
# label_map: None = already 0/1 int; dict = string→int mapping
# ─────────────────────────────────────────────────────────
DATASETS = [
    # file name              label col    text cols                  label map
    ('CEAS_08.csv',         'label',     ['subject', 'body'],       None),
    ('Enron.csv',           'label',     ['subject', 'body'],       None),
    ('Ling.csv',            'label',     ['subject', 'body'],       None),
    ('Nazario.csv',         'label',     ['subject', 'body'],       None),
    ('Nigerian_Fraud.csv',  'label',     ['subject', 'body'],       None),
    ('SpamAssasin.csv',     'label',     ['subject', 'body'],       None),
    ('datamail.csv',        'label',     ['text'],                  None),
    ('enron_spam_data.csv', 'Spam/Ham',  ['Subject', 'Message'],   {'ham': 0, 'spam': 1}),
    ('mail_data.csv',       'Category',  ['Message'],               {'ham': 0, 'spam': 1}),
    ('mailss.csv',          'spam',      ['text'],                  None),
    ('messages.csv',        'label',     ['subject', 'message'],    None),
    ('phishing_email.csv',  'label',     ['text_combined'],         None),
]


def clean_text(text: str) -> str:
    """Lowercase, strip URLs, emails, punctuation & excess whitespace."""
    if not isinstance(text, str):
        return ''
    text = text.lower()
    text = re.sub(r'http\S+|www\.\S+', ' url ', text)
    text = re.sub(r'\S+@\S+', ' email ', text)
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def load_dataset(fname, label_col, text_cols, label_map, datasets_dir):
    path = os.path.join(datasets_dir, fname)
    if not os.path.exists(path):
        print(f"  [SKIP] Not found: {fname}")
        return None

    needed_cols = [label_col] + text_cols
    try:
        df = pd.read_csv(path, encoding='utf-8', on_bad_lines='skip',
                         usecols=needed_cols, low_memory=False)
    except Exception:
        try:
            df = pd.read_csv(path, encoding='latin-1', on_bad_lines='skip',
                             usecols=needed_cols, low_memory=False)
        except Exception as e:
            print(f"  [ERROR] Could not read {fname}: {e}")
            return None

    # Build combined text column
    df['message'] = df[text_cols].fillna('').astype(str).agg(' '.join, axis=1)

    # Normalise label
    if label_map:
        df['label'] = df[label_col].astype(str).str.lower().str.strip().map(label_map)
    else:
        df['label'] = pd.to_numeric(df[label_col], errors='coerce')

    df = df[['label', 'message']].dropna(subset=['label'])
    df['label'] = df['label'].astype(int)

    # Keep only binary labels
    df = df[df['label'].isin([0, 1])]
    return df


def load_feedback_csv(csv_path):
    """Load the active-learning feedback appended to spam.csv."""
    if not os.path.exists(csv_path):
        return None
    try:
        df = pd.read_csv(csv_path, header=None,
                         names=['label_str', 'message'],
                         encoding='utf-8', on_bad_lines='skip')
        df['label'] = df['label_str'].astype(str).str.lower().str.strip().map(
            {'ham': 0, 'spam': 1}
        )
        df = df[['label', 'message']].dropna()
        df['label'] = df['label'].astype(int)
        print(f"  [OK] Feedback data: {len(df):,} rows from spam.csv")
        return df
    except Exception as e:
        print(f"  [WARN] Could not read feedback csv: {e}")
        return None


def train():
    print()
    print("=" * 60)
    print("  AI Spam Detector — Multi-Dataset Training Pipeline")
    print("=" * 60)

    # ── 1. Load & merge all datasets ──────────────────────────
    print("\n[1/5] Loading datasets...")
    frames = []
    for fname, label_col, text_cols, label_map in DATASETS:
        df = load_dataset(fname, label_col, text_cols, label_map, DATASETS_DIR)
        if df is not None and len(df) > 0:
            spam_count = df['label'].sum()
            ham_count  = len(df) - spam_count
            print(f"  [OK] {fname:<26}  {len(df):>8,} rows  "
                  f"(spam={spam_count:,}, ham={ham_count:,})")
            frames.append(df)
        else:
            print(f"  [SKIP] {fname} — empty or failed.")

    # Active-learning feedback (high weight — repeated 50× per entry in app.py)
    feedback_df = load_feedback_csv(SPAM_CSV)
    if feedback_df is not None and len(feedback_df) > 0:
        frames.append(feedback_df)

    if not frames:
        raise RuntimeError("No datasets could be loaded. Aborting.")

    master = pd.concat(frames, ignore_index=True)
    print(f"\n  Combined raw rows : {len(master):,}")

    # ── 2. Clean & deduplicate ────────────────────────────────
    print("\n[2/5] Cleaning & deduplicating...")
    master['message'] = master['message'].apply(clean_text)
    master = master[master['message'].str.len() > 10]   # drop near-empty
    master.drop_duplicates(subset=['message'], inplace=True)
    master.reset_index(drop=True, inplace=True)

    spam_total = master['label'].sum()
    ham_total  = len(master) - spam_total
    print(f"  Rows after cleaning : {len(master):,}")
    print(f"  Spam : {spam_total:,}  |  Ham : {ham_total:,}")

    # ── 3. TF-IDF Vectorisation ───────────────────────────────
    print("\n[3/5] Vectorising with TF-IDF...")
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,      # log(1+tf) — dampen high-freq terms
        max_df=0.85,            # ignore tokens appearing in >85% of docs
        min_df=3,               # ignore extremely rare tokens
        ngram_range=(1, 2),     # unigrams + bigrams
        max_features=150_000,   # vocabulary cap
        strip_accents='unicode',
        analyzer='word',
        stop_words='english',
    )
    X = vectorizer.fit_transform(master['message'])
    y = master['label'].values

    # ── 4. Train / Test Split ─────────────────────────────────
    print("\n[4/5] Training model...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"  Train: {X_train.shape[0]:,}  |  Test: {X_test.shape[0]:,}")

    # ── Logistic Regression (best F1 on large heterogeneous data)
    model = LogisticRegression(
        C=5.0,
        solver='saga',
        max_iter=1000,
        class_weight='balanced',   # handles any class imbalance
        n_jobs=-1,
        random_state=42
    )
    model.fit(X_train, y_train)

    # ── 5. Evaluate ───────────────────────────────────────────
    print("\n[5/5] Evaluating...")
    y_pred = model.predict(X_test)
    acc    = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=['Ham', 'Spam'])

    print(f"\n  Overall Accuracy : {acc * 100:.2f}%")
    print("\n" + report)

    # ── Save artefacts ────────────────────────────────────────
    pickle.dump(model,      open(MODEL_PATH, 'wb'))
    pickle.dump(vectorizer, open(VEC_PATH,   'wb'))

    print("=" * 60)
    print(f"  Model saved   -> {MODEL_PATH}")
    print(f"  Vectorizer    -> {VEC_PATH}")
    print("=" * 60)
    print()


if __name__ == '__main__':
    train()
