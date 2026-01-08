# ResumeForge - AI-Powered Resume Tailoring

ResumeForge is a Progressive Web App (PWA) that uses AI to tailor your resume sections to match job descriptions. It provides keyword matching analysis, improvement recommendations, and visual comparison tools to optimize your resume for ATS (Applicant Tracking System) compatibility.

## Features

- 🤖 **AI-Powered Resume Tailoring** - Uses Google Gemini 2.5 Flash to tailor resume sections to job descriptions
- 📊 **Keyword Analysis** - Identifies matched and missing keywords with match percentage scores
- 💡 **Improvement Tips** - Provides actionable recommendations categorized by priority (high/medium/low)
- 🔍 **Visual Comparison** - Side-by-side comparison of original vs tailored resume with highlighted changes
- 📝 **Changes Tracking** - Shows what was added, modified, and improved in your resume
- 💾 **Save & Manage** - Save tailored resumes to your account for easy access
- 💳 **Credit-Based System** - Pay-per-use model ($0.50 per generation) with free trial for new users
- 📱 **Progressive Web App** - Works offline and can be installed on mobile devices

## Tech Stack

- **Frontend**: React (via Babel Standalone), Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Cloud Functions)
- **AI**: Google Gemini 2.5 Flash API
- **Payments**: Stripe Checkout
- **Hosting**: Firebase Hosting

## Prerequisites

- Node.js 20+ (for Firebase Functions)
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase project with:
  - Authentication enabled (Email/Password)
  - Firestore database
  - Cloud Functions enabled
  - Hosting configured
