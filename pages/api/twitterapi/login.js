export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username, email, password, totp_secret } = req.body

  if (!username || !password) {
    return res.status(400).json({ 
      error: 'Username and password are required' 
    })
  }

  try {
    console.log('🔐 Logging into TwitterAPI.io...')

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

    // Store the login_cookie in environment or database
    // For now, we'll store it in environment variable
    // In production, you might want to store this securely in a database
    
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      login_cookie: loginData.login_cookie,
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