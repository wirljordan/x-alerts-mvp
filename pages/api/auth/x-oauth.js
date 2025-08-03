import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req, res) {
  const { method } = req

  if (method === 'GET') {
    // Step 1: Redirect to X OAuth
    const clientId = process.env.TWITTER_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/x-callback`
    const scope = 'users.read tweet.read offline.access'
    const state = Math.random().toString(36).substring(7)
    
    // Store state in session or cookie for verification
    res.setHeader('Set-Cookie', `oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax`)
    
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&code_challenge_method=S256&code_challenge=${generateCodeChallenge()}`
    
    res.redirect(authUrl)
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${method} Not Allowed`)
  }
}

function generateCodeChallenge() {
  // Simple PKCE code challenge generation
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
} 