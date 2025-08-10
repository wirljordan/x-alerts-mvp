-- Create rule_states table for tracking since_id values
CREATE TABLE IF NOT EXISTS rule_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  since_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rule_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_rule_states_rule_id ON rule_states(rule_id);

-- Update cost_logs table to include new fields
ALTER TABLE cost_logs 
ADD COLUMN IF NOT EXISTS phase TEXT,
ADD COLUMN IF NOT EXISTS params_sent JSONB;

-- Create index for cost_logs
CREATE INDEX IF NOT EXISTS idx_cost_logs_phase ON cost_logs(phase);
CREATE INDEX IF NOT EXISTS idx_cost_logs_rule_id ON cost_logs(rule_id); 