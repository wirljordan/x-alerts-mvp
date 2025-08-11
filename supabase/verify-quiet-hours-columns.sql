-- Verify that quiet hours columns exist in users table
-- Run this to check if the migration was successful

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
  AND column_name IN ('quiet_hours_start', 'quiet_hours_end', 'timezone')
ORDER BY column_name; 