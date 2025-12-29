# Quick Setup Guide - AI Resume Tailor

This is a condensed setup guide. For detailed instructions, see [README.md](./README.md).

## 🚀 Quick Start (5 Steps)

### 1. Create Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create new project: `resume-tailor`
- Enable **Firestore** (test mode)
- Enable **Authentication** → **Anonymous**

### 2. Get Gemini API Key
- Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
- Click **"Create API Key"**
- Copy the key (starts with `AIza...`)

### 3. Install & Configure Functions
```bash
cd functions
npm install
cd ..
firebase login
firebase init
# Select: Functions, Firestore
# Use existing project: resume-tailor
```

### 4. Set Config & Deploy
```bash
firebase functions:config:set \
  gemini.api_key="YOUR_GEMINI_API_KEY" \
  app.id="resume-tailor-v1"

firebase deploy --only functions
```

### 5. Update Frontend
- Open `ResumeTailor.jsx`
- Replace `FIREBASE_CONFIG` with your Firebase config
- Get config from: Firebase Console → Project Settings → Your apps → Web

## ✅ Verify Setup

1. **Check Functions Deployed**:
   ```bash
   firebase functions:list
   ```
   Should show: `tailorResume`

2. **Check Config**:
   ```bash
   firebase functions:config:get
   ```
   Should show: `gemini.api_key` and `app.id`

3. **Test in Browser**:
   - Load your React app
   - Should auto-sign-in anonymously
   - Credit balance should show 0
   - Click "Buy 5 Credits" → balance should update

## 🔧 Common Issues

**"Gemini API is not configured"**
→ Run: `firebase functions:config:set gemini.api_key="YOUR_KEY"` and redeploy

**"Failed to initialize"**
→ Check Firebase config in `ResumeTailor.jsx` matches your project

**Credits not updating**
→ Check Firestore rules are published (Firebase Console → Firestore → Rules)

## 📚 Next Steps

- See [README.md](./README.md) for full documentation
- Test the credit purchase flow
- Test resume generation
- Deploy to production when ready

