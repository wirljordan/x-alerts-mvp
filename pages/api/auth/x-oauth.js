import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/x-callback`
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    // Store code verifier in cookie
    res.setHeader('Set-Cookie', `code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax`)
    
    // OAuth URL with PKCE
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read&code_challenge_method=S256&code_challenge=${codeChallenge}`
    
    console.log('Redirecting to:', authUrl)
    res.redirect(authUrl)
  } else {
    res.status(405).end('Method not allowed')
  }
} 