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

    // Get business profile from database
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No business profile found
        return res.status(404).json({ error: 'Business profile not found' })
      }
      console.error('Error fetching business profile:', error)
      return res.status(500).json({ error: 'Failed to fetch business profile' })
    }

    res.status(200).json({
      success: true,
      businessProfile: data
    })

  } catch (error) {
    console.error('Error getting business profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 