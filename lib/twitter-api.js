// TwitterAPI.io integration for keyword monitoring
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitter.com/2'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceId = null) {
  try {
    const query = encodeURIComponent(keyword)
    let url = `${TWITTER_API_BASE_URL}/tweets/search/recent?query=${query}&max_results=10&tweet.fields=created_at,author_id,text&user.fields=name,username,profile_image_url&expansions=author_id`
    
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
    return data
  } catch (error) {
    console.error('Error searching tweets:', error)
    throw error
  }
}

// Function to get tweet details by ID
export async function getTweetById(tweetId) {
  try {
    const url = `${TWITTER_API_BASE_URL}/tweets/${tweetId}?tweet.fields=created_at,author_id,text&user.fields=name,username,profile_image_url&expansions=author_id`

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
    return data
  } catch (error) {
    console.error('Error getting tweet:', error)
    throw error
  }
}

// Function to get user details by ID
export async function getUserById(userId) {
  try {
    const url = `${TWITTER_API_BASE_URL}/users/${userId}?user.fields=name,username,profile_image_url`

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