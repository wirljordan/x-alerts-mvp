import { getServerSession } from 'next-auth/next'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { alert_id } = req.body

    if (!alert_id) {
      return res.status(400).json({ error: 'Alert ID is required' })
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

    // Delete alert (cascade will handle related messages)
    const { error } = await supabaseAdmin
      .from('alerts')
      .delete()
      .eq('id', alert_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting alert:', error)
      return res.status(500).json({ error: 'Failed to delete alert' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in alert deletion:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 