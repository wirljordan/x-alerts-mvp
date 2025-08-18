import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, websiteUrl } = req.body

    if (!userId || !websiteUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // First, get the user's UUID from x_user_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', userId)
      .single()

    if (userError) {
      console.error('Error finding user:', userError)
      return res.status(404).json({ error: 'User not found' })
    }

    // Update the business profile with the new website URL
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .update({ 
        website_url: websiteUrl,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.id)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to update website URL' })
    }

    console.log('Website URL updated successfully:', data)

    res.status(200).json({ 
      success: true, 
      businessProfile: data[0],
      message: 'Website URL updated successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 