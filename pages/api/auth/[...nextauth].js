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
          response_type: 'code'
        }
      },
      token: {
        url: 'https://api.x.com/2/oauth2/token'
      },
      userinfo: {
        url: 'https://api.x.com/2/users/me',
        async request({ tokens, provider }) {
          const response = await fetch(provider.userinfo.url, {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          })
          return await response.json()
        },
      },
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: profile.data.email,
          image: profile.data.profile_image_url,
          username: profile.data.username,
        }
      },
    }
  ],
  pages: {
    signIn: '/login',
    error: '/login'
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('SignIn successful:', { user: user?.name, username: user?.username })
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
        session.user.handle = token.username || 'user'
        session.user.plan = 'starter'
        session.user.sms_limit = 300
        session.user.sms_used = 0
      }
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
