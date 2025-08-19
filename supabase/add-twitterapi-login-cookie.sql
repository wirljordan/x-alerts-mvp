-- Add TwitterAPI.io login cookie column to users table
ALTER TABLE users ADD COLUMN twitterapi_login_cookie TEXT;

-- Add index for performance
CREATE INDEX idx_users_twitterapi_cookie ON users(twitterapi_login_cookie);

-- Add comment for documentation
COMMENT ON COLUMN users.twitterapi_login_cookie IS 'TwitterAPI.io login cookie for posting replies on behalf of user'; 