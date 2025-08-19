export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Testing TwitterAPI.io connection...')

    // Test 1: Check if API key is set
    if (!process.env.TWITTER_API_KEY) {
      return res.status(500).json({ 
        error: 'TWITTER_API_KEY not found in environment',
        availableEndpoints: []
      })
    }

    console.log('✅ TWITTER_API_KEY found')

    // Test 2: Try to get user info (this should work)
    const userResponse = await fetch('https://api.twitterapi.io/user', {
      headers: {
        'x-api-key': process.env.TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    console.log('User endpoint status:', userResponse.status)

    if (userResponse.ok) {
      const userData = await userResponse.json()
      console.log('✅ User endpoint works:', userData)
    } else {
      const errorText = await userResponse.text()
      console.log('❌ User endpoint failed:', errorText)
    }

    // Test 3: Try different tweet posting endpoints
    const endpoints = [
      '/tweet',
      '/twitter/tweet', 
      '/tweet/reply',
      '/twitter/tweet/reply',
      '/post/tweet'
    ]

    const results = {}

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`)
        
        const response = await fetch(`https://api.twitterapi.io${endpoint}`, {
          method: 'POST',
          headers: {
            'x-api-key': process.env.TWITTER_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: 'Test tweet from EarlyReply debug'
          })
        })

        results[endpoint] = {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        }

        if (response.ok) {
          const data = await response.json()
          results[endpoint].data = data
          console.log(`✅ ${endpoint} works:`, data)
        } else {
          const errorText = await response.text()
          results[endpoint].error = errorText
          console.log(`❌ ${endpoint} failed:`, errorText)
        }

      } catch (error) {
        results[endpoint] = {
          error: error.message,
          ok: false
        }
        console.log(`❌ ${endpoint} exception:`, error.message)
      }
    }

    return res.status(200).json({
      success: true,
      apiKeyPresent: !!process.env.TWITTER_API_KEY,
      apiKeyLength: process.env.TWITTER_API_KEY?.length || 0,
      results: results
    })

  } catch (error) {
    console.error('❌ Error testing TwitterAPI.io:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
} 