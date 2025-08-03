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

      const codeVerifier = cookies.code_verifier
      if (!codeVerifier) {
        console.log('No code verifier found')
        return res.redirect('/?error=no_verifier')
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
          redirect_uri: 'http://localhost:3000/api/auth/x-callback',
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

      // Get user info
      const userResponse = await fetch('https://api.x.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      })

      console.log('User response status:', userResponse.status)

      if (!userResponse.ok) {
        const errorText = await userResponse.text()
        console.error('User info failed:', errorText)
        return res.redirect('/?error=user_info_failed')
      }

      const userData = await userResponse.json()
      console.log('User data from /me:', userData)

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
      
      // Redirect to success page
      res.redirect('/success')

    } catch (error) {
      console.error('Error in callback:', error)
      res.redirect('/?error=callback_error')
    }
  } else {
    res.status(405).end('Method not allowed')
  }
} 