import { searchTweetsByKeyword } from '../../../lib/twitter-api'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Testing Twitter API integration...')

    // Test with a common keyword
    const testKeyword = 'test'
    console.log(`Searching for tweets containing: "${testKeyword}"`)

    const tweetsData = await searchTweetsByKeyword(testKeyword)
    
    console.log('Twitter API response:', tweetsData)

    if (!tweetsData.data) {
      return res.status(200).json({
        success: false,
        message: 'No tweets found or API error',
        data: tweetsData
      })
    }

    res.status(200).json({
      success: true,
      message: `Found ${tweetsData.data.length} tweets for keyword "${testKeyword}"`,
      data: tweetsData,
      sampleTweet: tweetsData.data[0] || null
    })

  } catch (error) {
    console.error('❌ Twitter API test error:', error)
    res.status(500).json({
      error: 'Twitter API test failed',
      details: error.message
    })
  }
} 