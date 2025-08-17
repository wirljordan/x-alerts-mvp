-- Add aiLeadFinderEnabled column to users table
ALTER TABLE users
ADD COLUMN ai_lead_finder_enabled BOOLEAN DEFAULT true;

-- Add index for performance
CREATE INDEX idx_users_ai_lead_finder_enabled ON users(ai_lead_finder_enabled);

-- Set default value for existing users (keep existing users off, but new users will default to on)
UPDATE users
SET ai_lead_finder_enabled = false
WHERE ai_lead_finder_enabled IS NULL; 