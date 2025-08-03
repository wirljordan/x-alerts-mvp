import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: '2.0'
    })
  ],
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn callback:', { user, account, profile })
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect callback:', { url, baseUrl })
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/dashboard'
    },
    async session({ session, token }) {
      console.log('Session callback:', { session, token })
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
      console.log('JWT callback:', { token, account, profile })
      if (account && profile) {
        token.sub = profile.id
        token.screen_name = profile.username
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
})
