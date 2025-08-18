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
      // Business profile doesn't exist, create a new one with AI analysis
      console.log('Creating new business profile for user:', userData.id)
      
      // Fetch website content for AI analysis
      let websiteContent = null
      try {
        const response = await fetch(websiteUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EarlyReply-Bot/1.0)'
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          websiteContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 5000)
        }
      } catch (error) {
        console.error('Error fetching website content:', error)
      }

      // Build site text for AI analysis
      let siteText = `Website: ${websiteUrl}\n\n`
      if (websiteContent) {
        siteText += `Website Content:\n${websiteContent}\n\n`
      }

      // Call OpenAI to extract business profile
      let aiSummary = 'Business profile created from website URL update'
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
          const businessProfile = JSON.parse(openaiData.choices[0].message.content)
          
          aiSummary = businessProfile.summary
          aiProducts = businessProfile.products
          aiAudience = businessProfile.audience
          aiValueProps = businessProfile.value_props
          aiTone = businessProfile.tone
          aiSafeTopics = businessProfile.safe_topics
          aiAvoid = businessProfile.avoid
          aiStarterKeywords = businessProfile.starter_keywords
          aiPlugLine = businessProfile.plug_line
        }
      } catch (error) {
        console.error('Error calling OpenAI:', error)
      }

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('business_profiles')
        .insert({
          user_id: userData.id,
          website_url: websiteUrl,
          website_content: websiteContent,
          summary: aiSummary,
          products: aiProducts,
          audience: aiAudience,
          value_props: aiValueProps,
          tone: aiTone,
          safe_topics: aiSafeTopics,
          avoid: aiAvoid,
          starter_keywords: aiStarterKeywords,
          plug_line: aiPlugLine,
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