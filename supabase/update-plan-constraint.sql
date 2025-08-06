-- Migration script to update the plan constraint to include 'growth'
-- This updates the database constraint to allow 'growth' plan

-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;

-- Add the new constraint that includes 'growth'
ALTER TABLE users ADD CONSTRAINT users_plan_check 
CHECK (plan IN ('free', 'starter', 'growth', 'pro', 'team'));

-- Update existing users with 'pro' plan that should be 'growth' (if they have 1000 SMS limit)
UPDATE users 
SET plan = 'growth' 
WHERE plan = 'pro' AND sms_limit = 1000;

-- Verify the changes
SELECT x_user_id, handle, plan, sms_limit FROM users WHERE x_user_id = '826285362158981121'; 