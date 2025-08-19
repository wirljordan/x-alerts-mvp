-- Add X OAuth access token column to users table
ALTER TABLE users ADD COLUMN x_oauth_access_token TEXT;

-- Add index for performance
CREATE INDEX idx_users_x_oauth_token ON users(x_oauth_access_token);

-- Add comment for documentation
COMMENT ON COLUMN users.x_oauth_access_token IS 'X OAuth access token for posting replies on behalf of user'; 