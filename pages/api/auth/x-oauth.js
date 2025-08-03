export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/x-callback`
    
    // Simple OAuth URL without PKCE
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read`
    
    console.log('Redirecting to:', authUrl)
    res.redirect(authUrl)
  } else {
    res.status(405).end('Method not allowed')
  }
} 