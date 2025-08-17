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

    // Save TwitterAPI.io credentials to database
    const { data, error } = await supabaseAdmin
      .from('x_api_credentials')
      .upsert({
        user_id: userId,
        access_token: apiKey
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving TwitterAPI.io credentials:', error)
      return res.status(500).json({ error: 'Failed to save TwitterAPI.io credentials' })
    }

    res.status(200).json({
      success: true,
      message: 'TwitterAPI.io credentials saved successfully'
    })

  } catch (error) {
    console.error('Error setting up TwitterAPI.io credentials:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 