import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { alertId, userId } = req.body

    if (!alertId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: alertId, userId' })
    }

    console.log('=== ALERT DELETE DEBUG ===')
    console.log('Request body:', req.body)
    console.log('Looking for user with X user ID:', userId)
    
    // First, get the user's internal UUID from their X user ID
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', userId)
      .single()

    console.log('Database query result:', { userData, userError })

    if (userError || !userData) {
      console.error('User not found in database:', userError)
      console.log('User ID searched:', userId)
      return res.status(404).json({ 
        error: 'User not found', 
        code: 'ONBOARDING_REQUIRED',
        message: 'Please complete your account setup first' 
      })
    }

    // Delete the keyword rule (only if it belongs to this user)
    const { data, error } = await supabaseAdmin
      .from('keyword_rules')
      .delete()
      .eq('id', alertId)
      .eq('user_id', userData.id)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to delete alert' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Alert not found or access denied' })
    }

    console.log('Alert deleted successfully:', data[0])

    res.status(200).json({ 
      success: true, 
      message: 'Alert deleted successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 