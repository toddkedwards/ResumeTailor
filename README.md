# AI Resume Tailor

A high-value, paid utility web application that optimizes resume content for ATS (Applicant Tracking System) keyword alignment using Google's Gemini AI. The app uses a **pay-per-generation credit system** managed through Firebase Firestore.

## 🚀 Features

- ✅ **ATS-Optimized Resume Tailoring**: Rewrites resume sections to match job description keywords
- ✅ **Credit-Based Monetization**: Pay-per-generation system (1 credit = 1 generation)
- ✅ **Real-Time Credit Balance**: Live updates via Firestore `onSnapshot` listener
- ✅ **Anonymous Authentication**: Seamless user experience with Firebase Auth
- ✅ **Secure API Access**: Gemini API calls through Firebase Functions proxy
- ✅ **Modern UI**: Built with React and Tailwind CSS

## 📋 Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v20 or higher) installed
2. **Firebase CLI** installed (`npm install -g firebase-tools`)
3. **Google Account** for Gemini API access
4. **Firebase Account** (free tier works)

## 🛠️ Setup Instructions

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `resume-tailor` (or your preferred name)
4. Follow the setup wizard:
   - Disable Google Analytics (optional)
   - Click **"Create project"**
5. Wait for project creation to complete

### Step 2: Enable Firebase Services

#### 2.1 Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Start in **test mode** (for development)
4. Choose a location (e.g., `us-central1`)
5. Click **"Enable"**

#### 2.2 Enable Authentication

1. Go to **Build** → **Authentication**
2. Click **"Get started"**
3. Go to **Sign-in method** tab
4. Enable **Anonymous** authentication:
   - Click on **Anonymous**
   - Toggle **Enable**
   - Click **"Save"**

### Step 3: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select your Google Cloud project (or create a new one)
5. Copy the API key (starts with `AIza...`)
6. **Important**: Save this key securely - you'll need it in Step 5

### Step 4: Initialize Firebase Functions

1. Open terminal in the `ResumeTailor` directory
2. Run:
   ```bash
   cd functions
   npm install
   ```
3. Initialize Firebase (if not already done):
   ```bash
   cd ..
   firebase login
   firebase init
   ```
   - Select:
     - ✅ **Functions**
     - ✅ **Firestore** (for security rules)
   - Use existing project: Select your `resume-tailor` project
   - Language: **JavaScript**
   - ESLint: **No** (or Yes if you prefer)
   - Install dependencies: **Yes**

### Step 5: Configure Firebase Functions

Set the Gemini API key and app ID:

```bash
firebase functions:config:set \
  gemini.api_key="YOUR_GEMINI_API_KEY_HERE" \
  app.id="resume-tailor-v1"
```

**Replace `YOUR_GEMINI_API_KEY_HERE`** with the API key from Step 3.

### Step 6: Deploy Firebase Functions

```bash
firebase deploy --only functions
```

