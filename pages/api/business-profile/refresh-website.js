import { supabaseAdmin } from '../../../lib/supabase'

// Function to fetch website content
async function fetchWebsiteContent(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EarlyReply/1.0; +https://earlyreply.app)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Basic HTML parsing to extract text content
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    return textContent.substring(0, 10000) // Limit to 10k characters
  } catch (error) {
    console.error('Error fetching website content:', error)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, websiteUrl } = req.body

    if (!userId || !websiteUrl) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Fetch updated website content
    const websiteContent = await fetchWebsiteContent(websiteUrl)
    
    if (!websiteContent) {
      return res.status(400).json({ error: 'Failed to fetch website content' })
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

    // Get existing business profile
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('business_profiles')
      .select('*')
      .eq('user_id', userData.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching business profile:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch business profile' })
    }

    // Prepare data for update/insert
    const profileData = {
      user_id: userData.id,
      website_url: websiteUrl,
      website_content: websiteContent,
      updated_at: new Date().toISOString()
    }

    // If profile exists, update it; otherwise create new one
    let result
    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .update(profileData)
        .eq('user_id', userData.id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        return res.status(500).json({ error: 'Failed to update business profile' })
      }
      result = data[0]
    } else {
      // Create new profile with minimal data
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .insert({
          ...profileData,
          company_name: 'Website Business',
          summary: 'Business profile created from website content',
          products: [],
          audience: [],
          value_props: [],
          tone: { style: 'casual', emojis: 'never' },
          safe_topics: [],
          avoid: ['politics', 'tragedy'],
          starter_keywords: [],
          plug_line: 'Check out our solution!'
        })
        .select()

      if (error) {
        console.error('Supabase insert error:', error)
        return res.status(500).json({ error: 'Failed to create business profile' })
      }
      result = data[0]
    }

    console.log('Website content refreshed successfully:', result)

    res.status(200).json({ 
      success: true, 
      businessProfile: result,
      message: 'Website content refreshed successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 