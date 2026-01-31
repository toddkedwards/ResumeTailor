# Production Readiness Checklist

Use this checklist to ensure everything is ready before going live.

---

## 🔴 Critical Items (Must Complete)

### 1. Stripe Configuration - LIVE MODE

#### Frontend (index.html)
- [ ] **Update Stripe Publishable Key** (Line ~298)
  - Current: `pk_test_51RbOo8KfMIBsUfylIZIdikgVnL7C1Mfdj61d8AJj3splHLHAloyepn6y4Olte2QtGviWpBE8OuYqN6F20LKwLJQl00aZ5sdgj0` (TEST KEY)
  - Replace with: `pk_live_YOUR_LIVE_KEY`
  - Get from: Stripe Dashboard → Developers → API keys (Live mode)

- [ ] **Update Stripe Price ID** (Line ~299)
  - Current: `price_1Skud7QQl8oxreSlbAkOS13N`
  - Verify this is your LIVE price ID for $2.00 / 5 credits
  - If different, update with your live price ID

#### Backend (Firebase Functions)
- [ ] **Set Stripe Secret Key** (Live)
  ```bash
  firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_SECRET_KEY"
  ```

- [ ] **Set Stripe Webhook Secret** (Live)
  ```bash
  firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"
  ```

- [ ] **Configure Stripe Webhook** (Live Mode)
  - Go to: Stripe Dashboard → Developers → Webhooks (Live mode)
  - Add endpoint: `https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
  - Events: `checkout.session.completed`, `payment_intent.succeeded`
  - Copy webhook signing secret

- [ ] **Redeploy Functions After Config Changes**
  ```bash
  firebase deploy --only functions
  ```

### 2. Domain & SSL Configuration

- [ ] **Custom Domain Setup** (resumeforgeapp.com)
  - Verify domain is connected in Firebase Hosting
  - Check SSL certificate is active (can take 24-48 hours)
  - Test: `https://resumeforgeapp.com` loads correctly

- [ ] **DNS Records Verified**
  - A record or CNAME pointing to Firebase
  - Check: `firebase hosting:sites:get resume-tailor-f4f7c`

### 3. Firebase Security Rules

- [ ] **Firestore Rules Deployed**
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] **Review Security Rules**
  - Users can only read/write their own data
  - No public read access to sensitive data
  - Test rules in Firebase Console

### 4. Environment Variables Verification

- [ ] **Gemini API Key Set**
  ```bash
  firebase functions:config:get gemini
  ```
  - Should show your Gemini API key

- [ ] **All Stripe Config Set**
  ```bash
  firebase functions:config:get stripe
  ```
  - Should show: `secret_key` and `webhook_secret` (both LIVE keys)

---

## 🟡 Important Items (Should Complete)

### 5. Testing Before Going Live

- [ ] **Test Payment Flow** (Use small real amount, e.g., $2.00)
  - Create test purchase
  - Verify payment processes in Stripe Dashboard (Live mode)
  - Verify credits are added to user account
  - Check webhook events are received

- [ ] **Test Resume Generation**
  - Generate a tailored resume
  - Verify credits are deducted
  - Check output quality and formatting

- [ ] **Test All Features**
  - Sign up / Sign in
  - Resume builder
  - Job matching
  - Interview prep
  - Dashboard analytics
  - Export functions (PDF, Word)

### 6. Monitoring & Alerts

- [ ] **Stripe Dashboard Alerts**
  - Enable email alerts for failed payments
  - Enable webhook failure alerts
  - Monitor payment success rate

- [ ] **Firebase Console Monitoring**
  - Set up error alerts for Cloud Functions
  - Monitor function execution logs
  - Check Firestore usage

- [ ] **Error Tracking**
  - Review Firebase Functions logs regularly
  - Set up alerts for high error rates

### 7. Legal & Compliance

- [ ] **Privacy Policy**
  - Add privacy policy page/link
  - Cover data collection, Stripe payments, user data

- [ ] **Terms of Service**
  - Add terms of service page/link
  - Cover usage, refunds, credits policy

- [ ] **GDPR/CCPA Compliance** (if applicable)
  - Data deletion requests
  - Cookie consent (if using analytics)

---

## 🟢 Nice to Have (Optional)

### 8. Performance Optimization

- [ ] **CDN Configuration**
  - Verify Firebase Hosting CDN is active
  - Check cache headers in `firebase.json`

- [ ] **Image Optimization**
  - Compress any logo/images
  - Use WebP format where possible

### 9. Analytics & Tracking

- [ ] **Google Analytics** (if desired)
  - Add tracking code
  - Set up conversion tracking

- [ ] **Stripe Analytics**
  - Review conversion funnel
  - Monitor payment success rates

### 10. Documentation

- [ ] **User Documentation**
  - Help/FAQ page
  - How-to guides

- [ ] **Admin Documentation**
  - Backup procedures
  - Monitoring procedures
  - Support contact info

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

---

## 🚨 Pre-Launch Final Checks

Before announcing as live, verify:

1. [ ] **Stripe is in LIVE mode** (not test mode)
2. [ ] **All test keys removed** from code
3. [ ] **Webhook is configured** in LIVE mode
4. [ ] **Domain is working** (resumeforgeapp.com)
5. [ ] **SSL certificate is active** (green lock icon)
6. [ ] **Test purchase works** (small real amount)
7. [ ] **Credits are added** after purchase
8. [ ] **Resume generation works** and deducts credits
9. [ ] **No console errors** in browser
10. [ ] **Mobile menu works** correctly

---

## 📞 Support Resources

- **Stripe Support**: https://support.stripe.com/
- **Firebase Support**: https://firebase.google.com/support
- **Stripe Dashboard**: https://dashboard.stripe.com/
- **Firebase Console**: https://console.firebase.google.com/

---

## ✅ Current Status

Based on code review:

- ✅ **Code is production-ready** (no obvious bugs)
- ✅ **Mobile menu fixed** and deployed
- ✅ **Bullet points fixed** and deployed
- ⚠️ **Stripe keys still in TEST mode** - NEEDS UPDATE
- ⚠️ **Need to verify domain/SSL** - CHECK STATUS
- ⚠️ **Need to test payment flow** - DO BEFORE LAUNCH

---

**Next Steps:**
1. Get your Stripe LIVE keys
2. Update `index.html` with live publishable key
3. Set Firebase Functions config with live secret key
4. Configure Stripe webhook in LIVE mode
5. Test with a small real purchase
6. Verify everything works
7. Go live! 🚀
