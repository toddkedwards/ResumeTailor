# Favicon Setup Instructions

## Steps to Add Your ResumeForge Favicon

### 1. Save the Favicon Image

Save your ResumeForge favicon image to the root directory of the project with these names:

**Required files:**
- `favicon.ico` - Traditional favicon (16x16, 32x32, 48x48 sizes in one file)
- `favicon-16x16.png` - 16x16 pixel PNG
- `favicon-32x32.png` - 32x32 pixel PNG
- `apple-touch-icon.png` - 180x180 pixel PNG (for iOS)

**Optional (for PWA):**
- `icon-192x192.png` - 192x192 pixel PNG (already referenced in manifest)
- `icon-512x512.png` - 512x512 pixel PNG (already referenced in manifest)

### 2. Quick Setup Options

#### Option A: Use Online Favicon Generator (Recommended)
1. Go to https://realfavicongenerator.net/
2. Upload your ResumeForge favicon image
3. Configure settings:
   - iOS: Enable "Apple touch icon"
   - Android: Enable "Android Chrome"
   - Windows: Enable "Windows Metro tile"
4. Generate and download the favicon package
5. Extract all files to the root directory (`/Users/toddk.edwards/ResumeTailor/`)

#### Option B: Manual Conversion
If you have the favicon image file:

1. **Create favicon.ico:**
   - Use an online converter like https://favicon.io/favicon-converter/
   - Upload your image and download the .ico file

2. **Create PNG sizes:**
   - Use an image editor (Photoshop, GIMP, or online tool)
   - Resize to: 16x16, 32x32, 180x180, 192x192, 512x512
   - Save with the names listed above

3. **Place all files in root directory**

### 3. File Structure After Setup

```
ResumeTailor/
├── favicon.ico              ✅
├── favicon-16x16.png        ✅
├── favicon-32x32.png        ✅
├── apple-touch-icon.png     ✅
├── icon-192x192.png         ✅ (optional, for PWA)
├── icon-512x512.png         ✅ (optional, for PWA)
└── index.html               ✅ (already configured)
```

### 4. Verify Setup

After adding the files:
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check the browser tab - you should see the ResumeForge favicon
3. Check browser console - no 404 errors for favicon files

### 5. Deploy

```bash
firebase deploy --only hosting
```

## Current HTML Configuration

The HTML is already configured with these favicon links:
- Standard favicon (favicon.ico)
- PNG favicons (16x16, 32x32)
- Apple touch icon (180x180)
- PWA icons (via manifest.json)

Just add the image files and you're done! 🎉

## Notes

- The favicon will appear in browser tabs, bookmarks, and browser history
- Apple touch icon is used when users add your site to their iOS home screen
- PWA icons are used when the app is installed as a Progressive Web App
- All favicon files should be in the root directory (same level as index.html)
