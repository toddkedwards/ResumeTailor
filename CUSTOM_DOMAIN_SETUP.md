# Custom Domain Setup Guide for ResumeForge

## Overview
This guide will help you connect your custom domain to Firebase Hosting for your ResumeForge app.

**Current Firebase Hosting URL:** `https://resume-tailor-f4f7c.web.app`

---

## Step 1: Add Custom Domain in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `resume-tailor-f4f7c`

2. **Navigate to Hosting**
   - Click on **"Hosting"** in the left sidebar
   - You should see your current site: `resume-tailor-f4f7c`

3. **Add Custom Domain**
   - Click **"Add custom domain"** button
   - Enter your domain name (e.g., `resumeforge.com` or `www.resumeforge.com`)
   - Click **"Continue"**

---

## Step 2: Choose Domain Type

Firebase will ask you to choose between:

### Option A: Root Domain (e.g., `resumeforge.com`)
- Use this if you want the main domain to work
- Requires **A record** in DNS

### Option B: Subdomain (e.g., `www.resumeforge.com`)
- Use this if you want a subdomain
- Requires **CNAME record** in DNS

**Recommendation:** Set up BOTH for best results:
1. Add `www.resumeforge.com` first (easier with CNAME)
2. Then add `resumeforge.com` (requires A record)

---

## Step 3: Get DNS Configuration from Firebase

After clicking "Continue", Firebase will show you:

### For Root Domain (resumeforge.com):
```
Type: A
Name: @ (or leave blank)
Value: 199.36.158.100
```

### For Subdomain (www.resumeforge.com):
```
Type: CNAME
Name: www
Value: resume-tailor-f4f7c.web.app
```

**Important:** Firebase may also provide a **TXT record** for domain verification. Copy this as well.

---

## Step 4: Configure DNS at Your Domain Provider

1. **Log in to your domain registrar** (e.g., GoDaddy, Namecheap, Google Domains, etc.)

2. **Find DNS Management**
   - Look for "DNS Settings", "DNS Management", or "Advanced DNS"
   - This is usually in your domain's control panel

3. **Add the DNS Records**

   **For Subdomain (www):**
   - Click "Add Record" or "Create Record"
   - Type: **CNAME**
   - Name/Host: `www`
   - Value/Target: `resume-tailor-f4f7c.web.app`
   - TTL: 3600 (or default)
   - Click "Save"

   **For Root Domain:**
   - Click "Add Record"
   - Type: **A**
   - Name/Host: `@` (or leave blank, or use your root domain)
   - Value/Target: `199.36.158.100`
   - TTL: 3600 (or default)
   - Click "Save"

   **For Domain Verification (if provided):**
   - Click "Add Record"
   - Type: **TXT**
   - Name/Host: `@` (or your domain)
   - Value: (paste the TXT record from Firebase)
   - TTL: 3600
   - Click "Save"

---

## Step 5: Wait for DNS Propagation

- DNS changes can take **15 minutes to 48 hours** to propagate
- Usually takes **1-2 hours** for most providers
- You can check propagation status at: https://www.whatsmydns.net/

---

## Step 6: Verify Domain in Firebase

1. **Go back to Firebase Console** → Hosting
2. Firebase will automatically detect when DNS is configured
3. You'll see a status indicator:
   - ⏳ **Pending** - DNS is propagating
   - ✅ **Connected** - Domain is ready
   - ❌ **Error** - Check DNS settings

4. **SSL Certificate**
   - Firebase automatically provisions SSL certificates
   - This happens after DNS is verified
   - Usually takes **10-30 minutes** after DNS verification

---

## Step 7: Test Your Custom Domain

Once Firebase shows "Connected":

1. Visit your custom domain: `https://yourdomain.com`
2. You should see your ResumeForge app
3. Check that HTTPS is working (green lock icon)

---

## Troubleshooting

### DNS Not Propagating
- Wait longer (up to 48 hours)
- Check DNS records are correct
- Clear your browser cache
- Try different DNS servers (8.8.8.8, 1.1.1.1)

### SSL Certificate Issues
- Wait 30-60 minutes after DNS verification
- Ensure DNS is fully propagated
- Check Firebase Console for error messages

### Domain Not Loading
- Verify DNS records are correct
- Check Firebase Console for status
- Ensure domain is verified in Firebase
- Try accessing via `http://` and `https://`

### Common DNS Provider Guides
- **GoDaddy:** https://www.godaddy.com/help/add-a-cname-record-19236
- **Namecheap:** https://www.namecheap.com/support/knowledgebase/article.aspx/2237/2238/how-to-add-a-cname-record-for-your-domain/
- **Google Domains:** https://support.google.com/domains/answer/3290350
- **Cloudflare:** https://developers.cloudflare.com/dns/manage-dns-records/

---

## Quick Reference

**Firebase Site ID:** `resume-tailor-f4f7c`  
**Firebase URL:** `https://resume-tailor-f4f7c.web.app`  
**Firebase IP:** `199.36.158.100` (may change - check Firebase Console)

**CNAME Record:**
```
Type: CNAME
Name: www
Value: resume-tailor-f4f7c.web.app
```

**A Record:**
```
Type: A
Name: @
Value: 199.36.158.100
```

---

## Next Steps After Setup

1. **Update any hardcoded URLs** in your code (if any)
2. **Test all functionality** on the custom domain
3. **Set up redirects** (if needed) - Firebase can redirect www to root or vice versa
4. **Update marketing materials** with your custom domain

---

**Need Help?** Check Firebase documentation: https://firebase.google.com/docs/hosting/custom-domain

