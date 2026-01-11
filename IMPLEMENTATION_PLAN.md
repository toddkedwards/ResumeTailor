# Implementation Plan: File Formats & Enhancements

## Current State

### Upload Support ✅
- PDF (using pdf.js)
- DOCX (using mammoth.js)
- TXT
- DOC (old format) - shows error

### Export Support ✅
- PDF (using jsPDF, with print fallback)
- Word (.doc format only, not .docx)

## Implementation Tasks

### Phase 1: File Format Support

#### 1.1 Upload Formats
- [x] PDF ✅
- [x] DOCX ✅
- [x] TXT ✅
- [ ] **Apple Pages (.pages)** - Pages files are ZIP archives; extract and parse XML
- [ ] **Google Docs** - Support .gdoc links or direct Google Drive API integration

#### 1.2 Export Formats
- [x] PDF (jsPDF) ✅
- [ ] **Word (.docx)** - Use `docx` library for proper .docx generation
- [ ] **Apple Pages (.pages)** - Generate Pages-compatible ZIP/XML structure
- [ ] **Google Docs** - Export via Google Drive API or provide .docx for import

### Phase 2: PDF Export Improvements
- [ ] Enhance jsPDF implementation with better formatting
- [ ] Add proper styling, fonts, and layout
- [ ] Remove print fallback (rely on jsPDF only)

### Phase 3: Offline Support
- [ ] Implement IndexedDB integration in main app
- [ ] Connect service worker sync function
- [ ] Add offline indicator UI
- [ ] Implement sync queue for when connection is restored

### Phase 4: Security & Performance
- [ ] Add rate limiting to Firebase Functions
- [ ] Implement Firebase App Check
- [ ] Add request validation and abuse prevention

## Libraries Needed

1. **docx** (for .docx export): `https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.js`
2. **jszip** (for Pages format): `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js`
3. **Google Drive API** (optional, for Google Docs): Requires OAuth setup

## Future Recommendations (from SETUP_CHECKLIST.md)

1. ✅ Service worker sync requires additional IndexedDB integration - **TO DO**
2. ✅ PDF export uses browser print - **IMPROVING**
3. ✅ Word export generates .doc file (not .docx) - **FIXING**
4. ✅ Consider adding Firebase App Check - **TO DO**
5. ✅ Consider adding rate limiting for API calls - **TO DO**

## Additional Future Enhancements

- Enhanced Analytics: Advanced user behavior tracking
- Resume Templates: Customizable templates for different industries
- Integration with Job Portals: Direct submission to job boards
- Mobile Application: Native mobile app version
- AI-Powered Suggestions: Real-time resume improvement suggestions
- Multilingual Support: Resume creation in multiple languages
