import crypto from 'crypto'
import { redisGet, redisSet, redisDel, redisLpush, REDIS_TTLS } from '../../../lib/redis'

const APP_BASE_URL = process.env.APP_BASE_URL || 'https://earlyreply.app'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    console.log('=== X CALLBACK DEBUG ===')
    console.log('Method:', req.method)
    console.log('Query params:', req.query)
    console.log('URL:', req.url)

    try {
      const { code, state, error } = req.query
      console.log('Code from query:', code)
      console.log('Error from query:', error)
      console.log('State from query:', state)

      // Check for OAuth errors
      if (error) {
        console.error('OAuth error received:', error)
        res.redirect('/?error=oauth_error')
        return
      }

      if (!code || !state) {
        console.error('Missing code or state')
        res.redirect('/?error=missing_params')
        return
      }

      // Get OAuth cookies
      const cookies = req.headers.cookie || ''
      const cookieMap = {}
      cookies.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=')
        if (name && value) {
          cookieMap[name] = value
        }
      })

      console.log('All cookies found:', Object.keys(cookieMap))
      const oauthCookies = {
        code_verifier: cookieMap.code_verifier ? 'present' : 'missing',
        oauth_state: cookieMap.oauth_state ? 'present' : 'missing'
      }
      console.log('OAuth cookies:', oauthCookies)

      if (!cookieMap.code_verifier || !cookieMap.oauth_state) {
        console.error('Missing OAuth cookies')
        res.redirect('/?error=missing_cookies')
        return
      }

      // Validate state parameter
      if (cookieMap.oauth_state !== state) {
        console.error('State mismatch')
        res.redirect('/?error=state_mismatch')
        return
      }
      console.log('State verification passed')

      // Check if this code has already been used (idempotency)
      const codeKey = `oauth_code:${code}`
      const codeUsed = await redisGet(codeKey)
      if (codeUsed) {
        console.log('Code already used, preventing duplicate processing')
        res.redirect('/?error=code_already_used')
        return
      }

      // Mark code as used immediately (10 minute TTL)
      await redisSet(codeKey, { used: true, timestamp: Date.now() }, REDIS_TTLS.CODE)
      console.log('Code marked as used for idempotency protection')

      // Invalidate state immediately
      const stateKey = `oauth_state:${state}`
      await redisDel(stateKey)
      console.log('State invalidated to prevent reuse')

      // Exchange code for token
      console.log('Exchanging code for token...')
      const clientId = process.env.TWITTER_CLIENT_ID
      const clientSecret = process.env.TWITTER_CLIENT_SECRET
      const redirectUri = process.env.X_REDIRECT_URI || 'https://earlyreply.app/api/auth/x-callback'

      console.log('Environment check:', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
        clientIdLength: clientId?.length,
        clientSecretLength: clientSecret?.length,
        clientIdStart: clientId?.substring(0, 10),
        clientSecretStart: clientSecret?.substring(0, 10)
      })

      if (!clientId || !clientSecret) {
        console.error('Missing OAuth credentials')
        res.redirect('/?error=oauth_not_configured')
        return
      }

      const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: cookieMap.code_verifier
        })
      })

      console.log('Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        res.redirect('/?error=token_exchange_failed')
        return
      }

      const tokenData = await tokenResponse.json()
      console.log('Token received successfully')
      console.log('Token data:', {
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        access_token: tokenData.access_token?.substring(0, 20) + '...',
        scope: tokenData.scope
      })

      // Generate session ID
      const sessionId = crypto.randomBytes(32).toString('hex')
      console.log('Generated session ID:', sessionId)

      // Store access token in Redis (10 minute TTL)
      const tokenKey = `oauth_token:${sessionId}`
      await redisSet(tokenKey, {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        created_at: Date.now()
      }, REDIS_TTLS.TOKEN)
      console.log('Access token stored in Redis')

      // Create minimal session data (without profile)
      const sessionData = {
        sessionId: sessionId,
        authenticated: true,
        profile_fetching: true
      }

      // Set session cookies
      const host = req.headers.host || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const secureFlag = protocol === 'https' ? '; Secure' : ''
      
      res.setHeader('Set-Cookie', [
        // Session cookie
        `x_session=${JSON.stringify(sessionData)}; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
        // Clear OAuth cookies
        'code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
        'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      ])

      // Enqueue background job to fetch user profile
      const jobData = {
        sessionId: sessionId,
        access_token: tokenData.access_token,
        enqueued_at: Date.now()
      }

      const jobEnqueued = await redisLpush('x_user_fetch_jobs', jobData)
      if (jobEnqueued) {
        console.log('User fetch job enqueued successfully')
      } else {
        console.error('Failed to enqueue user fetch job')
      }

      // Fire-and-forget: Trigger worker without awaiting
      console.log('Triggering background worker...')
      fetch(`${APP_BASE_URL}/api/workers/x-user-fetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'internal'}`
        }
      }).catch(error => {
        console.error('Background worker trigger failed:', error)
      })

      console.log('Authentication successful, redirecting to dashboard')
      res.redirect('/dashboard')

    } catch (error) {
      console.error('Error in callback:', error)
      res.redirect('/?error=callback_error')
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 