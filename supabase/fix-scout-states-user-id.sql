-- Fix scout_states table to use TEXT for user_id instead of UUID
-- Drop the existing table and recreate with correct column type

-- Drop existing table and related objects
DROP TABLE IF EXISTS scout_states CASCADE;

-- Recreate scout_states table with TEXT user_id
CREATE TABLE scout_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  since_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX idx_scout_states_user_id ON scout_states(user_id);

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'scout_states'
ORDER BY column_name; 