-- Check database timezone settings and user table structure
-- This will help identify if there's a timezone-related issue

-- Check current database timezone
SELECT 
  'Database Timezone' as setting,
  current_setting('timezone') as value
UNION ALL
SELECT 
  'Session Timezone' as setting,
  current_setting('session_timezone') as value
UNION ALL
SELECT 
  'System Timezone' as setting,
  current_setting('system_timezone') as value;

-- Check if users table exists and its structure
SELECT 
  'Table Exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
  ) as result
UNION ALL
SELECT 
  'Timezone Column Exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'timezone'
  ) as result
UNION ALL
SELECT 
  'Quiet Hours Start Column Exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'quiet_hours_start'
  ) as result
UNION ALL
SELECT 
  'Quiet Hours End Column Exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'quiet_hours_end'
  ) as result;

-- Check current user data to see if any users have timezone set
SELECT 
  'Users with timezone set' as info,
  COUNT(*) as count
FROM users 
WHERE timezone IS NOT NULL
UNION ALL
SELECT 
  'Total users' as info,
  COUNT(*) as count
FROM users; 