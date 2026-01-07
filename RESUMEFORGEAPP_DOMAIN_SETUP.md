# Custom Domain Setup: resumeforgeapp.com

## Domain: resumeforgeapp.com

---

## Step 1: Add Domain in Firebase Console

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/project/resume-tailor-f4f7c/hosting
   - Click **"Add custom domain"**

2. **Enter Your Domain**
   - Type: `resumeforgeapp.com`
   - Click **"Continue"**

3. **Firebase will show you DNS records** - Copy these exactly!

---

## Step 2: DNS Records You'll Need

Firebase will provide you with specific records. Here's what to expect:

### Option A: Root Domain (resumeforgeapp.com)
```
Type: A
Name: @ (or leave blank)
Value: [IP address from Firebase - usually 199.36.158.100]
```

### Option B: www Subdomain (www.resumeforgeapp.com) - RECOMMENDED
```
Type: CNAME
Name: www
Value: resume-tailor-f4f7c.web.app
```

**Recommendation:** Start with the www subdomain (easier setup), then add root domain.

### Domain Verification (if required)
```
Type: TXT
Name: @
Value: [TXT record from Firebase]
```

---

## Step 3: Configure DNS at Your Domain Registrar

### If using GoDaddy:
1. Log in → My Products → DNS
2. Scroll to "Records" section
3. Click "Add" → Select record type
4. Enter the values from Firebase
5. Click "Save"

### If using Namecheap:
1. Log in → Domain List → Manage → Advanced DNS
2. Click "Add New Record"
3. Select type and enter values
4. Click "Save"

### If using Google Domains:
1. Log in → DNS → Custom records
2. Click "Add record"
3. Enter values
4. Click "Save"

### If using Cloudflare:
1. Log in → Select domain → DNS
2. Click "Add record"
3. Enter values
4. Click "Save"

---

## Step 4: Wait for DNS Propagation

- **Check propagation:** https://www.whatsmydns.net/#CNAME/www.resumeforgeapp.com
- Usually takes **1-2 hours**
- Can take up to **48 hours** in rare cases

---

## Step 5: Verify in Firebase

1. Go back to Firebase Console → Hosting
2. You'll see status:
   - ⏳ **Pending** - DNS propagating
   - ✅ **Connected** - Ready!
   - ❌ **Error** - Check DNS

3. SSL certificate will auto-provision (10-30 minutes after DNS verification)

---

## Step 6: Test

Once connected:
- Visit: `https://www.resumeforgeapp.com` (or `https://resumeforgeapp.com`)
- Should see your ResumeForge app
- Check HTTPS is working (green lock)

---

## Quick Reference

**Your Firebase Site:** `resume-tailor-f4f7c`  
**Firebase URL:** `https://resume-tailor-f4f7c.web.app`  
**Your Domain:** `resumeforgeapp.com`

**Expected CNAME Record:**
```
Type: CNAME
Name: www
Value: resume-tailor-f4f7c.web.app
```

**Expected A Record (if adding root domain):**
```
Type: A
Name: @
Value: [Check Firebase Console for exact IP]
```

---

## Need Help?

1. **Check Firebase Console** - It shows exact records needed
2. **Verify DNS** - Use whatsmydns.net to check propagation
3. **Contact Support** - If issues persist after 48 hours

---

**Ready to start?** Go to Firebase Console and add your domain!

