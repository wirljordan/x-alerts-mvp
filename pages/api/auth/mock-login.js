export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Create a mock user session
    const mockUser = {
      id: '123456789',
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      image: 'https://pbs.twimg.com/profile_images/1234567890/test_400x400.jpg',
      verified: true,
      handle: 'testuser',
      plan: 'starter',
      sms_limit: 300,
      sms_used: 45
    }

    const sessionData = {
      user: mockUser,
      accessToken: 'mock_token_123',
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    // Set session cookies
    res.setHeader('Set-Cookie', [
      `x_session=${JSON.stringify(sessionData)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`,
      `x_user_id=${mockUser.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`
    ])

    // Redirect to dashboard
    res.redirect('/dashboard?oauth=success&mock=true')
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 