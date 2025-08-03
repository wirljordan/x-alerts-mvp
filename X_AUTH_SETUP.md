# X Authentication Setup Guide

## Prerequisites

1. **X Developer Account**: You need an X Developer account at [developer.x.com](https://developer.x.com)
2. **Node.js and npm**: Make sure you have Node.js installed
3. **Next.js project**: This guide assumes you're working with the existing Next.js project

## Step 1: Create an X Developer App

1. Go to [developer.x.com](https://developer.x.com)
2. Sign in with your X account
3. Apply for a developer account if you haven't already
4. Create a new app:
   - Click "Create App"
   - Fill in the app details
   - Select "Web App" as the app type
   - Add your website URL

## Step 2: Configure OAuth Settings

1. In your X app dashboard, go to "User authentication settings"
2. Enable OAuth 2.0
3. Set the following:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URLs**: `http://localhost:3000/api/auth/callback/x` (for development)
   - **Website URL**: `http://localhost:3000` (for development)
4. Save the settings

## Step 3: Get Your Credentials

1. In your X app dashboard, go to "Keys and tokens"
2. Copy your **Client ID** and **Client Secret**
3. Keep these secure - never commit them to version control

## Step 4: Set Up Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-in-production

# X OAuth Credentials
TWITTER_CLIENT_ID=your-x-client-id
TWITTER_CLIENT_SECRET=your-x-client-secret

# Other environment variables (if needed)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Step 5: Test the Authentication

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Go to `http://localhost:3000/login`

3. Click "Sign in with X"

4. You should be redirected to X's authorization page

5. After authorizing, you'll be redirected back to your dashboard

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI" error**:
   - Make sure the callback URL in your X app matches exactly: `http://localhost:3000/api/auth/callback/x`
   - Check that there are no trailing slashes

2. **"Client ID not found" error**:
   - Verify your `TWITTER_CLIENT_ID` is correct
   - Make sure the environment variable is loaded (restart your dev server)

3. **"Invalid client secret" error**:
   - Verify your `TWITTER_CLIENT_SECRET` is correct
   - Make sure there are no extra spaces or characters

4. **"NEXTAUTH_SECRET not set" error**:
   - Add a `NEXTAUTH_SECRET` to your `.env.local` file
   - You can generate one with: `openssl rand -base64 32`

### Debug Tools

- Visit `/debug-oauth` to see detailed debugging information
- Check the browser console for error messages
- Check the terminal where you're running the dev server for server-side errors

### Production Deployment

When deploying to production:

1. Update your X app's callback URL to your production domain
2. Update `NEXTAUTH_URL` to your production URL
3. Generate a new `NEXTAUTH_SECRET` for production
4. Set all environment variables in your hosting platform

## Security Notes

- Never commit your `.env.local` file to version control
- Use different X app credentials for development and production
- Regularly rotate your `NEXTAUTH_SECRET`
- Keep your X app credentials secure

## Next Steps

Once authentication is working:

1. Customize the user profile data you collect
2. Add user data to your database
3. Implement user-specific features
4. Add logout functionality
5. Handle authentication errors gracefully 