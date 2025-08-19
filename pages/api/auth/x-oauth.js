import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const clientId = process.env.TWITTER_CLIENT_ID
    
    if (!clientId) {
      console.error('TWITTER_CLIENT_ID not configured')
      return res.status(500).json({ error: 'OAuth not configured' })
    }
    
    // Determine redirect URI based on environment
    const host = req.headers.host || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    
    // For production, always use the non-www version to match X Developer Portal
    let redirectUri
    if (host.includes('earlyreply.app')) {
      redirectUri = 'https://earlyreply.app/api/auth/x-callback'
    } else {
      redirectUri = `${protocol}://${host}/api/auth/x-callback`
    }
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
    
    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(16).toString('hex')
    
    // Clear any existing OAuth cookies and set new ones with proper security settings
    const secureFlag = protocol === 'https' ? '; Secure' : ''
    res.setHeader('Set-Cookie', [
      // Clear old OAuth cookies first
      'code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
      'oauth_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;',
      // Set new OAuth cookies
      `code_verifier=${codeVerifier}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`,
      `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax${secureFlag}`
    ])
    
    // OAuth URL with PKCE - including email scope for TwitterAPI.io login
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=users.read%20tweet.read%20email&code_challenge_method=S256&code_challenge=${codeChallenge}&state=${state}&prompt=consent`
    
    console.log('Redirecting to X OAuth:', authUrl)
    console.log('Using redirect URI:', redirectUri)
    console.log('Generated state:', state)
    
    res.redirect(authUrl)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
} 