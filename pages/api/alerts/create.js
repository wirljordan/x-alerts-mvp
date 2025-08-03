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

    const { query_string, accounts_to_watch } = req.body

    if (!query_string) {
      return res.status(400).json({ error: 'Query string is required' })
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

    // Create alert
    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .insert({
        user_id: user.id,
        query_string,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating alert:', error)
      return res.status(500).json({ error: 'Failed to create alert' })
    }

    res.status(201).json({ alert })
  } catch (error) {
    console.error('Error in alert creation:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 