// TwitterAPI.io integration with strict cost controls and instrumentation
const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Configuration constants
const CONFIG = {
  MAX_RESULTS_PER_CALL: 3,
  BACKFILL_MAX_PAGES: 4,
  BACKFILL_MAX_TWEETS: 20,
  BACKFILL_MAX_RUNTIME_MS: 8000,
  TIME_WINDOW_MINUTES: 5,
  CREDITS_PER_TWEET: 15
}

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Validate and enforce page size limits
function validatePageSize(response, requestId, maxResults) {
  if (!response.meta) {
    console.warn(`⚠️ [${requestId}] No meta data in response, cannot validate page size`)
    return false
  }

  const returnedCount = response.meta.returned_count || response.meta.count || 0
  
  if (returnedCount > maxResults) {
    console.error(`🚨 [${requestId}] PAGE_SIZE_IGNORED: returned_count (${returnedCount}) > MAX_RESULTS_PER_CALL (${maxResults})`)
    console.error(`🚨 [${requestId}] Request payload:`, {
      url: response.config?.url || 'unknown',
      params: response.config?.params || 'unknown'
    })
    return false
  }

  return true
}

// Validate time window compliance
function validateTimeWindow(tweets, startTime, requestId) {
  if (!tweets || tweets.length === 0) return true
  
  const startTimestamp = new Date(startTime).getTime()
  
  for (const tweet of tweets) {
    const tweetTime = new Date(tweet.created_at || tweet.createdAt).getTime()
    if (tweetTime < startTimestamp) {
      console.error(`🚨 [${requestId}] WINDOW_IGNORED: Tweet ${tweet.id} created at ${tweet.created_at || tweet.createdAt} is older than start_time ${startTime}`)
      return false
    }
  }
  
  return true
}

// Build query with strict filters
function buildQuery(keyword, filters = {}) {
  let query = keyword
  
  // Handle @ mentions - search for tweets FROM that user
  if (keyword.startsWith('@')) {
    const username = keyword.substring(1)
    query = `from:${username}`
  } else {
    // For regular keywords, use exact phrase matching with required filters
    query = `"${keyword}" lang:en -is:retweet -is:quote -is:reply`
  }
  
  // Add optional filters
  if (filters.no_links) {
    query += ' -has:links'
  }
  if (filters.no_media) {
    query += ' -has:media'
  }
  
  return query
}

