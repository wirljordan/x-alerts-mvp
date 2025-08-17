-- Add company_name and website_url fields to business_profiles table
ALTER TABLE business_profiles 
ADD COLUMN company_name TEXT,
ADD COLUMN website_url TEXT;

-- Add index for company name searches
CREATE INDEX idx_business_profiles_company_name ON business_profiles(company_name);

-- Update the get_business_profile function to include new fields
CREATE OR REPLACE FUNCTION get_business_profile(user_uuid UUID)
RETURNS TABLE(
  company_name TEXT,
  website_url TEXT,
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
    bp.company_name,
    bp.website_url,
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