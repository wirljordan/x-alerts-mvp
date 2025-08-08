/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force Vercel deployment - test buttons must be visible
  reactStrictMode: true,
  swcMinify: true,
  
  // Production optimizations
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image optimization
  images: {
    domains: ['pbs.twimg.com', 'abs.twimg.com', 'lfvokdiatflpxnohmofo.supabase.co'],
  },
}

module.exports = nextConfig
