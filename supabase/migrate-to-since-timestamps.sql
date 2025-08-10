-- Migration to switch from since_id to since_at timestamps
-- This updates the database schema to work with twitterapi.io since: timestamps

-- Update scout_states table
ALTER TABLE scout_states 
DROP COLUMN IF EXISTS since_id;

ALTER TABLE scout_states 
ADD COLUMN IF NOT EXISTS since_at TIMESTAMP WITH TIME ZONE;

-- Update rule_states table  
ALTER TABLE rule_states 
DROP COLUMN IF EXISTS since_id;

ALTER TABLE rule_states 
ADD COLUMN IF NOT EXISTS since_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN scout_states.since_at IS 'ISO8601 UTC timestamp for since: parameter (YYYY-MM-DD_HH:mm:ss_UTC format)';
COMMENT ON COLUMN rule_states.since_at IS 'ISO8601 UTC timestamp for since: parameter (YYYY-MM-DD_HH:mm:ss_UTC format)';

-- Verify the changes
SELECT 
  table_name, 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('scout_states', 'rule_states') 
  AND column_name = 'since_at'
ORDER BY table_name; 