export default async function handler(req, res) {
  console.log('=== X CALLBACK DEBUG ===')
  console.log('Method:', req.method)
  console.log('Query params:', req.query)
  console.log('Headers:', req.headers)
  console.log('URL:', req.url)
  console.log('Body:', req.body)
  
  if (req.method === 'GET') {
    const { code, error, state } = req.query

    console.log('Code from query:', code)
    console.log('Error from query:', error)
    console.log('State from query:', state)

    if (error) {
      console.error('OAuth error:', error)
      return res.redirect('/?error=oauth_failed')
    }

    if (!code) {
      console.log('No code received')
      return res.redirect('/?error=no_code')
    }

    try {
      // Get code verifier from cookie
      const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {}) || {}
      
      console.log('Cookies:', cookies)
      let codeVerifier = cookies.code_verifier
      const oauthState = cookies.oauth_state

      if (!codeVerifier) {
        console.error('No code verifier found')
        console.error('Available cookies:', Object.keys(cookies))
        console.error('All cookies:', req.headers.cookie)
        
        // For Vercel, try to get code verifier from a different approach
        if (req.headers.host && !req.headers.host.includes('localhost')) {
          console.log('Production environment detected, trying alternative approach')
          // In production, the cookie might be set differently
          // Let's try to parse it more carefully
          const allCookies = req.headers.cookie || ''
          const codeVerifierMatch = allCookies.match(/code_verifier=([^;]+)/)
          if (codeVerifierMatch) {
            const extractedVerifier = codeVerifierMatch[1]
            console.log('Found code verifier in raw cookies:', extractedVerifier)
            // Use the extracted verifier
            codeVerifier = extractedVerifier
          } else {
            return res.redirect('/?error=no_verifier')
          }
        } else {
          return res.redirect('/?error=no_verifier')
        }
      }

      // Verify state parameter
      if (state !== oauthState) {
        console.error('State mismatch')
        return res.redirect('/?error=state_mismatch')
      }

      console.log('Exchanging code for token...')
      
      // Exchange code for access token
      const tokenResponse = await fetch('https://api.x.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: `${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/auth/x-callback`,
          code_verifier: codeVerifier
        })
      })

      console.log('Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        return res.redirect('/?error=token_failed')
      }

      const tokenData = await tokenResponse.json()
      console.log('Token received successfully')
      console.log('Token data:', tokenData)
      
      // Try to get user info using the token
      let userData = null
      
      try {
        // Try the v2 users/me endpoint first
        const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('User response status:', userResponse.status)

        if (userResponse.ok) {
          userData = await userResponse.json()
          console.log('User data from /me:', userData)
        } else {
          console.log('User /me failed, trying alternative approach')
          
          // If that fails, try to decode the token to get user info
          // The token might contain user information
          const tokenParts = tokenData.access_token.split('.')
          if (tokenParts.length >= 2) {
            try {
              const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
              console.log('Token payload:', payload)
              
              // Create a mock user object from token data
              userData = {
                data: {
                  id: payload.sub || 'unknown',
                  name: payload.name || 'X User',
                  username: payload.username || 'xuser',
                  profile_image_url: payload.picture || null,
                  verified: false
                }
              }
            } catch (e) {
              console.log('Could not decode token payload')
            }
          }
        }
      } catch (error) {
        console.error('User info error:', error)
      }

      if (!userData) {
        console.error('Could not get user info')
        return res.redirect('/?error=user_failed')
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
      res.setHeader('Set-Cookie', [
        `x_session=${JSON.stringify(sessionData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
        `x_user_id=${userData.data.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
        'code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
        'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
      ])
      
      // Redirect to success page instead of home page
      res.redirect('/success')

    } catch (error) {
      console.error('Callback error:', error)
      res.redirect('/?error=callback_failed')
    }
  } else {
    res.status(405).end('Method not allowed')
  }
} 