Wait for deployment to complete. Note the function URL (you'll see it in the output).

### Step 7: Update Frontend Configuration

1. Open `ResumeTailor.jsx`
2. Replace the `FIREBASE_CONFIG` object with your Firebase project config:

   **Get your config:**
   - Go to Firebase Console → Project Settings (gear icon)
   - Scroll to **"Your apps"** section
   - Click **"</>"** (Web) icon
   - Copy the `firebaseConfig` object

   **Update in ResumeTailor.jsx:**
   ```javascript
   const FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. Update `APP_ID` if you changed it:
   ```javascript
   const APP_ID = 'resume-tailor-v1';
   ```

### Step 8: Set Up Firestore Security Rules

1. Go to Firebase Console → **Firestore Database** → **Rules**
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profile data (credits)
    match /artifacts/{appId}/users/{userId}/profile/data {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow users to read/write their own data
    match /artifacts/{appId}/users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **"Publish"**

### Step 9: Install Dependencies and Run

If you're using a React build setup:

```bash
# Install React dependencies (if using Create React App or Vite)
npm install firebase

# Or if using the component directly, ensure you have:
# - React
# - ReactDOM
# - Firebase SDK
```

For a simple HTML setup, you can use CDN links (see `index.html` example below).

## 📁 Project Structure

```
ResumeTailor/
├── ResumeTailor.jsx          # Main React component
├── functions/
│   ├── index.js              # Firebase Functions (Gemini proxy)
│   └── package.json          # Functions dependencies
├── README.md                 # This file
└── firebase.json             # Firebase configuration (auto-generated)
```

## 🎯 Usage

1. **Start the app** (using your React setup or HTML file)
2. The app will automatically sign in anonymously
3. Your credit balance will display (starts at 0)
4. Click **"Buy 5 Credits ($2.00)"** to add credits (simulated purchase)
5. Paste a **Job Description** in the first text area
6. Paste your **Current Resume Section** in the second text area
7. Click **"Generate Tailored Resume"**
8. The tailored content will appear in the output panel
9. Click **"Copy Tailored Text"** to copy to clipboard

## 💳 Credit System

- **Cost per generation**: 1 credit
- **Purchase bundle**: 5 credits for $2.00 (simulated)
- **Credit storage**: Firestore path: `/artifacts/{appId}/users/{userId}/profile/data/credits_balance`
- **Real-time updates**: Credit balance updates instantly via `onSnapshot`

## 🔒 Security Notes

- ✅ Gemini API key is stored server-side (Firebase Functions)
- ✅ Anonymous authentication for user tracking
- ✅ Firestore security rules prevent unauthorized access
- ✅ Credits are deducted **before** API call (prevents abuse)

## 🧪 Testing

1. **Test credit purchase**:
   - Click "Buy 5 Credits"
   - Verify balance updates to 5

2. **Test generation**:
   - Enter job description and resume section
   - Click "Generate Tailored Resume"
   - Verify credits decrease by 1
   - Verify tailored text appears

3. **Test insufficient credits**:
   - Set credits to 0
   - Try to generate
   - Should show error message

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)

```bash
firebase init hosting
# Select: Use existing project, public directory: "public" (or create it)
# Single-page app: Yes

# Create public/index.html that loads your React app
# Or build your React app and deploy the build folder

firebase deploy --only hosting
```

### Option 2: Your Own Hosting

1. Build your React app
2. Upload the build files to your hosting
3. Ensure Firebase config is correct
4. Deploy Firebase Functions separately

## 📝 Configuration Reference

### Firebase Functions Config

```bash
# View current config
firebase functions:config:get

# Set config values
firebase functions:config:set \
  gemini.api_key="YOUR_KEY" \
  app.id="resume-tailor-v1"

# Deploy after config changes
firebase deploy --only functions
```

### Firestore Path Structure

```
artifacts/
  └── {appId}/           # e.g., "resume-tailor-v1"
      └── users/
          └── {userId}/  # Firebase Auth UID
              └── profile/
                  └── data/
                      ├── credits_balance: number
                      ├── created_at: timestamp
                      └── updated_at: timestamp
```

## 🐛 Troubleshooting

### "Failed to initialize"
- Check Firebase config in `ResumeTailor.jsx`
- Verify Anonymous auth is enabled
- Check browser console for errors

### "Gemini API is not configured"
- Run: `firebase functions:config:set gemini.api_key="YOUR_KEY"`
- Redeploy: `firebase deploy --only functions`

### "Insufficient credits" but balance shows credits
- Check Firestore rules allow writes
- Verify user is authenticated
- Check browser console for Firestore errors

### Credits not updating in real-time
- Verify `onSnapshot` is set up correctly
- Check Firestore rules allow reads
- Check browser console for listener errors

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Functions](https://firebase.google.com/docs/functions)

## 📄 License

This project is proprietary. All rights reserved.

---

**Need Help?** Check the troubleshooting section or review Firebase/Firestore logs in the Firebase Console.

