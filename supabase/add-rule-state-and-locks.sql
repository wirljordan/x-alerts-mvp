-- Migration to add RuleState table and distributed_locks table
-- This enables server-side new-only fetching and distributed locking

-- Add RuleState table for tracking since_id per rule
CREATE TABLE IF NOT EXISTS rule_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE UNIQUE,
  since_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add distributed_locks table for preventing parallel processing
CREATE TABLE IF NOT EXISTS distributed_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lock_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  instance_id TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rule_state_rule_id ON rule_state(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_state_since_id ON rule_state(since_id);
CREATE INDEX IF NOT EXISTS idx_distributed_locks_key ON distributed_locks(lock_key);
CREATE INDEX IF NOT EXISTS idx_distributed_locks_user_id ON distributed_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_distributed_locks_expires_at ON distributed_locks(expires_at);

-- Function to get or create rule state
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

-- Function to update rule state since_id
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