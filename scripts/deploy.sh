#!/bin/bash

# EarlyReply.app Production Deployment Script
echo "🚀 Deploying EarlyReply.app to production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git repository not found. Please initialize git first."
    exit 1
fi

# Check if environment variables are set
if [ -z "$TWITTER_CLIENT_ID" ] || [ -z "$TWITTER_CLIENT_SECRET" ]; then
    echo "⚠️  Warning: Environment variables not set locally"
    echo "   Make sure to set them in Vercel dashboard:"
    echo "   - TWITTER_CLIENT_ID"
    echo "   - TWITTER_CLIENT_SECRET"
fi

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the errors and try again."
    exit 1
fi

# Check if there are uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Committing changes..."
    git add .
    git commit -m "Deploy to production - $(date)"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo "❌ Push failed. Please check your git configuration."
    exit 1
fi

echo "✅ Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "1. Check Vercel dashboard for deployment status"
echo "2. Verify environment variables are set in Vercel"
echo "3. Test OAuth flow at https://earlyreply.app"
echo "4. Update X Developer Portal callback URLs if needed"
echo ""
echo "🔗 Useful links:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- X Developer Portal: https://developer.twitter.com/en/portal/dashboard"
echo "- EarlyReply.app: https://earlyreply.app" 