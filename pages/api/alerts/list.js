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

    console.log('Looking for user with X user ID:', userId)
    
    // First, get the user's internal UUID from their X user ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', userId)
      .single()

    if (userError || !userData) {
      console.error('User not found in database:', userError)
      console.log('User ID searched:', userId)
      
      // Return empty array instead of error for list endpoint
      return res.status(200).json({ 
        success: true, 
        alerts: []
      })
    }
    
    console.log('User found in database:', userData.id)

    // Get all alerts for this user
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    res.status(200).json({ 
      success: true, 
      alerts: data || []
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 