// Background worker for fetching X user profiles
// Processes jobs from Redis queue and handles rate limiting

import { redisGet, redisSet, redisDel, redisLpush, redisRpop, REDIS_TTLS } from '../../../lib/redis'

async function fetchUserProfile(accessToken, sessionId) {
  console.log(`🔄 Fetching user profile for session ${sessionId}...`)
  
  try {
    const response = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    console.log(`📊 X API response status: ${response.status}`)

    if (response.status === 429) {
      // Rate limited - check headers for retry timing
      const retryAfter = response.headers.get('retry-after')
      const rateLimitReset = response.headers.get('x-rate-limit-reset')
      
      console.log(`⏰ Rate limited (429) - retry-after: ${retryAfter}, x-rate-limit-reset: ${rateLimitReset}`)
      
      let retryDelay = 60 // Default 1 minute
      if (retryAfter) {
        retryDelay = parseInt(retryAfter)
      } else if (rateLimitReset) {
        const resetTime = parseInt(rateLimitReset) * 1000 // Convert to milliseconds
        const now = Date.now()
        retryDelay = Math.max(60, Math.ceil((resetTime - now) / 1000)) // At least 1 minute
      }
      
      console.log(`⏳ Will retry in ${retryDelay} seconds`)
      
      // Re-enqueue job with delay
      const retryJob = {
        sessionId: sessionId,
        access_token: accessToken,
        enqueued_at: Date.now(),
        retry_count: 1,
        retry_after: Date.now() + (retryDelay * 1000)
      }
      
      // Store retry job with TTL
      const retryKey = `retry_job:${sessionId}`
      await redisSet(retryKey, retryJob, retryDelay + 60) // TTL = retry delay + 1 minute buffer
      
      console.log(`📝 Re-enqueued job for retry in ${retryDelay} seconds`)
      return { success: false, rate_limited: true, retry_after: retryDelay }
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ X API error (${response.status}):`, errorText)
      return { success: false, error: `API error ${response.status}: ${errorText}` }
    }

    const userData = await response.json()
    console.log(`✅ User profile fetched successfully:`, {
      id: userData.data?.id,
      username: userData.data?.username,
      name: userData.data?.name
    })

    // Cache user profile for 24 hours
    const profileKey = `user_profile:${sessionId}`
    const profileData = {
      user: {
        id: userData.data.id,
        name: userData.data.name,
        username: userData.data.username,
        image: userData.data.profile_image_url,
        verified: userData.data.verified,
        handle: userData.data.username
      },
      fetched_at: Date.now(),
      cached_until: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }

    const cached = await redisSet(profileKey, profileData, REDIS_TTLS.PROFILE) // 24 hour TTL
    if (cached) {
      console.log(`💾 User profile cached for 24 hours`)
    } else {
      console.error(`❌ Failed to cache user profile`)
    }

    return { success: true, profile: profileData }

  } catch (error) {
    console.error(`❌ Error fetching user profile:`, error)
    return { success: false, error: error.message }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify internal authorization
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Unauthorized worker access attempt')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const token = authHeader.substring(7)
  if (token !== (process.env.CRON_SECRET || 'internal')) {
    console.error('❌ Invalid worker authorization token')
    return res.status(401).json({ error: 'Invalid token' })
  }

  console.log('🔄 X User Fetch Worker started')

  try {
    // Check for retry jobs first
    console.log('🔍 Checking for retry jobs...')
    const retryJobs = await redisGet('retry_jobs')
    if (retryJobs) {
      for (const [sessionId, retryJob] of Object.entries(retryJobs)) {
        if (retryJob.retry_after && Date.now() >= retryJob.retry_after) {
          console.log(`⏰ Processing retry job for session ${sessionId}`)
          
          // Remove from retry jobs
          await redisDel(`retry_job:${sessionId}`)
          
          // Re-enqueue for immediate processing
          await redisLpush('x_user_fetch_jobs', {
            sessionId: sessionId,
            access_token: retryJob.access_token,
            enqueued_at: Date.now()
          })
        }
      }
    }

    // Process one job from the queue
    console.log('🔍 Popping job from queue...')
    const job = await redisRpop('x_user_fetch_jobs')
    
    if (!job) {
      console.log('📭 No jobs in queue')
      return res.status(200).json({ message: 'No jobs to process' })
    }

    console.log(`📋 Processing job for session ${job.sessionId}`)

    // Check if profile is already cached
    const cachedProfile = await redisGet(`user_profile:${job.sessionId}`)
    if (cachedProfile) {
      console.log(`💾 Profile already cached for session ${job.sessionId}, skipping API call`)
      return res.status(200).json({ 
        message: 'Profile already cached',
        sessionId: job.sessionId
      })
    }

    // Fetch user profile
    const result = await fetchUserProfile(job.access_token, job.sessionId)
    
    if (result.success) {
      console.log(`✅ Successfully processed job for session ${job.sessionId}`)
      return res.status(200).json({
        message: 'Profile fetched and cached successfully',
        sessionId: job.sessionId,
        profile: result.profile
      })
    } else if (result.rate_limited) {
      console.log(`⏳ Job rate limited, will retry later`)
      return res.status(429).json({
        message: 'Rate limited, job re-enqueued for retry',
        sessionId: job.sessionId,
        retry_after: result.retry_after
      })
    } else {
      console.error(`❌ Failed to process job for session ${job.sessionId}:`, result.error)
      return res.status(500).json({
        message: 'Failed to fetch profile',
        sessionId: job.sessionId,
        error: result.error
      })
    }

  } catch (error) {
    console.error('❌ Worker error:', error)
    return res.status(500).json({ error: 'Internal worker error' })
  }
} 