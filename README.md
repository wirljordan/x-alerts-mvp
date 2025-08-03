# X Alerts MVP

A real-time X (Twitter) alert system that sends SMS notifications when your keywords appear on the platform. Built with Next.js, Supabase, and Twilio.

## Features

- 🔐 **X OAuth Authentication** - Secure login with X accounts
- 📱 **SMS Notifications** - Real-time alerts via Twilio
- 🎯 **Smart Filtering** - Use X's search operators for precise alerts
- 📊 **Usage Tracking** - Monitor SMS usage and limits
- 💳 **Stripe Integration** - Subscription billing with multiple plans
- 📈 **Dashboard** - Manage alerts and view usage statistics
- 🔔 **Webhook Integration** - Connect with Twilert for real-time monitoring

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Authentication**: NextAuth.js with X OAuth 2.0
- **Database**: Supabase (PostgreSQL)
- **SMS**: Twilio
- **Payments**: Stripe
- **Monitoring**: Twilert (external service)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd x_alerts_mvp_frontend
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env.local
```

Required environment variables:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# X (Twitter) OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Stripe
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_STARTER_PRICE_ID=your-starter-price-id
STRIPE_PRO_PRICE_ID=your-pro-price-id
STRIPE_TEAM_PRICE_ID=your-team-price-id

# Twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# Twilert
TWILERT_WEBHOOK_SECRET=your-twilert-webhook-secret
```

### 3. Database Setup

1. Create a Supabase project
2. Run the SQL schema from `supabase/schema.sql` in your Supabase SQL editor
3. Copy your Supabase URL and keys to `.env.local`

### 4. X OAuth Setup

1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Enable OAuth 2.0 with PKCE
4. Set callback URL to `http://localhost:3000/api/auth/callback/twitter`
5. Copy Client ID and Secret to `.env.local`

### 5. Stripe Setup

1. Create a Stripe account
2. Create three products with recurring prices:
   - Starter: $9/month
   - Pro: $29/month  
   - Team: $99/month
3. Copy the price IDs to `.env.local`

### 6. Twilio Setup

1. Create a Twilio account
2. Get a phone number for SMS
3. Copy Account SID, Auth Token, and phone number to `.env.local`

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## User Flow

1. **Landing Page** → User sees value proposition and logs in with X
2. **Onboarding** → 3-step wizard: goal selection → contact info → plan selection
3. **Dashboard** → View usage, manage alerts, create new alerts
4. **Alert Creation** → Set up search queries with test functionality
5. **Webhook Processing** → Twilert sends alerts to `/api/twilert` → Twilio sends SMS

## API Endpoints

- `POST /api/user/update` - Update user profile and plan
- `POST /api/stripe/create-checkout` - Create Stripe checkout session
- `POST /api/alerts/create` - Create new alert
- `GET /api/alerts/list` - List user's alerts
- `POST /api/alerts/toggle` - Pause/resume alert
- `DELETE /api/alerts/delete` - Delete alert
- `POST /api/alerts/test` - Test alert query (mock implementation)
- `POST /api/twilert` - Webhook for Twilert alerts

## Database Schema

### Users Table
- `id` (UUID) - Primary key
- `x_user_id` (TEXT) - X user ID
- `handle` (TEXT) - X username
- `phone` (TEXT) - SMS phone number
- `email` (TEXT) - Email address
- `plan` (TEXT) - Subscription plan
- `sms_limit` (INTEGER) - Monthly SMS limit
- `sms_used` (INTEGER) - SMS used this month

### Alerts Table
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to users
- `query_string` (TEXT) - X search query
- `feed_url` (TEXT) - Twilert feed URL
- `status` (TEXT) - 'active' or 'paused'
- `last_match_at` (TIMESTAMP) - Last matching tweet

### Messages Table
- `id` (UUID) - Primary key
- `alert_id` (UUID) - Foreign key to alerts
- `tweet_id` (TEXT) - X tweet ID
- `sent_via` (TEXT) - 'sms' or 'email'
- `sent_at` (TIMESTAMP) - When message was sent

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production

Update `NEXTAUTH_URL` and callback URLs to your production domain.

## Mobile Optimization

The app is fully optimized for mobile with:
- Responsive design using Tailwind CSS
- Touch-friendly buttons and forms
- Mobile-first navigation
- Optimized loading states

## Next Steps

After MVP launch, consider adding:
- Email notifications via SendGrid/Resend
- Quiet hours configuration
- Per-alert throttling
- Analytics and engagement tracking
- Slack/Discord integrations for team plans
- Advanced filtering options

## Support

For issues or questions, please check the documentation or create an issue in the repository.
