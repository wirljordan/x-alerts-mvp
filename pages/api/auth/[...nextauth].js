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
          scope: 'users.read tweet.read offline.access',
          response_type: 'code',
          code_challenge_method: 'S256'
        }
      },
      token: {
        url: 'https://api.x.com/2/oauth2/token'
      },
      userinfo: {
        url: 'https://api.x.com/2/users/me',
        params: {
          'user.fields': 'id,name,username,profile_image_url,verified'
        }
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
          verified: profile.data?.verified || false,
        }
      },
    }
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn successful:', { 
        user: user?.name, 
        username: user?.username,
        provider: account?.provider 
      })
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log('Redirect called:', { url, baseUrl })
      // Always redirect to dashboard after successful login
      return `${baseUrl}/dashboard`
    },
    async session({ session, token }) {
      session.user.id = token.sub || '123'
      session.user.handle = token.username || 'user'
      session.user.plan = 'starter'
      session.user.sms_limit = 300
      session.user.sms_used = 0
      session.user.verified = token.verified || false
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.data?.id || profile.id
        token.username = profile.data?.username || profile.username
        token.verified = profile.data?.verified || profile.verified || false
      }
      return token
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
})
