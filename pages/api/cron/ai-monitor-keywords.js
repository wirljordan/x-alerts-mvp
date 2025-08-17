import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByMultipleKeywords, formatSinceTimestamp, getNewestTweetTimestamp } from '../../../lib/twitter-api'
import { processTweetWithAI } from '../../../lib/ai-service'
import { postReplyAndLog } from '../../../lib/x-api'

// Configuration constants
const CONFIG = {
  // Scout phase
  SCOUT_MAX_RESULTS: 10,
  SCOUT_MAX_QUERY_LENGTH: 1500,
  
  // Cost caps
  MAX_TWEETS_PER_USER_PER_CYCLE: 20,
  MAX_TWEETS_PER_RULE_PER_CYCLE: 8,
  
  // Cost tracking
  CREDITS_PER_TWEET: 15,
  
  // Dedupe cache TTL (48 hours)
  DEDUPE_CACHE_TTL_HOURS: 48,
  
  // Debounce
  DEBOUNCE_SECONDS: 60
}

// Get scout state (since_at) from database
async function getScoutState(userId) {
  const { data, error } = await supabaseAdmin
    .from('scout_states')
    .select('since_at')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error(`❌ Error getting scout state for user ${userId}:`, error)
  }
  
  return data?.since_at || null
}

// Update scout state with new since_at
async function updateScoutState(userId, sinceAt) {
  const { error } = await supabaseAdmin
    .from('scout_states')
    .upsert({
      user_id: userId,
      since_at: sinceAt
    })
  
  if (error) {
    console.error(`❌ Error updating scout state for user ${userId}:`, error)
  }
}

// Check if tweet was already processed
async function isTweetProcessed(tweetId, userId) {
  const { data, error } = await supabaseAdmin
    .from('ai_replies')
    .select('id')
    .eq('tweet_id', tweetId)
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') {
    console.error(`❌ Error checking if tweet processed:`, error)
  }
  
  return !!data
}

// Process tweet with AI and post reply
async function processAndReplyToTweet(tweet, rule, user, businessProfile) {
  try {
    // Check if tweet was already processed
    const alreadyProcessed = await isTweetProcessed(tweet.id, user.id)
    if (alreadyProcessed) {
      console.log(`⏭️ Tweet ${tweet.id} already processed for user ${user.x_user_id}`)
      return { processed: false, reason: 'Already processed' }
    }

    // Process tweet with AI
    const aiResult = await processTweetWithAI(tweet.text, businessProfile)
    
    if (!aiResult.relevant) {
      console.log(`❌ Tweet ${tweet.id} not relevant: ${aiResult.reason}`)
      return { processed: false, reason: aiResult.reason }
    }

    // Post reply to X
    const replyResult = await postReplyAndLog(
      user.id,
      rule.id,
      tweet.id,
      tweet.text,
      aiResult.reply,
      supabaseAdmin
    )

    if (replyResult.success) {
      console.log(`✅ Reply posted successfully: ${replyResult.replyId}`)
      return { 
        processed: true, 
        replyId: replyResult.replyId,
        replyText: replyResult.replyText
      }
    } else {
      console.error(`❌ Failed to post reply: ${replyResult.error}`)
      return { processed: false, reason: replyResult.error }
    }

  } catch (error) {
    console.error(`❌ Error processing tweet ${tweet.id}:`, error)
    return { processed: false, reason: error.message }
  }
}

