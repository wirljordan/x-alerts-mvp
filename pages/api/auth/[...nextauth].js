import NextAuth from 'next-auth'

export default NextAuth({
  providers: [
    {
      id: 'x',
      name: 'X',
      type: 'oauth',
      authorization: {
        url: 'https://x.com/i/oauth2/authorize',
        params: {
          scope: 'users.read tweet.read',
          response_type: 'code'
        }
      },
      token: {
        url: 'https://api.x.com/2/oauth2/token'
      },
      userinfo: {
        url: 'https://api.x.com/2/users/me'
      },
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.data?.id || '123',
          name: profile.data?.name || 'X User',
          email: profile.data?.email || 'user@example.com',
          image: profile.data?.profile_image_url || '',
          username: profile.data?.username || 'user',
        }
      },
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn successful:', { user: user?.name, username: user?.username })
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect called:', { url, baseUrl })
      // Force redirect to dashboard
      return `${baseUrl}/dashboard`
    },
    async session({ session, token }) {
      session.user.id = token.sub || '123'
      session.user.handle = token.username || 'user'
      session.user.plan = 'starter'
      session.user.sms_limit = 300
      session.user.sms_used = 0
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.id
        token.username = profile.username
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true
})
