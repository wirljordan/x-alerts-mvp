-- Create scout_states table for tracking since_id values per user
CREATE TABLE IF NOT EXISTS scout_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  since_id TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_scout_states_user_id ON scout_states(user_id);

-- Update cost_logs table to include credits_total field
ALTER TABLE cost_logs 
ADD COLUMN IF NOT EXISTS credits_total INTEGER;

-- Create index for cost_logs credits_total
CREATE INDEX IF NOT EXISTS idx_cost_logs_credits_total ON cost_logs(credits_total);

-- Add cleanup function for seen_cache (48-hour TTL)
CREATE OR REPLACE FUNCTION cleanup_seen_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM seen_cache 
  WHERE seen_at < NOW() - INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run cleanup every hour
CREATE OR REPLACE FUNCTION trigger_cleanup_seen_cache()
RETURNS trigger AS $$
BEGIN
  -- Only run cleanup occasionally to avoid performance impact
  IF (EXTRACT(MINUTE FROM NOW()) % 60) = 0 THEN
    PERFORM cleanup_seen_cache();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cleanup_seen_cache_trigger') THEN
    CREATE TRIGGER cleanup_seen_cache_trigger
      AFTER INSERT ON seen_cache
      FOR EACH ROW
      EXECUTE FUNCTION trigger_cleanup_seen_cache();
  END IF;
END $$; 