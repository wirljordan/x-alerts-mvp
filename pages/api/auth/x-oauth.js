import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    
    // Determine redirect URI based on environment
    const host = req.headers.host || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const redirectUri = `${protocol}://${host}/api/auth/x-callback`
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    // Generate state parameter
    const state = crypto.randomBytes(16).toString('hex')
    
    // Clear existing session cookies and set new OAuth cookies
    res.setHeader('Set-Cookie', [
      'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
      'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
      `code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`,
      `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=300`
    ])
    
    // OAuth URL with PKCE
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read&code_challenge_method=S256&code_challenge=${codeChallenge}&state=${state}`
    
    console.log('Redirecting to X OAuth:', authUrl)
    console.log('Code verifier stored:', codeVerifier.substring(0, 10) + '...')
    console.log('Using redirect URI:', redirectUri)
    res.redirect(authUrl)
  } else {
    res.status(405).end('Method not allowed')
  }
} 