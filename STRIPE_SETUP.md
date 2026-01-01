# Stripe Setup Guide for ResumeForge

Complete guide to setting up Stripe payments for ResumeForge.

## Overview

ResumeForge uses Stripe for credit purchases:
- **Product**: 5 Credits Bundle
- **Price**: $2.00 (one-time payment)
- **What users get**: 5 credits = 5 resume generations

---

## Step 1: Create Stripe Account (if needed)

1. Go to https://stripe.com
2. Click **"Start now"** or **"Sign in"**
3. Complete account setup
4. Verify your email

---

## Step 2: Create Product and Price

1. **Go to Stripe Dashboard**
   - Visit: https://dashboard.stripe.com
   - Make sure you're in **Test mode** (toggle in top right) for testing

2. **Create Product**
   - Click **"Products"** in the left sidebar
   - Click **"+ Add product"**
   - Fill in:
     - **Name**: `ResumeForge - 5 Credits`
     - **Description**: `5 resume generations (5 credits)`
   - Click **"Save product"**

3. **Add Pricing**
   - In the product page, click **"Add pricing"**
   - Fill in:
     - **Price**: `2.00`
     - **Currency**: `USD`
     - **Billing period**: Select **"One time"** (NOT recurring)
   - Click **"Save pricing"**
   - **Copy the Price ID** (starts with `price_`) - you'll need this!

---

## Step 3: Get API Keys

1. **Go to API Keys**
   - In Stripe Dashboard, click **"Developers"** → **"API keys"**

2. **Get Test Keys** (for testing)
   - You'll see:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_`) - click "Reveal test key"
   - Copy both keys

3. **Get Live Keys** (for production)
   - Toggle to **"Live mode"** (top right)
   - Copy:
     - **Publishable key** (starts with `pk_live_`)
     - **Secret key** (starts with `sk_live_`)

**Note**: Start with test keys to verify everything works!

---

## Step 4: Set Up Webhook

1. **Get Webhook URL**
   - Your webhook URL is:
     ```
     https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook
     ```

2. **Add Webhook Endpoint in Stripe**
   - In Stripe Dashboard, go to **"Developers"** → **"Webhooks"**
   - Click **"+ Add endpoint"**
   - Enter webhook URL: `https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook`
   - Select events to listen for:
     - ✅ `checkout.session.completed` (required)
   - Click **"Add endpoint"**
   - **Copy the Signing secret** (starts with `whsec_`) - you'll need this!

---

## Step 5: Configure Firebase Functions

Run these commands in your terminal (replace with your actual keys):

```bash
cd /Users/toddk.edwards/ResumeTailor

# Set Stripe secret key
firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"

# Set Stripe price ID
firebase functions:config:set stripe.price_id="price_YOUR_PRICE_ID"

# Set webhook secret
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"

# Set app ID (if not already set)
firebase functions:config:set app.id="resume-tailor-v1"
```

**Example** (replace with your actual values):
```bash
firebase functions:config:set stripe.secret_key="sk_test_51AbC123..."
firebase functions:config:set stripe.price_id="price_1AbC123..."
firebase functions:config:set stripe.webhook_secret="whsec_AbC123..."
```

---

## Step 6: Redeploy Functions

After setting the config, redeploy:

```bash
firebase deploy --only functions
```

---

## Step 7: Test the Integration

1. **Open your app**: https://resume-tailor-f4f7c.web.app
2. **Sign in** with your account
3. **Click "Buy 5 Credits ($2.00)"**
4. **Complete test checkout**:
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/34`)
   - Any 3-digit CVC (e.g., `123`)
   - Any ZIP code (e.g., `12345`)
5. **Verify**:
   - You're redirected back to the app
   - Credits are added to your account
   - Check your credits count in the header

---

## Step 8: Switch to Live Mode (When Ready)

When you're ready to accept real payments:

1. **Switch Stripe to Live Mode**
   - Toggle to **"Live mode"** in Stripe Dashboard

2. **Get Live Keys**
   - Copy live publishable key and secret key

3. **Update Firebase Functions Config**
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_YOUR_LIVE_SECRET_KEY"
   ```

4. **Create Live Webhook**
   - Add the same webhook URL in Live mode
   - Copy the live webhook secret
   - Update config:
   ```bash
   firebase functions:config:set stripe.webhook_secret="whsec_YOUR_LIVE_WEBHOOK_SECRET"
   ```

5. **Redeploy**
   ```bash
   firebase deploy --only functions
   ```

---

## Verification Checklist

- [ ] Stripe account created
- [ ] Product created: "ResumeForge - 5 Credits"
- [ ] Price created: $2.00 (one-time)
- [ ] Price ID copied
- [ ] API keys copied (test and live)
- [ ] Webhook endpoint created
- [ ] Webhook secret copied
- [ ] Firebase Functions config set
- [ ] Functions redeployed
- [ ] Test checkout completed successfully
- [ ] Credits added after purchase

---

## Troubleshooting

### "Failed to create checkout session"
- Check Firebase Functions config is set correctly
- Verify price ID is correct
- Check Firebase Functions logs: `firebase functions:log`

### Credits not adding after purchase
- Check webhook is receiving events in Stripe Dashboard
- Verify webhook secret is correct
- Check Firebase Functions logs for webhook errors
- Ensure Firestore security rules allow writes

### Webhook errors
- Verify webhook URL is correct
- Check webhook secret matches
- Ensure `checkout.session.completed` event is selected

---

## Quick Reference

**Webhook URL:**
```
https://us-central1-resume-tailor-f4f7c.cloudfunctions.net/stripeWebhook
```

**Firebase Project:**
- Project ID: `resume-tailor-f4f7c`
- Functions Region: `us-central1`

**Product Details:**
- Name: ResumeForge - 5 Credits
- Price: $2.00
- Type: One-time payment
- Credits: 5 credits per purchase

---

## Need Help?

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe Docs: https://stripe.com/docs
- Firebase Console: https://console.firebase.google.com/project/resume-tailor-f4f7c

