-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  x_user_id TEXT UNIQUE NOT NULL,
  handle TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'growth', 'pro')),
  alerts_limit INTEGER DEFAULT 10,
  alerts_used INTEGER DEFAULT 0,
  timezone TEXT DEFAULT 'UTC',
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  delivery_mode TEXT DEFAULT 'sms' CHECK (delivery_mode IN ('sms', 'push', 'inapp')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KeywordRule table (replaces alerts)
CREATE TABLE keyword_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{"no_links": false, "no_media": false}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SeenCache for deduplication (48h TTL)
CREATE TABLE seen_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AlertLog for tracking alerts sent
CREATE TABLE alert_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'push', 'inapp'))
);

-- CostLog for tracking API usage and costs
CREATE TABLE cost_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweets_returned INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0
);

-- Legacy alerts table (for backward compatibility)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query_string TEXT NOT NULL,
  feed_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_match_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (legacy)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  sent_via TEXT NOT NULL CHECK (sent_via IN ('sms', 'email')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_x_user_id ON users(x_user_id);
CREATE INDEX idx_users_timezone ON users(timezone);
CREATE INDEX idx_keyword_rules_user_id ON keyword_rules(user_id);
CREATE INDEX idx_keyword_rules_status ON keyword_rules(status);
CREATE INDEX idx_seen_cache_rule_id ON seen_cache(rule_id);
CREATE INDEX idx_seen_cache_tweet_id ON seen_cache(tweet_id);
CREATE INDEX idx_seen_cache_seen_at ON seen_cache(seen_at);
CREATE INDEX idx_alert_logs_user_id ON alert_logs(user_id);
CREATE INDEX idx_alert_logs_rule_id ON alert_logs(rule_id);
CREATE INDEX idx_alert_logs_alerted_at ON alert_logs(alerted_at);
CREATE INDEX idx_cost_logs_ts ON cost_logs(ts);
CREATE INDEX idx_cost_logs_rule_id ON cost_logs(rule_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_messages_alert_id ON messages(alert_id);
CREATE INDEX idx_messages_tweet_id ON messages(tweet_id);

-- Function to get user usage
CREATE OR REPLACE FUNCTION get_user_usage(user_uuid UUID)
RETURNS TABLE(used INTEGER, limit_count INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT u.alerts_used, u.alerts_limit
  FROM users u
  WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql; 

-- Function to clean up old seen_cache entries (48h TTL)
CREATE OR REPLACE FUNCTION cleanup_seen_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM seen_cache 
  WHERE seen_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically clean up seen_cache
CREATE OR REPLACE FUNCTION trigger_cleanup_seen_cache()
RETURNS trigger AS $$
BEGIN
  -- Clean up old entries when new ones are inserted
  PERFORM cleanup_seen_cache();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_seen_cache_trigger
  AFTER INSERT ON seen_cache
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_seen_cache(); 