# EarlyReply - X Alerts MVP

A Next.js application for managing X (Twitter) alerts and notifications with OAuth authentication.

## 🌐 **Live Demo**

Visit: [https://earlyreply.app](https://earlyreply.app)

## ✨ **Features**

- **X OAuth Authentication**: Secure login with X (Twitter) accounts
- **User Profile Management**: View and manage user information
- **Mobile-Optimized**: Responsive design optimized for mobile devices
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS

## 🛠 **Tech Stack**

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Authentication**: X (Twitter) OAuth 2.0 with PKCE
- **Deployment**: Vercel
- **Domain**: Custom domain (earlyreply.app)

## 🚀 **Getting Started**

### Prerequisites

- Node.js 18+ 
- npm or yarn
- X Developer Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/wirljordan/x-alerts-mvp.git
   cd x-alerts-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and add your X Developer credentials:
   ```env
   TWITTER_CLIENT_ID=your-twitter-client-id
   TWITTER_CLIENT_SECRET=your-twitter-client-secret
   ```

4. **Configure X Developer App**
   - Go to [X Developer Portal](https://developer.x.com/portal)
   - Create a new app or use existing one
   - Set Callback URI to: `http://localhost:3000/api/auth/x-callback` (for local development)
   - Set Website URL to: `http://localhost:3000` (for local development)

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🌍 **Production Deployment**

### Vercel Deployment

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Add environment variables in Vercel dashboard
   - Deploy automatically on push

3. **Configure Custom Domain**
   - Add `earlyreply.app` in Vercel dashboard
   - Configure DNS settings as instructed

4. **Update X Developer App for Production**
   - Set Callback URI to: `https://earlyreply.app/api/auth/x-callback`
   - Set Website URL to: `https://earlyreply.app`

## 🔧 **Environment Variables**

| Variable | Description | Required |
|----------|-------------|----------|
| `TWITTER_CLIENT_ID` | X Developer App Client ID | ✅ |
| `TWITTER_CLIENT_SECRET` | X Developer App Client Secret | ✅ |

## 📱 **Mobile Optimization**

This application is specifically optimized for mobile devices:
- Responsive design that works on all screen sizes
- Touch-friendly interface elements
- Fast loading times
- Mobile-first CSS approach

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License.

## 🆘 **Support**

For support, please open an issue on GitHub or contact the development team.
