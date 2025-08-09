import { healthCheck, getUsageStats, validateAPIKey } from '../../../lib/twitter-auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { action } = req.body

    switch (action) {
      case 'health':
        console.log('🏥 Running Twitter API authentication health check...')
        const health = await healthCheck()
        return res.status(200).json({
          success: true,
          action: 'health_check',
          timestamp: new Date().toISOString(),
          ...health
        })

      case 'usage':
        console.log('📊 Getting Twitter API usage statistics...')
        const usage = getUsageStats()
        return res.status(200).json({
          success: true,
          action: 'usage_stats',
          timestamp: new Date().toISOString(),
          ...usage
        })

      case 'validate':
        console.log('🔑 Validating Twitter API key...')
        const { apiKey } = req.body
        if (!apiKey) {
          return res.status(400).json({
            success: false,
            error: 'API key is required for validation'
          })
        }
        const validation = await validateAPIKey(apiKey)
        return res.status(200).json({
          success: true,
          action: 'key_validation',
          timestamp: new Date().toISOString(),
          validation
        })

      case 'test_request':
        console.log('🧪 Testing Twitter API request...')
        const { searchQuery = 'test' } = req.body
        
        // Import the search function
        const { searchTweetsByKeyword } = await import('../../../lib/twitter-api')
        
        try {
          const result = await searchTweetsByKeyword(searchQuery)
          return res.status(200).json({
            success: true,
            action: 'test_request',
            timestamp: new Date().toISOString(),
            query: searchQuery,
            result: {
              tweetCount: result.data?.length || 0,
              hasData: !!result.data,
              sampleTweet: result.data?.[0] || null
            }
          })
        } catch (error) {
          return res.status(200).json({
            success: false,
            action: 'test_request',
            timestamp: new Date().toISOString(),
            query: searchQuery,
            error: error.message
          })
        }

      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: health, usage, validate, test_request'
        })
    }

  } catch (error) {
    console.error('❌ Twitter API auth test error:', error)
    res.status(500).json({
      success: false,
      error: 'Twitter API auth test failed',
      details: error.message,
      timestamp: new Date().toISOString()
    })
  }
} 