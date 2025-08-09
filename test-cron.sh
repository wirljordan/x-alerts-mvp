#!/bin/bash

# Test script for cron job
# Replace YOUR_CRON_SECRET with your actual secret from Vercel

echo "🧪 Testing cron job..."

# Test the cron endpoint directly
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-vercel-app.vercel.app/api/cron/monitor-keywords \
  -v

echo ""
echo "✅ Cron test completed!"
echo ""
echo "📝 To use this script:"
echo "1. Replace 'YOUR_CRON_SECRET' with your actual secret from Vercel dashboard"
echo "2. Replace 'your-vercel-app.vercel.app' with your actual Vercel domain"
echo "3. Make the script executable: chmod +x test-cron.sh"
echo "4. Run: ./test-cron.sh" 