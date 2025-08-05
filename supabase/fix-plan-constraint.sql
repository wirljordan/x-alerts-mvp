-- Migration script to fix the plan constraint
-- This updates the database constraint to allow 'free' plan

-- First, drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_check;

-- Add the new constraint that includes 'free'
ALTER TABLE users ADD CONSTRAINT users_plan_check 
CHECK (plan IN ('free', 'starter', 'pro', 'team'));

-- Update existing users to have 'free' plan if they have 'starter' with 300 SMS limit
UPDATE users 
SET plan = 'free', sms_limit = 25 
WHERE plan = 'starter' AND sms_limit = 300;

-- Update users with 'pro' plan to have correct SMS limit
UPDATE users 
SET sms_limit = 3000 
WHERE plan = 'pro';

-- Update users with 'team' plan to have correct SMS limit  
UPDATE users 
SET sms_limit = 10000 
WHERE plan = 'team';

-- Verify the changes
SELECT x_user_id, handle, plan, sms_limit FROM users; 