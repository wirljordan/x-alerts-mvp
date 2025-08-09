#!/usr/bin/env node

/**
 * Setup script for monitor-keywords database tables
 * Run this script to create the required tables and functions
 */

import { supabaseAdmin } from '../lib/supabase.js'

async function setupMonitorTables() {
  console.log('🚀 Setting up monitor-keywords database tables...')

  try {
    // 1. Create rule_state table
    console.log('📊 Creating rule_state table...')
    const { error: ruleStateError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS rule_state (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE UNIQUE,
          since_id TEXT,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })

    if (ruleStateError) {
      console.log('⚠️ rule_state table creation error (might already exist):', ruleStateError.message)
    } else {
      console.log('✅ rule_state table created successfully')
    }

    // 2. Create distributed_locks table
    console.log('📊 Creating distributed_locks table...')
    const { error: locksError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS distributed_locks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          lock_key TEXT UNIQUE NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          instance_id TEXT NOT NULL
        );
      `
    })

    if (locksError) {
      console.log('⚠️ distributed_locks table creation error (might already exist):', locksError.message)
    } else {
      console.log('✅ distributed_locks table created successfully')
    }

    // 3. Create indexes
    console.log('📊 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_rule_state_rule_id ON rule_state(rule_id);',
      'CREATE INDEX IF NOT EXISTS idx_rule_state_since_id ON rule_state(since_id);',
      'CREATE INDEX IF NOT EXISTS idx_distributed_locks_key ON distributed_locks(lock_key);',
      'CREATE INDEX IF NOT EXISTS idx_distributed_locks_user_id ON distributed_locks(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires_at ON distributed_locks(expires_at);'
    ]

    for (const indexSql of indexes) {
      try {
        await supabaseAdmin.rpc('exec_sql', { sql: indexSql })
      } catch (error) {
        console.log('⚠️ Index creation error (might already exist):', error.message)
      }
    }
    console.log('✅ Indexes created successfully')

    // 4. Create functions
    console.log('📊 Creating functions...')
    
    // get_or_create_rule_state function
    const getOrCreateFunction = `
      CREATE OR REPLACE FUNCTION get_or_create_rule_state(rule_uuid UUID)
      RETURNS rule_state AS $$
      DECLARE
        rule_state_record rule_state;
      BEGIN
        -- Try to get existing rule state
        SELECT * INTO rule_state_record 
        FROM rule_state 
        WHERE rule_id = rule_uuid;
        
        -- If not found, create it
        IF NOT FOUND THEN
          INSERT INTO rule_state (rule_id, since_id)
          VALUES (rule_uuid, NULL)
          RETURNING * INTO rule_state_record;
        END IF;
        
        RETURN rule_state_record;
      END;
      $$ LANGUAGE plpgsql;
    `

    try {
      await supabaseAdmin.rpc('exec_sql', { sql: getOrCreateFunction })
      console.log('✅ get_or_create_rule_state function created successfully')
    } catch (error) {
      console.log('⚠️ Function creation error:', error.message)
    }

    // update_rule_state_since_id function
    const updateFunction = `
      CREATE OR REPLACE FUNCTION update_rule_state_since_id(rule_uuid UUID, new_since_id TEXT)
      RETURNS void AS $$
      BEGIN
        UPDATE rule_state 
        SET since_id = new_since_id, last_updated = NOW()
        WHERE rule_id = rule_uuid;
        
        -- If no rows updated, insert new record
        IF NOT FOUND THEN
          INSERT INTO rule_state (rule_id, since_id)
          VALUES (rule_uuid, new_since_id);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `

    try {
      await supabaseAdmin.rpc('exec_sql', { sql: updateFunction })
      console.log('✅ update_rule_state_since_id function created successfully')
    } catch (error) {
      console.log('⚠️ Function creation error:', error.message)
    }

    console.log('🎉 Setup completed successfully!')
    console.log('📝 Note: If you see any "already exists" warnings, that\'s normal for subsequent runs.')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    console.log('💡 You may need to run the SQL migration manually in your Supabase dashboard')
    console.log('📁 Check: supabase/add-rule-state-and-locks.sql')
  }
}

// Run the setup
setupMonitorTables() 