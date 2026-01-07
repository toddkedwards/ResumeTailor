const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();

const APP_ID = functions.config().app?.id || 'resume-tailor-v1';
const GEMINI_API_KEY = functions.config().gemini?.api_key;

// Initialize Stripe
let stripe = null;
try {
  const stripeSecretKey = functions.config().stripe?.secret_key;
  if (stripeSecretKey) {
    stripe = require('stripe')(stripeSecretKey);
  }
} catch (error) {
  console.warn('Stripe not configured:', error.message);
}

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

/**
 * Generate Improvement Tips
 * Analyzes job description and resume to provide actionable improvement tips
 */
exports.generateImprovementTips = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to use this function.'
    );
  }

  const { jobDescription, originalResume, tailoredResume } = data;

  // Validate inputs
  if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Job description is required.'
    );
  }

  if (!GEMINI_API_KEY) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key is not configured.'
    );
  }

  try {
    // Find available model
    const listModelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    let availableModelName = 'gemini-pro';
    
    try {
      const listResponse = await fetch(listModelsUrl);
      if (listResponse.ok) {
        const modelsData = await listResponse.json();
        const availableModel = modelsData.models?.find(m => 
          m.name && 
          m.supportedGenerationMethods && 
          m.supportedGenerationMethods.includes('generateContent')
        );
        if (availableModel) {
          availableModelName = availableModel.name.replace('models/', '');
        }
      }
    } catch (listError) {
      console.error('Error listing models:', listError);
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${availableModelName}:generateContent?key=${GEMINI_API_KEY}`;

    const tipsPrompt = `You are a career coach and ATS optimization expert. Analyze the job description and resume section below, then provide 5-7 actionable, specific tips for improving the resume to better match the job requirements.

Focus on:
1. Missing keywords or skills from the job description
2. Skills/experiences to highlight more prominently
3. Action verbs and terminology to use
4. Formatting or structure improvements
5. Industry-specific terminology
6. Quantifiable achievements to add
7. ATS optimization strategies

Return your response as a JSON array of tip objects, each with:
- "title": A short, actionable title (max 60 characters)
- "description": A detailed explanation (2-3 sentences)
- "priority": "high", "medium", or "low"
- "category": One of: "keywords", "skills", "formatting", "terminology", "achievements", "ats"

Example format:
[
  {
    "title": "Add 'Agile methodology' keyword",
    "description": "The job description emphasizes Agile practices. Include 'Agile methodology' or 'Agile/Scrum' in your resume to improve keyword matching.",
    "priority": "high",
    "category": "keywords"
  }
]

JOB DESCRIPTION:
${jobDescription}

ORIGINAL RESUME SECTION:
${originalResume || 'Not provided'}

TAILORED RESUME SECTION:
${tailoredResume || 'Not provided'}

Provide 5-7 specific, actionable tips. Return ONLY valid JSON array, no other text.`;

    const requestBody = {
      contents: [{
        parts: [{
          text: tipsPrompt
        }]
      }]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const tipsText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!tipsText || tipsText.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    // Parse JSON from response
    let tips = [];
    try {
      // Extract JSON array from response
      const jsonMatch = tipsText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing the whole response
        tips = JSON.parse(tipsText);
      }
    } catch (parseError) {
      console.error('Error parsing tips JSON:', parseError);
      // Return a default tip if parsing fails
      tips = [{
        title: "Review the tailored resume above",
        description: "Compare the tailored version with your original to see keyword improvements and formatting changes.",
        priority: "medium",
        category: "ats"
      }];
    }

    // Validate and clean tips
    tips = tips.filter(tip => tip.title && tip.description).slice(0, 7);

    return {
      tips: tips,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

  } catch (error) {
    console.error('Error generating improvement tips:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to generate improvement tips: ${error.message || 'Unknown error'}`
    );
  }
});

/**
 * Create Stripe Checkout Session
 * Creates a checkout session for purchasing credits (5 credits for $2.00)
 */
exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create checkout session'
    );
  }

  if (!stripe) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stripe is not configured. Please set functions.config().stripe.secret_key'
    );
  }

  const userId = context.auth.uid;
  const email = context.auth.token.email || data.email;
  const priceId = data.priceId || functions.config().stripe?.price_id;

  console.log('Creating checkout session with:', { userId, email, priceId });

  if (!priceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Price ID is required. Please configure stripe.price_id in Firebase Functions config.'
    );
  }

  try {
    // Create or retrieve Stripe customer
    let customerId;
    const userRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${userId}`);
    const userDoc = await userRef.get();
    
    if (userDoc.exists && userDoc.data().stripeCustomerId) {
      customerId = userDoc.data().stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUserId: userId
        }
      });
      customerId = customer.id;
      
      // Save customer ID to Firestore
      await userRef.set({
        stripeCustomerId: customerId
      }, { merge: true });
    }

    // Get current URL for success/cancel redirects
    const currentUrl = data.currentUrl || 'https://resume-tailor-f4f7c.web.app';

    // Create Checkout Session (one-time payment for 5 credits)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'payment', // One-time payment
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${currentUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${currentUrl}?canceled=true`,
      metadata: {
        firebaseUserId: userId,
        creditsToAdd: '5', // Add 5 credits per purchase
      },
    });

    return { 
      sessionId: session.id,
      url: session.url 
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to create checkout session: ${error.message || 'Unknown error'}`
    );
  }
});

/**
 * Stripe Webhook Handler
 * Handles checkout.session.completed events to add credits to user account
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret;

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  if (!stripe) {
    console.error('Stripe not initialized');
    return res.status(400).send('Stripe not initialized');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.firebaseUserId;
    const creditsToAdd = parseInt(session.metadata?.creditsToAdd || '5', 10);

    if (!userId) {
      console.error('No firebaseUserId in session metadata');
      return res.status(400).send('No user ID in session metadata');
    }

    try {
      // Add credits to user account
      const creditsPath = `artifacts/${APP_ID}/users/${userId}/profile/data`;
      const creditsRef = admin.firestore().doc(creditsPath);
      const creditsDoc = await creditsRef.get();

      const currentCredits = creditsDoc.exists ? (creditsDoc.data().credits_balance || 0) : 0;

      await creditsRef.set({
        credits_balance: currentCredits + creditsToAdd,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      console.log(`Added ${creditsToAdd} credits to user ${userId}. New balance: ${currentCredits + creditsToAdd}`);

      return res.status(200).send({ received: true });
    } catch (error) {
      console.error('Error adding credits:', error);
      return res.status(500).send('Error processing webhook');
    }
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
});

