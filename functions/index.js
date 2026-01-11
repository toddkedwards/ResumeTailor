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

// Get app ID from config, default to 'resume-tailor-v1' to match frontend
const APP_ID = functions.config().app?.id || 'resume-tailor-v1';

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
      success_url: `${data.successUrl || 'https://resumeforgeapp.com'}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.cancelUrl || 'https://resumeforgeapp.com'}`,
      metadata: {
        firebaseUserId: userId,
        creditsToAdd: '5', // Add 5 credits per purchase ($2.00 for 5 credits)
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
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Has body:', !!req.body);
  console.log('Body type:', typeof req.body);
  console.log('Raw body type:', typeof req.rawBody);
  console.log('Raw body length:', req.rawBody?.length || 0);

  try {
    if (!stripe) {
      console.error('❌ Stripe is not configured');
      return res.status(500).json({ error: 'Stripe is not configured' });
    }
    console.log('✅ Stripe is configured');

    const sig = req.headers['stripe-signature'];
    const webhookSecret = functions.config().stripe?.webhook_secret;

    console.log('Signature present:', !!sig);
    console.log('Webhook secret present:', !!webhookSecret);

    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    if (!sig) {
      console.error('❌ Stripe signature header missing');
      return res.status(400).json({ error: 'Stripe signature header missing' });
    }

    let event;

    try {
      // For Firebase Functions, we need to use req.rawBody if available, otherwise req.body
      const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
      console.log('Attempting to construct event with rawBody length:', rawBody.length);
      
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      console.log('✅ Webhook event verified:', event.type, event.id);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', {
        error: err.message,
        errorStack: err.stack,
        hasSignature: !!sig,
        signatureLength: sig?.length || 0,
        hasSecret: !!webhookSecret,
        secretLength: webhookSecret?.length || 0,
        bodyLength: req.rawBody?.length || req.body?.length || 0
      });
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event with proper error handling
    console.log('Processing event type:', event.type);
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log('📦 Processing checkout.session.completed:', {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            userId: session.metadata?.firebaseUserId,
            creditsToAdd: session.metadata?.creditsToAdd,
            customer: session.customer,
            fullMetadata: session.metadata
          });
          
          if (session.payment_status === 'paid') {
            console.log('✅ Payment is paid, calling handlePaymentSuccess...');
            await handlePaymentSuccess(session);
            console.log('✅ Successfully processed payment for session:', session.id);
          } else {
            console.warn('⚠️ Session not paid yet:', session.payment_status);
          }
          break;
      
      case 'payment_intent.succeeded':
        // SKIP payment_intent.succeeded to prevent duplicate credit additions
        // The checkout.session.completed event is the primary event and handles credit addition
        // Processing both events causes credits to be added twice
        console.log('⚠️ payment_intent.succeeded received - skipping to prevent duplicate processing');
        console.log('Payment intent details:', {
          paymentIntentId: event.data.object.id,
          amount: event.data.object.amount,
          customer: event.data.object.customer
        });
        console.log('ℹ️ Credits are handled by checkout.session.completed event only');
        // Explicitly do NOT process payment_intent - let checkout.session.completed handle it
        break;

        // Subscription events no longer needed for one-time payments
        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      console.log('✅ Event processed successfully, sending response');
      res.json({ received: true });
    } catch (error) {
      console.error('❌ Error processing webhook event:', {
        error: error.message,
        stack: error.stack,
        eventType: event?.type || 'unknown',
        eventId: event?.id || 'unknown'
      });
      // Return 500 so Stripe knows to retry
      res.status(500).json({ 
        received: false, 
        error: error.message 
      });
    }
  } catch (outerError) {
    console.error('❌ Outer error in webhook handler:', {
      error: outerError.message,
      stack: outerError.stack
    });
    res.status(500).json({ 
      received: false, 
      error: outerError.message 
    });
  }
});

/**
 * Handle payment success - add credits to user account
 */
