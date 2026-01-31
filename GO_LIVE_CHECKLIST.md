# 🚀 Go-Live Checklist - ResumeForge

Complete this checklist before launching to production. Check off each item as you complete it.

---

## 🔴 CRITICAL - Must Complete Before Launch

### 1. Stripe Configuration (LIVE Mode)

#### Frontend Updates
- [ ] **Update Stripe Publishable Key** in `index.html` (line ~298)
  - Current: `pk_test_51RbOo8KfMIBsUfylIZIdikgVnL7C1Mfdj61d8AJj3splHLHAloyepn6y4Olte2QtGviWpBE8OuYqN6F20LKwLJQl00aZ5sdgj0` (TEST)
  - Replace with: `pk_live_YOUR_LIVE_KEY`
  - Get from: https://dashboard.stripe.com/ → Developers → API keys (Live mode)

- [ ] **Verify Stripe Price ID** in `index.html` (line ~299)
  - Current: `price_1Skud7QQl8oxreSlbAkOS13N`
  - Verify this is your LIVE price ID for $2.00 / 5 credits
  - If different, update with your live price ID

#### Backend Updates
- [ ] **Set Stripe Secret Key (LIVE)**
  ```bash
  firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_SECRET_KEY"
  ```

- [ ] **Set Stripe Webhook Secret (LIVE)**
  ```bash
  firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"
  ```

- [ ] **Configure Stripe Webhook in LIVE Mode**
  1. Go to: https://dashboard.stripe.com/ → Developers → Webhooks (Live mode)
  2. Click "Add endpoint"
  3. Endpoint URL: `https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
  4. Events: `checkout.session.completed`, `payment_intent.succeeded`
  5. Copy webhook signing secret
  6. Update Firebase config (see above)

- [ ] **Deploy Functions After Config Changes**
  ```bash
  firebase deploy --only functions
  ```

### 2. Domain & SSL Configuration

- [ ] **Verify Custom Domain** (resumeforgeapp.com)
  - Check Firebase Hosting → Custom domains
  - Verify domain is connected and verified
  - SSL certificate should be active (green lock icon)

- [ ] **Test Domain Access**
  - Visit: https://resumeforgeapp.com
  - Verify site loads correctly
  - Check SSL certificate (should show valid/green lock)

- [ ] **DNS Records Verified**
  - A record or CNAME pointing to Firebase
  - Check: `firebase hosting:sites:get resume-tailor-f4f7c`

### 3. Security & Rules

- [ ] **Firestore Security Rules Deployed**
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Review Security Rules**
  - Users can only access their own data
  - Feedback collection allows user creation
  - No public read access to sensitive data

- [ ] **Verify Admin Email is Set**
  ```bash
  firebase functions:config:get admin
  ```
  - Should show: `admin.email = "toddkedwards@gmail.com"`

### 4. Environment Variables Verification

- [ ] **Check All Firebase Functions Config**
  ```bash
  firebase functions:config:get
  ```
  - Verify `gemini.api_key` is set
  - Verify `stripe.secret_key` is LIVE (starts with `sk_live_`)
  - Verify `stripe.webhook_secret` is LIVE (starts with `whsec_`)
  - Verify `admin.email` is set

---

## 🟡 IMPORTANT - Should Complete Before Launch

### 5. Testing (Do This Before Going Live!)

#### Payment Testing
- [ ] **Test Payment Flow with Small Real Amount**
  - Use a real credit card (not test card)
  - Make a $2.00 purchase
  - Verify payment appears in Stripe Dashboard (Live mode)
  - Verify credits are added to user account
  - Verify webhook events are received

#### Feature Testing
- [ ] **Test Resume Generation**
  - Generate a tailored resume
  - Verify credits are deducted
  - Check output quality and formatting
  - Verify bullet points display correctly

- [ ] **Test Cover Letter Generation**
  - Generate a cover letter
  - Verify it works and uses credits

- [ ] **Test Interview Questions**
  - Generate interview questions
  - Test feedback feature
  - Verify credits are deducted

- [ ] **Test Resume Builder**
  - Create a resume from scratch
  - Test drag-and-drop section reordering
  - Test export functions (PDF, Word)
  - Verify custom colors/fonts work

- [ ] **Test Job Matching**
  - Use job matching feature
  - Verify results display correctly

- [ ] **Test Application Tracker**
  - Add a job application
  - Update status
  - Add resume version
  - Set reminder

- [ ] **Test Feedback System**
  - Submit feedback
  - Verify it saves to Firestore
  - Check Firebase Console to view feedback

#### User Flow Testing
- [ ] **Test Sign Up Flow**
  - Create new account
  - Verify email verification (if enabled)
  - Test sign in

- [ ] **Test Mobile Experience**
  - Test on mobile device
  - Verify mobile menu works
  - Check all features are accessible
  - Test responsive design

- [ ] **Test Error Handling**
  - Test with no credits (should show pricing modal)
  - Test with invalid inputs
  - Test offline mode (if applicable)

### 6. Code Verification

- [ ] **Remove All Test Keys**
  ```bash
  # Search for test keys
  grep -r "pk_test_" .
  grep -r "sk_test_" .
  ```
  - Should find nothing (or only in comments/docs)

- [ ] **Verify No Console Errors**
  - Open browser console
  - Check for errors
  - Fix any critical errors

- [ ] **Verify Admin Account Works**
  - Sign in with toddkedwards@gmail.com
  - Verify unlimited credits (shows "∞")
  - Test generation without credit deduction

### 7. Monitoring Setup

- [ ] **Stripe Dashboard Alerts**
  - Go to: Stripe Dashboard → Settings → Alerts
  - Enable email alerts for:
    - Failed payments
    - Webhook failures
    - Disputes
    - High failure rates

- [ ] **Firebase Console Monitoring**
  - Set up error alerts (if available)
  - Monitor function execution logs
  - Check Firestore usage

- [ ] **Set Up Error Tracking**
  - Review Firebase Functions logs regularly
  - Set up alerts for high error rates
  - Monitor user feedback

---

## 🟢 NICE TO HAVE - Optional Enhancements

### 8. Legal & Compliance

- [ ] **Privacy Policy**
  - Add privacy policy page/link
  - Cover: data collection, Stripe payments, user data, cookies

- [ ] **Terms of Service**
  - Add terms of service page/link
  - Cover: usage, refunds, credits policy, user responsibilities

- [ ] **GDPR/CCPA Compliance** (if applicable)
  - Data deletion requests process
  - Cookie consent (if using analytics)
  - User data export capability

### 9. Analytics & Tracking

- [ ] **Google Analytics** (if desired)
  - Add tracking code
  - Set up conversion tracking
  - Track key events (signups, purchases, generations)

- [ ] **Stripe Analytics**
  - Review conversion funnel
  - Monitor payment success rates
  - Track revenue metrics

### 10. Documentation

- [ ] **User Documentation**
  - Help/FAQ page (already have FAQ on landing)
  - How-to guides for key features
  - Video tutorials (optional)

- [ ] **Admin Documentation**
  - How to view feedback in Firebase Console
  - How to monitor payments in Stripe
  - Backup procedures
  - Support contact info

### 11. Performance Optimization

- [ ] **CDN Configuration**
  - Verify Firebase Hosting CDN is active
  - Check cache headers in `firebase.json`

- [ ] **Image Optimization**
  - Compress any logo/images
  - Use WebP format where possible

---

## ✅ Pre-Launch Final Verification

Before announcing as live, verify:

1. [ ] **Stripe is in LIVE mode** (not test mode)
2. [ ] **All test keys removed** from code
3. [ ] **Webhook is configured** in LIVE mode
4. [ ] **Domain is working** (resumeforgeapp.com)
5. [ ] **SSL certificate is active** (green lock icon)
6. [ ] **Test purchase works** (small real amount - $2.00)
7. [ ] **Credits are added** after purchase
8. [ ] **Resume generation works** and deducts credits
9. [ ] **No console errors** in browser
10. [ ] **Mobile menu works** correctly
11. [ ] **All features tested** and working
12. [ ] **Admin account works** (unlimited credits)
13. [ ] **Feedback system works** (can submit and view)
14. [ ] **Firestore rules deployed** and secure
15. [ ] **Monitoring/alerts set up**

---

## 📋 Quick Reference Commands

### Check Current Configuration
```bash
# View all Firebase Functions config
firebase functions:config:get

