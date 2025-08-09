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
      // Regular keyword matching - use intelligent matching with context awareness
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
        // For multi-word keywords, use strict matching with context validation
        const matchResult = checkMultiWordMatch(lowerTweetText, lowerKeyword, words)
        if (matchResult.matches && matchResult.isRelevant) {
          return keyword
        }
      }
    }
  }
  
  return null
}

// Helper function to check multi-word matches with strict validation
function checkMultiWordMatch(tweetText, keyword, words) {
  // First, check for exact keyword phrase match (highest priority)
  if (tweetText.includes(keyword)) {
    return { matches: true, isRelevant: true }
  }
  
  // For multi-word keywords, require more strict matching
  let matchScore = 0
  let totalWords = words.length
  let matchedWords = []
  
  for (const word of words) {
    // Check for exact word match or variations
    const wordVariations = generateWordVariations(word)
    const wordMatches = wordVariations.some(variation => {
      const lowerVariation = variation.toLowerCase()
      return tweetText.includes(lowerVariation) ||
             tweetText.split(' ').some(tweetWord => 
               tweetWord.toLowerCase().includes(lowerVariation) || 
               lowerVariation.includes(tweetWord.toLowerCase())
             )
    })
    
    if (wordMatches) {
      matchScore++
      matchedWords.push(word)
    }
  }
  
  // Require very high match percentage for multi-word keywords
  const requiredMatchPercentage = words.length === 2 ? 0.9 : 0.8 // 90% for 2 words, 80% for 3+ words
  const minimumMatches = Math.ceil(totalWords * requiredMatchPercentage)
  
  if (matchScore >= minimumMatches) {
    // Additional strict context validation for multi-word keywords
    const isRelevant = validateMultiWordContext(tweetText, keyword, words, matchedWords)
    return { matches: true, isRelevant }
  }
  
  return { matches: false, isRelevant: false }
}

// Helper function to validate context for multi-word keywords
function validateMultiWordContext(tweetText, keyword, keywordWords, matchedWords) {
  // Check for obvious irrelevant content
  const irrelevantTerms = [
    'porn', 'adult', 'nsfw', 'explicit', 'sexual', 'adult content',
    'gambling', 'casino', 'bet', 'lottery', 'scam', 'rugpull',
    'medical', 'clinical', 'surgical', 'patient', 'therapy', 'treatment',
    'cardiovascular', 'antiplatelet', 'thrombosis', 'bleeding'
  ]
  
  // If tweet contains obviously irrelevant content, be very strict
  const hasIrrelevantContent = irrelevantTerms.some(term => tweetText.includes(term))
  
  if (hasIrrelevantContent) {
    // For tweets with irrelevant content, require exact keyword phrase
    return tweetText.includes(keyword)
  }
  
  // For business/social media keywords, check for relevant context
  const businessKeywords = ['marketing', 'business', 'growth', 'sales', 'leads', 'customers', 'x', 'twitter', 'social']
  const hasBusinessContext = businessKeywords.some(businessWord => 
    keywordWords.some(word => word.toLowerCase().includes(businessWord.toLowerCase()))
  )
  
  if (hasBusinessContext) {
    // Check if tweet has business/social media context
    const businessContextTerms = [
      'business', 'marketing', 'growth', 'sales', 'leads', 'customers', 
      'strategy', 'campaign', 'advertising', 'promotion', 'brand',
      'tips', 'advice', 'guide', 'help', 'how to',
      'x', 'twitter', 'social media', 'platform', 'followers', 'engagement',
      'content', 'post', 'tweet', 'viral', 'trending'
    ]
    
    const hasBusinessContextInTweet = businessContextTerms.some(term => tweetText.includes(term))
    
    // For business keywords, require business context AND exact word proximity
    if (!hasBusinessContextInTweet) {
      return false
    }
    
    // Additional check: ensure matched words are in close proximity
    if (matchedWords.length >= 2) {
      const wordsAreClose = checkWordProximity(tweetText, matchedWords)
      if (!wordsAreClose) {
        return false
      }
    }
  }
  
  return true
}

// Helper function to check if matched words are in close proximity
function checkWordProximity(tweetText, matchedWords) {
  const words = tweetText.split(' ')
  const wordIndices = []
  
  // Find indices of matched words
  for (const matchedWord of matchedWords) {
    const variations = generateWordVariations(matchedWord)
    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase()
      if (variations.some(variation => word.includes(variation.toLowerCase()) || variation.toLowerCase().includes(word))) {
        wordIndices.push(i)
        break
      }
    }
  }
  
  // Check if words are within 5 positions of each other
  if (wordIndices.length >= 2) {
    const sortedIndices = wordIndices.sort((a, b) => a - b)
    for (let i = 0; i < sortedIndices.length - 1; i++) {
      if (sortedIndices[i + 1] - sortedIndices[i] > 5) {
        return false
      }
    }
  }
  
  return true
} 