async function handlePaymentSuccess(session) {
  console.log('handlePaymentSuccess called:', {
    sessionId: session.id,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
    customer: session.customer
  });

  const userId = session.metadata?.firebaseUserId;
  if (!userId) {
    console.error('No firebaseUserId in session metadata', {
      sessionId: session.id,
      metadata: session.metadata
    });
    return;
  }

  // Check if payment was actually completed
  if (session.payment_status !== 'paid') {
    console.warn(`Payment not completed for session ${session.id}. Status: ${session.payment_status}`);
    return;
  }

  const sessionId = session.id;
  const userRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${userId}`);
  
  // Check if this session has already been processed (idempotency check)
  const processedSessionsRef = admin.firestore().collection('processed_payments');
  const sessionDoc = await processedSessionsRef.doc(sessionId).get();
  
  if (sessionDoc.exists) {
    console.log(`⚠️ Session ${sessionId} has already been processed. Skipping to prevent duplicate credits.`);
    return;
  }

  const creditsToAdd = parseInt(session.metadata?.creditsToAdd || '5', 10);
  
    console.log('Adding credits:', {
      userId,
      creditsToAdd,
      appId: APP_ID,
      userPath: `artifacts/${APP_ID}/users/${userId}`
    });
    
    try {
      // First, check if the document exists and log its current state
      const beforeDoc = await userRef.get();
      console.log('Before update - Document exists:', beforeDoc.exists);
      if (beforeDoc.exists) {
        console.log('Before update - Current data:', beforeDoc.data());
      }
      
      // Use transaction to prevent race conditions and ensure idempotency
      const result = await admin.firestore().runTransaction(async (transaction) => {
        // Check if session was already processed (double-check in transaction)
        const processedDoc = await transaction.get(processedSessionsRef.doc(sessionId));
        if (processedDoc.exists) {
          console.log(`⚠️ Session ${sessionId} already processed in transaction. Aborting.`);
          throw new Error('Session already processed');
        }
        
        const doc = await transaction.get(userRef);
        const existingCredits = doc.exists ? (doc.data().credits || 0) : 0;
        const newCredits = existingCredits + creditsToAdd;
        
        console.log('Transaction: updating credits', {
          docExists: doc.exists,
          existingCredits,
          creditsToAdd,
          newCredits
        });
        
        const updateData = {
          credits: newCredits,
          hasPaidOnce: true,
          lastCreditPurchase: admin.firestore.FieldValue.serverTimestamp(),
          stripeCustomerId: session.customer,
        };
        
        console.log('Transaction: setting data', updateData);
        
        // Mark session as processed BEFORE updating credits
        transaction.set(processedSessionsRef.doc(sessionId), {
          userId: userId,
          sessionId: sessionId,
          creditsAdded: creditsToAdd,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          amount: session.amount_total,
          currency: session.currency
        });
        
        transaction.set(userRef, updateData, { merge: true });
        
        return { success: true, newCredits };
      });
      
      console.log('Transaction completed:', result);

    // Verify the update
    const verifyDoc = await userRef.get();
    const newCredits = verifyDoc.exists ? (verifyDoc.data().credits || 0) : 0;
    console.log(`✅ Successfully added ${creditsToAdd} credits to user: ${userId}. New total: ${newCredits}`);
    
    // Log full user document for debugging
    if (verifyDoc.exists) {
      console.log('User document after update:', verifyDoc.data());
    } else {
      console.error('⚠️ User document does not exist after update!');
    }
  } catch (error) {
    console.error(`❌ Error adding credits to user ${userId}:`, {
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorStack: error.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    // Log the full error object
    console.error('Full error object:', error);
    
    // Check if it's a Firestore permission error
    if (error.code === 7 || error.message?.includes('permission') || error.message?.includes('PERMISSION_DENIED')) {
      console.error('⚠️ PERMISSION DENIED - Check Firestore security rules!');
      console.error('User path:', `artifacts/${APP_ID}/users/${userId}`);
      console.error('APP_ID:', APP_ID);
    }
    
    throw error; // Re-throw so webhook can retry
  }
}

/**
 * Verify and add credits for a checkout session (manual verification)
 * This can be called from the frontend if webhook hasn't processed yet
 */
exports.verifyPaymentAndAddCredits = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  if (!stripe) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stripe is not configured'
    );
  }

  const { sessionId } = data;
  if (!sessionId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Session ID is required'
    );
  }

  const userId = context.auth.uid;

  try {
    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verify this session belongs to the current user
    if (session.metadata?.firebaseUserId !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'This session does not belong to the current user'
      );
    }

    // Check if payment was completed
    if (session.payment_status !== 'paid') {
      return {
        success: false,
        message: `Payment not completed. Status: ${session.payment_status}`,
        creditsAdded: 0
      };
    }

    // Check if credits were already added (prevent double-adding)
    const userRef = admin.firestore().doc(`artifacts/${APP_ID}/users/${userId}`);
    const userDoc = await userRef.get();
    const lastPurchase = userDoc.exists ? userDoc.data().lastCreditPurchase : null;
    
    // If purchase was very recent (within last minute), might be duplicate
    // But we'll still process it to be safe (transaction will handle it)
    
    // Add credits
    await handlePaymentSuccess(session);
    
    // Get updated credits
    const updatedDoc = await userRef.get();
    const newCredits = updatedDoc.exists ? (updatedDoc.data().credits || 0) : 0;
    
    return {
      success: true,
      message: 'Credits added successfully',
      creditsAdded: parseInt(session.metadata?.creditsToAdd || '5', 10),
      totalCredits: newCredits
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to verify payment',
      error.message
    );
  }
});

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
 * Rate Limiting Middleware
 * Limits API calls per user to prevent abuse
 */
async function checkRateLimit(userId, functionName, maxRequests = 10, windowMinutes = 1) {
  if (!userId) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated for rate limiting'
    );
  }

  const db = admin.firestore();
  const rateLimitRef = db.collection('rate_limits').doc(`${userId}_${functionName}`);
  const now = admin.firestore.Timestamp.now();
  const windowStart = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - (windowMinutes * 60 * 1000)
  );

  try {
    const rateLimitDoc = await rateLimitRef.get();
    
    if (!rateLimitDoc.exists) {
      // First request - create rate limit document
      await rateLimitRef.set({
        requests: [now],
        lastRequest: now,
        count: 1
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const rateLimitData = rateLimitDoc.data();
    const requests = rateLimitData.requests || [];
    
    // Filter out requests outside the time window
    const recentRequests = requests.filter(
      req => req.toMillis() > windowStart.toMillis()
    );

    if (recentRequests.length >= maxRequests) {
      const oldestRequest = recentRequests[0];
      const waitUntil = oldestRequest.toMillis() + (windowMinutes * 60 * 1000);
      const waitSeconds = Math.ceil((waitUntil - now.toMillis()) / 1000);
      
      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`,
        { retryAfter: waitSeconds }
      );
    }

    // Add current request
    recentRequests.push(now);
    
    // Update rate limit document
    await rateLimitRef.set({
      requests: recentRequests,
      lastRequest: now,
      count: recentRequests.length
    }, { merge: true });

    return { 
      allowed: true, 
      remaining: maxRequests - recentRequests.length 
    };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    // If rate limit check fails, allow the request (fail open)
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: maxRequests };
  }
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

  // Check rate limit (10 requests per minute)
  await checkRateLimit(context.auth.uid, 'generateTailoredResume', 10, 1);

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

