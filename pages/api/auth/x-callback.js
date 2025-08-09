export default async function handler(req, res) {
  console.log('=== X CALLBACK DEBUG ===')
  console.log('Method:', req.method)
  console.log('Query params:', req.query)
  console.log('URL:', req.url)
  
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
      // Parse cookies properly
      const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          acc[key] = decodeURIComponent(value)
        }
        return acc
      }, {}) || {}

      console.log('All cookies found:', Object.keys(cookies))
      console.log('OAuth cookies:', {
        code_verifier: cookies.code_verifier ? 'present' : 'missing',
        oauth_state: cookies.oauth_state ? 'present' : 'missing'
      })

      const codeVerifier = cookies.code_verifier
      const storedState = cookies.oauth_state

      if (!codeVerifier) {
        console.log('No code verifier found')
        return res.redirect('/?error=no_verifier')
      }

      if (!storedState) {
        console.log('No stored state found')
        return res.redirect('/?error=no_state')
      }

      // Verify state parameter for CSRF protection
      if (state !== storedState) {
        console.log('State mismatch:', { 
          received: state, 
          stored: storedState,
          receivedLength: state?.length,
          storedLength: storedState?.length
        })
        return res.redirect('/?error=state_mismatch')
      }

      console.log('State verification passed')
      console.log('Exchanging code for token...')

      // Determine redirect URI for token exchange
      const host = req.headers.host || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      
      // For production, always use the non-www version to match X Developer Portal
      let redirectUri
      if (host.includes('earlyreply.app')) {
        redirectUri = 'https://earlyreply.app/api/auth/x-callback'
      } else {
        redirectUri = `${protocol}://${host}/api/auth/x-callback`
      }

      // Debug environment variables
      console.log('Environment check:', {
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        clientIdLength: process.env.TWITTER_CLIENT_ID?.length,
        clientSecretLength: process.env.TWITTER_CLIENT_SECRET?.length,
        clientIdStart: process.env.TWITTER_CLIENT_ID?.substring(0, 10),
        clientSecretStart: process.env.TWITTER_CLIENT_SECRET?.substring(0, 10)
      })

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
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      })

      console.log('Token response status:', tokenResponse.status)

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        console.error('Token exchange failed:', errorText)
        return res.redirect('/?error=token_exchange_failed')
      }

      const tokenData = await tokenResponse.json()
      console.log('Token received successfully')
      console.log('Token data:', tokenData)

      // Get user info using the correct API endpoint
      console.log('Fetching user info from X API...')
      
      // Try v2 API first with proper error handling
      let userData
      try {
        const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        })

        console.log('User response status:', userResponse.status)

        if (userResponse.ok) {
          userData = await userResponse.json()
          console.log('User data from v2 API:', userData)
        } else {
          const errorText = await userResponse.text()
          console.error('v2 API failed:', errorText)
          
          // If it's a rate limit, wait and retry once
          if (userResponse.status === 429) {
            console.log('Rate limited, waiting 2 seconds and retrying...')
            await new Promise(resolve => setTimeout(resolve, 2000))
            
            const retryResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (retryResponse.ok) {
              userData = await retryResponse.json()
              console.log('User data from v2 API (retry):', userData)
            } else {
              throw new Error(`v2 API retry failed: ${retryResponse.status}`)
            }
          } else {
            throw new Error(`v2 API failed: ${userResponse.status}`)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error.message)
        
        // Try alternative v2 endpoint
        try {
          console.log('Trying alternative v2 endpoint...')
          const altResponse = await fetch('https://api.x.com/2/users/me', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (altResponse.ok) {
            userData = await altResponse.json()
            console.log('User data from alternative v2 API:', userData)
          } else {
            throw new Error(`Alternative v2 API failed: ${altResponse.status}`)
          }
                 } catch (altError) {
           console.error('Alternative v2 API also failed:', altError.message)
           
           // Last resort: try to extract user ID from the access token
           // The access token might contain encoded user information
           console.log('Attempting to extract user info from token...')
           
           // Try to decode the JWT token to get user info
           try {
             const tokenParts = tokenData.access_token.split('.')
             if (tokenParts.length === 3) {
               const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString())
               console.log('Token payload:', payload)
               
               // If we can extract user info from token, use it
               if (payload.sub || payload.user_id) {
                 const userId = payload.sub || payload.user_id
                 console.log('Extracted user ID from token:', userId)
                 
                 userData = {
                   data: {
                     id: userId,
                     name: 'X User',
                     username: 'xuser',
                     profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
                     verified: false
                   }
                 }
               } else {
                 throw new Error('No user ID found in token')
               }
             } else {
               throw new Error('Invalid token format')
             }
           } catch (tokenError) {
             console.error('Failed to extract user info from token:', tokenError.message)
             
             // Final fallback: redirect to error page
             console.log('All methods failed, redirecting to error page')
             res.redirect('/?error=api_unavailable&token=' + encodeURIComponent(tokenData.access_token))
             return
           }
         }
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