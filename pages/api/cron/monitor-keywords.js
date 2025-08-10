import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByMultipleKeywords, formatTweetForSMS, findMatchingKeyword } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

// Configuration constants
const CONFIG = {
  // Server-side filtering
  USE_SINCE_PARAM: true,
  SINCE_PARAM_NAME: process.env.SINCE_PARAM_NAME || 'since_id',
  SEED_TO_NOW: process.env.SEED_TO_NOW === 'true',
  
  // Scout phase
  SCOUT_MAX_RESULTS: 1,
  SCOUT_MAX_QUERY_LENGTH: 1500,
  
  // Drill phase
  DRILL_MAX_RESULTS: 3,
  
  // Cost caps
  MAX_TWEETS_PER_USER_PER_CYCLE: parseInt(process.env.MAX_TWEETS_PER_USER_PER_CYCLE) || 10,
  MAX_TWEETS_PER_RULE_PER_CYCLE: parseInt(process.env.MAX_TWEETS_PER_RULE_PER_CYCLE) || 6,
  
  // Backfill phase
  BACKFILL_MAX_PAGES: 2,
  BACKFILL_MAX_TWEETS: 6,
  BACKFILL_MAX_RUNTIME_MS: 6000,
  
  // Cost tracking
  CREDITS_PER_TWEET: 15,
  
  // Dedupe cache TTL (48 hours)
  DEDUPE_CACHE_TTL_HOURS: 48,
  
  // Provider verification
  HUGE_PAGE_THRESHOLD: 20
}

