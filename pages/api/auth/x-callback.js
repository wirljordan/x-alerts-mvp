import crypto from 'crypto'

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

      // Simple approach - just try once and handle gracefully
      console.log('Making single API call to get user info...')
      const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('User response status:', userResponse.status)

      let userData
      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('X API failed:', errorText)
        
        // If rate limited, just redirect with a simple message
        if (userResponse.status === 429) {
          console.log('Rate limited, redirecting to try again later')
          res.redirect('/?error=api_rate_limited')
          return
        }
        
        // For other errors, throw to be caught by the outer try-catch
        throw new Error(`X API failed with status ${userResponse.status}: ${errorText}`)
      } else {
        userData = await userResponse.json()
        console.log('User data from X API:', userData)
      }

      // Create session data
      const sessionData = {
        user: {
          id: userData.data.id,
          name: userData.data.name,
          username: userData.data.username,
          image: userData.data.profile_image_url,
          verified: userData.data.verified,
          handle: userData.data.username
        },
        accessToken: tokenData.access_token
      }

      // Set session cookies and clear OAuth cookies
      const host = req.headers.host || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const secureFlag = protocol === 'https' ? '; Secure' : ''
      
      res.setHeader('Set-Cookie', [
        // HttpOnly cookie for security (server-side access)
        `x_session_secure=${JSON.stringify(sessionData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
        // Non-HttpOnly cookie for client-side access
        `x_session=${JSON.stringify(sessionData)}; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
        `x_user_id=${userData.data.id}; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
        'code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
        'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      ])
      
      console.log('Authentication successful, redirecting to dashboard')
      console.log('Session data set:', { userId: userData.data.id, username: userData.data.username })
      // Redirect to dashboard
      res.redirect('/dashboard')

    } catch (error) {
      console.error('Error in callback:', error)
      res.redirect('/?error=callback_error')
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 