// TwitterAPI.io integration for keyword monitoring
// Force deployment - ensure twitterapi.io endpoints are used
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceId = null) {
  try {
    const query = encodeURIComponent(keyword)
    let url = `${TWITTER_API_BASE_URL}/tweets/search?query=${query}&limit=10`
    
    if (sinceId) {
      url += `&since_id=${sinceId}`
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TWITTER_API_KEY}`,
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
        data: data.data.map(tweet => ({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          created_at: tweet.created_at
        })),
        includes: {
          users: data.includes?.users || []
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
    const url = `${TWITTER_API_BASE_URL}/tweets/${tweetId}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TWITTER_API_KEY}`,
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
    const url = `${TWITTER_API_BASE_URL}/users/${userId}`

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TWITTER_API_KEY}`,
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

// Function to format tweet data for SMS
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