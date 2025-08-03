import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = 'http://localhost:3000/api/test-callback'
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    // Generate state parameter
    const state = crypto.randomBytes(16).toString('hex')
    
    // Store code verifier and state in cookies
    res.setHeader('Set-Cookie', [
      `code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax`,
      `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax`
    ])
    
    // OAuth URL with PKCE - shortened to stay under 250 chars
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read&code_challenge_method=S256&code_challenge=${codeChallenge}&state=${state}`
    
    console.log('Test OAuth URL:', authUrl)
    res.redirect(authUrl)
  } else {
    res.status(405).end('Method not allowed')
  }
} 