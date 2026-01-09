const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Node.js 18+ has fetch built-in
// Firebase Functions runs on Node 18, so fetch is available globally

admin.initializeApp();

// Initialize Stripe only if secret key is configured
let stripe = null;
try {
  const stripeSecretKey = functions.config().stripe?.secret_key;
  if (stripeSecretKey) {
    stripe = require('stripe')(stripeSecretKey);
  }
} catch (error) {
  console.warn('Stripe not configured:', error.message);
}

// Get app ID from config, default to 'resumeforge-v1' for ResumeForge
const APP_ID = functions.config().app?.id || 'resumeforge-v1';

/**
 * Create Stripe Checkout Session
 * This function creates a Stripe Checkout session for one-time credit purchases
 * Each purchase adds 1 credit (1 generation) to the user's account
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

  if (!priceId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Price ID is required'
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

    // Create Checkout Session (one-time payment for credits)
    // Note: Apple Pay and Google Pay are automatically enabled when 'card' is in payment_method_types
    // They appear automatically on supported devices (Safari on iOS/macOS for Apple Pay, Chrome/Android for Google Pay)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'], // 'card' automatically enables Apple Pay/Google Pay on supported devices
      mode: 'payment', // One-time payment for credits
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${data.successUrl || 'https://resumeforgeapp.com?session_id={CHECKOUT_SESSION_ID}'}`,
      cancel_url: `${data.cancelUrl || 'https://resumeforgeapp.com'}`,
      metadata: {
        firebaseUserId: userId,
        creditsToAdd: '5', // Add 5 credits per purchase ($1.00 for 5 credits)
      },
      // Ensure 3D Secure is enabled (required for Apple Pay/Google Pay)
      payment_method_options: {
        card: {
          request_three_d_secure: 'automatic',
        },
      },
    });

    // Return both sessionId (for backward compatibility) and url (for modern redirect)
    return { 
      sessionId: session.id,
      url: session.url 
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create checkout session',
      error.message
    );
  }
});

/**
 * Stripe Webhook Handler
 * Handles Stripe webhook events for subscription updates
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (!stripe) {
    console.error('Stripe is not configured');
    return res.status(500).json({ error: 'Stripe is not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe?.webhook_secret;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event with proper error handling
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handlePaymentSuccess(session);
        break;

      // Subscription events no longer needed for one-time payments
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    // Return 500 so Stripe knows to retry
    res.status(500).json({ 
      received: false, 
      error: error.message 
    });
  }
});

/**
 * Handle payment success - add credits to user account
 */
async function handlePaymentSuccess(session) {
  const userId = session.metadata?.firebaseUserId;
  if (!userId) {
    console.error('No firebaseUserId in session metadata');
    return;
  }

  const creditsToAdd = parseInt(session.metadata?.creditsToAdd || '1', 10);
  const userRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${userId}`);
  const userDoc = await userRef.get();

  const currentCredits = userDoc.exists() ? (userDoc.data().credits || 0) : 0;
  const hasPaidOnce = userDoc.exists() ? (userDoc.data().hasPaidOnce || false) : false;

  await userRef.set({
    credits: currentCredits + creditsToAdd,
    hasPaidOnce: true, // Unlock premium features after first payment
    lastCreditPurchase: admin.firestore.FieldValue.serverTimestamp(),
    stripeCustomerId: session.customer,
  }, { merge: true });

  console.log(`Added ${creditsToAdd} credits to user: ${userId}`);
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription) {
  const customerId = subscription.customer;
  
  // Find user by Stripe customer ID
  const usersRef = admin.firestore().collection(`artifacts/${APP_ID}/users`);
  const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
  
  if (snapshot.empty) {
    console.error(`No user found for customer: ${customerId}`);
    return;
  }

  const userDoc = snapshot.docs[0];
  const userRef = userDoc.ref;

  // Map Stripe subscription status to our internal status
  // Valid Stripe statuses: trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused
  let subscriptionStatus;
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    subscriptionStatus = 'active';
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
    subscriptionStatus = 'canceled';
  } else {
    // For past_due, incomplete, paused - keep current status or set to appropriate state
    // past_due and incomplete might still have access during grace period
    // For now, we'll mark as active if not explicitly canceled
    subscriptionStatus = subscription.status === 'past_due' || subscription.status === 'incomplete' ? 'active' : 'canceled';
    console.warn(`Subscription in non-standard status: ${subscription.status}, mapped to: ${subscriptionStatus}`);
  }

  const updates = {
    subscriptionStatus: subscriptionStatus,
    subscriptionEndDate: subscription.current_period_end 
      ? admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000)
      : null,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status, // Store raw Stripe status for reference
  };

  await userRef.update(updates);
  console.log(`Subscription updated for user: ${userDoc.id}`);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  const customerId = subscription.customer;
  
  // Find user by Stripe customer ID
  const usersRef = admin.firestore().collection(`artifacts/${APP_ID}/users`);
  const snapshot = await usersRef.where('stripeCustomerId', '==', customerId).get();
  
  if (snapshot.empty) {
    console.error(`No user found for customer: ${customerId}`);
    return;
  }

  const userDoc = snapshot.docs[0];
  const userRef = userDoc.ref;

  await userRef.update({
    subscriptionStatus: 'canceled',
    subscriptionEndDate: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Subscription canceled for user: ${userDoc.id}`);
}

