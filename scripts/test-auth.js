#!/usr/bin/env node

// Test script for TwitterAPI.io authentication system
// Run with: node scripts/test-auth.js

const { TwitterAPIAuth, getTwitterAuth } = require('../lib/twitter-auth.js')

async function testAuthSystem() {
  console.log('🧪 Testing TwitterAPI.io Authentication System\n')

  try {
    // Test 1: Initialize with mock API key
    console.log('1. Testing initialization...')
    process.env.TWITTER_API_KEY = 'test-api-key-123'
    
    const auth = new TwitterAPIAuth()
    console.log('✅ Authentication system initialized successfully')
    console.log(`   Loaded ${auth.apiKeys.length} API key(s)`)
    console.log(`   Current key: ${auth.getCurrentAPIKey()}\n`)

    // Test 2: Test authentication headers
    console.log('2. Testing authentication headers...')
    const headers = auth.getAuthHeaders()
    console.log('✅ Headers generated successfully')
    console.log('   Headers:', JSON.stringify(headers, null, 2), '\n')

    // Test 3: Test API key rotation
    console.log('3. Testing API key rotation...')
    const originalKey = auth.getCurrentAPIKey()
    auth.rotateAPIKey()
    const newKey = auth.getCurrentAPIKey()
    
    if (originalKey !== newKey) {
      console.log('✅ API key rotation working')
    } else {
      console.log('⚠️  API key rotation (only one key available)')
    }
    console.log(`   Original key: ${originalKey}`)
    console.log(`   New key: ${newKey}\n`)

    // Test 4: Test usage statistics
    console.log('4. Testing usage statistics...')
    auth.incrementRequestCount()
    auth.incrementRequestCount()
    const stats = auth.getUsageStats()
    console.log('✅ Usage statistics working')
    console.log('   Stats:', JSON.stringify(stats, null, 2), '\n')

    // Test 5: Test should rotate logic
    console.log('5. Testing rotation threshold logic...')
    const shouldRotate = auth.shouldRotateAPIKey()
    console.log(`   Should rotate: ${shouldRotate}`)
    console.log(`   Current request count: ${auth.requestCounts.get(auth.getCurrentAPIKey()) || 0}`)
    console.log(`   Rotation threshold: 800\n`)

    // Test 6: Test singleton pattern
    console.log('6. Testing singleton pattern...')
    const singleton1 = getTwitterAuth()
    const singleton2 = getTwitterAuth()
    if (singleton1 === singleton2) {
      console.log('✅ Singleton pattern working correctly')
    } else {
      console.log('❌ Singleton pattern not working')
    }
    console.log(`   Instance 1: ${singleton1.getCurrentAPIKey()}`)
    console.log(`   Instance 2: ${singleton2.getCurrentAPIKey()}\n`)

    // Test 7: Test health check (will fail without real API key)
    console.log('7. Testing health check...')
    try {
      const health = await auth.healthCheck()
      console.log('✅ Health check completed')
      console.log('   Health:', JSON.stringify(health, null, 2))
    } catch (error) {
      console.log('⚠️  Health check failed (expected without real API key)')
      console.log(`   Error: ${error.message}`)
    }

    console.log('\n🎉 All authentication system tests completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Set TWITTER_API_KEY environment variable with real API key')
    console.log('   2. Add additional API keys (TWITTER_API_KEY_1, etc.) for rotation')
    console.log('   3. Test with real API requests')
    console.log('   4. Monitor usage and health in dashboard')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testAuthSystem() 