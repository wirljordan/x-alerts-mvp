-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only read/update their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (x_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (x_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (x_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Alerts table policies
-- Users can only access their own alerts
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM users 
            WHERE x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert own alerts" ON alerts
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM users 
            WHERE x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM users 
            WHERE x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can delete own alerts" ON alerts
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM users 
            WHERE x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Messages table policies
-- Users can only access messages for their own alerts
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        alert_id IN (
            SELECT a.id FROM alerts a
            JOIN users u ON a.user_id = u.id
            WHERE u.x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

CREATE POLICY "Users can insert own messages" ON messages
    FOR INSERT WITH CHECK (
        alert_id IN (
            SELECT a.id FROM alerts a
            JOIN users u ON a.user_id = u.id
            WHERE u.x_user_id = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );

-- Service role bypass (for server-side operations)
CREATE POLICY "Service role can access all data" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all alerts" ON alerts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can access all messages" ON messages
    FOR ALL USING (auth.role() = 'service_role'); 