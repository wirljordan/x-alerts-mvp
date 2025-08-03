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

    const { alert_id, status } = req.body

    if (!alert_id || !status) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get user ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('x_user_id', session.user.sub)
      .single()

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update alert status
    const { error } = await supabaseAdmin
      .from('alerts')
      .update({ status })
      .eq('id', alert_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating alert:', error)
      return res.status(500).json({ error: 'Failed to update alert' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in alert toggle:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 