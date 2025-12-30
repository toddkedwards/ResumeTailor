import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Configuration
const APP_ID = 'resume-tailor-v1';
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyALXDoW17ultZ3rlSNr9oL4GE6DLCQa3tI",
  authDomain: "resume-tailor-f4f7c.firebaseapp.com",
  projectId: "resume-tailor-f4f7c",
  storageBucket: "resume-tailor-f4f7c.firebasestorage.app",
  messagingSenderId: "697064626570",
  appId: "1:697064626570:web:b9c65f441c8561bab51073"
};

// Constants
const CREDIT_COST = 1; // 1 credit per generation
const PURCHASE_BUNDLE = 5; // 5 credits for $2.00 (simulated)

// Initialize Firebase
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

function App() {
  const [userId, setUserId] = useState(null);
  const [credits, setCredits] = useState(0);
  const [jobDescription, setJobDescription] = useState('');
  const [resumeSection, setResumeSection] = useState('');
  const [tailoredText, setTailoredText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const unsubscribeRef = useRef(null);

  // Initialize authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        setIsLoading(false);
      } else {
        // Sign in anonymously
        try {
          const userCredential = await signInAnonymously(auth);
          setUserId(userCredential.user.uid);
          setIsLoading(false);
        } catch (error) {
          console.error('Error signing in anonymously:', error);
          setError('Failed to initialize. Please refresh the page.');
          setIsLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Set up real-time credit balance listener
  useEffect(() => {
    if (!userId) return;

    const creditsPath = `artifacts/${APP_ID}/users/${userId}/profile/data`;
    const creditsDocRef = doc(db, creditsPath);

    // Set up real-time listener
    unsubscribeRef.current = onSnapshot(
      creditsDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setCredits(data.credits_balance || 0);
        } else {
          // Initialize document with 0 credits if it doesn't exist
          setCredits(0);
          try {
            await setDoc(creditsDocRef, {
              credits_balance: 0,
              created_at: serverTimestamp(),
              updated_at: serverTimestamp()
            }, { merge: true });
          } catch (error) {
            console.error('Error initializing credits document:', error);
          }
        }
      },
      (error) => {
        console.error('Error listening to credits:', error);
        setError('Failed to load credit balance.');
      }
    );

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [userId]);

  // Decrement credits function
  const decrementCredits = async () => {
    if (!userId) return false;

    const creditsPath = `artifacts/${APP_ID}/users/${userId}/profile/data`;
    const creditsDocRef = doc(db, creditsPath);

    try {
      const docSnap = await getDoc(creditsDocRef);
      const currentCredits = docSnap.exists() ? (docSnap.data().credits_balance || 0) : 0;

      if (currentCredits < CREDIT_COST) {
        return false;
      }

      await updateDoc(creditsDocRef, {
        credits_balance: currentCredits - CREDIT_COST,
        updated_at: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error decrementing credits:', error);
      return false;
    }
  };

  // Simulate credit purchase (for testing/demo)
  const simulateCreditPurchase = async () => {
    if (!userId) {
      setError('Please wait for authentication to complete.');
      return;
    }

    const creditsPath = `artifacts/${APP_ID}/users/${userId}/profile/data`;
    const creditsDocRef = doc(db, creditsPath);

    try {
      const docSnap = await getDoc(creditsDocRef);
      const currentCredits = docSnap.exists() ? (docSnap.data().credits_balance || 0) : 0;

      await setDoc(creditsDocRef, {
        credits_balance: currentCredits + PURCHASE_BUNDLE,
        updated_at: serverTimestamp()
      }, { merge: true });

      alert(`Successfully added ${PURCHASE_BUNDLE} credits! Total: ${currentCredits + PURCHASE_BUNDLE}`);
    } catch (error) {
      console.error('Error purchasing credits:', error);
      setError('Failed to purchase credits. Please try again.');
    }
  };

  // Generate tailored resume
  const generateTailoredResume = async () => {
    // Validate inputs
    if (!jobDescription.trim()) {
      setError('Please enter a Job Description.');
      return;
    }
    if (!resumeSection.trim()) {
      setError('Please enter your Current Resume Section.');
      return;
    }

    // Check credits
    if (credits < CREDIT_COST) {
      setError(`Insufficient credits. You need ${CREDIT_COST} credit to generate. Please purchase credits.`);
      return;
    }

    setIsGenerating(true);
    setError(null);
    setTailoredText('');

    try {
      // Decrement credits BEFORE making API call
      const creditDeducted = await decrementCredits();
      if (!creditDeducted) {
        setError('Failed to deduct credits. Please try again.');
        setIsGenerating(false);
        return;
      }

      // Call Firebase Function for Gemini API
      const tailorResume = httpsCallable(functions, 'tailorResume');
      const result = await tailorResume({
        jobDescription: jobDescription.trim(),
        resumeSection: resumeSection.trim()
      });

      if (result.data && result.data.tailoredText) {
        setTailoredText(result.data.tailoredText);
      } else {
        throw new Error('No tailored text returned from API');
      }
    } catch (error) {
      console.error('Error generating tailored resume:', error);
      
      // Refund credit if generation failed
      if (userId) {
        const creditsPath = `artifacts/${APP_ID}/users/${userId}/profile/data`;
        const creditsDocRef = doc(db, creditsPath);
        try {
          const docSnap = await getDoc(creditsDocRef);
          const currentCredits = docSnap.exists() ? (docSnap.data().credits_balance || 0) : 0;
          await updateDoc(creditsDocRef, {
            credits_balance: currentCredits + CREDIT_COST,
            updated_at: serverTimestamp()
          });
        } catch (refundError) {
          console.error('Error refunding credit:', refundError);
        }
      }

      setError(error.message || 'Failed to generate tailored resume. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy tailored text to clipboard
  const copyToClipboard = () => {
    if (!tailoredText) return;

    navigator.clipboard.writeText(tailoredText).then(() => {
      alert('Copied to clipboard!');
    }).catch((error) => {
      console.error('Failed to copy:', error);
      setError('Failed to copy to clipboard.');
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Resume Tailor</h1>
          <p className="text-gray-600">Optimize your resume for ATS keyword alignment</p>
          
          {/* Credit Balance Display */}
          <div className="mt-4 inline-block bg-white rounded-lg shadow-md px-6 py-3">
            <span className="text-sm text-gray-600">Credits: </span>
            <span className="text-2xl font-bold text-indigo-600">{credits}</span>
            <button
              onClick={simulateCreditPurchase}
              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              Buy {PURCHASE_BUNDLE} Credits ($2.00)
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            {/* Job Description */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Job Description (JD)
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Current Resume Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Resume Section
              </label>
              <textarea
                value={resumeSection}
                onChange={(e) => setResumeSection(e.target.value)}
                placeholder="Paste the resume section you want to tailor here..."
                className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={generateTailoredResume}
              disabled={isGenerating || credits < CREDIT_COST}
              className="w-full py-4 bg-indigo-600 text-white rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : `Generate Tailored Resume (${CREDIT_COST} Credit)`}
            </button>
          </div>

          {/* Output Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-semibold text-gray-700">
                Tailored Resume Section
              </label>
              {tailoredText && (
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  Copy Tailored Text
                </button>
              )}
            </div>
            <div className="border border-gray-300 rounded-lg p-4 h-[600px] overflow-y-auto bg-gray-50">
              {tailoredText ? (
                <p className="text-gray-800 whitespace-pre-wrap">{tailoredText}</p>
              ) : (
                <p className="text-gray-400 italic">Your tailored resume section will appear here...</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Google Gemini AI • Optimized for ATS keyword matching</p>
        </div>
      </div>
    </div>
  );
}

export default App;

