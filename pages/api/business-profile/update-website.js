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

    // Check if business profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userData.id)
      .single()

    let result
    if (checkError && checkError.code === 'PGRST116') {
      // Business profile doesn't exist, create a new one
      console.log('Creating new business profile for user:', userData.id)
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('business_profiles')
        .insert({
          user_id: userData.id,
          website_url: websiteUrl,
          summary: 'Business profile created from website URL update',
          products: [],
          audience: [],
          value_props: [],
          tone: { style: 'casual', emojis: 'never' },
          safe_topics: [],
          avoid: ['politics', 'tragedy'],
          starter_keywords: [],
          plug_line: 'Check out our solution!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()

      if (createError) {
        console.error('Error creating business profile:', createError)
        return res.status(500).json({ error: 'Failed to create business profile' })
      }
      result = newProfile[0]
    } else if (checkError) {
      console.error('Error checking business profile:', checkError)
      return res.status(500).json({ error: 'Failed to check business profile' })
    } else {
      // Business profile exists, update it
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('business_profiles')
        .update({ 
          website_url: websiteUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userData.id)
        .select()

      if (updateError) {
        console.error('Supabase error:', updateError)
        return res.status(500).json({ error: 'Failed to update website URL' })
      }
      result = updatedProfile[0]
    }

    console.log('Website URL updated successfully:', result)

    res.status(200).json({ 
      success: true, 
      businessProfile: result,
      message: 'Website URL updated successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 