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

    // Get the business profile for the user
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('x_user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No business profile found
        return res.status(200).json({ 
          success: true, 
          businessProfile: null,
          message: 'No business profile found' 
        })
      }
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to fetch business profile' })
    }

    console.log('Business profile fetched successfully:', data)

    res.status(200).json({ 
      success: true, 
      businessProfile: data,
      message: 'Business profile fetched successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 