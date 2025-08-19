-- Create table for Twitter accounts with encrypted credentials
CREATE TABLE twitter_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  encrypted_password TEXT NOT NULL,
  encrypted_email TEXT NOT NULL,
  encrypted_auth_token TEXT NOT NULL,
  encrypted_totp_secret TEXT,
  registration_year INTEGER,
  is_active BOOLEAN DEFAULT true,
  assigned_user_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for user account assignments
CREATE TABLE user_account_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  twitter_account_id UUID REFERENCES twitter_accounts(id) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, twitter_account_id)
);

-- Add indexes for performance
CREATE INDEX idx_twitter_accounts_assigned_user ON twitter_accounts(assigned_user_id);
CREATE INDEX idx_twitter_accounts_active ON twitter_accounts(is_active) WHERE is_active = true;
CREATE INDEX idx_user_account_assignments_user ON user_account_assignments(user_id);
CREATE INDEX idx_user_account_assignments_active ON user_account_assignments(is_active) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies (only system can access)
CREATE POLICY "System access only" ON twitter_accounts FOR ALL USING (true);
CREATE POLICY "System access only" ON user_account_assignments FOR ALL USING (true); 