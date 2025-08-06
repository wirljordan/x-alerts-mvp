-- Add pending_plan field to track scheduled plan changes
-- This allows users to keep their current plan until end of billing period

-- Add the pending_plan column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS pending_plan TEXT CHECK (pending_plan IN ('free', 'starter', 'growth', 'pro'));

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_pending_plan ON users(pending_plan);
CREATE INDEX IF NOT EXISTS idx_users_subscription_cancel_at ON users(subscription_cancel_at);

-- Comment the columns
COMMENT ON COLUMN users.pending_plan IS 'Plan user will be moved to at end of billing period (for downgrades)';
COMMENT ON COLUMN users.subscription_cancel_at IS 'Date when subscription will be canceled or downgraded'; 