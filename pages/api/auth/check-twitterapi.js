import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if user has TwitterAPI.io credentials
    const { data, error } = await supabase
      .from('x_api_credentials')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking TwitterAPI.io credentials:', error)
      return res.status(500).json({ error: 'Failed to check credentials' })
    }

    const hasCredentials = !!data

    res.status(200).json({
      success: true,
      hasCredentials
    })

  } catch (error) {
    console.error('Error in check TwitterAPI.io:', error)
    res.status(500).json({
      error: error.message || 'Failed to check TwitterAPI.io credentials'
    })
  }
} 