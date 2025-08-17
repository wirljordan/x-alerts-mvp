-- Add AI replies tracking fields to users table
ALTER TABLE users 
ADD COLUMN ai_replies_used INTEGER DEFAULT 0,
ADD COLUMN ai_replies_limit INTEGER;

-- Set default AI replies limits based on current plan
UPDATE users 
SET ai_replies_limit = CASE 
  WHEN plan = 'free' THEN 10
  WHEN plan = 'starter' THEN 100
  WHEN plan = 'growth' THEN 300
  WHEN plan = 'pro' THEN 1000
  ELSE 10
END
WHERE ai_replies_limit IS NULL;

-- Add index for performance
CREATE INDEX idx_users_ai_replies_used ON users(ai_replies_used);
CREATE INDEX idx_users_ai_replies_limit ON users(ai_replies_limit);

-- Function to increment AI replies used
CREATE OR REPLACE FUNCTION increment_ai_replies_used(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET ai_replies_used = ai_replies_used + 1
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to reset AI replies usage (for monthly reset)
CREATE OR REPLACE FUNCTION reset_ai_replies_usage()
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET ai_replies_used = 0;
END;
$$ LANGUAGE plpgsql; 