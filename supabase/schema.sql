-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  x_user_id TEXT UNIQUE NOT NULL,
  handle TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'team')),
  sms_limit INTEGER DEFAULT 25,
  sms_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query_string TEXT NOT NULL,
  feed_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_match_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  sent_via TEXT NOT NULL CHECK (sent_via IN ('sms', 'email')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_x_user_id ON users(x_user_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_messages_alert_id ON messages(alert_id);
CREATE INDEX idx_messages_tweet_id ON messages(tweet_id);

-- Function to get user usage
CREATE OR REPLACE FUNCTION get_user_usage(user_uuid UUID)
RETURNS TABLE(used INTEGER, limit_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT u.sms_used, u.sms_limit
  FROM users u
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql; 