import { supabaseAdmin } from '../../../lib/supabase'
import puppeteer from 'puppeteer'

// Helper function to extract website content using Puppeteer for JavaScript rendering
async function extractWebsiteContent(websiteUrl) {
  let browser = null
  try {
    console.log('Fetching website content from:', websiteUrl)
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })
    
    const page = await browser.newPage()
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    
    // Navigate to the page and wait for content to load
    await page.goto(websiteUrl, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    
    // Wait a bit more for any dynamic content
    await page.waitForTimeout(3000)
    
    // Extract the rendered content
    const textContent = await page.evaluate(() => {
      // Remove script and style elements
      const scripts = document.querySelectorAll('script, style, noscript')
      scripts.forEach(el => el.remove())
      
      // Get all text content
      const bodyText = document.body.innerText || document.body.textContent || ''
      
      // Get specific elements for better content extraction
      const title = document.title || ''
      const metaDesc = document.querySelector('meta[name="description"]')?.content || ''
      const h1s = Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).join(', ')
      const h2s = Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).join(', ')
      const ps = Array.from(document.querySelectorAll('p')).map(p => p.textContent.trim()).slice(0, 10).join('. ')
      
      return {
        title,
        metaDesc,
        h1s,
        h2s,
        ps,
        bodyText: bodyText.substring(0, 10000) // Limit body text
      }
    })
    
    console.log('Successfully extracted content using Puppeteer')
    
    // Build comprehensive content
    const contentParts = []
    if (textContent.title) contentParts.push(`Title: ${textContent.title}`)
    if (textContent.metaDesc) contentParts.push(`Description: ${textContent.metaDesc}`)
    if (textContent.h1s) contentParts.push(`Main Headings: ${textContent.h1s}`)
    if (textContent.h2s) contentParts.push(`Sub Headings: ${textContent.h2s}`)
    if (textContent.ps) contentParts.push(`Content: ${textContent.ps}`)
    
    let finalContent = contentParts.join('. ')
    
    // If we still don't have much content, add some body text
    if (finalContent.length < 500 && textContent.bodyText.length > 200) {
      finalContent += `. Additional content: ${textContent.bodyText.substring(0, 2000)}`
    }
    
    console.log('Final content length:', finalContent.length)
    console.log('First 200 chars of content:', finalContent.substring(0, 200))
    
    return finalContent || `Website: ${websiteUrl}. This appears to be a business website. Please provide more details about your business, products, and services.`
    
  } catch (error) {
    console.error('Error fetching website content with Puppeteer:', error.message)
    return `Website: ${websiteUrl}. This appears to be a business website. Please provide more details about your business, products, and services.`
  } finally {
    if (browser) {
      await browser.close()
    }
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

      // Build site text for AI analysis - let GPT-4o analyze the website directly
      let siteText = `Please analyze the website at ${websiteUrl} and extract business information. This appears to be a modern single-page application, so focus on understanding the business model, pricing, features, and target audience from the website content.\n\n`
      
      // Add any extracted content as additional context
      if (websiteContent && !websiteContent.includes('This appears to be a business website') && !websiteContent.includes('Loading')) {
        siteText += `Additional extracted content:\n${websiteContent}\n\n`
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
        let aiPlugLine = 'We auto-write short, helpful replies so you can be first without living on X.'

        try {
          const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
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
- Use ONLY facts from the provided text. Do NOT invent.
- The summary should be comprehensive and detailed - it will be used as the main reference for AI replies.
- Include specific details like pricing tiers, feature limits, target audience, and key benefits.
- If the text is too thin to infer confidently, set needs_more_input=true and set all arrays to [] and strings to "" (empty). No apologies. No prose.
- Output MUST be a single JSON object. No markdown, no commentary.`
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
            let content = openaiData.choices[0].message.content.trim()
            
            // Handle markdown code blocks if present
            if (content.startsWith('```json')) {
              content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
            } else if (content.startsWith('```')) {
              content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
            }
            
            const businessProfile = JSON.parse(content)
            
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

      // Build site text for AI analysis - let GPT-4o analyze the website directly
      let siteText = `Please analyze the website at ${websiteUrl} and extract business information. This appears to be a modern single-page application, so focus on understanding the business model, pricing, features, and target audience from the website content.\n\n`
      
      // Add any extracted content as additional context
      if (websiteContent && !websiteContent.includes('This appears to be a business website') && !websiteContent.includes('Loading')) {
        siteText += `Additional extracted content:\n${websiteContent}\n\n`
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
      let aiPlugLine = existingProfile.plug_line || 'We auto-write short, helpful replies so you can be first without living on X.'

      try {
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
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
- Use ONLY facts from the provided text. Do NOT invent.
- The summary should be comprehensive and detailed - it will be used as the main reference for AI replies.
- Include specific details like pricing tiers, feature limits, target audience, and key benefits.
- If the text is too thin to infer confidently, set needs_more_input=true and set all arrays to [] and strings to "" (empty). No apologies. No prose.
- Output MUST be a single JSON object. No markdown, no commentary.`
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
          let content = openaiData.choices[0].message.content.trim()
          
          // Handle markdown code blocks if present
          if (content.startsWith('```json')) {
            content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (content.startsWith('```')) {
            content = content.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }
          
          const businessProfile = JSON.parse(content)
            
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