/**
 * Generate cover letter based on job description and resume
 * Returns a tailored cover letter
 */
exports.generateCoverLetter = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate cover letters'
    );
  }

  // Check rate limit (10 requests per minute)
  await checkRateLimit(context.auth.uid, 'generateCoverLetter', 10, 1);

  const { jobDescription, resumeText, applicantName, companyName } = data;
  
  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Job description is required'
    );
  }
  
  if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Resume text is required'
    );
  }

  // Get Gemini API key from config
  const geminiApiKey = functions.config().gemini?.api_key;
  
  if (!geminiApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key not configured'
    );
  }

  const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

  try {
    const prompt = `You are an expert cover letter writer. Create a professional, compelling cover letter.

Job Description:
${jobDescription}

Applicant's Resume:
${resumeText}

${applicantName ? `Applicant Name: ${applicantName}\n` : ''}${companyName ? `Company Name: ${companyName}\n` : ''}

Task:
1. Write a professional cover letter that highlights the applicant's relevant experience and skills
2. Match the applicant's qualifications to the job requirements
3. Show enthusiasm for the position and company
4. Keep it concise (3-4 paragraphs, approximately 250-350 words)
5. Use a professional but engaging tone
6. Include specific examples from the resume that relate to the job description

Return your response as a JSON object with this exact structure:
{
  "coverLetter": "The complete cover letter text",
  "keyHighlights": ["Highlight 1", "Highlight 2", "Highlight 3"],
  "wordCount": 300
}

IMPORTANT:
- Make the cover letter specific to this job and company
- Reference specific requirements from the job description
- Use the applicant's actual experience and achievements
- Ensure the cover letter is professional and ATS-friendly`;

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
      throw new Error(`Gemini API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = result.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      parsedResult = JSON.parse(jsonText);
    } catch (parseError) {
      // Fallback: treat entire response as cover letter
      parsedResult = {
        coverLetter: responseText,
        keyHighlights: [],
        wordCount: responseText.split(/\s+/).length
      };
    }

    return {
      success: true,
      coverLetter: parsedResult.coverLetter || responseText,
      keyHighlights: parsedResult.keyHighlights || [],
      wordCount: parsedResult.wordCount || (parsedResult.coverLetter || responseText).split(/\s+/).length
    };
  } catch (error) {
    console.error('Cover letter generation error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate cover letter',
      error.message
    );
  }
});

/**
 * Generate interview questions based on job description and resume
 * Returns tailored interview questions with tips
 */
exports.generateInterviewQuestions = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to generate interview questions'
    );
  }

  // Check rate limit (10 requests per minute)
  await checkRateLimit(context.auth.uid, 'generateInterviewQuestions', 10, 1);

  const { jobDescription, resumeText } = data;
  
  if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Job description is required'
    );
  }
  
  if (!resumeText || typeof resumeText !== 'string' || !resumeText.trim()) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Resume text is required'
    );
  }

  // Get Gemini API key from config
  const geminiApiKey = functions.config().gemini?.api_key;
  
  if (!geminiApiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Gemini API key not configured'
    );
  }

  const geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent';

  try {
    const prompt = `You are an expert HR interviewer. Based on the following job description and resume, generate 8-12 diverse interview questions. Include a mix of behavioral, technical, situational, and experience-based questions. For each question, provide a brief tip on how to answer it effectively.

Job Description:
${jobDescription}

Resume:
${resumeText}

Format your response as a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "type": "behavioral|technical|situational|experience",
      "tips": "Brief tip on how to answer this question effectively"
    }
  ]
}