/**
 * Generate tailored resume based on job description and resume section
 * Returns tailored resume, keyword matches, and improvement tips
 */
exports.generateTailoredResume = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to tailor resumes'
    );
  }

  const { jobDescription, resumeSection, sectionType, industry } = data;
  
  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Job description is required'
    );
  }
  
  if (!resumeSection || typeof resumeSection !== 'string' || !resumeSection.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Resume section is required'
    );
  }

  // Get Gemini API key from config
  const geminiApiKey = functions.config().gemini?.api_key;
  
  if (!geminiApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key not configured. Please set functions.config().gemini.api_key'
    );
  }

  const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

  try {
    // Industry-specific guidance
    const industryGuidance = industry ? `\n\nIndustry Context: ${industry}. Tailor the resume section specifically for this industry, using industry-standard terminology and best practices.` : '';
    
    // Create prompt for resume tailoring
    const prompt = `You are an expert resume writer and ATS (Applicant Tracking System) specialist.${industryGuidance}

Job Description:
${jobDescription}

Current Resume Section (${sectionType || 'general'}):
${resumeSection}

Task:
1. Tailor the resume section to match the job description while maintaining authenticity
2. Identify keywords from the job description that are missing or underrepresented in the current resume
3. Provide detailed improvement tips for better ATS optimization
4. Identify specific changes made (what was added, modified, or improved)

Return your response as a JSON object with this exact structure:
{
  "tailoredResume": "The improved, tailored version of the resume section",
  "keywordMatches": {
    "matched": ["keyword1", "keyword2", "keyword3"],
    "missing": ["keyword4", "keyword5", "keyword6"],
    "matchPercentage": 75
  },
  "improvementTips": [
    {"tip": "Specific improvement tip text", "category": "ats|achievements|skills|formatting", "priority": "high|medium|low"}
  ],
  "changes": {
    "added": ["List of phrases or keywords that were added"],
    "modified": ["List of phrases that were improved or modified"],
    "improvements": ["Specific improvements made to the resume"]
  }
}

IMPORTANT: 
- Always provide at least 3-5 improvement tips
- Include specific keywords from the job description in the keywordMatches
- Be specific about what changed in the changes section
- Make the tailored resume professional, ATS-friendly, and aligned with the job requirements
- Ensure all arrays have at least some content (never empty arrays)`;

    const response = await fetch(`${geminiApiUrl}?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `API error: ${response.status}`;
      
      console.error('Gemini API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      throw new functions.https.HttpsError(
        'internal',
        `Gemini API error: ${errorMessage}`,
        { status: response.status, error: errorData }
      );
    }

    const result = await response.json();
    
    // Extract text from Gemini response
    let responseText = '';
    if (result.candidates && result.candidates[0] && result.candidates[0].content) {
      responseText = result.candidates[0].content.parts[0].text;
    }

    // Try to parse JSON from the response
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        parsedResult = JSON.parse(responseText);
      }
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from text
      console.warn('Failed to parse JSON response, creating fallback structure');
      parsedResult = {
        tailoredResume: responseText,
        keywordMatches: {
          matched: [],
          missing: [],
          matchPercentage: 0
        },
        improvementTips: [],
        changes: {
          added: [],
          modified: [],
          improvements: []
        }
      };
    }

    return {
      success: true,
      ...parsedResult
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to tailor resume',
      error.message
    );
  }
});
