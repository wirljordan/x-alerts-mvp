import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByMultipleKeywords, formatTweetForSMS, findMatchingKeyword } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

// Configuration constants
const CONFIG = {
  // Server-side filtering
  USE_SINCE_PARAM: true,
  SINCE_PARAM_NAME: 'since_id',
  
  // Scout phase
  SCOUT_MAX_RESULTS: 1,
  
  // Backfill phase
  BACKFILL_MAX_PAGES: 2,
  BACKFILL_MAX_TWEETS: 6,
  BACKFILL_MAX_RUNTIME_MS: 6000,
  
  // Time window fallback
  TIME_WINDOW_MINUTES: 5,
  
  // Cost tracking
  CREDITS_PER_TWEET: 15
}

// Fisher-Yates shuffle with deterministic seed
function shuffleWithSeed(array, seed) {
  const shuffled = [...array]
  const random = (min, max) => {
    const x = Math.sin(seed++) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = random(0, i)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

// Generate deterministic seed for current minute
function generateSeed(userId) {
  const now = new Date()
  const minuteKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const hash = `${userId}${minuteKey}`.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return Math.abs(hash)
}

// Check if user is in quiet hours
function isInQuietHours(user) {
  if (!user.timezone || !user.quiet_hours_start || !user.quiet_hours_end) {
    return false
  }
  
  const now = new Date()
  const userTime = new Date(now.toLocaleString('en-US', { timeZone: user.timezone }))
  const currentTime = userTime.toTimeString().slice(0, 8)
  
  const start = user.quiet_hours_start
  const end = user.quiet_hours_end
  
  if (start <= end) {
    return currentTime >= start && currentTime <= end
  } else {
    // Handles overnight quiet hours (e.g., 22:00 to 08:00)
    return currentTime >= start || currentTime <= end
  }
}

// Get rule state (since_id) from database
async function getRuleState(ruleId) {
  const { data, error } = await supabaseAdmin
    .from('rule_states')
    .select('since_id')
    .eq('rule_id', ruleId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`❌ Error getting rule state for ${ruleId}:`, error)
  }
  
  return data?.since_id || null
}

// Update rule state with new since_id
async function updateRuleState(ruleId, sinceId) {
  const { error } = await supabaseAdmin
    .from('rule_states')
    .upsert({
      rule_id: ruleId,
      since_id: sinceId,
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error(`❌ Error updating rule state for ${ruleId}:`, error)
  }
}

// Check if tweet was already seen
async function isTweetSeen(ruleId, tweetId) {
  const { data, error } = await supabaseAdmin
    .from('seen_cache')
    .select('id')
    .eq('rule_id', ruleId)
    .eq('tweet_id', tweetId)
    .single()
  
  return !error && data
}

// Mark tweet as seen
async function markTweetSeen(ruleId, tweetId) {
  try {
    await supabaseAdmin
      .from('seen_cache')
      .insert({
        rule_id: ruleId,
        tweet_id: tweetId
      })
  } catch (error) {
    if (error.code !== '23505') { // Ignore duplicate key errors
      console.error(`❌ Error marking tweet as seen:`, error)
    }
  }
}

// Log cost for observability
async function logCost(ruleId, phase, paramsSent, tweetsReturned, userId) {
  const creditsUsed = tweetsReturned * CONFIG.CREDITS_PER_TWEET
  
  console.log(`💰 Cost log: user=${userId}, rule=${ruleId}, phase=${phase}, params=${JSON.stringify(paramsSent)}, tweets=${tweetsReturned}, credits=${creditsUsed}`)
  
  try {
    await supabaseAdmin
      .from('cost_logs')
      .insert({
        rule_id: ruleId,
        phase: phase,
        params_sent: paramsSent,
        tweets_returned: tweetsReturned,
        credits_used: creditsUsed,
        logged_at: new Date().toISOString()
      })
  } catch (error) {
    console.error(`❌ Error logging cost:`, error)
  }
}

// Send alert and update usage
async function sendAlert(user, ruleId, tweet, channel = 'sms') {
  try {
    // Check if user has alerts remaining
    const alertsUsed = user.alerts_used || 0
    let alertsLimit = 10
    const planLimits = { 'free': 10, 'starter': 100, 'growth': 300, 'pro': 1000 }
    alertsLimit = planLimits[user.plan] || 10
    
    if (alertsUsed >= alertsLimit) {
      console.log(`⚠️ User ${user.x_user_id} has reached alerts limit (${alertsUsed}/${alertsLimit})`)
      return false
    }

    // Format and send SMS
    const smsText = formatKeywordAlertSMS(tweet.keyword, { tweetId: tweet.id })
    const formattedPhone = formatPhoneNumber(user.phone)
    
    const smsResult = await sendSMSNotification(formattedPhone, smsText)
    
    if (smsResult.success) {
      console.log(`📱 SMS sent successfully: ${smsResult.messageId}`)
      
      // Update user's alerts_used count
      await supabaseAdmin
        .from('users')
        .update({ alerts_used: alertsUsed + 1 })
        .eq('id', user.id)
      
      // Log the alert
      await supabaseAdmin
        .from('alert_logs')
        .insert({
          user_id: user.id,
          rule_id: ruleId,
          tweet_id: tweet.id,
          alerted_at: new Date().toISOString(),
          channel: channel
        })
      
      return true
    } else {
      console.error(`❌ SMS failed: ${smsResult.error}`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error sending alert:`, error)
    return false
  }
}

// Scout phase: Check if any keywords have new tweets
async function scoutPhase(keywords, userId) {
  if (keywords.length === 0) return { hasNewTweets: false, tweets: [] }
  
  // Escape brackets and special characters in keywords
  const keywordQueries = keywords.map(keyword => {
    if (keyword.startsWith('@')) {
      return `from:${keyword.substring(1)}`
    }
    // Escape brackets and forward slashes for literal search
    const escapedKeyword = keyword
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\//g, '\\/')
    return `"${escapedKeyword}"`
  })
  
  // Split into chunks if query gets too long (Twitter API limit ~1000 chars)
  const MAX_QUERY_LENGTH = 800
  const queryChunks = []
  let currentChunk = []
  let currentLength = 0
  
  for (const query of keywordQueries) {
    const queryLength = query.length + (currentChunk.length > 0 ? 4 : 0) // +4 for " OR "
    if (currentLength + queryLength > MAX_QUERY_LENGTH && currentChunk.length > 0) {
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
  
  console.log(`🔍 Scout phase: searching ${keywords.length} keywords in ${queryChunks.length} query chunk(s)`)
  
  // Try each query chunk
  for (let i = 0; i < queryChunks.length; i++) {
    const chunk = queryChunks[i]
    const scoutQuery = `(${chunk}) lang:en -is:retweet -is:quote -is:reply`
    
    try {
      const tweetsData = await searchTweetsByMultipleKeywords(
        keywords, // Pass original keywords for the API call
        null, // No since_id for scout
        CONFIG.SCOUT_MAX_RESULTS
      )
      
      const hasNewTweets = tweetsData.data && tweetsData.data.length > 0
      
      await logCost(null, 'scout', { 
        query: scoutQuery, 
        maxResults: CONFIG.SCOUT_MAX_RESULTS,
        chunk: i + 1,
        totalChunks: queryChunks.length
      }, tweetsData.data?.length || 0, userId)
      
      console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length} result: ${hasNewTweets ? 'HIT' : 'MISS'} (${tweetsData.data?.length || 0} tweets)`)
      
      if (hasNewTweets) {
        return { hasNewTweets: true, tweets: tweetsData.data || [] }
      }
    } catch (error) {
      console.error(`❌ Scout phase error on chunk ${i + 1}:`, error)
      await logCost(null, 'scout', { 
        query: scoutQuery, 
        maxResults: CONFIG.SCOUT_MAX_RESULTS,
        chunk: i + 1,
        totalChunks: queryChunks.length,
        error: error.message
      }, 0, userId)
    }
  }
  
  console.log(`🔍 Scout result: MISS (all ${queryChunks.length} chunks)`)
  return { hasNewTweets: false, tweets: [] }
}

// Drill phase: Check individual rules
async function drillPhase(user, rules, userId) {
  const seed = generateSeed(userId)
  const shuffledRules = shuffleWithSeed(rules, seed)
  
  console.log(`🎲 Drill phase: scanning ${shuffledRules.length} rules (seed: ${seed})`)
  
  let rulesScanned = 0
  let rulesHit = 0
  let alertsSent = 0
  
  for (const rule of shuffledRules) {
    rulesScanned++
    
    try {
      // Get rule state (since_id)
      const sinceId = await getRuleState(rule.id)
      
      // Build query
      const query = rule.query.startsWith('@') 
        ? `from:${rule.query.substring(1)}`
        : `"${rule.query}" lang:en -is:retweet -is:quote -is:reply`
      
      console.log(`🔍 Drilling rule ${rulesScanned}/${shuffledRules.length}: "${rule.query}"`)
      
      // Search with since_id or time window
      const params = CONFIG.USE_SINCE_PARAM && sinceId 
        ? { [CONFIG.SINCE_PARAM_NAME]: sinceId }
        : { start_time: new Date(Date.now() - CONFIG.TIME_WINDOW_MINUTES * 60 * 1000).toISOString() }
      
      const tweetsData = await searchTweetsByMultipleKeywords(
        [rule.query],
        sinceId,
        3 // Keep drill phase small for efficiency
      )
      
      await logCost(rule.id, 'drill', params, tweetsData.data?.length || 0, userId)
      
      if (!tweetsData.data || tweetsData.data.length === 0) {
        console.log(`📭 No new tweets for rule "${rule.query}"`)
        continue
      }
      
      // Filter out already seen tweets
      const newTweets = []
      let maxTweetId = sinceId
      
      for (const tweet of tweetsData.data) {
        const seen = await isTweetSeen(rule.id, tweet.id)
        if (!seen) {
          newTweets.push({
            ...tweet,
            keyword: rule.query
          })
          await markTweetSeen(rule.id, tweet.id)
          
          // Track highest tweet ID for since_id update
          if (!maxTweetId || tweet.id > maxTweetId) {
            maxTweetId = tweet.id
          }
        }
      }
      
      if (newTweets.length === 0) {
        console.log(`👁️ All tweets already seen for rule "${rule.query}"`)
        continue
      }
      
      rulesHit++
      console.log(`✅ Rule HIT: "${rule.query}" - ${newTweets.length} new tweets`)
      
      // Update rule state with new since_id
      if (maxTweetId) {
        await updateRuleState(rule.id, maxTweetId)
      }
      
      // Send alert with newest tweet
      const newestTweet = newTweets[0]
      const alertSent = await sendAlert(user, rule.id, newestTweet, user.delivery_mode || 'sms')
      
      if (alertSent) {
        alertsSent++
      }
      
      // Start backfill worker (non-blocking)
      backfillWorker(user, rule.id, newTweets).catch(error => {
        console.error(`❌ Backfill worker error for rule ${rule.id}:`, error)
      })
      
      // Early stop - we found a match
      console.log(`⏹️ Early stop: found match for rule "${rule.query}"`)
      break
      
    } catch (error) {
      console.error(`❌ Error drilling rule "${rule.query}":`, error)
      await logCost(rule.id, 'drill', { error: error.message }, 0, userId)
    }
  }
  
  return { rulesScanned, rulesHit, alertsSent }
}

// Backfill worker (unchanged from original)
async function backfillWorker(user, ruleId, initialTweets) {
  const startTime = Date.now()
  let pagesProcessed = 0
  let totalTweets = initialTweets.length
  
  console.log(`🔄 Starting backfill worker for rule ${ruleId}`)
  
  try {
    // Get rule state for since_id
    const sinceId = await getRuleState(ruleId)
    
    while (pagesProcessed < CONFIG.BACKFILL_MAX_PAGES && 
           totalTweets < CONFIG.BACKFILL_MAX_TWEETS &&
           (Date.now() - startTime) < CONFIG.BACKFILL_MAX_RUNTIME_MS) {
      
      pagesProcessed++
      
      const tweetsData = await searchTweetsByMultipleKeywords(
        [initialTweets[0].keyword],
        sinceId,
        3 // Keep backfill small for efficiency
      )
      
      if (!tweetsData.data || tweetsData.data.length === 0) {
        break
      }
      
      // Process new tweets (simplified - just log them)
      for (const tweet of tweetsData.data) {
        const seen = await isTweetSeen(ruleId, tweet.id)
        if (!seen) {
          await markTweetSeen(ruleId, tweet.id)
          totalTweets++
        }
      }
      
      await logCost(ruleId, 'backfill', { page: pagesProcessed }, tweetsData.data.length, user.x_user_id)
    }
    
    console.log(`✅ Backfill completed: ${pagesProcessed} pages, ${totalTweets} total tweets`)
    
  } catch (error) {
    console.error(`❌ Backfill worker error:`, error)
  }
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
    console.log('🔄 Starting optimized keyword monitoring cron job...')

    // Get all active keyword rules from the database
    const { data: keywordRules, error: rulesError } = await supabaseAdmin
      .from('keyword_rules')
      .select(`
        *,
        users!inner(
          id,
          x_user_id,
          phone,
          plan,
          alerts_used,
          alerts_limit,
          timezone,
          quiet_hours_start,
          quiet_hours_end,
          delivery_mode
        )
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
        totalProcessed: 0,
        totalSmsSent: 0,
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
          rules: []
        }
      }
      userRules[userId].rules.push(rule)
    }

    let totalCallsMade = 0
    let totalRulesScanned = 0
    let totalRulesHit = 0
    let totalTweets = 0
    let totalSmsSent = 0
    const results = []

    // Process each user
    for (const [userId, userData] of Object.entries(userRules)) {
      const { user, rules } = userData
      
      console.log(`👤 Processing user ${user.x_user_id} with ${rules.length} rules`)
      
      // Check if user has alerts credits remaining
      const alertsUsed = user.alerts_used || 0
      let alertsLimit = 10
      const planLimits = { 'free': 10, 'starter': 100, 'growth': 300, 'pro': 1000 }
      alertsLimit = planLimits[user.plan] || 10
      
      if (alertsUsed >= alertsLimit) {
        console.log(`⚠️ User ${user.x_user_id} has reached alerts limit (${alertsUsed}/${alertsLimit})`)
        continue
      }

      // Check if user has a valid phone number for SMS
      if (!user.phone || !user.phone.trim()) {
        console.log(`⚠️ User ${user.x_user_id} has no phone number`)
        continue
      }

      // Check quiet hours - skip entire processing if user is in quiet hours
      const inQuietHours = isInQuietHours(user)
      if (inQuietHours) {
        console.log(`😴 User ${user.x_user_id} is in quiet hours, skipping all processing (no API calls or SMS)`)
        continue
      }

      // Scout phase: Check if any keywords have new tweets
      const keywords = rules.map(rule => rule.query)
      const scoutResult = await scoutPhase(keywords, user.x_user_id)
      totalCallsMade++
      
      if (!scoutResult.hasNewTweets) {
        console.log(`📭 Scout phase: no new tweets found, skipping drill phase for user ${user.x_user_id}`)
        continue
      }

      // Drill phase: Check individual rules
      const drillResult = await drillPhase(user, rules, user.x_user_id)
      totalCallsMade += drillResult.rulesScanned
      totalRulesScanned += drillResult.rulesScanned
      totalRulesHit += drillResult.rulesHit
      totalSmsSent += drillResult.alertsSent

      results.push({
        userId: user.x_user_id,
        rulesScanned: drillResult.rulesScanned,
        rulesHit: drillResult.rulesHit,
        alertsSent: drillResult.alertsSent
      })
    }

    // Calculate cost estimate
    const costEstimate = (totalTweets * CONFIG.CREDITS_PER_TWEET) / 100000

    console.log(`🎯 Cron job completed:`)
    console.log(`  📊 Calls made: ${totalCallsMade}`)
    console.log(`  🔍 Rules scanned: ${totalRulesScanned}`)
    console.log(`  ✅ Rules hit: ${totalRulesHit}`)
    console.log(`  📱 SMS sent: ${totalSmsSent}`)
    console.log(`  💰 Cost estimate: $${costEstimate.toFixed(4)}`)

    return res.status(200).json({
      success: true,
      message: `Processed ${totalRulesScanned} rules, hit ${totalRulesHit}, sent ${totalSmsSent} alerts`,
      callsMade: totalCallsMade,
      rulesScanned: totalRulesScanned,
      rulesHit: totalRulesHit,
      totalSmsSent,
      costEstimate,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in cron job:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      callsMade: 0,
      rulesScanned: 0,
      rulesHit: 0,
      totalSmsSent: 0,
      costEstimate: 0,
      timestamp: new Date().toISOString()
    })
  }
} 