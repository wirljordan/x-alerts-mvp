import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Starting migration from alerts to keyword_rules...')

    // Get all active alerts from the old table
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('alerts')
      .select('id, user_id, query_string, status, created_at')
      .eq('status', 'active')

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    console.log(`📊 Found ${alerts.length} active alerts to migrate`)

    if (alerts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No alerts to migrate',
        migrated: 0
      })
    }

    let migrated = 0
    const results = []

    // Migrate each alert to keyword_rules
    for (const alert of alerts) {
      try {
        // Check if this rule already exists in keyword_rules
        const { data: existingRule } = await supabaseAdmin
          .from('keyword_rules')
          .select('id')
          .eq('user_id', alert.user_id)
          .eq('query', alert.query_string)
          .single()

        if (existingRule) {
          console.log(`⏭️ Rule already exists for user ${alert.user_id}: "${alert.query_string}"`)
          continue
        }

        // Insert into keyword_rules
        const { data: newRule, error: insertError } = await supabaseAdmin
          .from('keyword_rules')
          .insert({
            user_id: alert.user_id,
            query: alert.query_string,
            status: alert.status,
            created_at: alert.created_at
          })
          .select()
          .single()

        if (insertError) {
          console.error(`❌ Error migrating alert ${alert.id}:`, insertError)
          continue
        }

        console.log(`✅ Migrated: "${alert.query_string}" for user ${alert.user_id}`)
        migrated++
        results.push({
          old_id: alert.id,
          new_id: newRule.id,
          query: alert.query_string,
          user_id: alert.user_id
        })

      } catch (error) {
        console.error(`❌ Error processing alert ${alert.id}:`, error)
      }
    }

    console.log(`🎉 Migration completed: ${migrated} rules migrated`)

    return res.status(200).json({
      success: true,
      message: `Successfully migrated ${migrated} rules`,
      migrated,
      results
    })

  } catch (error) {
    console.error('❌ Error in migration:', error)
    return res.status(500).json({ error: error.message })
  }
} 