IMPORTANT:
- Generate 8-12 questions total
- Include a mix of question types (behavioral, technical, situational, experience-based)
- Make questions specific to the job description and candidate's experience
- Provide actionable tips for each question
- Ensure all questions are relevant to the position`;

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
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const responseText = result.candidates[0].content.parts[0].text;
    
    // Try to parse JSON response
    let parsedResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      parsedResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('Could not parse JSON from Gemini response, attempting fallback:', parseError);
      // Fallback: try to extract questions if not perfectly JSON
      const questions = responseText.split(/\d+\.\s*/).filter(Boolean).map(q => q.trim());
      parsedResult = {
        questions: questions.map(q => {
          const lines = q.split('\n');
          return {
            question: lines[0].trim(),
            type: 'general',
            tips: lines.slice(1).join(' ').replace(/Tip:\s*/i, '').trim() || 'Prepare a specific example from your experience.'
          };
        }).filter(q => q.question)
      };
    }

    // Ensure questions array exists and is valid
    if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
      throw new Error('Invalid response format: questions array not found');
    }

    return {
      success: true,
      questions: parsedResult.questions.filter(q => q && q.question),
      totalQuestions: parsedResult.questions.length
    };
  } catch (error) {
    console.error('Interview questions generation error:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate interview questions',
      error.message
    );
  }
});
