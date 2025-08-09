import { searchTweetsByKeyword } from '../../../lib/twitter-api'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Testing Twitter API integration...')

    // Test with a more relevant keyword for better demonstration
    const testKeyword = 'marketing'
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

    // Filter out irrelevant tweets for demonstration
    const relevantTweets = tweetsData.data.filter(tweet => {
      const text = tweet.text.toLowerCase()
      // Look for tweets that actually mention marketing in a business context
      return text.includes('marketing') && (
        text.includes('business') || 
        text.includes('growth') || 
        text.includes('strategy') || 
        text.includes('campaign') ||
        text.includes('digital') ||
        text.includes('social')
      )
    })

    res.status(200).json({
      success: true,
      message: `Found ${tweetsData.data.length} tweets for keyword "${testKeyword}" (${relevantTweets.length} relevant)`,
      data: tweetsData,
      relevantTweets: relevantTweets,
      sampleTweet: relevantTweets[0] || tweetsData.data[0] || null,
      totalFound: tweetsData.data.length,
      relevantCount: relevantTweets.length
    })

  } catch (error) {
    console.error('❌ Twitter API test error:', error)
    res.status(500).json({
      error: 'Twitter API test failed',
      details: error.message
    })
  }
} 