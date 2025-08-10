-- Fix rule_states table to use TEXT for user_id instead of UUID
-- Drop the existing table and recreate with correct column type

-- Drop existing table and related objects
DROP TABLE IF EXISTS rule_states CASCADE;

-- Recreate rule_states table with TEXT user_id
CREATE TABLE rule_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  since_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rule_id)
);

-- Create indexes for performance
CREATE INDEX idx_rule_states_rule_id ON rule_states(rule_id);
CREATE INDEX idx_rule_states_user_id ON rule_states(user_id);

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'rule_states'
ORDER BY column_name; 