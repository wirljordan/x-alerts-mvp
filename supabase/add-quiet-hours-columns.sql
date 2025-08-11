-- Add quiet hours columns to users table
-- This migration adds the missing columns for the quiet hours feature

-- Add quiet_hours_start column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME;

-- Add quiet_hours_end column  
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME;

-- Add timezone column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';

-- Create index for better performance on timezone queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Add comment to document the columns
COMMENT ON COLUMN users.quiet_hours_start IS 'Start time for quiet hours (HH:MM format)';
COMMENT ON COLUMN users.quiet_hours_end IS 'End time for quiet hours (HH:MM format)';
COMMENT ON COLUMN users.timezone IS 'User timezone for quiet hours calculation'; 