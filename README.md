# EarlyReply.app - X Authentication MVP

A Next.js application for X (Twitter) OAuth authentication, optimized for mobile users.

## Features

- ✅ X OAuth 2.0 authentication with PKCE
- ✅ Mobile-optimized UI
- ✅ Secure session management
- ✅ Error handling and user feedback
- ✅ Ready for earlyreply.app integration

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and configure your X API credentials:

```bash
cp .env.example .env.local
```

Required variables:
```env
# X (Twitter) OAuth - REQUIRED
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret
```

### 2. X API Setup

1. Go to [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Configure OAuth 2.0 settings:
   - **App permissions**: Read
   - **Type of App**: Web App
   - **Callback URLs**: 
     - `http://localhost:3000/api/auth/x-callback` (development)
     - `https://earlyreply.app/api/auth/x-callback` (production)
   - **Website URL**: `https://earlyreply.app`
4. Copy the Client ID and Client Secret to your `.env.local`

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Production Deployment (earlyreply.app)

### 1. Deploy to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin main
   ```

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository
   - Configure the project settings

3. **Set Environment Variables in Vercel**:
   - Go to Project Settings → Environment Variables
   - Add the following variables:
     ```
     TWITTER_CLIENT_ID=your-production-twitter-client-id
     TWITTER_CLIENT_SECRET=your-production-twitter-client-secret
     ```

4. **Configure Custom Domain**:
   - Go to Project Settings → Domains
   - Add `earlyreply.app` as your custom domain
   - Configure DNS settings as instructed by Vercel

### 2. Update X Developer App for Production

1. **Update Callback URLs**:
   - Go to your X Developer Portal
   - Add `https://earlyreply.app/api/auth/x-callback` to your OAuth 2.0 callback URLs
   - Update Website URL to `https://earlyreply.app`

2. **Test Production OAuth**:
   - Visit `https://earlyreply.app`
   - Test the sign-in flow
   - Verify user data is pulled correctly

### 3. SSL and Security

The application automatically handles:
- ✅ HTTPS redirects in production
- ✅ Secure cookie settings
- ✅ CSRF protection
- ✅ PKCE OAuth flow

## OAuth Flow

1. User clicks "Sign in with X"
2. Redirected to X OAuth with PKCE challenge
3. User authorizes the app
4. X redirects back with authorization code
5. App exchanges code for access token
6. App fetches user info and creates session
7. User redirected to success page

## Security Features

- ✅ PKCE (Proof Key for Code Exchange)
- ✅ State parameter for CSRF protection
- ✅ Secure cookie settings
- ✅ HttpOnly cookies for session data
- ✅ Proper error handling

## Mobile Optimization

- ✅ Responsive design
- ✅ Touch-friendly buttons
- ✅ Optimized for small screens
- ✅ Fast loading times

## API Endpoints

- `GET /api/auth/x-oauth` - Initiates OAuth flow
- `GET /api/auth/x-callback` - Handles OAuth callback
- `GET /` - Main landing page
- `GET /success` - Success page after authentication

## Troubleshooting

### Common Issues

1. **"Cannot access 'state' before initialization"**
   - Fixed: Proper variable declaration order

2. **"Code verifier did not match the code challenge"**
   - Fixed: Improved PKCE implementation

3. **"User info failed"**
   - Fixed: Added fallback user data and better error handling

4. **403 Forbidden on user info**
   - Fixed: Added proper API headers and fallback handling

### Production Issues

1. **OAuth Callback Fails**:
   - Ensure callback URL is exactly `https://earlyreply.app/api/auth/x-callback`
   - Check environment variables are set in Vercel

2. **Domain Issues**:
   - Verify DNS is configured correctly
   - Ensure SSL certificate is active

3. **Session Issues**:
   - Check cookie domain settings
   - Verify SameSite cookie policy

### Debug Mode

The app includes detailed logging for debugging OAuth issues. Check the console for:
- OAuth URLs being generated
- Token exchange responses
- User info API calls
- Cookie parsing

## Next Steps

This MVP provides a solid foundation for earlyreply.app. Next features could include:

- Database integration (Supabase)
- User preferences and settings
- X post monitoring
- Notification system
- Payment integration (Stripe)

## License

MIT
