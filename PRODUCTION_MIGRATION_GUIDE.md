# Production Migration Guide: Test to Live

This guide walks you through migrating ResumeForge from test/staging to production with live Stripe and Firebase configuration.

---

## 📋 Pre-Migration Checklist

- [ ] Stripe live account created and verified
- [ ] Stripe live API keys obtained
- [ ] Firebase project configured for production
- [ ] Domain name configured (resumeforgeapp.com)
- [ ] SSL certificate verified
- [ ] Backup of current test configuration

---

## 🔑 Step 1: Stripe Configuration

### 1.1 Get Your Live Stripe Keys

1. **Log in to Stripe Dashboard**: https://dashboard.stripe.com/
2. **Switch to Live Mode**: Toggle the "Test mode" switch in the top right to "Live mode"
3. **Get Your Keys**:
   - Go to **Developers** → **API keys**
   - Copy your **Publishable key** (starts with `pk_live_...`)
   - Copy your **Secret key** (starts with `sk_live_...`) - **Keep this secret!**

### 1.2 Update Frontend (index.html)

**File**: `/Users/toddk.edwards/ResumeTailor/index.html`

**Find** (around line 298):
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RbOo8KfMIBsUfylIZIdikgVnL7C1Mfdj61d8AJj3splHLHAloyepn6y4Olte2QtGviWpBE8OuYqN6F20LKwLJQl00aZ5sdgj0';
```

**Replace with**:
```javascript
const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE';
```

### 1.3 Update Backend (Firebase Functions)

**File**: `/Users/toddk.edwards/ResumeTailor/functions/index.js`

The Stripe secret key is stored in Firebase Functions config. Update it using the Firebase CLI:

```bash
cd /Users/toddk.edwards/ResumeTailor
firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_SECRET_KEY_HERE"
```

**Important**: 
- Replace `YOUR_LIVE_SECRET_KEY_HERE` with your actual live secret key
- The key must be in quotes
- After setting, redeploy functions: `firebase deploy --only functions`

### 1.4 Configure Stripe Webhook (Live Mode)

1. **In Stripe Dashboard** (Live mode):
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - **Endpoint URL**: `https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
   - **Events to send**: Select these events:
     - `checkout.session.completed`
     - `payment_intent.succeeded` (optional, but recommended)
   - Click **Add endpoint**
   - Copy the **Signing secret** (starts with `whsec_...`)

2. **Update Webhook Secret in Firebase**:
```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET_HERE"
```

3. **Redeploy Functions**:
```bash
firebase deploy --only functions
```

---

## 🔥 Step 2: Firebase Configuration

### 2.1 Verify Firebase Project

1. **Check Current Project**:
```bash
firebase projects:list
firebase use resume-tailor-f4f7c  # or your production project ID
```

2. **Verify Firebase Hosting**:
```bash
firebase hosting:sites:list
```

### 2.2 Update Firebase Hosting (Custom Domain)

If using a custom domain (resumeforgeapp.com):

1. **In Firebase Console**:
   - Go to **Hosting** → **Add custom domain**
   - Enter: `resumeforgeapp.com`
   - Follow DNS verification steps
   - Wait for SSL certificate provisioning (can take a few hours)

2. **Verify Domain**:
```bash
firebase hosting:sites:get resume-tailor-f4f7c
```

### 2.3 Environment Variables Check

Verify all Firebase Functions config variables:

```bash
firebase functions:config:get
```

**Expected variables**:
- `stripe.secret_key` (live key)
- `stripe.webhook_secret` (live webhook secret)
- `gemini.api_key` (should already be set)

---

## 🤖 Step 3: Google Gemini API

### 3.1 Verify API Key

The Gemini API key should work for both test and production. Verify it's set:

```bash
firebase functions:config:get gemini
```

If not set, set it:
```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
firebase deploy --only functions
```

---

## 📝 Step 4: Update Code Files

### 4.1 Update index.html

**Location**: Line ~298

**Change**:
```javascript
// OLD (Test)
const STRIPE_PUBLISHABLE_KEY = 'pk_test_...';

// NEW (Live)
const STRIPE_PUBLISHABLE_KEY = 'pk_live_YOUR_LIVE_KEY';
```

### 4.2 Verify No Test Keys Remain

Search for test keys in your codebase:

```bash
cd /Users/toddk.edwards/ResumeTailor
grep -r "pk_test_" .
grep -r "sk_test_" .
```

**If found**, replace with live keys.

---

## 🚀 Step 5: Deploy to Production

### 5.1 Build Frontend

```bash
cd /Users/toddk.edwards/ResumeTailor
npm run build
```

### 5.2 Deploy Everything

```bash
# Deploy hosting and functions
firebase deploy

# Or deploy separately:
firebase deploy --only hosting
firebase deploy --only functions
```

