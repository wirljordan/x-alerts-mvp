-- Add business profiles table for AI auto-reply system
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  audience JSONB NOT NULL DEFAULT '[]',
  value_props JSONB NOT NULL DEFAULT '[]',
  tone JSONB NOT NULL DEFAULT '{"style": "casual", "emojis": "never"}',
  safe_topics JSONB NOT NULL DEFAULT '[]',
  avoid JSONB NOT NULL DEFAULT '["politics", "tragedy"]',
  starter_keywords JSONB NOT NULL DEFAULT '[]',
  plug_line TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add AI replies table to track generated replies
CREATE TABLE ai_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  tweet_text TEXT NOT NULL,
  generated_reply TEXT NOT NULL,
  relevance_score FLOAT,
  relevance_reason TEXT,
  posted_to_x BOOLEAN DEFAULT FALSE,
  x_reply_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  posted_at TIMESTAMP WITH TIME ZONE
);

-- Add TwitterAPI.io credentials table
CREATE TABLE x_api_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX idx_ai_replies_user_id ON ai_replies(user_id);
CREATE INDEX idx_ai_replies_rule_id ON ai_replies(rule_id);
CREATE INDEX idx_ai_replies_tweet_id ON ai_replies(tweet_id);
CREATE INDEX idx_ai_replies_created_at ON ai_replies(created_at);
CREATE INDEX idx_ai_replies_posted_to_x ON ai_replies(posted_to_x);
CREATE INDEX idx_x_api_credentials_user_id ON x_api_credentials(user_id);

-- Add unique constraint to ensure one business profile per user
ALTER TABLE business_profiles ADD CONSTRAINT unique_user_business_profile UNIQUE (user_id);

-- Add unique constraint to ensure one TwitterAPI.io credential per user
ALTER TABLE x_api_credentials ADD CONSTRAINT unique_user_x_credentials UNIQUE (user_id);

-- Add function to get business profile with fallback
CREATE OR REPLACE FUNCTION get_business_profile(user_uuid UUID)
RETURNS TABLE(
  summary TEXT,
  products JSONB,
  audience JSONB,
  value_props JSONB,
  tone JSONB,
  safe_topics JSONB,
  avoid JSONB,
  starter_keywords JSONB,
  plug_line TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.summary,
    bp.products,
    bp.audience,
    bp.value_props,
    bp.tone,
    bp.safe_topics,
    bp.avoid,
    bp.starter_keywords,
    bp.plug_line
  FROM business_profiles bp
  WHERE bp.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql; 