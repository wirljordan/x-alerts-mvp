import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, username, password, email, totp_secret } = req.body

  if (!userId || !username || !password) {
    return res.status(400).json({ 
      error: 'userId, username, and password are required' 
    })
  }

  try {
    console.log('🔐 User logging into TwitterAPI.io...')

    // Login to TwitterAPI.io
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

    // Store the login cookie in the database
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        twitterapi_login_cookie: loginData.login_cookie,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ Error saving login cookie to database:', updateError)
      return res.status(500).json({ 
        error: 'Failed to save login cookie',
        details: updateError
      })
    }

    console.log('✅ Login cookie saved to database for user:', userId)
    
    return res.status(200).json({
      success: true,
      message: 'TwitterAPI.io login successful',
      status: loginData.status
    })

  } catch (error) {
    console.error('❌ Error logging into TwitterAPI.io:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
} 