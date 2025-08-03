import { getServerSession } from 'next-auth/next'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { phone, email, plan } = req.body

    // Update user data
    const updateData = {}
    if (phone) updateData.phone = phone
    if (email) updateData.email = email
    if (plan) {
      updateData.plan = plan
      // Set SMS limit based on plan
      const smsLimits = { starter: 300, pro: 1000, team: 5000 }
      updateData.sms_limit = smsLimits[plan]
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('x_user_id', session.user.sub)

    if (error) {
      console.error('Error updating user:', error)
      return res.status(500).json({ error: 'Failed to update user' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in user update:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 