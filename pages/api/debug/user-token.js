import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'userId parameter required' })
  }

  try {
    console.log('🔍 Checking user data for:', userId)

    // Check if user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('x_user_id', userId)
      .single()

    if (userError) {
      console.log('❌ User not found:', userError)
      return res.status(404).json({ 
        error: 'User not found',
        details: userError,
        userId: userId
      })
    }

    console.log('✅ User found:', {
      id: userData.id,
      x_user_id: userData.x_user_id,
      handle: userData.handle,
      has_token: !!userData.x_oauth_access_token,
      token_length: userData.x_oauth_access_token?.length || 0,
      created_at: userData.created_at,
      updated_at: userData.updated_at
    })

    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        x_user_id: userData.x_user_id,
        handle: userData.handle,
        has_token: !!userData.x_oauth_access_token,
        token_length: userData.x_oauth_access_token?.length || 0,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      }
    })

  } catch (error) {
    console.error('❌ Error checking user:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    })
  }
} 