// Scout phase: Check all keywords in one query and process with AI
async function scoutPhase(user, rules, userId, businessProfile, creditsTotal) {
  console.log(`🔍 Scout phase: searching ${rules.length} keywords in one query`)
  
  // Get scout state since_at
  let scoutSinceAt = await getScoutState(userId)
  
  // Seed if first run
  if (!scoutSinceAt) {
    const now = new Date()
    now.setMinutes(now.getMinutes() - 2) // Start from 2 minutes ago
    scoutSinceAt = now.toISOString()
    console.log(`🌱 Seeding scout since_at: ${scoutSinceAt} (first run)`)
  }
  
  console.log(`🔍 Scout since_at: ${scoutSinceAt}`)
  
  // Build one OR query for all rules
  const keywordQueries = rules.map(rule => {
    if (rule.query.startsWith('@')) {
      return `from:${rule.query.substring(1)}`
    }
    const escapedKeyword = rule.query
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\//g, '\\/')
    return `"${escapedKeyword}"`
  })
  
  // Split into chunks if query gets too long
  const queryChunks = []
  let currentChunk = []
  let currentLength = 0
  
  for (const query of keywordQueries) {
    const queryLength = query.length + (currentChunk.length > 0 ? 4 : 0) // +4 for " OR "
    if (currentLength + queryLength > CONFIG.SCOUT_MAX_QUERY_LENGTH && currentChunk.length > 0) {
      queryChunks.push(currentChunk.join(' OR '))
      currentChunk = [query]
      currentLength = queryLength
    } else {
      currentChunk.push(query)
      currentLength += queryLength
    }
  }
  if (currentChunk.length > 0) {
    queryChunks.push(currentChunk.join(' OR '))
  }
  
  let totalTweets = 0
  let totalRepliesPosted = 0
  let newestTimestamp = null
  
  for (let i = 0; i < queryChunks.length; i++) {
    const chunk = queryChunks[i]
    
    const sinceFormatted = formatSinceTimestamp(scoutSinceAt)
    const optimizedQuery = `(${chunk}) since:${sinceFormatted} lang:en -is:retweet -is:quote -is:reply`
    
    console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length}: searching for ${rules.length} keywords`)
    console.log(`📊 Max results: ${CONFIG.SCOUT_MAX_RESULTS}`)
    console.log(`📅 Using since: ${sinceFormatted}`)
    
    const tweetsData = await searchTweetsByMultipleKeywords(
      rules.map(r => r.query),
      sinceFormatted,
      CONFIG.SCOUT_MAX_RESULTS
    )
    
    const tweets = tweetsData.data || []
    totalTweets += tweets.length
    
    // Update credits total
    const newCredits = tweets.length * CONFIG.CREDITS_PER_TWEET
    creditsTotal += newCredits
    
    if (tweets.length === 0) {
      console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length} result: MISS (0 tweets)`)
      continue
    }
    
    console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length} result: HIT (${tweets.length} tweets)`)
    
    // Process each tweet and find matching rules
    for (const tweet of tweets) {
      // Find which rule matches this tweet
      const matchingRule = findMatchingRule(tweet.text, rules)
      
      if (matchingRule) {
        console.log(`🎯 Tweet ${tweet.id} matches rule: ${matchingRule.query}`)
        
        // Process tweet with AI and post reply
        const result = await processAndReplyToTweet(tweet, matchingRule, user, businessProfile)
        
        if (result.processed) {
          totalRepliesPosted++
        }
      }
      
      // Update newest timestamp
      if (!newestTimestamp || new Date(tweet.created_at) > new Date(newestTimestamp)) {
        newestTimestamp = tweet.created_at
      }
    }
  }
  
  // Update scout state with newest timestamp
  if (newestTimestamp) {
    await updateScoutState(userId, newestTimestamp)
  }
  
  return {
    totalTweets,
    totalRepliesPosted,
    creditsTotal,
    newestTimestamp
  }
}

// Find which rule matches a tweet
function findMatchingRule(tweetText, rules) {
  const lowerTweetText = tweetText.toLowerCase()
  
  for (const rule of rules) {
    const keyword = rule.query.toLowerCase()
    
    // Handle @ mentions
    if (keyword.startsWith('@')) {
      const username = keyword.substring(1)
      if (lowerTweetText.includes(`@${username}`) || lowerTweetText.includes(username)) {
        return rule
      }
    } else {
      // Check for exact keyword match
      const keywordWords = keyword.split(/\s+/).filter(word => word.length > 0)
      
      if (keywordWords.length === 1) {
        // Single word - check for exact match
        if (lowerTweetText.includes(keyword)) {
          return rule
        }
      } else {
        // Multiple words - check if ALL words are present in order
        const tweetWords = lowerTweetText.split(/\s+/)
        let allWordsFound = true
        
        for (const word of keywordWords) {
          if (!tweetWords.some(tweetWord => tweetWord.includes(word))) {
            allWordsFound = false
            break
          }
        }
        
        if (allWordsFound) {
          return rule
        }
      }
    }
  }
  
  return null
}

export default async function handler(req, res) {
  // Verify this is a legitimate cron request
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('⚠️ Unauthorized cron request - missing or invalid CRON_SECRET')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Accept both GET and POST methods for Vercel cron compatibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
  }

  try {
    console.log('🤖 Starting AI-powered keyword monitoring cron job...')

    // Get all active keyword rules with users and business profiles
    const { data: keywordRules, error: rulesError } = await supabaseAdmin
      .from('keyword_rules')
      .select(`
        *,
        users!inner(
          id,
          x_user_id,
          plan,
          timezone,
          quiet_hours_start,
          quiet_hours_end
        ),
        business_profiles!inner(*)
      `)
      .eq('status', 'active')

    if (rulesError) {
      console.error('❌ Error fetching keyword rules:', rulesError)
      return res.status(500).json({ error: 'Failed to fetch keyword rules' })
    }

    console.log(`📊 Found ${keywordRules.length} active keyword rules`)

    if (keywordRules.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active keyword rules to monitor',
        callsMade: 0,
        rulesScanned: 0,
        rulesHit: 0,
        totalRepliesPosted: 0,
        creditsTotal: 0,
        costEstimate: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Group rules by user
    const userRules = {}
    for (const rule of keywordRules) {
      const userId = rule.user_id
      if (!userRules[userId]) {
        userRules[userId] = {
          user: rule.users,
          businessProfile: rule.business_profiles,
          rules: []
        }
      }
      userRules[userId].rules.push(rule)
    }

    let totalCallsMade = 0
    let totalRulesScanned = 0
    let totalRulesHit = 0
    let totalRepliesPosted = 0
    let creditsTotal = 0

    // Process each user
    for (const [userId, userData] of Object.entries(userRules)) {
      const { user, businessProfile, rules } = userData
      totalRulesScanned += rules.length

      console.log(`👤 Processing user ${user.x_user_id} with ${rules.length} rules`)

      try {
        // Scout phase: Check all keywords in one query and process with AI
        const scoutResult = await scoutPhase(user, rules, user.x_user_id, businessProfile, creditsTotal)
        
        totalCallsMade += 1
        totalRepliesPosted += scoutResult.totalRepliesPosted
        creditsTotal = scoutResult.creditsTotal
        
        if (scoutResult.totalRepliesPosted > 0) {
          totalRulesHit += 1
        }
        
        // Log user cycle summary
        const usdCost = (creditsTotal / 100000).toFixed(6)
        console.log(`📊 User ${user.x_user_id} cycle summary: rules_considered=${rules.length}, scout_calls=1, replies_posted=${scoutResult.totalRepliesPosted}, credits_total=${creditsTotal}, usd=${usdCost}`)
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.x_user_id}:`, error)
      }
    }

    // Final summary
    const usdCost = (creditsTotal / 100000).toFixed(6)
    console.log(`🎯 AI Cron job completed:`)
    console.log(`📊 Calls made: ${totalCallsMade}`)
    console.log(`🔍 Rules scanned: ${totalRulesScanned}`)
    console.log(`✅ Rules hit: ${totalRulesHit}`)
    console.log(`🤖 Replies posted: ${totalRepliesPosted}`)
    console.log(`💰 Credits total: ${creditsTotal}`)
    console.log(`💵 Cost estimate: $${usdCost}`)

    res.status(200).json({
      success: true,
      callsMade: totalCallsMade,
      rulesScanned: totalRulesScanned,
      rulesHit: totalRulesHit,
      totalRepliesPosted: totalRepliesPosted,
      creditsTotal: creditsTotal,
      costEstimate: parseFloat(usdCost),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ AI Cron job error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 