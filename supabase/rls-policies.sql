-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE x_api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE seen_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = x_user_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = x_user_id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = x_user_id);

-- Keyword rules policies
CREATE POLICY "Users can view own keyword rules" ON keyword_rules
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own keyword rules" ON keyword_rules
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own keyword rules" ON keyword_rules
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can delete own keyword rules" ON keyword_rules
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- Business profiles policies
CREATE POLICY "Users can view own business profile" ON business_profiles
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own business profile" ON business_profiles
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own business profile" ON business_profiles
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- AI replies policies
CREATE POLICY "Users can view own AI replies" ON ai_replies
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own AI replies" ON ai_replies
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- X API credentials policies (CRITICAL - most sensitive)
CREATE POLICY "Users can view own API credentials" ON x_api_credentials
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own API credentials" ON x_api_credentials
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own API credentials" ON x_api_credentials
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- Scout states policies
CREATE POLICY "Users can view own scout states" ON scout_states
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own scout states" ON scout_states
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own scout states" ON scout_states
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- Rule states policies
CREATE POLICY "Users can view own rule states" ON rule_states
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own rule states" ON rule_states
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can update own rule states" ON rule_states
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- Seen cache policies
CREATE POLICY "Users can view own seen cache" ON seen_cache
  FOR SELECT USING (
    rule_id IN (
      SELECT id FROM keyword_rules WHERE user_id IN (
        SELECT id FROM users WHERE x_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can insert own seen cache" ON seen_cache
  FOR INSERT WITH CHECK (
    rule_id IN (
      SELECT id FROM keyword_rules WHERE user_id IN (
        SELECT id FROM users WHERE x_user_id = auth.uid()::text
      )
    )
  );

-- Alert logs policies
CREATE POLICY "Users can view own alert logs" ON alert_logs
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own alert logs" ON alert_logs
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE x_user_id = auth.uid()::text
    )
  );

-- Cost logs policies
CREATE POLICY "Users can view own cost logs" ON cost_logs
  FOR SELECT USING (
    rule_id IN (
      SELECT id FROM keyword_rules WHERE user_id IN (
        SELECT id FROM users WHERE x_user_id = auth.uid()::text
      )
    )
  );

CREATE POLICY "Users can insert own cost logs" ON cost_logs
  FOR INSERT WITH CHECK (
    rule_id IN (
      SELECT id FROM keyword_rules WHERE user_id IN (
        SELECT id FROM users WHERE x_user_id = auth.uid()::text
      )
    )
  ); 