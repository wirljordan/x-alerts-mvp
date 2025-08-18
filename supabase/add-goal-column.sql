-- Add goal column to users table
ALTER TABLE users
ADD COLUMN goal TEXT;

-- Add index for performance
CREATE INDEX idx_users_goal ON users(goal);

-- Add comment for documentation
COMMENT ON COLUMN users.goal IS 'User''s primary goal for using EarlyReply (leads, engagement, brand, support)'; 