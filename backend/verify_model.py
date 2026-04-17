import os, pickle

base    = r'd:\4th Sem\AI_RMS_chatbot\New folder\gmail_spam_detection\backend'
m_path  = os.path.join(base, 'spam_model.pkl')
v_path  = os.path.join(base, 'vectorizer.pkl')

print('spam_model.pkl:', os.path.exists(m_path), round(os.path.getsize(m_path)/1024/1024,2), 'MB')
print('vectorizer.pkl:', os.path.exists(v_path), round(os.path.getsize(v_path)/1024/1024,2), 'MB')

model = pickle.load(open(m_path, 'rb'))
vec   = pickle.load(open(v_path, 'rb'))
print('Model type:', type(model).__name__)

sample = 'Congratulations! You have won a free prize. Click here to claim now!'
test   = vec.transform([sample])
pred   = model.predict(test)[0]
conf   = max(model.predict_proba(test)[0]) * 100
label  = 'Spam' if pred == 1 else 'Ham'
print(f'Quick test => prediction={label}, confidence={conf:.1f}%')
