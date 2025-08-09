import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Testing monitor-keywords functionality...')

    // Test 1: Check if rule_state table exists and can be queried
    console.log('📊 Test 1: Checking rule_state table...')
    const { data: ruleStateTest, error: ruleStateError } = await supabaseAdmin
      .from('rule_state')
      .select('*')
      .limit(1)
    
    if (ruleStateError) {
      console.log('❌ rule_state table error:', ruleStateError.message)
    } else {
      console.log('✅ rule_state table accessible, sample data:', ruleStateTest)
    }

    // Test 2: Check if distributed_locks table exists
    console.log('📊 Test 2: Checking distributed_locks table...')
    const { data: locksTest, error: locksError } = await supabaseAdmin
      .from('distributed_locks')
      .select('*')
      .limit(1)
    
    if (locksError) {
      console.log('❌ distributed_locks table error:', locksError.message)
    } else {
      console.log('✅ distributed_locks table accessible, sample data:', locksTest)
    }

    // Test 3: Test the get_or_create_rule_state function
    console.log('📊 Test 3: Testing get_or_create_rule_state function...')
    try {
      // Get a sample keyword rule
      const { data: sampleRule } = await supabaseAdmin
        .from('keyword_rules')
        .select('id')
        .limit(1)
        .single()
      
      if (sampleRule) {
        const { data: ruleState, error: funcError } = await supabaseAdmin
          .rpc('get_or_create_rule_state', { rule_uuid: sampleRule.id })
        
        if (funcError) {
          console.log('❌ get_or_create_rule_state function error:', funcError.message)
        } else {
          console.log('✅ get_or_create_rule_state function works, result:', ruleState)
        }
      } else {
        console.log('⚠️ No keyword rules found to test with')
      }
    } catch (error) {
      console.log('❌ Function test error:', error.message)
    }

    // Test 4: Check environment variables
    console.log('📊 Test 4: Checking environment variables...')
    const envVars = {
      SEARCH_SINCE_PARAM: process.env.SEARCH_SINCE_PARAM || 'since_id (default)',
      BACKFILL_MAX_PAGES: process.env.BACKFILL_MAX_PAGES || '2 (default)',
      BACKFILL_MAX_TWEETS: process.env.BACKFILL_MAX_TWEETS || '6 (default)',
      LOCK_TTL_SECONDS: process.env.LOCK_TTL_SECONDS || '240 (default)',
      TWITTER_API_BASE_URL: process.env.TWITTER_API_BASE_URL ? '✅ Set' : '❌ Not set',
      TWITTER_API_KEY: process.env.TWITTER_API_KEY ? '✅ Set' : '❌ Not set'
    }
    console.log('Environment variables:', envVars)

    return res.status(200).json({
      success: true,
      message: 'Monitor test completed',
      tests: {
        ruleStateTable: ruleStateError ? 'Failed' : 'Passed',
        distributedLocksTable: locksError ? 'Failed' : 'Passed',
        environmentVariables: 'Checked',
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Test error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
} 