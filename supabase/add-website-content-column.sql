-- Add website_content column to business_profiles table
ALTER TABLE business_profiles
ADD COLUMN website_content TEXT;

-- Add index for performance
CREATE INDEX idx_business_profiles_website_content ON business_profiles(website_content);

-- Add comment for documentation
COMMENT ON COLUMN business_profiles.website_content IS 'Raw website content fetched for AI analysis'; 