// Format timestamp for twitterapi.io since: parameter
function formatSinceTimestamp(date) {
  if (!date) return null
  
  const d = new Date(date)
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const hours = String(d.getUTCHours()).padStart(2, '0')
  const minutes = String(d.getUTCMinutes()).padStart(2, '0')
  const seconds = String(d.getUTCSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day}_${hours}:${minutes}:${seconds}_UTC`
}

// Get current time minus 2 minutes for seeding
function getSeedTimestamp() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - 2)
  return now.toISOString()
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

// Get scout state (since_at) from database
async function getScoutState(userId) {
  const { data, error } = await supabaseAdmin
    .from('scout_states')
    .select('since_at')
    .eq('user_id', userId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
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
      since_at: sinceAt,
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error(`❌ Error updating scout state for user ${userId}:`, error)
  }
}

// Get rule state (since_at) from database
async function getRuleState(ruleId) {
  const { data, error } = await supabaseAdmin
    .from('rule_states')
    .select('since_at')
    .eq('rule_id', ruleId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`❌ Error getting rule state for ${ruleId}:`, error)
  }
  
  return data?.since_at || null
}

// Update rule state with new since_at
async function updateRuleState(ruleId, sinceAt, userId) {
  const { error } = await supabaseAdmin
    .from('rule_states')
    .upsert({
      rule_id: ruleId,
      user_id: userId,
      since_at: sinceAt,
      updated_at: new Date().toISOString()
    })
  
  if (error) {
    console.error(`❌ Error updating rule state for ${ruleId}:`, error)
  }
}

// Check if tweet was already seen (48-hour dedupe cache)
async function isTweetSeen(ruleId, tweetId) {
  const { data, error } = await supabaseAdmin
    .from('seen_cache')
    .select('id')
    .eq('rule_id', ruleId)
    .eq('tweet_id', tweetId)
    .single()
  
  return !error && data
}

// Mark tweet as seen (48-hour dedupe cache)
async function markTweetSeen(ruleId, tweetId) {
  try {
    await supabaseAdmin
      .from('seen_cache')
      .insert({
        rule_id: ruleId,
        tweet_id: tweetId,
        seen_at: new Date().toISOString()
      })
  } catch (error) {
    if (error.code !== '23505') { // Ignore duplicate key errors
      console.error(`❌ Error marking tweet as seen:`, error)
    }
  }
}

// Log cost for observability with cumulative tracking
async function logCost(ruleId, phase, paramsSent, tweetsReturned, userId, creditsTotal) {
  const creditsUsed = tweetsReturned * CONFIG.CREDITS_PER_TWEET
  
  console.log(`💰 Cost log: user=${userId}, rule=${ruleId}, phase=${phase}, params=${JSON.stringify(paramsSent)}, tweets=${tweetsReturned}, credits=${creditsUsed}, total=${creditsTotal}`)
  
  try {
    await supabaseAdmin
      .from('cost_logs')
      .insert({
        rule_id: ruleId,
        phase: phase,
        params_sent: paramsSent,
        tweets_returned: tweetsReturned,
        credits_used: creditsUsed,
        credits_total: creditsTotal,
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
    if (smsResult && smsResult.sid) {
      console.log(`📱 SMS sent successfully: ${smsResult.sid}`)
      
      // Update user's alerts_used count
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ alerts_used: alertsUsed + 1 })
        .eq('x_user_id', user.x_user_id)
      
      if (updateError) {
        console.error(`❌ Error updating alerts_used for user ${user.x_user_id}:`, updateError)
      }
      
      // Log the alert
      try {
        await supabaseAdmin
          .from('alert_logs')
          .insert({
            user_id: user.x_user_id,
            rule_id: ruleId,
            tweet_id: tweet.id,
            alerted_at: new Date().toISOString(),
            channel: channel
          })
      } catch (error) {
        console.error(`❌ Error logging alert:`, error)
      }
      
      return true
    } else {
      console.error(`❌ SMS failed: no message ID returned`)
      return false
    }
  } catch (error) {
    console.error(`❌ Error sending alert:`, error)
    return false
  }
}

// Get newest tweet timestamp from response
function getNewestTweetTimestamp(tweets) {
  if (!tweets || tweets.length === 0) return null
  
  // Sort by createdAt to ensure newest first
  const sortedTweets = [...tweets].sort((a, b) => {
    const dateA = new Date(a.created_at)
    const dateB = new Date(b.created_at)
    return dateB - dateA
  })
  
  return sortedTweets[0].created_at
}

// Update since_at if needed (only if tweets returned)
async function updateSinceAtIfNeeded(tweets, currentSinceAt, updateFunction) {
  if (!tweets || tweets.length === 0) {
    console.log(`📭 No tweets returned, keeping since_at: ${currentSinceAt}`)
    return
  }
  
  const newestTimestamp = getNewestTweetTimestamp(tweets)
  if (!newestTimestamp) return
  
  // Compare timestamps
  const currentDate = currentSinceAt ? new Date(currentSinceAt) : new Date(0)
  const newestDate = new Date(newestTimestamp)
  
  if (newestDate > currentDate) {
    console.log(`📈 Updating since_at: ${currentSinceAt} → ${newestTimestamp}`)
    await updateFunction(newestTimestamp)
  } else {
    console.log(`📊 Newest tweet timestamp ${newestTimestamp} not newer than current ${currentSinceAt}`)
  }
}

// Scout phase: Check if any keywords have new tweets
async function scoutPhase(keywords, userId, creditsTotal) {
  console.log(`🔍 Scout phase: searching ${keywords.length} keywords in 1 query chunk(s)`)
  
  // Get scout state since_at
  let scoutSinceAt = await getScoutState(userId)
  
  // Seed if first run
  if (!scoutSinceAt) {
    scoutSinceAt = getSeedTimestamp()
    console.log(`🌱 Seeding scout since_at: ${scoutSinceAt} (first run)`)
  }
  
  console.log(`🔍 Scout since_at: ${scoutSinceAt}`)
  
  // Build query with proper escaping
  const keywordQueries = keywords.map(keyword => {
    if (keyword.startsWith('@')) {
      return `from:${keyword.substring(1)}`
    }
    const escapedKeyword = keyword
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\//g, '\\/')
    return `"${escapedKeyword}"`
  })
  
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
  let hasNewTweets = false
  
  for (let i = 0; i < queryChunks.length; i++) {
    const chunk = queryChunks[i]
    const sinceFormatted = formatSinceTimestamp(scoutSinceAt)
    const optimizedQuery = `(${chunk}) since:${sinceFormatted} lang:en -is:retweet -is:quote -is:reply`
    
    console.log(`🔍 Searching for ${keywords.length} keywords with exact phrase query: ${keywords.join(', ')}`)
    console.log(`📊 Max results: ${CONFIG.SCOUT_MAX_RESULTS}`)
    console.log(`📅 Using since: ${sinceFormatted}`)
    
    const tweetsData = await searchTweetsByMultipleKeywords(
      keywords,
      sinceFormatted,
      CONFIG.SCOUT_MAX_RESULTS
    )
    
    const tweets = tweetsData.data || []
    totalTweets += tweets.length
    
    // Update scout since_at if tweets returned
    await updateSinceAtIfNeeded(tweets, scoutSinceAt, (newSinceAt) => updateScoutState(userId, newSinceAt))
    
    await logCost(null, 'scout', { 
      query: optimizedQuery,
      maxResults: CONFIG.SCOUT_MAX_RESULTS,
      chunk: i + 1,
      totalChunks: queryChunks.length,
      sent_since_at: scoutSinceAt,
      new_since_at: tweets.length > 0 ? getNewestTweetTimestamp(tweets) : null
    }, tweets.length, userId, creditsTotal)
    
    if (tweets.length > 0) {
      console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length} result: HIT (${tweets.length} tweets)`)
      hasNewTweets = true
      break // Early stop on first hit
    } else {
      console.log(`🔍 Scout chunk ${i + 1}/${queryChunks.length} result: MISS (${tweets.length} tweets)`)
    }
  }
  
  if (hasNewTweets) {
    console.log(`🔍 Scout result: HIT (${totalTweets} total tweets)`)
  } else {
    console.log(`🔍 Scout result: MISS (all ${queryChunks.length} chunks)`)
  }
  
  return { hasNewTweets, tweets: [], creditsTotal }
}

