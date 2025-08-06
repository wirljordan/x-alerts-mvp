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
    
    // For now, create the alert directly using the X user ID
    // We'll store the X user ID directly in the user_id field temporarily
    const { data, error } = await supabaseAdmin
      .from('alerts')
      .insert([
        {
          user_id: userId, // Using X user ID directly for now
          name: name.trim(),
          query: query.trim(),
          description: description?.trim() || null,
          status: 'active',
          created_at: new Date().toISOString(),
          last_match_at: null
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