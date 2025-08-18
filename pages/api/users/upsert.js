import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, username, email, phone, goal, plan } = req.body

    if (!userId || !username) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Map plan names to match our schema
    const planMapping = {
      'starter': 'starter', 
      'growth': 'growth',
      'pro': 'pro'
    }

    const mappedPlan = planMapping[plan] || 'starter'

    // Calculate AI replies limits based on plan
    const aiRepliesLimits = {
      'starter': 100,
      'growth': 300,
      'pro': 1000
    }

    const aiRepliesLimit = aiRepliesLimits[plan] || 100

    // Upsert user data
    const { data, error } = await supabaseAdmin
      .from('users')
      .upsert({
        x_user_id: userId,
        handle: username,
        email: email || null,
        phone: phone || null,
        goal: goal || null,
        plan: mappedPlan,
        ai_replies_limit: aiRepliesLimit,
        ai_replies_used: 0,
        ai_lead_finder_enabled: true // Default to enabled for new users
      }, {
        onConflict: 'x_user_id',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to save user data' })
    }

    console.log('User data saved successfully:', data)

    res.status(200).json({ 
      success: true, 
      user: data[0],
      message: 'User data saved successfully' 
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 