# X Alerts MVP Frontend

A Next.js application for X (Twitter) alerts with OAuth authentication.

## Features

- ✅ X OAuth Authentication
- ✅ User Profile Management
- ✅ Mobile-Optimized UI
- ✅ Session Management
- ✅ Secure Token Handling

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Authentication**: X OAuth 2.0 with PKCE
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- X Developer Account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd x_alerts_mvp_frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# X (Twitter) OAuth
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Other services (optional)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## X OAuth Setup

1. Go to the [X Developer Portal](https://developer.x.com/)
2. Create a new app or use an existing one
3. Configure OAuth 2.0 settings:
   - Callback URL: `http://localhost:3000/api/auth/x-callback` (development)
   - Callback URL: `https://your-domain.vercel.app/api/auth/x-callback` (production)
4. Add the required scopes: `tweet.read`, `users.read`, `offline.access`
5. Copy your Client ID and Client Secret to `.env.local`

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:
- `TWITTER_CLIENT_ID`
- `TWITTER_CLIENT_SECRET`
- Update your X app's callback URL to your production domain

## Project Structure

```
├── pages/
│   ├── api/
│   │   └── auth/
│   │       ├── x-oauth.js      # OAuth initiation
│   │       └── x-callback.js   # OAuth callback
│   ├── index.js                # Landing page
│   └── success.js              # Success page
├── styles/
│   └── globals.css             # Global styles
└── public/                     # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
