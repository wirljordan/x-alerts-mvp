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

    // Build site text for AI analysis
    let siteText = `Website: ${websiteUrl}\n\n`
    if (websiteContent) {
      siteText += `Website Content:\n${websiteContent}\n\n`
    }

    // Call OpenAI to extract business profile
    let aiSummary = 'Business profile created from website content'
    let aiProducts = []
    let aiAudience = []
    let aiValueProps = []
    let aiTone = { style: 'casual', emojis: 'never' }
    let aiSafeTopics = []
    let aiAvoid = ['politics', 'tragedy']
    let aiStarterKeywords = []
    let aiPlugLine = 'Check out our solution!'

    try {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are extracting a tiny business profile for auto-reply generation on X. Return strict JSON with keys: summary (1 sentence), products (max 3), audience (2–3 words each), value_props (3 bullets), tone: {style: one of [casual, neutral, pro], emojis: one of [never, mirror]}, safe_topics (5–10 topic nouns/phrases), avoid (list; must include politics, tragedy; add competitor names only if explicit in text), starter_keywords (8–15 short buyer-intent tweet phrases), plug_line (1 gentle sentence, no hype). Rules: - Keep it short and concrete. - Infer tone from the text; default casual if unclear. - Keywords must sound like tweets ("any tools for…?", "recommend ___?", "how do I ___?"), not SEO terms. - Do not invent features not present in the text.`
            },
            {
              role: 'user',
              content: `TEXT START\n${siteText}\nTEXT END`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })

      if (openaiResponse.ok) {
        const openaiData = await openaiResponse.json()
        
        try {
          // Try to parse the response as JSON
          const businessProfile = JSON.parse(openaiData.choices[0].message.content)
          
          // Validate that we got the expected fields
          if (businessProfile.summary && typeof businessProfile.summary === 'string') {
            aiSummary = businessProfile.summary
            aiProducts = businessProfile.products || []
            aiAudience = businessProfile.audience || []
            aiValueProps = businessProfile.value_props || []
            aiTone = businessProfile.tone || { style: 'casual', emojis: 'never' }
            aiSafeTopics = businessProfile.safe_topics || []
            aiAvoid = businessProfile.avoid || ['politics', 'tragedy']
            aiStarterKeywords = businessProfile.starter_keywords || []
            aiPlugLine = businessProfile.plug_line || 'Check out our solution!'
          } else {
            console.error('Invalid business profile structure from OpenAI:', businessProfile)
          }
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError)
          console.error('OpenAI response content:', openaiData.choices[0].message.content)
          
          // Try to extract summary from error response
          const content = openaiData.choices[0].message.content
          if (content.includes('summary') || content.includes('business')) {
            // Extract a simple summary from the error response
            aiSummary = content.substring(0, 200) + '...'
          }
        }
      } else {
        console.error('OpenAI API error:', openaiResponse.status, openaiResponse.statusText)
      }
    } catch (error) {
      console.error('Error calling OpenAI:', error)
    }

    // If profile exists, update it with AI analysis; otherwise create new one
    let result
    if (existingProfile) {
      // Update existing profile with AI analysis
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .update({
          ...profileData,
          summary: aiSummary,
          products: aiProducts,
          audience: aiAudience,
          value_props: aiValueProps,
          tone: aiTone,
          safe_topics: aiSafeTopics,
          avoid: aiAvoid,
          starter_keywords: aiStarterKeywords,
          plug_line: aiPlugLine
        })
        .eq('user_id', userData.id)
        .select()

      if (error) {
        console.error('Supabase update error:', error)
        return res.status(500).json({ error: 'Failed to update business profile' })
      }
      result = data[0]
    } else {
      // Create new profile with AI analysis
      const { data, error } = await supabaseAdmin
        .from('business_profiles')
        .insert({
          ...profileData,
          company_name: 'Website Business',
          summary: aiSummary,
          products: aiProducts,
          audience: aiAudience,
          value_props: aiValueProps,
          tone: aiTone,
          safe_topics: aiSafeTopics,
          avoid: aiAvoid,
          starter_keywords: aiStarterKeywords,
          plug_line: aiPlugLine
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