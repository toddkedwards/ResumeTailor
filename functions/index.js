const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();

const APP_ID = functions.config().app?.id || 'resume-tailor-v1';
const GEMINI_API_KEY = functions.config().gemini?.api_key;

// Initialize Gemini AI
let genAI;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
} else {
  console.warn('Gemini API key not configured. Set it with: firebase functions:config:set gemini.api_key="YOUR_KEY"');
}

/**
 * Tailor Resume Function
 * Takes a job description and resume section, returns ATS-optimized tailored content
 */
exports.tailorResume = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use this function.'
    );
  }

  const { jobDescription, resumeSection } = data;

  // Validate inputs
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Job description is required and must be a non-empty string.'
    );
  }

  if (!resumeSection || typeof resumeSection !== 'string' || resumeSection.trim().length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Resume section is required and must be a non-empty string.'
    );
  }

  if (!GEMINI_API_KEY || !genAI) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API is not configured. Please contact support.'
    );
  }

  try {
    // Get the Gemini model (using latest stable model)
    // Available models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Create sophisticated system prompt for ATS optimization
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) consultant and resume optimization specialist. Your task is to rewrite resume content to maximize keyword alignment with a specific job description while maintaining authenticity and accuracy.

**Your Objectives:**
1. Identify key skills, technologies, qualifications, and terminology from the job description
2. Rewrite the resume section to naturally incorporate these keywords and phrases
3. Maintain the original meaning and accomplishments while enhancing ATS compatibility
4. Use action verbs and quantifiable achievements where possible
5. Ensure the content is professional, concise, and compelling

**Guidelines:**
- Do NOT fabricate experience or skills that aren't in the original resume
- Do NOT change job titles, company names, or dates
- DO incorporate relevant keywords from the job description naturally
- DO enhance descriptions with industry-standard terminology
- DO maintain the same level of detail and structure
- DO focus on achievements and impact, not just responsibilities

**Output Format:**
Return ONLY the rewritten resume section text. Do not include explanations, notes, or meta-commentary. The output should be ready to paste directly into a resume.`;

    const userPrompt = `**Job Description:**
${jobDescription}

**Current Resume Section:**
${resumeSection}

Please rewrite the resume section above to optimize it for ATS keyword alignment with the provided job description.`;

    // Generate content
    const result = await model.generateContent(systemPrompt + '\n\n' + userPrompt);
    const response = await result.response;
    const tailoredText = response.text();

    if (!tailoredText || tailoredText.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    return {
      tailoredText: tailoredText.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Provide more specific error messages
    if (error.message && error.message.includes('API key')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Gemini API key is invalid or expired. Please contact support.'
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate tailored resume: ${error.message || 'Unknown error'}`
    );
  }
});