// Try different page size parameters until one works
async function tryPageSizeParams(baseUrl, query, startTime, endTime, requestId) {
  const pageSizeParams = ['limit', 'count', 'max_results']
  
  for (const param of pageSizeParams) {
    try {
      const url = `${baseUrl}?query=${encodeURIComponent(query)}&${param}=${CONFIG.MAX_RESULTS_PER_CALL}`
      
      if (startTime && endTime) {
        url += `&start_time=${startTime}&end_time=${endTime}`
      }
      
      console.log(`🔍 [${requestId}] Trying page size param: ${param}=${CONFIG.MAX_RESULTS_PER_CALL}`)
      
      const response = await fetch(url, {
        headers: {
          'x-api-key': TWITTER_API_KEY,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn(`⚠️ [${requestId}] ${param} param failed with status ${response.status}`)
        continue
      }

      const data = await response.json()
      
      // Check if the page size parameter was respected
      if (validatePageSize(data, requestId, CONFIG.MAX_RESULTS_PER_CALL)) {
        console.log(`✅ [${requestId}] Page size param ${param}=${CONFIG.MAX_RESULTS_PER_CALL} accepted, returned_count: ${data.meta?.returned_count || data.meta?.count || 0}`)
        return data
      } else {
        console.warn(`⚠️ [${requestId}] Page size param ${param} was ignored, trying next...`)
        continue
      }
      
    } catch (error) {
      console.warn(`⚠️ [${requestId}] Error with ${param} param:`, error.message)
      continue
    }
  }
  
  throw new Error(`All page size parameters failed for request ${requestId}`)
}

// Main search function with strict cost controls
export async function searchTweetsByKeyword(keyword, sinceId = null, filters = {}) {
  const requestId = generateRequestId()
  const startTime = new Date(Date.now() - CONFIG.TIME_WINDOW_MINUTES * 60 * 1000).toISOString()
  const endTime = new Date().toISOString()
  
  try {
    console.log(`🔍 [${requestId}] Starting search for keyword: "${keyword}"`)
    console.log(`⏰ [${requestId}] Time window: ${startTime} to ${endTime}`)
    console.log(`📊 [${requestId}] Max results per call: ${CONFIG.MAX_RESULTS_PER_CALL}`)
    
    // Build query with filters
    const query = buildQuery(keyword, filters)
    console.log(`🔍 [${requestId}] Final query: ${query}`)
    
    // Try different page size parameters
    const data = await tryPageSizeParams(
      `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search`,
      query,
      startTime,
      endTime,
      requestId
    )
    
    // Validate time window compliance
    if (!validateTimeWindow(data.tweets, startTime, requestId)) {
      throw new Error(`Time window validation failed for request ${requestId}`)
    }
    
    // Transform and validate response
    if (data.tweets) {
      const tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt || tweet.created_at
      }))
      
      const returnedCount = data.meta?.returned_count || data.meta?.count || tweets.length
      const creditsUsed = returnedCount * CONFIG.CREDITS_PER_TWEET
      
      console.log(`✅ [${requestId}] Search completed successfully`)
      console.log(`📊 [${requestId}] Results: ${tweets.length} tweets, ${returnedCount} returned, ${creditsUsed} credits used`)
      console.log(`💰 [${requestId}] Cost breakdown: ${returnedCount} × ${CONFIG.CREDITS_PER_TWEET} = ${creditsUsed} credits`)
      
      return {
        data: tweets,
        includes: {
          users: data.tweets.map(tweet => tweet.author).filter(Boolean)
        },
        meta: {
          request_id: requestId,
          returned_count: returnedCount,
          credits_used: creditsUsed,
          time_window: { start: startTime, end: endTime }
        }
      }
    }
    
    return {
      data: [],
      includes: { users: [] },
      meta: {
        request_id: requestId,
        returned_count: 0,
        credits_used: 0,
        time_window: { start: startTime, end: endTime }
      }
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error searching tweets:`, error)
    throw error
  }
}

// Search multiple keywords with strict cost controls
export async function searchTweetsByMultipleKeywords(keywords, sinceId = null, maxResults = CONFIG.MAX_RESULTS_PER_CALL) {
  const requestId = generateRequestId()
  const startTime = new Date(Date.now() - CONFIG.TIME_WINDOW_MINUTES * 60 * 1000).toISOString()
  const endTime = new Date().toISOString()
  
  try {
    console.log(`🔍 [${requestId}] Starting multi-keyword search for ${keywords.length} keywords`)
    console.log(`⏰ [${requestId}] Time window: ${startTime} to ${endTime}`)
    console.log(`📊 [${requestId}] Max results per call: ${maxResults}`)
    
    // Create OR query with exact phrase matching
    const keywordQueries = keywords.map(keyword => {
      if (keyword.startsWith('@')) {
        return `from:${keyword.substring(1)}`
      }
      return `"${keyword}"`
    }).join(' OR ')
    
    // Add required filters
    const query = `(${keywordQueries}) lang:en -is:retweet -is:quote -is:reply`
    console.log(`🔍 [${requestId}] Final query: ${query}`)
    
    // Try different page size parameters
    const data = await tryPageSizeParams(
      `${TWITTER_API_BASE_URL}/twitter/tweet/advanced_search`,
      query,
      startTime,
      endTime,
      requestId
    )
    
    // Validate time window compliance
    if (!validateTimeWindow(data.tweets, startTime, requestId)) {
      throw new Error(`Time window validation failed for request ${requestId}`)
    }
    
    // Transform and validate response
    if (data.tweets) {
      const tweets = data.tweets.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        author_id: tweet.author?.id,
        created_at: tweet.createdAt || tweet.created_at
      }))
      
      const returnedCount = data.meta?.returned_count || data.meta?.count || tweets.length
      const creditsUsed = returnedCount * CONFIG.CREDITS_PER_TWEET
      
      console.log(`✅ [${requestId}] Multi-keyword search completed successfully`)
      console.log(`📊 [${requestId}] Results: ${tweets.length} tweets, ${returnedCount} returned, ${creditsUsed} credits used`)
      console.log(`💰 [${requestId}] Cost breakdown: ${returnedCount} × ${CONFIG.CREDITS_PER_TWEET} = ${creditsUsed} credits`)
      
      return {
        data: tweets,
        includes: {
          users: data.tweets.map(tweet => tweet.author).filter(Boolean)
        },
        meta: {
          request_id: requestId,
          returned_count: returnedCount,
          credits_used: creditsUsed,
          time_window: { start: startTime, end: endTime }
        }
      }
    }
    
    return {
      data: [],
      includes: { users: [] },
      meta: {
        request_id: requestId,
        returned_count: 0,
        credits_used: 0,
        time_window: { start: startTime, end: endTime }
      }
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error in multi-keyword search:`, error)
    throw error
  }
}

// Get tweet details by ID
export async function getTweetById(tweetId) {
  const requestId = generateRequestId()
  
  try {
    console.log(`🔍 [${requestId}] Getting tweet details for ID: ${tweetId}`)
    
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
    
    console.log(`✅ [${requestId}] Tweet details retrieved successfully`)
    
    // Transform response
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
        },
        meta: {
          request_id: requestId,
          returned_count: 1,
          credits_used: CONFIG.CREDITS_PER_TWEET
        }
      }
    }
    
    return {
      data: null,
      includes: { users: [] },
      meta: {
        request_id: requestId,
        returned_count: 0,
        credits_used: 0
      }
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error getting tweet:`, error)
    throw error
  }
}

// Get user details by ID
export async function getUserById(userId) {
  const requestId = generateRequestId()
  
  try {
    console.log(`🔍 [${requestId}] Getting user details for ID: ${userId}`)
    
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
    
    console.log(`✅ [${requestId}] User details retrieved successfully`)
    
    // Transform response
    if (data.data) {
      return {
        data: {
          id: data.data.id,
          name: data.data.name,
          username: data.data.username,
          profile_image_url: data.data.profile_image_url
        },
        meta: {
          request_id: requestId,
          returned_count: 1,
          credits_used: CONFIG.CREDITS_PER_TWEET
        }
      }
    }
    
    return {
      data: null,
      meta: {
        request_id: requestId,
        returned_count: 0,
        credits_used: 0
      }
    }
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error getting user:`, error)
    throw error
  }
}

// Format tweet for SMS
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

// Find matching keyword in tweet text
export function findMatchingKeyword(tweetText, keywords) {
  const lowerTweetText = tweetText.toLowerCase()
  
  for (const keyword of keywords) {
    if (keyword.startsWith('@')) {
      const username = keyword.substring(1).toLowerCase()
      if (lowerTweetText.includes(`@${username}`) || lowerTweetText.includes(username)) {
        return keyword
      }
    } else {
      const lowerKeyword = keyword.toLowerCase()
      if (lowerTweetText.includes(lowerKeyword)) {
        return keyword
      }
    }
  }
  
  return null
}

// Export configuration for external use
export { CONFIG }