import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔍 Debug: Checking all users and their keyword rules...')

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, x_user_id, handle, phone, plan, alerts_used, alerts_limit, timezone, quiet_hours_start, quiet_hours_end')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }

    console.log(`📊 Found ${users.length} total users`)

    // Get all keyword rules
    const { data: keywordRules, error: rulesError } = await supabaseAdmin
      .from('keyword_rules')
      .select('id, user_id, query, status, created_at')

    if (rulesError) {
      console.error('❌ Error fetching keyword rules:', rulesError)
      return res.status(500).json({ error: 'Failed to fetch keyword rules' })
    }

    console.log(`📊 Found ${keywordRules.length} total keyword rules`)

    // Group rules by user
    const userRules = {}
    for (const rule of keywordRules) {
      if (!userRules[rule.user_id]) {
        userRules[rule.user_id] = []
      }
      userRules[rule.user_id].push(rule)
    }

    // Build response
    const userDetails = users.map(user => {
      const userRuleCount = userRules[user.id]?.length || 0
      const activeRuleCount = userRules[user.id]?.filter(rule => rule.status === 'active').length || 0
      
      return {
        id: user.id,
        x_user_id: user.x_user_id,
        handle: user.handle,
        phone: user.phone,
        plan: user.plan,
        alerts_used: user.alerts_used,
        alerts_limit: user.alerts_limit,
        timezone: user.timezone,
        quiet_hours_start: user.quiet_hours_start,
        quiet_hours_end: user.quiet_hours_end,
        total_rules: userRuleCount,
        active_rules: activeRuleCount,
        rules: userRules[user.id] || []
      }
    })

    console.log('📋 User details:', userDetails.map(u => ({
      handle: u.handle,
      x_user_id: u.x_user_id,
      active_rules: u.active_rules,
      total_rules: u.total_rules,
      phone: u.phone ? 'Yes' : 'No',
      plan: u.plan
    })))

    return res.status(200).json({
      success: true,
      total_users: users.length,
      total_rules: keywordRules.length,
      users: userDetails
    })

  } catch (error) {
    console.error('❌ Error in debug endpoint:', error)
    return res.status(500).json({ error: error.message })
  }
} 