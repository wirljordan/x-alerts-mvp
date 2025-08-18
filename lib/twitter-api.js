// TwitterAPI.io integration for keyword monitoring
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceTimestamp = null) {
  try {
    // Use exact phrase matching for reliable results
    let query = keyword
    
    // Handle @ mentions - search for tweets FROM that user
    if (keyword.startsWith('@')) {
      const username = keyword.substring(1)
      query = `from:${username}`
    } else {
      // For regular keywords, use exact phrase matching
      query = `"${keyword}"`
    }
    
    // Add since: timestamp if provided
    if (sinceTimestamp) {
      query += ` since:${sinceTimestamp}`
    }
    
    // Always add filters
    query += ` lang:en -is:retweet -is:quote -is:reply`
    
    const encodedQuery = encodeURIComponent(query)
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${encodedQuery}&queryType=Latest&maxResults=5`

    console.log(`🔍 Searching for keyword: "${keyword}" with query: ${query}`)

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
      const tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt
      }))

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
export async function searchTweetsByMultipleKeywords(keywords, sinceTimestamp = null, maxResults = 5) {
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
    
    // Build the complete query
    let query = `(${keywordQueries})`
    
    // Add since: timestamp if provided
    if (sinceTimestamp) {
      query += ` since:${sinceTimestamp}`
    }
    
    // Always add filters
    query += ` lang:en -is:retweet -is:quote -is:reply`
    
    const encodedQuery = encodeURIComponent(query)
    let url = `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search?query=${encodedQuery}&queryType=Latest&maxResults=${maxResults}`

    console.log(`🔍 Searching for ${keywords.length} keywords with query: ${query}`)
    console.log(`📊 Max results: ${maxResults}`)

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
      const tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt
      }))

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
    console.error('Error getting tweet by ID:', error)
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
          username: data.data.username,
          name: data.data.name,
          profile_image_url: data.data.profile_image_url
        }
      }
    }
    return data
  } catch (error) {
    console.error('Error getting user by ID:', error)
    throw error
  }
}

// Format tweet for SMS notification
export function formatTweetForSMS(tweet, user) {
  const username = user?.username || 'Unknown User'
  const tweetText = tweet.text.length > 100 ? tweet.text.substring(0, 100) + '...' : tweet.text
  return `${username}: ${tweetText}`
}

// Find which keyword matched a tweet
export function findMatchingKeyword(tweetText, keywords) {
  const lowerTweetText = tweetText.toLowerCase()
  
  for (const keyword of keywords) {
    const cleanKeyword = keyword.startsWith('@') ? keyword.substring(1) : keyword
    if (lowerTweetText.includes(cleanKeyword.toLowerCase())) {
      return keyword
    }
  }
  
  return keywords[0] // Fallback to first keyword
}

// Format timestamp for Twitter API since: parameter
export function formatSinceTimestamp(timestamp) {
  if (!timestamp) return null
  
  // Convert to ISO string and format for Twitter API
  const date = new Date(timestamp)
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Get the newest tweet timestamp from a list of tweets
export function getNewestTweetTimestamp(tweets) {
  if (!tweets || tweets.length === 0) return null
  
  let newestTimestamp = null
  
  for (const tweet of tweets) {
    const tweetDate = new Date(tweet.created_at)
    if (!newestTimestamp || tweetDate > new Date(newestTimestamp)) {
      newestTimestamp = tweet.created_at
    }
  }
  
  return newestTimestamp
} 