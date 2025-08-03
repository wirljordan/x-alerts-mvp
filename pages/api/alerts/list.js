import { getServerSession } from 'next-auth/next'
import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
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

    // Get user's alerts
    const { data: alerts, error } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching alerts:', error)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    res.status(200).json({ alerts })
  } catch (error) {
    console.error('Error in alerts list:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 