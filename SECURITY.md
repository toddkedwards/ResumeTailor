# Security Notes

## API Key Security

### ✅ Gemini API Key Protection

The Gemini API key is **securely stored server-side only** in Firebase Functions configuration:

- **Location**: Firebase Functions config (server-side)
- **Access**: Only accessible by Firebase Functions code
- **Client-side**: ❌ **NEVER** exposed in `index.html` or any client-side code
- **Git**: ✅ Not committed to repository (stored in Firebase config only)

### How It Works

1. **Client** (`index.html`) calls Firebase Function `tailorResume`
2. **Firebase Function** (`functions/index.js`) reads API key from secure config
3. **Function** makes API call to Gemini API (server-to-server)
4. **Function** returns result to client

The API key **never** leaves the server.

### ⚠️ Important Security Rules

1. **Never** commit API keys to Git
2. **Never** hardcode API keys in client-side code
3. **Never** expose API keys in documentation or screenshots
4. **Always** use Firebase Functions config for sensitive keys
5. **Always** use environment variables or secure config for production

### If API Key is Compromised

If your API key is exposed or leaked:

1. **Immediately** revoke it in [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Generate a new API key
3. Update Firebase Functions config:
   ```bash
   firebase functions:config:set gemini.api_key="NEW_KEY_HERE"
   firebase deploy --only functions
   ```
4. Remove any exposed keys from code/documentation

### Current Setup Status

- ✅ API key stored in Firebase Functions config only
- ✅ No API key in client-side code
- ✅ No API key in documentation files
- ✅ Setup scripts prompt for key (not hardcoded)

