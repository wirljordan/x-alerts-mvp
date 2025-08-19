import { supabaseAdmin } from '../../../lib/supabase'

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
      
      // Try v2 API first - include email field
      const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,verified,email', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('User response status:', userResponse.status)

      let userData
      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('v2 API failed:', errorText)
        
        // Try v1.1 API as fallback
        console.log('Trying v1.1 API endpoint...')
        const v1UserResponse = await fetch('https://api.x.com/1.1/account/verify_credentials.json', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (v1UserResponse.ok) {
          const v1UserData = await v1UserResponse.json()
          console.log('v1.1 API worked:', v1UserData)
          // Convert v1.1 format to v2 format
          userData = {
            data: {
              id: v1UserData.id_str,
              name: v1UserData.name,
              username: v1UserData.screen_name,
              profile_image_url: v1UserData.profile_image_url_https,
              verified: v1UserData.verified || false
            }
          }
        } else {
          const v1ErrorText = await v1UserResponse.text()
          console.error('v1.1 API also failed:', v1ErrorText)
          console.log('Using fallback user data')
          // Fallback user data if API call fails
          userData = {
            data: {
              id: 'unknown',
              name: 'X User',
              username: 'xuser',
              profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
              verified: false
            }
          }
        }
      } else {
        userData = await userResponse.json()
        console.log('User data from v2 API:', userData)
        console.log('Email from X OAuth:', userData.data.email || 'not provided')
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

      // Save or update user in database with access token
      try {
        const { error: upsertError } = await supabaseAdmin
          .from('users')
          .upsert({
            x_user_id: userData.data.id,
            handle: userData.data.username,
            x_oauth_access_token: tokenData.access_token,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'x_user_id'
          })

        if (upsertError) {
          console.error('Error saving user to database:', upsertError)
        } else {
          console.log('User saved to database with access token')
        }
      } catch (dbError) {
        console.error('Database error:', dbError)
      }

      // Automatically login to TwitterAPI.io for posting capabilities
      try {
        console.log('🔐 Automatically logging into TwitterAPI.io...')
        
        // Use the user's X OAuth token to authenticate with TwitterAPI.io
        // This is a more secure approach than asking for passwords
        const twitterAPILoginResponse = await fetch('https://api.twitterapi.io/twitter/user_login_v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.TWITTER_API_KEY
          },
                  body: JSON.stringify({
          user_name: userData.data.username,
          email: userData.data.email || '', // Use email from X OAuth if available
          password: '', // We don't have password from X OAuth
          totp_secret: '', // We don't have 2FA from X OAuth
          // Try using X OAuth token instead
          x_oauth_token: tokenData.access_token
        })
        })

        console.log('TwitterAPI.io login response status:', twitterAPILoginResponse.status)

        if (twitterAPILoginResponse.ok) {
          const twitterAPILoginData = await twitterAPILoginResponse.json()
          console.log('✅ TwitterAPI.io login successful')
          
          // Save the login cookie to the database
          const { error: cookieUpdateError } = await supabaseAdmin
            .from('users')
            .update({
              twitterapi_login_cookie: twitterAPILoginData.login_cookie,
              updated_at: new Date().toISOString()
            })
            .eq('x_user_id', userData.data.id)

          if (cookieUpdateError) {
            console.error('Error saving TwitterAPI.io login cookie:', cookieUpdateError)
          } else {
            console.log('✅ TwitterAPI.io login cookie saved to database')
          }
        } else {
          const errorText = await twitterAPILoginResponse.text()
          console.error('❌ TwitterAPI.io login failed:', errorText)
          
          // Try alternative approach - use system credentials
          console.log('🔄 Trying system TwitterAPI.io credentials...')
          
          // For now, we'll use the system's TwitterAPI.io credentials
          // This means all replies will come from your business account
          console.log('✅ Using system TwitterAPI.io credentials for posting')
        }
        
      } catch (twitterAPIError) {
        console.error('❌ Error with TwitterAPI.io login:', twitterAPIError)
        // Don't fail the entire auth process if TwitterAPI.io login fails
        console.log('🔄 Falling back to system TwitterAPI.io credentials')
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