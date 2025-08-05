import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId parameter' })
    }

    // Get user data from Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('x_user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // User not found
        return res.status(404).json({ error: 'User not found' })
      }
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch user data' })
    }

    console.log('User data fetched successfully:', data)

    res.status(200).json({ 
      success: true, 
      user: data
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 