// Drill phase: Check individual rules with cost caps
async function drillPhase(user, rules, userId, creditsTotal) {
  const seed = generateSeed(userId)
  const shuffledRules = shuffleWithSeed(rules, seed)
  
  console.log(`🎲 Drill phase: scanning ${shuffledRules.length} rules (seed: ${seed})`)
  
  let rulesScanned = 0
  let rulesHit = 0
  let alertsSent = 0
  let tweetsTotalUserCycle = 0
  
  for (const rule of shuffledRules) {
    rulesScanned++
    
    try {
      // Check user-level cost cap
      if (tweetsTotalUserCycle >= CONFIG.MAX_TWEETS_PER_USER_PER_CYCLE) {
        console.log(`🚫 COST_CAP_HIT: User ${userId} hit MAX_TWEETS_PER_USER_PER_CYCLE (${CONFIG.MAX_TWEETS_PER_USER_PER_CYCLE})`)
        break
      }
      
      // Get rule state (since_at)
      let ruleSinceAt = await getRuleState(rule.id)
      
      // If rule has no since_at and scout hit, seed with scout since_at
      if (!ruleSinceAt) {
        const scoutSinceAt = await getScoutState(userId)
        if (scoutSinceAt) {
          ruleSinceAt = scoutSinceAt
          console.log(`🌱 Seeding rule "${rule.query}" with scout since_at: ${ruleSinceAt}`)
        } else {
          // Seed with current time minus 2 minutes
          ruleSinceAt = getSeedTimestamp()
          console.log(`🌱 Seeding rule "${rule.query}" with seed timestamp: ${ruleSinceAt}`)
        }
      }
      
      // Build query with intent bundle for broad terms (unless disabled)
      let query = rule.query
      if (!rule.intent_strict && query.length < 10) { // Simple heuristic for broad terms
        query = `(${query}) AND ("looking for" OR "need" OR "recommend" OR "who can")`
      }
      
      // Always include filters with since: timestamp
      const sinceFormatted = formatSinceTimestamp(ruleSinceAt)
      const finalQuery = query.startsWith('@') 
        ? `from:${query.substring(1)} since:${sinceFormatted} lang:en -is:retweet -is:quote -is:reply`
        : `"${query}" since:${sinceFormatted} lang:en -is:retweet -is:quote -is:reply`
      
      console.log(`🔍 Drilling rule ${rulesScanned}/${shuffledRules.length}: "${rule.query}"`)
      console.log(`📅 Using since: ${sinceFormatted}`)
      
      // Search with since: timestamp
      const tweetsData = await searchTweetsByMultipleKeywords(
        [rule.query],
        sinceFormatted,
        CONFIG.DRILL_MAX_RESULTS
      )
      
      const tweets = tweetsData.data || []
      
      // Check for huge page warning
      if (tweets.length > CONFIG.HUGE_PAGE_THRESHOLD) {
        console.log(`⚠️ HUGE_PAGE_WARNING: ${tweets.length} tweets returned for rule "${rule.query}"`)
      }
      
      // Update credits total
      const newCredits = tweets.length * CONFIG.CREDITS_PER_TWEET
      creditsTotal += newCredits
      tweetsTotalUserCycle += tweets.length
      
      await logCost(rule.id, 'drill', { 
        sent_since_at: ruleSinceAt,
        new_since_at: tweets.length > 0 ? getNewestTweetTimestamp(tweets) : null,
        query: rule.query
      }, tweets.length, userId, creditsTotal)
      
      if (tweets.length === 0) {
        console.log(`📭 No new tweets for rule "${rule.query}"`)
        continue
      }
      
      // Filter out already seen tweets and apply per-rule cap
      const newTweets = []
      for (const tweet of tweets) {
        const seen = await isTweetSeen(rule.id, tweet.id)
        if (!seen) {
          newTweets.push({
            ...tweet,
            keyword: rule.query
          })
          await markTweetSeen(rule.id, tweet.id)
          
          // Apply per-rule tweet cap
          if (newTweets.length >= CONFIG.MAX_TWEETS_PER_RULE_PER_CYCLE) {
            console.log(`📊 Rule "${rule.query}" hit tweet cap (${CONFIG.MAX_TWEETS_PER_RULE_PER_CYCLE}), stopping`)
            break
          }
        }
      }
      
      if (newTweets.length === 0) {
        console.log(`👁️ All tweets already seen for rule "${rule.query}"`)
        continue
      }
      
      rulesHit++
      console.log(`✅ Rule HIT: "${rule.query}" - ${newTweets.length} new tweets`)
      
      // Update rule since_at
      await updateSinceAtIfNeeded(tweets, ruleSinceAt, (newSinceAt) => updateRuleState(rule.id, newSinceAt, userId))
      
      // Send alert with newest tweet
      const newestTweet = newTweets[0]
      const alertSent = await sendAlert(user, rule.id, newestTweet, user.delivery_mode || 'sms')
      
      if (alertSent) {
        alertsSent++
      }
      
      // Start backfill worker (non-blocking)
      backfillWorker(user, rule.id, newTweets, creditsTotal).catch(error => {
        console.error(`❌ Backfill worker error for rule ${rule.id}:`, error)
      })
      
      // Early stop - we found a match
      console.log(`⏹️ Early stop: found match for rule "${rule.query}"`)
      break
      
    } catch (error) {
      console.error(`❌ Error drilling rule "${rule.query}":`, error)
      await logCost(rule.id, 'drill', { 
        error: error.message,
        sent_since_at: await getRuleState(rule.id)
      }, 0, userId, creditsTotal)
    }
  }
  
  return { rulesScanned, rulesHit, alertsSent, creditsTotal, tweetsTotalUserCycle }
}

