// TwitterAPI.io integration for keyword monitoring
import { makeAuthenticatedRequest, getAuthHeaders, healthCheck, getUsageStats } from './twitter-auth.js'

const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceId = null) {
  try {
    // Use exact phrase matching for reliable results
    let query = keyword
    
    // Handle @ mentions - search for tweets FROM that user
    if (keyword.startsWith('@')) {
      const username = keyword.substring(1)
      query = `from:${username}`
    } else {
      // For regular keywords, use exact phrase matching
      query = `"${keyword}" lang:en -is:retweet -is:quote -is:reply -is:verified`
    }
    
    const encodedQuery = encodeURIComponent(query)
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${encodedQuery}&queryType=Latest&maxResults=5`

    // Only add cursor if sinceId is a valid tweet ID (numeric)
    if (sinceId && /^\d+$/.test(sinceId)) {
      url += `&cursor=${sinceId}`
      console.log(`📅 Using tweet ID cursor: ${sinceId}`)
    } else if (sinceId) {
      console.log(`📅 Ignoring timestamp sinceId: ${sinceId} (will filter in app)`)
    }

    console.log(`🔍 Searching for keyword: "${keyword}" with exact phrase query: ${query}`)

    const response = await makeAuthenticatedRequest(url)

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.tweets) {
      let tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt
      }))

      // If sinceId is a timestamp, filter tweets by date
      if (sinceId && !/^\d+$/.test(sinceId)) {
        const sinceDate = new Date(sinceId)
        tweets = tweets.filter(tweet => {
          const tweetDate = new Date(tweet.created_at)
          return tweetDate > sinceDate
        })
        console.log(`📅 Filtered ${tweets.length} tweets after ${sinceDate.toISOString()}`)
      } else if (!sinceId) {
        // If no sinceId provided, only get tweets from the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        tweets = tweets.filter(tweet => {
          const tweetDate = new Date(tweet.created_at)
          return tweetDate > fiveMinutesAgo
        })
        console.log(`⏰ Filtered ${tweets.length} tweets from last 5 minutes (after ${fiveMinutesAgo.toISOString()})`)
      }

      return {
        data: tweets,
        includes: {
          users: data.tweets.map(tweet => tweet.author).filter(Boolean)
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error searching tweets:', error)
    throw error
  }
}

// Function to search tweets by multiple keywords in a single request with optimizations
export async function searchTweetsByMultipleKeywords(keywords, sinceId = null, maxResults = 5) {
  try {
    // Create OR query with exact phrase matching
    const keywordQueries = keywords.map(keyword => {
      // Handle @ mentions differently
      if (keyword.startsWith('@')) {
        return `from:${keyword.substring(1)}` // Search for tweets FROM the user
      }
      // For regular keywords, use exact phrase matching
      return `"${keyword}"`
    }).join(' OR ')
    
    // Add filters for better quality results
    const optimizedQuery = `(${keywordQueries}) lang:en -is:retweet -is:quote -is:reply`
    const query = encodeURIComponent(optimizedQuery)
    
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${query}&queryType=Latest&maxResults=${maxResults}`

    // Only add cursor if sinceId is a valid tweet ID (numeric)
    if (sinceId && /^\d+$/.test(sinceId)) {
      url += `&cursor=${sinceId}`
      console.log(`📅 Using tweet ID cursor: ${sinceId}`)
    } else if (sinceId) {
      // If sinceId is a timestamp, we'll filter results in the application
      console.log(`📅 Ignoring timestamp sinceId: ${sinceId} (will filter in app)`)
    }

    console.log(`🔍 Searching for ${keywords.length} keywords with exact phrase query: ${keywords.join(', ')}`)
    console.log(`📊 Max results: ${maxResults}`)

    const response = await makeAuthenticatedRequest(url)

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.tweets) {
      let tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt
      }))

      // If sinceId is a timestamp, filter tweets by date
      if (sinceId && !/^\d+$/.test(sinceId)) {
        const sinceDate = new Date(sinceId)
        tweets = tweets.filter(tweet => {
          const tweetDate = new Date(tweet.created_at)
          return tweetDate > sinceDate
        })
        console.log(`📅 Filtered ${tweets.length} tweets after ${sinceDate.toISOString()}`)
      } else if (!sinceId) {
        // If no sinceId provided, only get tweets from the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
        tweets = tweets.filter(tweet => {
          const tweetDate = new Date(tweet.created_at)
          return tweetDate > fiveMinutesAgo
        })
        console.log(`⏰ Filtered ${tweets.length} tweets from last 5 minutes (after ${fiveMinutesAgo.toISOString()})`)
      }

      return {
        data: tweets,
        includes: {
          users: data.tweets.map(tweet => tweet.author).filter(Boolean)
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error searching tweets:', error)
    throw error
  }
}

// Function to get tweet details by ID
export async function getTweetById(tweetId) {
  try {
    const url = `${TWITTER_API_BASE_URL}/twitter/tweets/${tweetId}`

    const response = await makeAuthenticatedRequest(url)

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.data) {
      return {
        data: {
          id: data.data.id,
          text: data.data.text,
          author_id: data.data.author_id,
          created_at: data.data.created_at
        },
        includes: {
          users: data.includes?.users || []
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error getting tweet:', error)
    throw error
  }
}

// Function to get user details by ID
export async function getUserById(userId) {
  try {
    const url = `${TWITTER_API_BASE_URL}/twitter/user/${userId}`

    const response = await makeAuthenticatedRequest(url)

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.data) {
      return {
        data: {
          id: data.data.id,
          name: data.data.name,
          username: data.data.username,
          profile_image_url: data.data.profile_image_url
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error getting user:', error)
    throw error
  }
}

export function formatTweetForSMS(tweet, user) {
  const tweetUrl = `https://twitter.com/${user.username}/status/${tweet.id}`
  const tweetText = tweet.text.length > 100 ? tweet.text.substring(0, 100) + '...' : tweet.text

  return {
    authorName: user.name,
    authorUsername: user.username,
    tweetText: tweetText,
    tweetUrl: tweetUrl,
    tweetId: tweet.id
  }
}

// Function to determine which keyword matched a tweet
export function findMatchingKeyword(tweetText, keywords) {
  const lowerTweetText = tweetText.toLowerCase()
  
  for (const keyword of keywords) {
    if (keyword.startsWith('@')) {
      // For @ mentions, check if the tweet is from that user
      const username = keyword.substring(1).toLowerCase()
      // This would need to be enhanced with actual user data
      // For now, we'll check if the username appears in the tweet
      if (lowerTweetText.includes(`@${username}`) || lowerTweetText.includes(username)) {
        return keyword
      }
    } else {
      // Use exact phrase matching for regular keywords (most reliable)
      const lowerKeyword = keyword.toLowerCase()
      
      // Check for exact phrase match (case-insensitive)
      if (lowerTweetText.includes(lowerKeyword)) {
        return keyword
      }
    }
  }
  
  return null
}

// Export authentication utilities
export { healthCheck, getUsageStats } 