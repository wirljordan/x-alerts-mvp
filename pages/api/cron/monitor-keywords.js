import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByMultipleKeywords, formatTweetForSMS, findMatchingKeyword } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

// Configuration constants
const CONFIG = {
  MAX_RESULTS_PER_CALL: 3,
  BACKFILL_MAX_PAGES: 4,
  BACKFILL_MAX_TWEETS: 20,
  BACKFILL_MAX_RUNTIME_MS: 8000,
  TIME_WINDOW_MINUTES: 5,
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

// Build query with filters
function buildQuery(keyword, filters = {}) {
  let query = keyword
  
  if (keyword.startsWith('@')) {
    const username = keyword.substring(1)
    query = `from:${username}`
  } else {
    query = `"${keyword}" lang:en -is:retweet -is:quote -is:reply -is:verified`
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
  await supabaseAdmin
    .from('seen_cache')
    .insert({
      rule_id: ruleId,
      tweet_id: tweetId
    })
}

// Log cost
async function logCost(ruleId, tweetsReturned) {
  const creditsUsed = tweetsReturned * CONFIG.CREDITS_PER_TWEET
  await supabaseAdmin
    .from('cost_logs')
    .insert({
      rule_id: ruleId,
      tweets_returned: tweetsReturned,
      credits_used: creditsUsed
    })
}

// Send alert
async function sendAlert(user, ruleId, tweet, channel = 'sms') {
  // Check if already alerted for this tweet
  const { data: existingAlert } = await supabaseAdmin
    .from('alert_logs')
    .select('id')
    .eq('rule_id', ruleId)
    .eq('tweet_id', tweet.id)
    .single()
  
  if (existingAlert) {
    console.log(`⚠️ Alert already sent for tweet ${tweet.id}`)
    return false
  }
  
  let success = false
  
  if (channel === 'sms' && user.phone) {
    try {
      const tweetData = formatTweetForSMS(tweet, { username: tweet.author_username || 'unknown' })
      const smsMessage = formatKeywordAlertSMS(tweet.keyword || 'keyword', tweetData)
      const formattedPhone = formatPhoneNumber(user.phone)
      
      await sendSMSNotification(formattedPhone, smsMessage)
      success = true
      console.log(`📱 SMS sent for tweet ${tweet.id}`)
    } catch (error) {
      console.error(`❌ Failed to send SMS for tweet ${tweet.id}:`, error)
    }
  }
  
  // Log the alert
  await supabaseAdmin
    .from('alert_logs')
    .insert({
      user_id: user.id,
      rule_id: ruleId,
      tweet_id: tweet.id,
      channel: channel
    })
  
  return success
}

// Backfill worker
async function backfillWorker(user, ruleId, initialTweets, seenTweetIds) {
  // Check quiet hours before starting backfill
  if (isInQuietHours(user)) {
    console.log(`😴 User ${user.x_user_id} is in quiet hours, skipping backfill for rule ${ruleId}`)
    return initialTweets.length
  }

  const startTime = Date.now()
  let totalTweets = initialTweets.length
  let pages = 0
  
  console.log(`🔄 Starting backfill for rule ${ruleId}`)
  
  while (pages < CONFIG.BACKFILL_MAX_PAGES && 
         totalTweets < CONFIG.BACKFILL_MAX_TWEETS && 
         (Date.now() - startTime) < CONFIG.BACKFILL_MAX_RUNTIME_MS) {
    
    try {
      // Get the oldest tweet from current batch for pagination
      const oldestTweet = initialTweets[initialTweets.length - 1]
      if (!oldestTweet) break
      
      const tweetsData = await searchTweetsByMultipleKeywords(
        [initialTweets[0].keyword], 
        oldestTweet.id, 
        CONFIG.MAX_RESULTS_PER_CALL
      )
      
      if (!tweetsData.data || tweetsData.data.length === 0) {
        console.log(`📄 Backfill page ${pages + 1}: No more tweets`)
        break
      }
      
      const newTweets = tweetsData.data.filter(tweet => !seenTweetIds.has(tweet.id))
      
      if (newTweets.length === 0) {
        console.log(`📄 Backfill page ${pages + 1}: All tweets already seen`)
        break
      }
      
      // Mark new tweets as seen
      for (const tweet of newTweets) {
        await markTweetSeen(ruleId, tweet.id)
        seenTweetIds.add(tweet.id)
      }
      
      totalTweets += newTweets.length
      pages++
      
      console.log(`📄 Backfill page ${pages}: Found ${newTweets.length} new tweets`)
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`❌ Backfill error on page ${pages + 1}:`, error)
      break
    }
  }
  
  console.log(`✅ Backfill completed: ${pages} pages, ${totalTweets} total tweets`)
  return totalTweets
}

export default async function handler(req, res) {
  // Verify this is a legitimate cron request (optional security for Vercel cron)
  const authHeader = req.headers.authorization
  const cronSecret = process.env.CRON_SECRET
  
  // Only check auth if CRON_SECRET is set (for testing, it might not be set)
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('⚠️ Unauthorized cron request - missing or invalid CRON_SECRET')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Accept both GET and POST methods for Vercel cron compatibility
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use GET or POST.' })
  }

  try {
    console.log('🔄 Starting improved keyword monitoring cron job...')

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

    let totalProcessed = 0
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

      // Generate deterministic seed for current minute
      const seed = generateSeed(userId)
      
      // Shuffle rules uniformly
      const shuffledRules = shuffleWithSeed(rules, seed)
      console.log(`🎲 Shuffled ${shuffledRules.length} rules for user ${user.x_user_id} (seed: ${seed})`)

      // Calculate time window (5 minutes ago to now)
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - CONFIG.TIME_WINDOW_MINUTES * 60 * 1000)
      
      let userProcessed = 0
      let userSmsSent = 0
      let foundMatch = false

      // Process rules in shuffled order
      for (const rule of shuffledRules) {
        if (foundMatch) {
          console.log(`⏹️ Stopping early for user ${user.x_user_id} - match found`)
          break
        }

        try {
          console.log(`🔍 Processing rule: "${rule.query}" for user ${user.x_user_id}`)
          
          // Build query with filters
          const query = buildQuery(rule.query, rule.filters || {})
          
          // Search for tweets in the 5-minute window
          const tweetsData = await searchTweetsByMultipleKeywords(
            [rule.query], 
            fiveMinutesAgo.toISOString(), 
            CONFIG.MAX_RESULTS_PER_CALL
          )

          if (!tweetsData.data || tweetsData.data.length === 0) {
            console.log(`📭 No tweets found for rule "${rule.query}"`)
            await logCost(rule.id, 0)
            continue
          }

          // Filter out already seen tweets
          const newTweets = []
          for (const tweet of tweetsData.data) {
            const seen = await isTweetSeen(rule.id, tweet.id)
            if (!seen) {
              newTweets.push({
                ...tweet,
                keyword: rule.query
              })
              await markTweetSeen(rule.id, tweet.id)
            }
          }

          if (newTweets.length === 0) {
            console.log(`👁️ All tweets already seen for rule "${rule.query}"`)
            await logCost(rule.id, tweetsData.data.length)
            continue
          }

          console.log(`✅ Found ${newTweets.length} new tweets for rule "${rule.query}"`)
          
          // Take the newest tweet for immediate alert
          const newestTweet = newTweets[0]
          
          // Send immediate alert (quiet hours already checked above)
          const alertSent = await sendAlert(user, rule.id, newestTweet, user.delivery_mode || 'sms')
          if (alertSent) {
            userSmsSent++
            totalSmsSent++
          }

          // Log the cost
          await logCost(rule.id, tweetsData.data.length)

          // Store results for backfill
          results.push({
            userId: user.x_user_id,
            ruleId: rule.id,
            ruleQuery: rule.query,
            tweets: newTweets,
            timestamp: now.toISOString()
          })

          // Start backfill worker (non-blocking)
          const seenTweetIds = new Set(newTweets.map(t => t.id))
          backfillWorker(user, rule.id, newTweets, seenTweetIds).catch(error => {
            console.error(`❌ Backfill worker error for rule ${rule.id}:`, error)
          })

          foundMatch = true
          userProcessed++

        } catch (error) {
          console.error(`❌ Error processing rule "${rule.query}":`, error)
          await logCost(rule.id, 0)
        }
      }

      totalProcessed += userProcessed
      console.log(`✅ User ${user.x_user_id}: processed ${userProcessed} rules, sent ${userSmsSent} alerts`)
    }

    console.log(`🎯 Cron job completed: ${totalProcessed} rules processed, ${totalSmsSent} alerts sent`)

    return res.status(200).json({
      success: true,
      message: `Processed ${totalProcessed} rules, sent ${totalSmsSent} alerts`,
      totalProcessed,
      totalSmsSent,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in cron job:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      totalProcessed: 0,
      totalSmsSent: 0,
      timestamp: new Date().toISOString()
    })
  }
} 