// Backfill worker with proper caps
async function backfillWorker(user, ruleId, initialTweets, creditsTotal) {
  const startTime = Date.now()
  let pagesProcessed = 0
  let totalTweets = initialTweets.length
  
  console.log(`🔄 Starting backfill worker for rule ${ruleId}`)
  
  try {
    // Get rule state for since_at
    const ruleSinceAt = await getRuleState(ruleId)
    const sinceFormatted = formatSinceTimestamp(ruleSinceAt)
    
    while (pagesProcessed < CONFIG.BACKFILL_MAX_PAGES && 
           totalTweets < CONFIG.BACKFILL_MAX_TWEETS &&
           (Date.now() - startTime) < CONFIG.BACKFILL_MAX_RUNTIME_MS) {
      
      pagesProcessed++
      
      const tweetsData = await searchTweetsByMultipleKeywords(
        [initialTweets[0].keyword],
        sinceFormatted,
        3 // Keep backfill small for efficiency
      )
      
      const tweets = tweetsData.data || []
      
      if (tweets.length === 0) {
        console.log(`📭 Backfill page ${pagesProcessed}: no more tweets`)
        break
      }
      
      // Check for huge page warning
      if (tweets.length > CONFIG.HUGE_PAGE_THRESHOLD) {
        console.log(`⚠️ HUGE_PAGE_WARNING: Backfill page ${pagesProcessed} returned ${tweets.length} tweets`)
      }
      
      // Update credits total
      const newCredits = tweets.length * CONFIG.CREDITS_PER_TWEET
      creditsTotal += newCredits
      
      // Process new tweets (just mark as seen, don't send alerts)
      let newTweetsFound = 0
      for (const tweet of tweets) {
        const seen = await isTweetSeen(ruleId, tweet.id)
        if (!seen) {
          await markTweetSeen(ruleId, tweet.id)
          newTweetsFound++
          totalTweets++
        }
      }
      
      await logCost(ruleId, 'backfill', { 
        page: pagesProcessed,
        sent_since_at: ruleSinceAt,
        new_since_at: tweets.length > 0 ? getNewestTweetTimestamp(tweets) : null
      }, tweets.length, user.x_user_id, creditsTotal)
      
      console.log(`📄 Backfill page ${pagesProcessed}: ${newTweetsFound} new tweets (${totalTweets}/${CONFIG.BACKFILL_MAX_TWEETS} total)`)
      
      // Update rule since_at
      await updateSinceAtIfNeeded(tweets, ruleSinceAt, (newSinceAt) => updateRuleState(ruleId, newSinceAt, user.x_user_id))
      
      // Check if we've hit limits
      if (totalTweets >= CONFIG.BACKFILL_MAX_TWEETS) {
        console.log(`📊 Backfill stopped: reached tweet limit (${totalTweets}/${CONFIG.BACKFILL_MAX_TWEETS})`)
        break
      }
      
      if ((Date.now() - startTime) >= CONFIG.BACKFILL_MAX_RUNTIME_MS) {
        console.log(`⏰ Backfill stopped: reached time limit (${Date.now() - startTime}ms/${CONFIG.BACKFILL_MAX_RUNTIME_MS}ms)`)
        break
      }
      
      // Small delay between backfill pages
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`✅ Backfill worker completed: ${pagesProcessed} pages, ${totalTweets} total tweets`)
    
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
        callsMade: 0,
        rulesScanned: 0,
        rulesHit: 0,
        totalSmsSent: 0,
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
          rules: []
        }
      }
      userRules[userId].rules.push(rule)
    }
    
    console.log(`📊 Grouped ${keywordRules.length} rules into ${Object.keys(userRules).length} users`)

    let totalCallsMade = 0
    let totalRulesScanned = 0
    let totalRulesHit = 0
    let totalSmsSent = 0
    let creditsTotal = 0
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

      try {
        // Scout phase: Check if any keywords have new tweets
        const scoutResult = await scoutPhase(
          rules.map(rule => rule.query),
          user.x_user_id,
          creditsTotal
        )
        
        if (!scoutResult.hasNewTweets) {
          console.log(`📭 Scout phase: no new tweets found, skipping drill phase for user ${user.x_user_id}`)
          continue
        }

        // Drill phase: Check individual rules
        const drillResult = await drillPhase(user, rules, user.x_user_id, creditsTotal)
        
        totalCallsMade += drillResult.rulesScanned + 1 // +1 for scout
        totalRulesScanned += drillResult.rulesScanned
        totalRulesHit += drillResult.rulesHit
        totalSmsSent += drillResult.alertsSent
        creditsTotal = drillResult.creditsTotal
        
        // Log user cycle summary
        const usdCost = (creditsTotal / 100000).toFixed(6)
        console.log(`📊 User ${user.x_user_id} cycle summary: rules_considered=${rules.length}, rules_scanned=${drillResult.rulesScanned}, rules_hit=${drillResult.rulesHit}, credits_total=${creditsTotal}, usd=${usdCost}`)
        
        if (drillResult.tweetsTotalUserCycle >= CONFIG.MAX_TWEETS_PER_USER_PER_CYCLE) {
          console.log(`🚫 COST_CAP_HIT: User ${user.x_user_id} hit MAX_TWEETS_PER_USER_PER_CYCLE`)
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${user.x_user_id}:`, error)
      }
    }

    // Final summary
    const usdCost = (creditsTotal / 100000).toFixed(6)
    console.log(`🎯 Cron job completed:`)
    console.log(`📊 Calls made: ${totalCallsMade}`)
    console.log(`🔍 Rules scanned: ${totalRulesScanned}`)
    console.log(`✅ Rules hit: ${totalRulesHit}`)
    console.log(`📱 SMS sent: ${totalSmsSent}`)
    console.log(`💰 Credits total: ${creditsTotal}`)
    console.log(`💵 Cost estimate: $${usdCost}`)

    res.status(200).json({
      success: true,
      callsMade: totalCallsMade,
      rulesScanned: totalRulesScanned,
      rulesHit: totalRulesHit,
      totalSmsSent: totalSmsSent,
      creditsTotal: creditsTotal,
      costEstimate: parseFloat(usdCost),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Cron job error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 