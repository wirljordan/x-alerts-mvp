import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, password, email, totp_secret } = req.body

  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password are required' 
    })
  }

  try {
    console.log('🔐 User logging into TwitterAPI.io...')

    // Step 1: Login to TwitterAPI.io
    const loginResponse = await fetch('https://api.twitterapi.io/twitter/user_login_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TWITTER_API_KEY
      },
      body: JSON.stringify({
        user_name: username,
        email: email || '',
        password: password,
        totp_secret: totp_secret || ''
      })
    })

    console.log('Login response status:', loginResponse.status)

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text()
      console.error('❌ TwitterAPI.io login failed:', errorText)
      return res.status(400).json({ 
        error: 'Login failed',
        details: errorText
      })
    }

    const loginData = await loginResponse.json()
    console.log('✅ TwitterAPI.io login successful')

    // Step 2: Get user info from TwitterAPI.io
    const userResponse = await fetch('https://api.twitterapi.io/user', {
      headers: {
        'x-api-key': process.env.TWITTER_API_KEY,
        'Content-Type': 'application/json'
      }
    })

    let userData
    if (userResponse.ok) {
      userData = await userResponse.json()
      console.log('✅ User info retrieved:', userData)
    } else {
      // Fallback user data
      userData = {
        id: username,
        name: username,
        username: username,
        profile_image_url: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'
      }
    }

    // Step 3: Create session data
    const sessionData = {
      user: {
        id: userData.id || username,
        name: userData.name || username,
        username: userData.username || username,
        image: userData.profile_image_url,
        verified: userData.verified || false,
        handle: userData.username || username
      },
      accessToken: loginData.login_cookie // Store the login cookie as access token
    }

    // Step 4: Save or update user in database
    try {
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          x_user_id: userData.id || username,
          handle: userData.username || username,
          twitterapi_login_cookie: loginData.login_cookie,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'x_user_id'
        })

      if (upsertError) {
        console.error('Error saving user to database:', upsertError)
      } else {
        console.log('User saved to database with TwitterAPI.io login cookie')
      }
    } catch (dbError) {
      console.error('Database error:', dbError)
    }

    // Step 5: Set session cookies
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    res.setHeader('Set-Cookie', [
      // HttpOnly cookie for security (server-side access)
      `x_session_secure=${JSON.stringify(sessionData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
      // Non-HttpOnly cookie for client-side access
      `x_session=${JSON.stringify(sessionData)}; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`,
      `x_user_id=${userData.id || username}; Path=/; SameSite=Lax; Max-Age=${24 * 60 * 60}${secureFlag}`
    ])
    
    console.log('Authentication successful')
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: sessionData.user
    })

  } catch (error) {
    console.error('❌ Error with TwitterAPI.io login:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
} 