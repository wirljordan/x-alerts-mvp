import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Function to fetch website content
async function fetchWebsiteContent(url) {
  try {
    // Use a simple fetch to get the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EarlyReply-Bot/1.0)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    
    // Extract text content from HTML (basic implementation)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 5000) // Limit to first 5000 characters
    
    return textContent
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
    const { userId, companyName, websiteUrl, businessDescription } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    if (!companyName) {
      return res.status(400).json({ error: 'Company name is required' })
    }

    // Build comprehensive site text for AI analysis
    let siteText = `Company Name: ${companyName}\n\n`
    
    if (websiteUrl) {
      siteText += `Website: ${websiteUrl}\n\n`
      
      // Try to fetch website content
      const websiteContent = await fetchWebsiteContent(websiteUrl)
      if (websiteContent) {
        siteText += `Website Content:\n${websiteContent}\n\n`
      }
    }
    
    if (businessDescription) {
      siteText += `Business Description:\n${businessDescription}\n\n`
    }

    // Call OpenAI to extract business profile
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

    if (!openaiResponse.ok) {
      throw new Error('Failed to extract business profile from OpenAI')
    }

    const openaiData = await openaiResponse.json()
    const businessProfile = JSON.parse(openaiData.choices[0].message.content)

    // Save to Supabase
    const { data, error } = await supabase
      .from('business_profiles')
      .upsert({
        user_id: userId,
        company_name: companyName,
        website_url: websiteUrl || null,
        summary: businessProfile.summary,
        products: businessProfile.products,
        audience: businessProfile.audience,
        value_props: businessProfile.value_props,
        tone: businessProfile.tone,
        safe_topics: businessProfile.safe_topics,
        avoid: businessProfile.avoid,
        starter_keywords: businessProfile.starter_keywords,
        plug_line: businessProfile.plug_line,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Supabase error:', error)
      throw new Error('Failed to save business profile')
    }

    res.status(200).json({
      success: true,
      businessProfile: data[0]
    })

  } catch (error) {
    console.error('Error creating business profile:', error)
    res.status(500).json({
      error: error.message || 'Failed to create business profile'
    })
  }
} 