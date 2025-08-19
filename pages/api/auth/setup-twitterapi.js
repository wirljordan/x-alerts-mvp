import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, apiKey } = req.body

    if (!userId || !apiKey) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get user's UUID from x_user_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', userId)
      .single()

    if (userError) {
      console.error('Error finding user:', userError)
      return res.status(404).json({ error: 'User not found' })
    }

    // Save or update TwitterAPI.io credentials
    const { data, error } = await supabaseAdmin
      .from('x_api_credentials')
      .upsert({
        user_id: userData.id,
        access_token: apiKey,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving TwitterAPI.io credentials:', error)
      return res.status(500).json({ error: 'Failed to save credentials' })
    }

    res.status(200).json({
      success: true,
      message: 'TwitterAPI.io credentials saved successfully'
    })

  } catch (error) {
    console.error('Error setting up TwitterAPI.io:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 