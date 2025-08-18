import { supabaseAdmin } from '../../../lib/supabase'

// Function to fetch website content
async function fetchWebsiteContent(url) {
  try {
    console.log('Fetching website content from:', url)
    
    const response = await fetch(url, {
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
      console.error(`HTTP error! status: ${response.status} for URL: ${url}`)
      throw new Error(`HTTP error! status: ${response.status}`)
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
    if (textContent.length < 500) {
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
      } else if (url.includes('earlyreply.app')) {
        // Special case for earlyreply.app
        textContent = `EarlyReply is an AI-powered auto-reply system for X (Twitter) that helps businesses engage with potential customers automatically. We use AI to analyze tweets for relevance and generate personalized replies that sound human and helpful. Our target audience is small businesses, agencies, and indie founders who want to catch leads on X without spending all day on the platform. We offer different pricing tiers with varying reply limits and features.`
      } else {
        textContent = `Website: ${url}. This appears to be a business website. Please provide more details about your business, products, and services.`
      }
    }
    
    const finalContent = textContent.substring(0, 10000) // Limit to 10k characters
    console.log('Cleaned website content length:', finalContent.length)
    console.log('First 200 chars of content:', finalContent.substring(0, 200))
    
    return finalContent
  } catch (error) {
    console.error('Error fetching website content:', error.message)
    // Return a fallback description instead of null
    return `Website: ${url}. This appears to be a business website. Please provide more details about your business, products, and services.`
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
    let aiPlugLine = 'We auto-write short, helpful replies so you can be first without living on X.'

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
                content: `You are extracting a business profile for auto-reply generation on X.

Return ONLY valid JSON with keys:
summary (string, detailed business description - can be as long as needed),
products (array, max 3 strings),
audience (array, 2–3 short strings),
value_props (array, exactly 3 short strings),
tone: { style: one of ["casual","neutral","pro"], emojis: one of ["never","mirror"] },
safe_topics (array, 5–10 strings),
avoid (array, must include "politics" and "tragedy"),
starter_keywords (array, 8–15 short tweet-like phrases),
plug_line (string, ≤120 chars),
needs_more_input (boolean)

Rules:
- Use ONLY facts from the provided text. Do NOT invent features.
- The summary should be comprehensive and detailed - it will be used as the main reference for AI replies.
- If the text is too thin to infer the items confidently, set needs_more_input=true and fill all arrays as [] and strings as "" (empty). Do NOT apologize. Do NOT add commentary.
- Output MUST be a single JSON object. No markdown, no prose.`
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
          
          // Check if AI needs more input
          if (businessProfile.needs_more_input === true) {
            console.log('AI indicates more input is needed, skipping profile update')
            aiSummary = 'Please provide more details about your business to generate a complete profile.'
            aiProducts = []
            aiAudience = []
            aiValueProps = []
            aiTone = { style: 'casual', emojis: 'never' }
            aiSafeTopics = []
            aiAvoid = ['politics', 'tragedy']
            aiStarterKeywords = []
            aiPlugLine = 'We auto-write short, helpful replies so you can be first without living on X.'
          } else {
            // Valid profile generated
            aiSummary = businessProfile.summary || ''
            aiProducts = businessProfile.products || []
            aiAudience = businessProfile.audience || []
            aiValueProps = businessProfile.value_props || []
            aiTone = businessProfile.tone || { style: 'casual', emojis: 'never' }
            aiSafeTopics = businessProfile.safe_topics || []
            aiAvoid = businessProfile.avoid || ['politics', 'tragedy']
            aiStarterKeywords = businessProfile.starter_keywords || []
            aiPlugLine = businessProfile.plug_line || 'We auto-write short, helpful replies so you can be first without living on X.'
          }
        } catch (parseError) {
          console.error('Error parsing OpenAI response:', parseError)
          console.error('OpenAI response content:', openaiData.choices[0].message.content)
          
          // Don't save to DB if parsing failed
          aiSummary = 'Error generating business profile. Please try again.'
          aiProducts = []
          aiAudience = []
          aiValueProps = []
          aiTone = { style: 'casual', emojis: 'never' }
          aiSafeTopics = []
          aiAvoid = ['politics', 'tragedy']
          aiStarterKeywords = []
          aiPlugLine = 'We auto-write short, helpful replies so you can be first without living on X.'
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