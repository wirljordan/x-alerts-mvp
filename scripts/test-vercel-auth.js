#!/usr/bin/env node

// Test script to verify Vercel environment variables
console.log('🔍 Checking Vercel Authentication Setup...\n')

const requiredEnvVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET', 
  'TWITTER_CLIENT_ID',
  'TWITTER_CLIENT_SECRET'
]

console.log('Required Environment Variables:')
requiredEnvVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('SECRET') ? '***SET***' : value}`)
  } else {
    console.log(`❌ ${varName}: MISSING`)
  }
})

console.log('\n📋 Next Steps:')
console.log('1. Make sure your Twitter app callback URL includes your Vercel domain:')
console.log('   https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/api/auth/callback/x')
console.log('\n2. Test the authentication at:')
console.log('   https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/test-auth')
console.log('\n3. If you get errors, check the debug page:')
console.log('   https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/debug-oauth') 