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
      
      // Instead of failing, suggest the user complete onboarding
      return res.status(404).json({ 
        error: 'Please complete onboarding first',
        code: 'ONBOARDING_REQUIRED'
      })
    }
    
    console.log('User found in database:', userData.id)

    // Create the alert in Supabase
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .insert({
        user_id: userData.id,
        query_string: query,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to create alert' })
    }

    console.log('Alert created successfully:', data)

    res.status(200).json({ 
      success: true, 
      alert: data,
      message: 'Alert created successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 