#!/bin/bash
# Quick Setup Script for ResumeTailor
# Run this after creating your Firebase project

echo "🚀 ResumeTailor Setup Script"
echo "============================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Install with: npm install -g firebase-tools"
    exit 1
fi

# Get project ID
read -p "Enter your Firebase Project ID: " PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Project ID is required"
    exit 1
fi

echo ""
echo "📦 Setting up Firebase project: $PROJECT_ID"
echo ""

# Link project
firebase use $PROJECT_ID

# Set configuration
echo "⚙️  Setting Firebase Functions configuration..."
echo "⚠️  IMPORTANT: You need to provide your Gemini API key from https://aistudio.google.com/app/apikey"
read -p "Enter your Gemini API key: " GEMINI_KEY

if [ -z "$GEMINI_KEY" ]; then
    echo "❌ Gemini API key is required"
    exit 1
fi

firebase functions:config:set \
  gemini.api_key="$GEMINI_KEY" \
  app.id="resume-tailor-v1"

echo ""
echo "📤 Deploying Firebase Functions..."
firebase deploy --only functions

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update FIREBASE_CONFIG in ResumeTailor.jsx or index.html"
echo "2. Set Firestore security rules (copy from firestore.rules)"
echo "3. Test the app!"

