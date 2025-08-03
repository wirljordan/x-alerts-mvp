export default async function handler(req, res) {
  console.log('Callback hit!', req.query)
  
  if (req.method === 'GET') {
    const { code, error } = req.query

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
      
      const codeVerifier = cookies.code_verifier
      
      if (!codeVerifier) {
        console.error('No code verifier found')
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
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/x-callback`,
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
      
      // Clear the code verifier cookie
      res.setHeader('Set-Cookie', 'code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;')
      
      // Redirect to success
      res.redirect('/success')

    } catch (error) {
      console.error('Callback error:', error)
      res.redirect('/?error=callback_failed')
    }
  } else {
    res.status(405).end('Method not allowed')
  }
} 