### 5.3 Verify Deployment

1. **Check Hosting**:
   - Visit: https://resumeforgeapp.com (or your custom domain)
   - Verify the site loads correctly

2. **Check Functions**:
   - Visit: https://console.firebase.google.com/project/resume-tailor-f4f7c/functions
   - Verify all functions are deployed and active

---

## ✅ Step 6: Testing & Verification

### 6.1 Test Stripe Checkout (Small Amount)

1. **Create a Test Purchase**:
   - Go to your live site
   - Click "Buy Credits"
   - Use Stripe test card: `4242 4242 4242 4242`
   - **Wait!** - In live mode, use a real card with a small amount ($2.00)

2. **Verify Payment**:
   - Check Stripe Dashboard → **Payments** (Live mode)
   - Verify payment appears
   - Check Firebase Firestore → User document
   - Verify credits were added

### 6.2 Test Webhook

1. **In Stripe Dashboard**:
   - Go to **Webhooks** → Your endpoint
   - Check **Recent events**
   - Verify `checkout.session.completed` events are being received
   - Check for any errors

2. **If Webhook Fails**:
   - Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```
   - Verify webhook secret is correct
   - Check function URL is accessible

### 6.3 Test Resume Generation

1. **Generate a Resume**:
   - Upload a resume
   - Enter a job description
   - Generate tailored resume
   - Verify it works and uses credits

2. **Check Analytics**:
   - Verify analytics are being saved
   - Check Firestore for user data

---

## 🔒 Step 7: Security Checklist

- [ ] All test keys removed from code
- [ ] Live Stripe keys configured
- [ ] Webhook secret set and verified
- [ ] Firebase security rules reviewed
- [ ] API rate limiting enabled
- [ ] Error logging configured
- [ ] HTTPS enforced (Firebase does this automatically)

---

## 📊 Step 8: Monitoring Setup

### 8.1 Stripe Dashboard

- Monitor **Payments** for successful transactions
- Check **Webhooks** for delivery status
- Review **Customers** for user activity

### 8.2 Firebase Console

- **Functions**: Monitor execution logs and errors
- **Firestore**: Check data structure and usage
- **Analytics**: Track user behavior (if enabled)
- **Hosting**: Monitor bandwidth and requests

### 8.3 Set Up Alerts

1. **Stripe Alerts**:
   - Go to **Settings** → **Alerts**
   - Enable email alerts for:
     - Failed payments
     - Webhook failures
     - Disputes

2. **Firebase Alerts**:
   - Go to **Project Settings** → **Alerts**
   - Set up alerts for:
     - Function errors
     - High error rates
     - Unusual activity

---

## 🐛 Troubleshooting

### Issue: Payments Not Processing

**Check**:
1. Stripe keys are live (not test)
2. Webhook is configured in live mode
3. Webhook secret matches in Firebase config
4. Function is deployed: `firebase deploy --only functions`

**Solution**:
```bash
# Verify config
firebase functions:config:get

# Redeploy functions
firebase deploy --only functions

# Check logs
firebase functions:log --only stripeWebhook
```

### Issue: Credits Not Added

**Check**:
1. Webhook is receiving events (Stripe Dashboard)
2. Function logs show successful execution
3. Firestore rules allow writes
4. User document exists

**Solution**:
- Check Firebase Functions logs
- Verify `processed_payments` collection (idempotency)
- Check Firestore security rules

### Issue: Domain Not Working

**Check**:
1. DNS records are correct
2. SSL certificate is provisioned
3. Domain is verified in Firebase

**Solution**:
- Wait 24-48 hours for DNS propagation
- Check Firebase Hosting for domain status
- Verify DNS records match Firebase requirements

---

## 📞 Support Resources

- **Stripe Support**: https://support.stripe.com/
- **Firebase Support**: https://firebase.google.com/support
- **Stripe API Docs**: https://stripe.com/docs/api
- **Firebase Docs**: https://firebase.google.com/docs

---

## 🎯 Quick Reference Commands

```bash
# Set Stripe live secret key
firebase functions:config:set stripe.secret_key="sk_live_YOUR_KEY"

# Set Stripe webhook secret
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"

# View all config
firebase functions:config:get

# Deploy everything
npm run build && firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# View function logs
firebase functions:log

# Check current project
firebase use
```

---

## ✅ Final Checklist

Before going fully live:

- [ ] All test keys replaced with live keys
- [ ] Stripe webhook configured and tested
- [ ] Test purchase completed successfully
- [ ] Credits added correctly after purchase
- [ ] Resume generation works
- [ ] Analytics tracking works
- [ ] Domain configured and SSL active
- [ ] Monitoring and alerts set up
- [ ] Backup of configuration saved
- [ ] Team notified of production launch

---

**🎉 Once all steps are complete, your application is ready for production!**
