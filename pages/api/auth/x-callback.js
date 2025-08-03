export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { code, state, error } = req.query

    if (error) {
      console.error('OAuth error:', error)
      return res.redirect('/?error=oauth_failed')
    }

    if (!code) {
      return res.redirect('/?error=no_code')
    }

    try {
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
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/x-callback`
        })
      })

      if (!tokenResponse.ok) {
        console.error('Token exchange failed:', await tokenResponse.text())
        return res.redirect('/?error=token_failed')
      }

      const tokenData = await tokenResponse.json()
      const { access_token } = tokenData

      // Get user info
      const userResponse = await fetch('https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url,verified', {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      })

      if (!userResponse.ok) {
        console.error('User info failed:', await userResponse.text())
        return res.redirect('/?error=user_failed')
      }

      const userData = await userResponse.json()
      const user = userData.data

      // Create session data
      const sessionData = {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.profile_image_url,
          verified: user.verified,
          handle: user.username
        },
        accessToken: access_token
      }

      // Set session cookies
      res.setHeader('Set-Cookie', [
        `x_session=${JSON.stringify(sessionData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
        `x_user_id=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
      ])

      // Redirect to success page
      res.redirect('/success')

    } catch (error) {
      console.error('OAuth callback error:', error)
      res.redirect('/?error=callback_failed')
    }
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 