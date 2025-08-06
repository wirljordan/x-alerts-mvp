import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, name, query, description } = req.body

    if (!userId || !name || !query) {
      return res.status(400).json({ error: 'Missing required fields: userId, name, query' })
    }

    console.log('=== ALERT CREATE DEBUG ===')
    console.log('Request body:', req.body)
    console.log('Creating alert directly for user ID:', userId)
    
    // First, get the user's internal UUID from their X user ID  
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', userId)
      .single()

    if (userError || !userData) {
      console.error('User not found in database:', userError)
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    }

    console.log('User found in database:', userData.id)

    // Create the alert using the correct schema
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .insert([
        {
          user_id: userData.id, // Use the internal UUID
          query_string: query.trim(), // Map to correct column name
          status: 'active'
        }
      ])
      .select()

    if (error) {
      console.error('Error creating alert:', error)
      return res.status(500).json({ error: 'Failed to create alert' })
    }

    console.log('Alert created successfully:', data[0])

    res.status(201).json({
      success: true,
      alert: data[0]
    })
  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 