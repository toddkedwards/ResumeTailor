# Local Testing Guide

## ✅ Configuration Status

**Current Configuration:**
- ✅ Gemini API Key: Configured (server-side)
- ✅ Stripe: Configured (test mode)
- ✅ Firestore Rules: Deployed
- ✅ App ID: Set to `resume-tailor-v1` (in Firebase config)

**Note:** The code uses `resumeforge-v1` but Firebase config has `resume-tailor-v1`. Both will work, but for consistency, you may want to update one to match the other.

## 🧪 Testing Options

### Option 1: Test with Live Firebase (Easiest)

This uses your live Firebase project but is safe for testing.

1. **Deploy Functions First:**
   ```bash
   cd functions
   npm install  # If not already done
   cd ..
   firebase deploy --only functions
   ```

2. **Open the App:**
   - Option A: Use Firebase Hosting (if deployed)
     ```bash
     firebase deploy --only hosting
     # Then visit: https://resume-tailor-f4f7c.web.app
     ```
   
   - Option B: Test locally with live Firebase
     ```bash
     # Use a simple HTTP server
     python -m http.server 8000
     # Or
     npx serve .
     # Then open: http://localhost:8000
     ```

3. **Test Flow:**
   - Open the app in your browser
   - Sign up with a test email
   - Try tailoring a resume section
   - Verify improvement tips appear
   - Test comparison view
   - Test save/copy/export functions

### Option 2: Firebase Emulators (Full Local Testing)

This runs everything locally without touching production.

1. **Initialize Emulators** (if not done):
   ```bash
   firebase init emulators
   # Select: Functions, Firestore, Authentication
   ```

2. **Create `.runtimeconfig.json` for local functions:**
   ```bash
   cd functions
   # Create .runtimeconfig.json with your config
   cat > .runtimeconfig.json << EOF
   {
     "gemini": {
       "api_key": "YOUR_GEMINI_API_KEY"
     },
     "app": {
       "id": "resume-tailor-v1"
     },
     "stripe": {
       "secret_key": "YOUR_STRIPE_SECRET_KEY",
       "price_id": "YOUR_STRIPE_PRICE_ID",
       "webhook_secret": "YOUR_STRIPE_WEBHOOK_SECRET"
     }
   }
   EOF
   cd ..
   ```

3. **Update `index.html` for emulator** (temporary):
   - Change Firebase config to point to emulators
   - Or use environment detection

4. **Start Emulators:**
   ```bash
   firebase emulators:start
   ```

5. **Access:**
   - Functions: http://localhost:5001
   - Firestore: http://localhost:8080
   - Auth: http://localhost:9099
   - UI: http://localhost:5000 (if hosting emulator enabled)

## 📋 Testing Checklist

### Basic Functionality
- [ ] **Sign Up**
  - Create account with email/password
  - Verify account created in Firebase Console
  
- [ ] **Sign In**
  - Sign in with created account
  - Verify authentication works

- [ ] **Tailor Resume**
  - Enter a job description (sample provided below)
  - Enter a resume section (sample provided below)
  - Select section type
  - Click "Tailor Resume"
  - Wait for generation (may take 10-30 seconds)

- [ ] **Verify Results**
  - ✅ Tailored resume appears
  - ✅ Keyword matches show (matched/missing/percentage)
  - ✅ Improvement tips appear (at least 3-5 tips)
  - ✅ Changes summary shows (added/modified/improvements)
  - ✅ Comparison view works (show/hide button)

- [ ] **Test Actions**
  - Copy resume to clipboard
  - Save resume (if signed in)
  - Export to PDF
  - Export to Word

- [ ] **View Saved Resumes**
  - Check "My Saved Resumes" section
  - Verify saved resume appears
  - Test delete functionality

### Sample Test Data

**Job Description:**
```
Software Engineer Position

We are seeking a skilled Software Engineer to join our team. The ideal candidate will have:
- 3+ years of experience in JavaScript and React
- Strong knowledge of Node.js and RESTful APIs
- Experience with cloud platforms (AWS, Azure, or GCP)
- Familiarity with CI/CD pipelines
- Excellent problem-solving skills
- Bachelor's degree in Computer Science or related field

Responsibilities:
- Develop and maintain web applications
- Collaborate with cross-functional teams
- Write clean, maintainable code
- Participate in code reviews
- Debug and fix production issues
```

**Resume Section (Experience):**
```
Software Developer | ABC Company | 2020-2023
- Built web applications using JavaScript
- Worked with databases
- Fixed bugs in the code
- Attended team meetings
```

**Expected Results:**
- Tailored resume should include keywords like "React", "Node.js", "RESTful APIs", "cloud platforms"
- Improvement tips should suggest adding specific technologies
- Keyword match should show missing keywords from job description
- Changes should highlight what was added/modified

## 🐛 Common Issues & Solutions

### "Firebase Functions not initialized"
- **Solution:** Make sure functions are deployed: `firebase deploy --only functions`
- Check browser console for errors

### "Gemini API error"
- **Solution:** Verify API key is set: `firebase functions:config:get`
- Check API key has quota remaining
- Check Firebase Functions logs: `firebase functions:log`

### "Permission denied" when saving
- **Solution:** Verify Firestore rules are deployed
- Check user is authenticated
- Verify rules allow user to write to their own collection

### Improvement tips not appearing
- **Solution:** Check that the backend prompt is working
- Verify Gemini API is returning the expected JSON structure
- Check browser console for parsing errors

### Comparison view not showing
- **Solution:** Make sure both `tailoredResume` and `resumeSection` have content
- Check that `showComparison` state is being toggled
- Verify no JavaScript errors in console

## 📊 Monitoring

### Check Firebase Console
- **Functions:** https://console.firebase.google.com/project/resume-tailor-f4f7c/functions
- **Firestore:** https://console.firebase.google.com/project/resume-tailor-f4f7c/firestore
- **Authentication:** https://console.firebase.google.com/project/resume-tailor-f4f7c/authentication

### View Logs
```bash
# Function logs
firebase functions:log

# Real-time logs
firebase functions:log --only generateTailoredResume
```

## ✅ Next Steps After Testing

Once local testing is successful:

1. **Deploy to Production:**
   ```bash
   firebase deploy
   ```

2. **Configure Stripe Webhook:**
   - Add webhook endpoint in Stripe Dashboard
   - Point to: `https://YOUR_REGION-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
   - Select event: `checkout.session.completed`

3. **Test Payment Flow:**
   - Use Stripe test cards
   - Verify credits are added after payment

4. **Monitor:**
   - Set up Firebase alerts
   - Monitor API usage
   - Track error rates
