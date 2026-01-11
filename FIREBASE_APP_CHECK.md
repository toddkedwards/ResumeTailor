# Firebase App Check Implementation Guide

## Overview
Firebase App Check helps protect your backend resources from abuse by verifying that incoming traffic is from your legitimate app.

## Implementation Steps

### 1. Enable App Check in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Build** > **App Check**
4. Click **Get Started**
5. Register your web app:
   - Click **Add app** > **Web**
   - Enter app nickname (e.g., "ResumeForge Web")
   - Register the app

### 2. Choose App Attestation Provider

For web apps, you have two options:

#### Option A: reCAPTCHA v3 (Recommended for Web)
1. In App Check, select your web app
2. Click **Manage** next to reCAPTCHA
3. Register your domain (e.g., `resumeforgeapp.com`)
4. Copy the **reCAPTCHA site key**

#### Option B: reCAPTCHA Enterprise (More robust)
1. Enable reCAPTCHA Enterprise in Google Cloud Console
2. Create a site key
3. Configure in Firebase App Check

### 3. Update Frontend (index.html)

Add reCAPTCHA script and initialize App Check:

```html
<!-- Add before closing </head> tag -->
<script src="https://www.google.com/recaptcha/api.js?render=YOUR_RECAPTCHA_SITE_KEY"></script>

<!-- Add in Firebase initialization section -->
<script type="module">
  import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js';
  
  // Initialize App Check
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
</script>
```

### 4. Update Firebase Functions

Enforce App Check in your Cloud Functions:

```javascript
const functions = require('firebase-functions');

// Enforce App Check for all callable functions
exports.generateTailoredResume = functions
  .runWith({
    enforceAppCheck: true
  })
  .https.onCall(async (data, context) => {
    // Verify App Check token
    if (context.app == undefined) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'The function must be called from an App Check verified app.'
      );
    }
    
    // Rest of your function code...
  });
```

### 5. Update Firestore Rules (Optional)

You can also enforce App Check in Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId
        && request.app != null; // Require App Check
    }
  }
}
```

## Testing

1. **Test in Development:**
   - App Check tokens are automatically generated in development
   - Test your functions locally

2. **Test in Production:**
   - Deploy functions with `enforceAppCheck: true`
   - Test from your production domain
   - Check Firebase Console > App Check for metrics

## Notes

- **Development Mode:** App Check is automatically enabled in development
- **Production Mode:** Requires proper domain registration
- **Token Refresh:** Tokens auto-refresh every hour
- **Monitoring:** Check App Check dashboard for abuse patterns

## Troubleshooting

- **"App Check token missing"**: Ensure reCAPTCHA script is loaded
- **"Invalid App Check token"**: Verify domain is registered in reCAPTCHA
- **"App Check verification failed"**: Check that site key matches

## Resources

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [reCAPTCHA v3 Setup](https://www.google.com/recaptcha/admin)
- [App Check Pricing](https://firebase.google.com/pricing)
