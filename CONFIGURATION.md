# Configuration Guide

## 🔐 Secure Configuration Steps

### 1. Set Gemini API Key (Server-Side Only)

**IMPORTANT**: The API key will be stored securely in Firebase Functions config, NOT in code.

Run this command in your terminal:

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

**Verify it was set correctly:**
```bash
firebase functions:config:get
```

You should see:
```json
{
  "gemini": {
    "api_key": "YOUR_GEMINI_API_KEY"
  }
}
```

### 2. Set App ID (Optional)

The app ID defaults to 'resumeforge-v1', but you can set it explicitly:

```bash
firebase functions:config:set app.id="resumeforge-v1"
```

### 3. Stripe Configuration (Test Mode)

Your Stripe keys are already in the code (test mode). To configure the server-side secret key:

```bash
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
firebase functions:config:set stripe.price_id="price_1SdFMgKfMIBsUfylWTwUr3eO"
```

**To get your Stripe secret key:**
1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the "Secret key" (starts with `sk_test_`)
3. Use it in the command above

**For Stripe Webhook (after deployment):**
1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://YOUR_REGION-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
3. Select event: `checkout.session.completed`
4. Copy the webhook signing secret (starts with `whsec_`)
5. Set it: `firebase functions:config:set stripe.webhook_secret="whsec_..."`

### 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Deploy Firebase Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## 🧪 Local Testing

### Option 1: Firebase Emulators (Recommended for Testing)

1. **Install emulators** (if not already installed):
   ```bash
   firebase init emulators
   # Select: Functions, Firestore, Authentication
   ```

2. **Start emulators**:
   ```bash
   firebase emulators:start
   ```

3. **Set local config** (for emulators):
   ```bash
   firebase functions:config:get > .runtimeconfig.json
   # Edit .runtimeconfig.json to add your config
   ```

4. **Test locally**:
   - Functions will run on: http://localhost:5001
   - Firestore on: http://localhost:8080
   - Auth on: http://localhost:9099

### Option 2: Test with Live Firebase (Limited)

1. **Deploy functions first**:
   ```bash
   firebase deploy --only functions
   ```

2. **Open index.html in browser** or use a local server:
   ```bash
   python -m http.server 8000
   # Then open http://localhost:8000
   ```

## ✅ Verification Checklist

After configuration, verify:

- [ ] Gemini API key is set: `firebase functions:config:get | grep gemini`
- [ ] Functions deployed: Check Firebase Console > Functions
- [ ] Firestore rules deployed: Check Firebase Console > Firestore > Rules
- [ ] Can sign up/sign in: Test authentication
- [ ] Can tailor resume: Test the main feature
- [ ] Improvement tips appear: Verify new features work
- [ ] Comparison view works: Test show/hide comparison
- [ ] Changes tracking works: Verify changes summary

## 🔒 Security Notes

- ✅ Gemini API key is stored server-side (secure)
- ✅ Stripe secret key will be stored server-side (secure)
- ⚠️ Firebase API keys in index.html are public (this is normal and safe)
- ⚠️ Stripe publishable key in index.html is public (this is normal and safe)
- ✅ All sensitive operations happen server-side

## 🐛 Troubleshooting

### Functions not working?
- Check logs: `firebase functions:log`
- Verify config: `firebase functions:config:get`
- Redeploy: `firebase deploy --only functions`

### Authentication errors?
- Enable Email/Password in Firebase Console > Authentication > Sign-in method
- Check Firestore rules are deployed

### Gemini API errors?
- Verify API key is correct: `firebase functions:config:get`
- Check API key has quota remaining
- Check logs for detailed error: `firebase functions:log`

### Stripe errors?
- Verify you're using test mode keys
- Check Stripe dashboard for test mode
- Verify webhook is configured (after deployment)
