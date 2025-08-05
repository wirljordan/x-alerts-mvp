-- Migration script to fix user plans
-- This updates existing users to have the correct free plan and SMS limits

-- Update existing users to have 'free' plan if they don't have a paid plan
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