import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, apiKey } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Handle DELETE request (remove API key)
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('x_api_credentials')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('Error removing TwitterAPI.io credentials:', error)
        return res.status(500).json({ error: 'Failed to remove API credentials' })
      }

      return res.status(200).json({
        success: true,
        message: 'TwitterAPI.io credentials removed successfully'
      })
    }

    // Handle POST request (add API key)
    if (!apiKey) {
      return res.status(400).json({ error: 'TwitterAPI.io API key is required' })
    }

    // Verify the API key by testing it
    try {
      const testResponse = await fetch('https://api.twitterapi.io/twitter/user/me', {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!testResponse.ok) {
        return res.status(400).json({ 
          error: 'Invalid TwitterAPI.io API key. Please check your key and try again.' 
        })
      }

      const userData = await testResponse.json()
      console.log('✅ TwitterAPI.io API key verified for user:', userId)

    } catch (error) {
      console.error('Error verifying TwitterAPI.io API key:', error)
      return res.status(400).json({ 
        error: 'Failed to verify TwitterAPI.io API key. Please check your key and try again.' 
      })
    }

    // Save the API key to database
    const { data, error } = await supabase
      .from('x_api_credentials')
      .upsert({
        user_id: userId,
        access_token: apiKey,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (error) {
      console.error('Error saving TwitterAPI.io credentials:', error)
      return res.status(500).json({ error: 'Failed to save API credentials' })
    }

    res.status(200).json({
      success: true,
      message: 'TwitterAPI.io credentials saved successfully'
    })

  } catch (error) {
    console.error('Error in TwitterAPI.io setup:', error)
    res.status(500).json({
      error: error.message || 'Failed to setup TwitterAPI.io credentials'
    })
  }
} 