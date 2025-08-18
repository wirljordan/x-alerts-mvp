import { supabaseAdmin } from '../../../lib/supabase'

// Helper function to extract website content with enhanced parsing
async function extractWebsiteContent(websiteUrl) {
  try {
    console.log('Fetching website content from:', websiteUrl)
    
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    })
    
    if (!response.ok) {
      console.error('Website fetch failed with status:', response.status)
      return `Website: ${websiteUrl}. This appears to be a business website. Please provide more details about your business, products, and services.`
    }
    
    const html = await response.text()
    console.log('Successfully fetched website content, length:', html.length)
    
    // Enhanced HTML parsing to extract text content
    let textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '') // Remove noscript
      .replace(/<meta[^>]*>/gi, '') // Remove meta tags
      .replace(/<link[^>]*>/gi, '') // Remove link tags
      .replace(/<[^>]+>/g, ' ') // Remove remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
      .replace(/&amp;/g, '&') // Replace HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
    
    // If we got very little content, try to extract from title and meta description
    if (textContent.length < 50) {
      console.log('Very little content extracted, trying to get title and meta description')
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''
      
      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      const description = descMatch ? descMatch[1].trim() : ''
      
      // Extract h1 tags
      const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi)
      const h1s = h1Matches ? h1Matches.map(h1 => h1.replace(/<[^>]+>/g, '').trim()) : []
      
      // Build fallback content
      const fallbackParts = []
      if (title) fallbackParts.push(`Title: ${title}`)
      if (description) fallbackParts.push(`Description: ${description}`)
      if (h1s.length > 0) fallbackParts.push(`Headings: ${h1s.join(', ')}`)
      
      if (fallbackParts.length > 0) {
        textContent = fallbackParts.join('. ') + '. This appears to be a business website.'
      } else {
        textContent = `Website: ${websiteUrl}. This appears to be a business website. Please provide more details about your business, products, and services.`
      }
    }
    
    const finalContent = textContent.substring(0, 5000)
    console.log('Cleaned website content length:', finalContent.length)
    console.log('First 200 chars of content:', finalContent.substring(0, 200))
    
    return finalContent
  } catch (error) {
    console.error('Error fetching website content:', error.message)
    return `Website: ${websiteUrl}. This appears to be a business website. Please provide more details about your business, products, and services.`
  }
}

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
      
      // Extract website content
      const websiteContent = await extractWebsiteContent(websiteUrl)

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
      // Business profile exists, update it with AI analysis
      console.log('Updating existing business profile with AI analysis for user:', userData.id)
      
      // Extract website content
      const websiteContent = await extractWebsiteContent(websiteUrl)

      // Build site text for AI analysis
      let siteText = `Website: ${websiteUrl}\n\n`
      if (websiteContent) {
        siteText += `Website Content:\n${websiteContent}\n\n`
      }

      // Call OpenAI to extract business profile
      let aiSummary = existingProfile.summary || 'Business profile updated from website URL'
      let aiProducts = existingProfile.products || []
      let aiAudience = existingProfile.audience || []
      let aiValueProps = existingProfile.value_props || []
      let aiTone = existingProfile.tone || { style: 'casual', emojis: 'never' }
      let aiSafeTopics = existingProfile.safe_topics || []
      let aiAvoid = existingProfile.avoid || ['politics', 'tragedy']
      let aiStarterKeywords = existingProfile.starter_keywords || []
      let aiPlugLine = existingProfile.plug_line || 'Check out our solution!'

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

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('business_profiles')
        .update({ 
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