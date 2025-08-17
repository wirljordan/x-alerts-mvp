import { supabaseAdmin } from '../../../lib/supabase'
import { extractBusinessProfile } from '../../../lib/ai-service'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, siteText } = req.body

    if (!userId || !siteText) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Extract business profile using AI
    const businessProfile = await extractBusinessProfile(siteText)

    // Save business profile to database
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .insert({
        user_id: userId,
        summary: businessProfile.summary,
        products: businessProfile.products,
        audience: businessProfile.audience,
        value_props: businessProfile.value_props,
        tone: businessProfile.tone,
        safe_topics: businessProfile.safe_topics,
        avoid: businessProfile.avoid,
        starter_keywords: businessProfile.starter_keywords,
        plug_line: businessProfile.plug_line
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving business profile:', error)
      return res.status(500).json({ error: 'Failed to save business profile' })
    }

    res.status(200).json({
      success: true,
      businessProfile: data
    })

  } catch (error) {
    console.error('Error creating business profile:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 