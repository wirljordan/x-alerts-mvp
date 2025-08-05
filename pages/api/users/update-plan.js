import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, plan } = req.body

    if (!userId || !plan) {
      return res.status(400).json({ error: 'Missing userId or plan' })
    }

    // Map plan names to match our schema
    const planMapping = {
      'free': 'free',
      'starter': 'starter', 
      'growth': 'pro',
      'pro': 'team'
    }

    const mappedPlan = planMapping[plan] || 'free'

    // Calculate SMS limits based on plan
    const smsLimits = {
      'free': 25,
      'starter': 300,
      'growth': 1000,
      'pro': 3000
    }

    const smsLimit = smsLimits[plan] || 25

    // Update user in Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        plan: mappedPlan,
        sms_limit: smsLimit
      })
      .eq('x_user_id', userId)
      .select()

    if (error) {
      console.error('Failed to update user plan:', error)
      return res.status(500).json({ error: 'Failed to update user plan', details: error })
    }

    console.log('User plan updated successfully:', data)
    res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error updating user plan:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 