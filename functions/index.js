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
    // First, list available models to find one that works
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    let availableModelName = null;
    
    try {
      const listResponse = await fetch(listModelsUrl);
      if (listResponse.ok) {
        const modelsData = await listResponse.json();
        console.log('Available models:', JSON.stringify(modelsData, null, 2));
        
        // Find a model that supports generateContent
        const availableModel = modelsData.models?.find(m => 
          m.name && 
          m.supportedGenerationMethods && 
          m.supportedGenerationMethods.includes('generateContent')
        );
        
        if (availableModel) {
          // Extract model name (format: models/gemini-xxx)
          availableModelName = availableModel.name.replace('models/', '');
          console.log(`Found available model: ${availableModelName}`);
        } else {
          console.log('No model found with generateContent support. Available models:', 
            modelsData.models?.map(m => ({ name: m.name, methods: m.supportedGenerationMethods })) || 'none');
        }
      } else {
        const errorText = await listResponse.text();
        console.error('Error listing models:', errorText);
      }
    } catch (listError) {
      console.error('Error calling ListModels:', listError);
    }
    
    // Use the found model, or try common model names as fallback
    const modelName = availableModelName || 'gemini-pro';
    console.log(`Using model: ${modelName}`);
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Create a more directive and explicit prompt for better tailoring
    const prompt = `You are an expert ATS (Applicant Tracking System) optimization specialist. Your task is to rewrite a resume section to maximize keyword alignment with a specific job description.

CRITICAL REQUIREMENTS:
1. Extract ALL key terms, skills, technologies, qualifications, and phrases from the job description
2. Identify synonyms and related terms that appear in the job description
3. Rewrite the resume section to naturally incorporate these exact keywords and phrases
4. Match the language, terminology, and phrasing used in the job description
5. Maintain the original meaning and accomplishments - do NOT add false information
6. Preserve job titles, company names, and dates exactly as written
7. Use action verbs that match the style of the job description
8. Emphasize achievements and impact, especially those relevant to the job requirements

KEYWORD MATCHING STRATEGY:
- If the job description mentions "JavaScript", use "JavaScript" (not "JS" or "javascript")
- If it mentions "React.js", use "React.js" (not just "React")
- Match the exact terminology: "Agile methodology" vs "agile" vs "scrum"
- Incorporate industry-specific terms and buzzwords from the job description
- Use the same phrasing style (e.g., "collaborate with cross-functional teams" if that phrase appears)

OUTPUT REQUIREMENTS:
- Return ONLY the rewritten resume section text
- Do NOT include explanations, notes, or meta-commentary
- Do NOT add markdown formatting
- The output should be ready to paste directly into a resume
- Maintain similar length and structure to the original

JOB DESCRIPTION:
${jobDescription}

CURRENT RESUME SECTION:
${resumeSection}

TASK: Rewrite the "Current Resume Section" above to optimize it for ATS keyword alignment with the "Job Description". Incorporate relevant keywords, phrases, and terminology from the job description while maintaining accuracy and authenticity. Focus on matching the language and requirements specified in the job description.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    // Make the API call
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Gemini API error (${response.status}): ${errorText}`;
      
      // If model not found, provide helpful error
      if (response.status === 404) {
        errorMessage = `Gemini model "${modelName}" is not available. The API key may not have access to this model. Please check your Google Cloud Console to ensure the Generative Language API is enabled and your API key has the correct permissions. Error details: ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const tailoredText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!tailoredText || tailoredText.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    return {
      tailoredText: tailoredText.trim(),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    
    // Provide more specific error messages
    if (error.message && error.message.includes('API key')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Gemini API key is invalid or expired. Please contact support.'
      );
    }

    // If model not found, provide helpful error message
    if (error.message && (error.message.includes('not found') || error.message.includes('404'))) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Gemini model not available. The API key may not have access to this model, or the model name may be incorrect. Error: ${error.message}`
      );
    }

    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate tailored resume: ${error.message || 'Unknown error'}`
    );
  }
});

