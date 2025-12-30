# Setup Instructions - Do This Now

## Step 1: Create Firebase Project (2 minutes)

1. Go to https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `resume-tailor` (or your choice)
4. Click **Continue**
5. **Disable Google Analytics** (optional, click "Not now")
6. Click **Create project**
7. Wait for project creation (30 seconds)
8. Click **Continue**

## Step 2: Enable Required Services

### Enable Firestore:
1. In Firebase Console, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** (for development)
4. Choose location: **us-central1** (or closest to you)
5. Click **"Enable"**

### Enable Authentication:
1. Click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Anonymous"**
5. Toggle **"Enable"**
6. Click **"Save"**

## Step 3: Run Setup Script

Once the project is created, run:

```bash
cd /Users/toddk.edwards/ResumeTailor
./QUICK_SETUP.sh
```

When prompted, enter your **Firebase Project ID** (you'll see it in the Firebase Console URL or project settings).

**OR** run these commands manually:

```bash
cd /Users/toddk.edwards/ResumeTailor

# Link your project (replace PROJECT_ID with your actual project ID)
firebase use YOUR_PROJECT_ID

# Set configuration
firebase functions:config:set \
  gemini.api_key="AIzaSyBb90cSNK4OMnhM3FTsplGVmbmkr1T7HUU" \
  app.id="resume-tailor-v1"

# Deploy functions
firebase deploy --only functions
```

## Step 4: Get Firebase Config

1. Go to Firebase Console → **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click the **`</>`** (Web) icon
4. Copy the `firebaseConfig` object
5. Update `ResumeTailor.jsx` or `index.html`:
   - Find `FIREBASE_CONFIG`
   - Replace with your actual config

## Step 5: Set Firestore Rules

1. Copy content from `firestore.rules`
2. Go to Firebase Console → **Firestore Database** → **Rules**
3. Paste the rules
4. Click **"Publish"**

## Step 6: Test!

1. Open `index.html` in your browser
2. Should auto-sign-in anonymously
3. Click "Buy 5 Credits" to add credits
4. Enter job description and resume section
5. Click "Generate Tailored Resume"
6. 🎉 It should work!

---

**Need Help?** Check `README.md` for detailed troubleshooting.

