export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/x-callback`
    const scope = 'users.read tweet.read'
    const state = Math.random().toString(36).substring(7)
    
    // Store state in cookie
    res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax`)
    
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`
    
    res.redirect(authUrl)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 