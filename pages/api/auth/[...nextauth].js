import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: '2.0',
      authorization: {
        url: 'https://x.com/i/oauth2/authorize',
        params: {
          scope: 'users.read tweet.read offline.access'
        }
      },
      token: {
        url: 'https://api.x.com/2/oauth2/token'
      },
      userinfo: {
        url: 'https://api.x.com/2/users/me'
      }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn successful:', { user: user?.name, profile: profile?.username })
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect called:', { url, baseUrl })
      // Always redirect to dashboard after successful login
      return `${baseUrl}/dashboard`
    },
    async session({ session, token }) {
      if (token.sub) {
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
  debug: true
})
