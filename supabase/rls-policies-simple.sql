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

-- For now, allow all operations but we'll secure this properly later
-- This is a temporary measure to get RLS enabled without breaking the app

-- Users table - allow all operations for now
CREATE POLICY "Allow all users operations" ON users FOR ALL USING (true);

-- Keyword rules - allow all operations for now  
CREATE POLICY "Allow all keyword rules operations" ON keyword_rules FOR ALL USING (true);

-- Business profiles - allow all operations for now
CREATE POLICY "Allow all business profiles operations" ON business_profiles FOR ALL USING (true);

-- AI replies - allow all operations for now
CREATE POLICY "Allow all AI replies operations" ON ai_replies FOR ALL USING (true);

-- X API credentials - allow all operations for now
CREATE POLICY "Allow all API credentials operations" ON x_api_credentials FOR ALL USING (true);

-- Scout states - allow all operations for now
CREATE POLICY "Allow all scout states operations" ON scout_states FOR ALL USING (true);

-- Rule states - allow all operations for now
CREATE POLICY "Allow all rule states operations" ON rule_states FOR ALL USING (true);

-- Seen cache - allow all operations for now
CREATE POLICY "Allow all seen cache operations" ON seen_cache FOR ALL USING (true);

-- Alert logs - allow all operations for now
CREATE POLICY "Allow all alert logs operations" ON alert_logs FOR ALL USING (true);

-- Cost logs - allow all operations for now
CREATE POLICY "Allow all cost logs operations" ON cost_logs FOR ALL USING (true); 