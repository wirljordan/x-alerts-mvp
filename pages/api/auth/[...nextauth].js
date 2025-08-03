import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      version: '2.0' // OAuth 2.0 with PKCE
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'twitter') {
        try {
          // For now, just return true to allow sign in
          // We'll add Supabase integration later
          return true
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (token.sub) {
        // Add basic user info to session
        session.user.id = token.sub
        session.user.handle = token.screen_name || 'user'
        session.user.plan = 'starter'
        session.user.sms_limit = 300
        session.user.sms_used = 0
      }
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.id
        token.screen_name = profile.username
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
})
