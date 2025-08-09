-- Migration script for improved cron system
-- Run this in your Supabase SQL editor

-- Step 1: Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '16:00:00',
ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '08:00:00',
ADD COLUMN IF NOT EXISTS delivery_mode TEXT DEFAULT 'sms',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Step 2: Create keyword_rules table
CREATE TABLE IF NOT EXISTS keyword_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters JSONB DEFAULT '{"no_links": false, "no_media": false}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create seen_cache table
CREATE TABLE IF NOT EXISTS seen_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create alert_logs table
CREATE TABLE IF NOT EXISTS alert_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'push', 'inapp'))
);

-- Step 5: Create cost_logs table
CREATE TABLE IF NOT EXISTS cost_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ts TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweets_returned INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0
);

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_user_id ON keyword_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_rules_status ON keyword_rules(status);
CREATE INDEX IF NOT EXISTS idx_seen_cache_rule_id ON seen_cache(rule_id);
CREATE INDEX IF NOT EXISTS idx_seen_cache_tweet_id ON seen_cache(tweet_id);
CREATE INDEX IF NOT EXISTS idx_seen_cache_seen_at ON seen_cache(seen_at);
CREATE INDEX IF NOT EXISTS idx_alert_logs_user_id ON alert_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_rule_id ON alert_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_alert_logs_alerted_at ON alert_logs(alerted_at);
CREATE INDEX IF NOT EXISTS idx_cost_logs_ts ON cost_logs(ts);
CREATE INDEX IF NOT EXISTS idx_cost_logs_rule_id ON cost_logs(rule_id);

-- Step 7: Create cleanup function for seen_cache
CREATE OR REPLACE FUNCTION cleanup_seen_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM seen_cache 
  WHERE seen_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for automatic cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_seen_cache()
RETURNS trigger AS $$
BEGIN
  -- Clean up old entries when new ones are inserted
  PERFORM cleanup_seen_cache();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cleanup_seen_cache_trigger') THEN
    CREATE TRIGGER cleanup_seen_cache_trigger
      AFTER INSERT ON seen_cache
      FOR EACH ROW
      EXECUTE FUNCTION trigger_cleanup_seen_cache();
  END IF;
END $$;

-- Step 10: Migrate existing alerts to keyword_rules (optional)
-- This will create keyword_rules from existing alerts
INSERT INTO keyword_rules (user_id, query, status, created_at)
SELECT 
  user_id,
  query_string as query,
  status,
  created_at
FROM alerts 
WHERE NOT EXISTS (
  SELECT 1 FROM keyword_rules kr 
  WHERE kr.user_id = alerts.user_id 
  AND kr.query = alerts.query_string
);

-- Step 11: Verify migration
SELECT 
  'Users with new columns' as check_type,
  COUNT(*) as count
FROM users 
WHERE timezone IS NOT NULL
UNION ALL
SELECT 
  'Keyword rules' as check_type,
  COUNT(*) as count
FROM keyword_rules
UNION ALL
SELECT 
  'Seen cache entries' as check_type,
  COUNT(*) as count
FROM seen_cache
UNION ALL
SELECT 
  'Alert logs' as check_type,
  COUNT(*) as count
FROM alert_logs
UNION ALL
SELECT 
  'Cost logs' as check_type,
  COUNT(*) as count
FROM cost_logs; 