# Check current project
firebase use

# View hosting sites
firebase hosting:sites:list
```

### Update Stripe Keys
```bash
# Set Stripe secret key (LIVE)
firebase functions:config:set stripe.secret_key="sk_live_YOUR_KEY"

# Set Stripe webhook secret (LIVE)
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"

# Deploy functions after config change
firebase deploy --only functions
```

### Deploy Everything
```bash
# Build CSS
npm run build

# Deploy all
firebase deploy

# Or deploy separately
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Search for Test Keys
```bash
# Find any remaining test keys
grep -r "pk_test_" .
grep -r "sk_test_" .
```

---

## 🎯 Current Status Summary

### ✅ Already Complete
- ✅ Code is production-ready
- ✅ Mobile menu fixed and deployed
- ✅ Bullet points fixed and deployed
- ✅ Admin account configured (toddkedwards@gmail.com)
- ✅ Feedback system implemented
- ✅ Landing page updated with all features
- ✅ All features implemented and tested (in test mode)

### ⚠️ Needs Attention
- ⚠️ **Stripe keys still in TEST mode** - MUST UPDATE
- ⚠️ **Need to verify domain/SSL** - CHECK STATUS
- ⚠️ **Need to test payment flow** - DO BEFORE LAUNCH
- ⚠️ **Need to set up monitoring/alerts** - RECOMMENDED

---

## 🚨 Critical Path to Launch

**Minimum required to go live:**

1. Get Stripe LIVE keys
2. Update `index.html` with live publishable key
3. Set Firebase Functions config with live secret key
4. Configure Stripe webhook in LIVE mode
5. Test with small real purchase ($2.00)
6. Verify everything works
7. Deploy final changes
8. **GO LIVE!** 🚀

**Estimated time:** 30-60 minutes (if you have Stripe keys ready)

---

## 📞 Support Resources

- **Stripe Support**: https://support.stripe.com/
- **Firebase Support**: https://firebase.google.com/support
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Firebase Console**: https://console.firebase.google.com/project/resume-tailor-f4f7c

---

## 🎉 Once Complete

After completing all critical items and testing:

1. Make a final announcement
2. Monitor closely for first 24-48 hours
3. Respond quickly to any issues
4. Review user feedback
5. Iterate and improve!

**Good luck with your launch! 🚀**