- Google Cloud account with Gemini API access
- Stripe account (for payments)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd ResumeTailor
cd functions
npm install
```

### 2. Firebase Configuration

1. **Create/Select Firebase Project**
   ```bash
   firebase login
   firebase use resume-tailor  # or your project ID
   ```

2. **Update Firebase Config in `index.html`**
   - Open `index.html`
   - Find `FIREBASE_CONFIG` (around line 225)
   - Replace with your Firebase project configuration:
     ```javascript
     const FIREBASE_CONFIG = {
         apiKey: "YOUR_API_KEY",
         authDomain: "YOUR_PROJECT.firebaseapp.com",
         projectId: "YOUR_PROJECT_ID",
         storageBucket: "YOUR_PROJECT.appspot.com",
         messagingSenderId: "YOUR_SENDER_ID",
         appId: "YOUR_APP_ID",
         measurementId: "YOUR_MEASUREMENT_ID"
     };
     ```

3. **Update APP_ID** (around line 213)
   ```javascript
   const APP_ID = 'resumeforge-v1'; // Keep or change as needed
   ```

### 3. Stripe Configuration

1. **Get Stripe Keys**
   - Log into Stripe Dashboard
   - Get your Publishable Key (starts with `pk_`)
   - Create a Product and Price ($0.50) and get the Price ID (starts with `price_`)

2. **Update Stripe Config in `index.html`** (around line 238)
   ```javascript
   const STRIPE_PUBLISHABLE_KEY = 'pk_test_...'; // Your Stripe publishable key
   const STRIPE_PRICE_ID = 'price_...'; // Your $0.50 price ID
   ```

3. **Configure Stripe in Firebase Functions**
   ```bash
   firebase functions:config:set stripe.secret_key="sk_test_..." stripe.price_id="price_..." stripe.webhook_secret="whsec_..."
   ```

### 4. Gemini API Configuration

1. **Get Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key for Gemini 2.5 Flash

2. **Set in Firebase Functions**
   ```bash
   firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
   ```

3. **Set App ID (optional, defaults to 'resumeforge-v1')**
   ```bash
   firebase functions:config:set app.id="resumeforge-v1"
   ```

### 5. Firestore Security Rules

Create or update `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /artifacts/{appId}/users/{userId} {
      // Users can only read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Saved resumes subcollection
      match /saved_resumes/{resumeId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

### 6. Deploy Firebase Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### 7. Deploy Frontend

```bash
firebase deploy --only hosting
```

## Development

### Local Development

1. **Start Firebase Emulators** (optional)
   ```bash
   firebase emulators:start
   ```

2. **Serve Functions Locally**
   ```bash
   cd functions
   npm run serve
   ```

3. **Test Locally**
   - Open `index.html` in a browser
   - Or use a local server:
     ```bash
     python -m http.server 8000
     # or
     npx serve .
     ```

### Firebase Functions Scripts

```bash
cd functions

# Run emulator
npm run serve

# Deploy functions
npm run deploy

# View logs
npm run logs
```

## Project Structure

```
ResumeTailor/
├── index.html              # Main application file (React app)
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker for offline support
├── firebase.json           # Firebase configuration
├── functions/
│   ├── index.js           # Cloud Functions (Stripe, Gemini API)
│   ├── package.json       # Functions dependencies
│   └── node_modules/      # Installed dependencies
└── README.md              # This file
```

## API Endpoints (Cloud Functions)

### `generateTailoredResume`
Generates a tailored resume section based on job description.

**Parameters:**
- `jobDescription` (string, required): The job description
- `resumeSection` (string, required): Current resume section to tailor
- `sectionType` (string, optional): Type of section (general, experience, education, skills, summary)

**Returns:**
```json
{
  "success": true,
  "tailoredResume": "Tailored resume text...",
  "keywordMatches": {
    "matched": ["keyword1", "keyword2"],
    "missing": ["keyword3", "keyword4"],
    "matchPercentage": 75
  },
  "improvementTips": [
    {
      "tip": "Improvement suggestion",
      "category": "ats|achievements|skills|formatting",
      "priority": "high|medium|low"
    }
  ],
  "changes": {
    "added": ["Added phrases"],
    "modified": ["Modified sections"],
    "improvements": ["Key improvements"]
  }
}
```

### `createCheckoutSession`
Creates a Stripe Checkout session for purchasing credits.

**Returns:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

### `stripeWebhook`
Handles Stripe webhook events (payment success, subscription updates).

## Usage

1. **Sign Up/Sign In**: Create an account or sign in with email/password
2. **Enter Job Description**: Paste the full job description
3. **Enter Resume Section**: Paste the section you want to tailor
4. **Select Section Type**: Choose the type (Experience, Education, Skills, etc.)
5. **Tailor Resume**: Click "Tailor Resume" button
6. **Review Results**:
   - View keyword match analysis
   - See tailored resume with highlighted changes
   - Read improvement tips
   - Compare original vs tailored (toggle comparison view)
7. **Save or Copy**: Save to your account or copy to clipboard

## Pricing

- **Free**: 1 free generation for new users
- **Paid**: $0.50 per generation (purchased via Stripe)

## Environment Variables (Firebase Functions Config)

Required Firebase Functions configuration:

```bash
# Gemini API
firebase functions:config:set gemini.api_key="YOUR_KEY"

# Stripe
firebase functions:config:set stripe.secret_key="sk_..."
firebase functions:config:set stripe.price_id="price_..."
firebase functions:config:set stripe.webhook_secret="whsec_..."

# App ID (optional)
firebase functions:config:set app.id="resumeforge-v1"
```

View current config:
```bash
firebase functions:config:get
```

## Troubleshooting

### Functions Not Working
- Verify Firebase Functions are deployed: `firebase deploy --only functions`
- Check logs: `firebase functions:log`
- Verify API keys are set: `firebase functions:config:get`

### Authentication Issues
- Ensure Firebase Authentication is enabled in Firebase Console
- Check that Email/Password provider is enabled

### Stripe Payments Not Working
- Verify Stripe keys are correct (test vs production)
- Check Stripe webhook is configured and pointing to your function URL
- Verify webhook secret matches in Firebase config

### Gemini API Errors
- Check API key is valid and has quota remaining
- Verify the API key has access to Gemini 2.5 Flash
- Check Firebase Functions logs for detailed error messages

### Firestore Permission Errors
- Deploy security rules: `firebase deploy --only firestore:rules`
- Verify user is authenticated before accessing Firestore
- Check rules match the collection structure

## Security Notes

- Firebase API keys are safe to expose in client-side code (they're meant to be public)
- Sensitive keys (Stripe secret, Gemini API key) are stored server-side in Firebase Functions config
- Always use Firestore security rules to protect user data
- Consider implementing Firebase App Check for additional protection

## License

[Add your license here]

## Support

For issues or questions, please [create an issue](link-to-issues) or contact [your-email].

## Changelog

### v1.0.0
- Initial release
- AI-powered resume tailoring
- Keyword matching analysis
- Improvement tips and recommendations
- Visual comparison view
- Changes tracking
- Save and manage resumes
- Stripe payment integration
