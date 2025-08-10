-- Add intent_strict column to keyword_rules table
-- This controls whether broad terms get automatic intent bundling

ALTER TABLE keyword_rules 
ADD COLUMN IF NOT EXISTS intent_strict BOOLEAN DEFAULT FALSE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_keyword_rules_intent_strict ON keyword_rules(intent_strict);

-- Add comment
COMMENT ON COLUMN keyword_rules.intent_strict IS 'If false, broad terms get automatic intent bundling ("looking for", "need", etc.)';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'keyword_rules' AND column_name = 'intent_strict'; 