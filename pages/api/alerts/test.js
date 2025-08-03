import { getServerSession } from 'next-auth/next'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { query_string } = req.body

    if (!query_string) {
      return res.status(400).json({ error: 'Query string is required' })
    }

    // This is a placeholder implementation
    // In a real implementation, you would:
    // 1. Call X API to search for tweets
    // 2. Return the actual results
    // 3. Handle rate limiting and pagination

    // Mock results for demonstration
    const mockResults = [
      {
        id: '1',
        text: 'Just discovered some amazing marketing tips! #marketing #growth',
        user_handle: 'marketing_guru',
        created_at: new Date().toISOString(),
        tweet_url: 'https://twitter.com/marketing_guru/status/123456789'
      },
      {
        id: '2',
        text: 'Looking for recommendations on the best marketing tools for small businesses',
        user_handle: 'smallbiz_owner',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        tweet_url: 'https://twitter.com/smallbiz_owner/status/123456790'
      },
      {
        id: '3',
        text: 'Marketing automation has completely changed how we approach customer acquisition',
        user_handle: 'tech_entrepreneur',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        tweet_url: 'https://twitter.com/tech_entrepreneur/status/123456791'
      }
    ]

    res.status(200).json({ 
      results: mockResults,
      query: query_string,
      note: 'This is a demo. In production, this would show real X search results.'
    })
  } catch (error) {
    console.error('Error in alert test:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 