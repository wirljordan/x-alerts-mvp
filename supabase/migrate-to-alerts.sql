-- Migration script to update from SMS limits to alerts limits
-- Run this in your Supabase SQL editor

-- Step 1: Add new columns if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_limit INTEGER DEFAULT 10;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alerts_used INTEGER DEFAULT 0;

-- Step 2: Migrate existing SMS data to alerts data
UPDATE users 
SET 
  alerts_limit = CASE 
    WHEN plan = 'free' THEN 10
    WHEN plan = 'starter' THEN 100
    WHEN plan = 'growth' THEN 300
    WHEN plan = 'pro' THEN 1000
    ELSE 10
  END,
  alerts_used = COALESCE(sms_used, 0)
WHERE alerts_limit = 10 OR alerts_limit IS NULL;

-- Step 3: Update the plan constraint to include 'growth'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;
ALTER TABLE users ADD CONSTRAINT users_plan_check CHECK (plan IN ('free', 'starter', 'growth', 'pro'));

-- Step 4: Verify the migration
SELECT 
  x_user_id, 
  handle, 
  plan, 
  sms_limit as old_sms_limit, 
  sms_used as old_sms_used,
  alerts_limit as new_alerts_limit, 
  alerts_used as new_alerts_used
FROM users 
ORDER BY created_at DESC; 