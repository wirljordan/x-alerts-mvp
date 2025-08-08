// TwitterAPI.io integration for keyword monitoring
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceId = null) {
  try {
    const query = encodeURIComponent(keyword)
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${query}&queryType=Latest`

    if (sinceId) {
      url += `&cursor=${sinceId}`
    }

    const response = await fetch(url, {
      headers: {
        'x-api-key': TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.tweets) {
      return {
        data: data.tweets.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author?.id,
          created_at: tweet.createdAt
        })),
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
    // Create optimized OR query with filters
    const keywordQueries = keywords.map(keyword => {
      // Handle @ mentions differently
      if (keyword.startsWith('@')) {
        return `from:${keyword.substring(1)}` // Search for tweets FROM the user
      }
      return `"${keyword}"` // Exact phrase match for regular keywords
    }).join(' OR ')
    
    // Add filters for better quality results
    const optimizedQuery = `(${keywordQueries}) lang:en -is:retweet -is:quote`
    const query = encodeURIComponent(optimizedQuery)
    
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${query}&queryType=Latest&maxResults=${maxResults}`

    if (sinceId) {
      url += `&cursor=${sinceId}`
    }

    console.log(`🔍 Searching for ${keywords.length} keywords with filters: ${keywords.join(', ')}`)
    console.log(`📊 Max results: ${maxResults}, Since ID: ${sinceId || 'none'}`)

    const response = await fetch(url, {
      headers: {
        'x-api-key': TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Transform twitterapi.io response to match expected format
    if (data.tweets) {
      return {
        data: data.tweets.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author?.id,
          created_at: tweet.createdAt
        })),
        includes: {
          users: data.tweets.map(tweet => tweet.author).filter(Boolean)
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error searching tweets by multiple keywords:', error)
    throw error
  }
}

// Function to get tweet details by ID
export async function getTweetById(tweetId) {
  try {
    const url = `${TWITTER_API_BASE_URL}/twitter/tweets/${tweetId}`

    const response = await fetch(url, {
      headers: {
        'x-api-key': TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

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

    const response = await fetch(url, {
      headers: {
        'x-api-key': TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

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
      // Regular keyword matching
      if (lowerTweetText.includes(keyword.toLowerCase())) {
        return keyword
      }
    }
  }
  
  return null
} 