// TwitterAPI.io integration for keyword monitoring
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Function to search tweets by keyword
export async function searchTweetsByKeyword(keyword, sinceId = null) {
  try {
    // Improve the query with better filtering and context
    let query = keyword
    
    // Handle @ mentions - search for tweets FROM that user
    if (keyword.startsWith('@')) {
      const username = keyword.substring(1)
      query = `from:${username}`
    } else {
      // For regular keywords, use flexible matching with semantic variations
      query = createFlexibleQuery(keyword)
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

    console.log(`🔍 Searching for keyword: "${keyword}" with flexible query: ${query}`)

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

// Helper function to create flexible queries with semantic variations
function createFlexibleQuery(keyword) {
  const lowerKeyword = keyword.toLowerCase()
  
  // Handle @ mentions - search for tweets FROM that user
  if (lowerKeyword.startsWith('@')) {
    const username = lowerKeyword.substring(1)
    return `from:${username} lang:en -is:retweet -is:quote -is:reply -is:verified`
  }
  
  // Split keyword into words and filter out very short or common words
  const words = lowerKeyword.split(' ').filter(word => {
    // Filter out common stop words and very short words
    const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']
    return word.length > 2 && !stopWords.includes(word.toLowerCase())
  })
  
  if (words.length === 0) {
    // If no significant words, return the original keyword
    return `${keyword} lang:en -is:retweet -is:quote -is:reply -is:verified`
  }
  
  // Create flexible query based on word patterns
  const queryParts = words.map(word => {
    // Generate variations for each word dynamically
    const variations = generateWordVariations(word)
    return variations.length > 1 ? `(${variations.join(' OR ')})` : word
  })
  
  // Join with OR for flexible matching - any of the words can match
  const flexibleQuery = queryParts.join(' OR ')
  return `(${flexibleQuery}) lang:en -is:retweet -is:quote -is:reply -is:verified`
}

// Helper function to generate word variations dynamically
function generateWordVariations(word) {
  const variations = [word]
  
  // Common morphological variations
  if (word.endsWith('ing')) {
    // Add base form and past tense for -ing words
    const base = word.slice(0, -3)
    variations.push(base, base + 's', base + 'ed')
  } else if (word.endsWith('ed')) {
    // Add base form and -ing for -ed words
    const base = word.slice(0, -2)
    variations.push(base, base + 'ing', base + 's')
  } else if (word.endsWith('s')) {
    // Add singular form for plural words
    const singular = word.slice(0, -1)
    variations.push(singular, singular + 'ing')
  } else {
    // Add common variations for base words
    variations.push(word + 'ing', word + 's', word + 'ed')
  }
  
  // Add common synonyms based on word patterns (not hardcoded specific words)
  const commonPrefixes = {
    'un': 'un', // undo, unlock, etc.
    're': 're', // redo, retry, etc.
    'pre': 'pre', // preview, preload, etc.
    'post': 'post', // post-game, post-work, etc.
  }
  
  // Check for common prefixes and add variations
  for (const [prefix, replacement] of Object.entries(commonPrefixes)) {
    if (word.startsWith(prefix) && word.length > prefix.length + 2) {
      const base = word.slice(prefix.length)
      variations.push(base, replacement + base)
    }
  }
  
  // Remove duplicates and return
  return [...new Set(variations)]
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
      // For regular keywords, use flexible matching
      return createFlexibleQuery(keyword).replace(' lang:en -is:retweet -is:quote -is:reply -is:verified', '')
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

    console.log(`🔍 Searching for ${keywords.length} keywords with flexible query: ${keywords.join(', ')}`)
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
      // Regular keyword matching - use intelligent matching
      const lowerKeyword = keyword.toLowerCase()
      const words = lowerKeyword.split(' ').filter(word => {
        // Filter out common stop words
        const stopWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must']
        return word.length > 2 && !stopWords.includes(word.toLowerCase())
      })
      
      if (words.length === 0) {
        // If no significant words, use exact matching
        if (lowerTweetText.includes(lowerKeyword)) {
          return keyword
        }
      } else {
        // For multi-word keywords, check if most words are present
        const matchingWords = words.filter(word => {
          // Check for exact word match or variations
          const wordVariations = generateWordVariations(word)
          return wordVariations.some(variation => 
            lowerTweetText.includes(variation.toLowerCase()) ||
            lowerTweetText.split(' ').some(tweetWord => 
              tweetWord.toLowerCase().includes(variation.toLowerCase()) || 
              variation.toLowerCase().includes(tweetWord.toLowerCase())
            )
          )
        })
        
        // If more than 50% of significant words match, consider it a match
        if (matchingWords.length >= Math.ceil(words.length * 0.5)) {
          return keyword
        }
      }
    }
  }
  
  return null
} 