# Database Setup Instructions

## Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Sign in and select your project: `lfvokdiatflpxnohmofo`

## Step 2: Run SQL Setup
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `supabase/setup.sql`
4. Click **Run** to execute the SQL

## Step 3: Verify Tables Created
1. Go to **Table Editor** in your Supabase dashboard
2. You should see these tables:
   - `users` - Stores user profiles and onboarding data
   - `alerts` - Stores keyword alerts
   - `messages` - Stores sent notifications

## Step 4: Test the Setup
1. Try the onboarding flow
2. Check that user data is saved to the `users` table
3. Verify the dashboard loads real data from Supabase

## Environment Variables Added
The following variables have been added to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://lfvokdiatflpxnohmofo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Next Steps
1. Add these same environment variables to your Vercel project
2. Test the complete onboarding flow
3. Verify data persistence across sessions 