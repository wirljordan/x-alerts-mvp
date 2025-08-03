import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'
import { supabaseAdmin } from '../../../lib/supabase'

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
      version: '2.0' // OAuth 2.0 with PKCE
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'twitter') {
        try {
          // Check if user exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('x_user_id', profile.id)
            .single()

          if (!existingUser) {
            // Create new user
            const { error } = await supabaseAdmin
              .from('users')
              .insert({
                x_user_id: profile.id,
                handle: profile.username,
                email: profile.email
              })

            if (error) {
              console.error('Error creating user:', error)
              return false
            }
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    async session({ session, token }) {
      if (token.sub) {
        try {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id, handle, plan, sms_limit, sms_used')
            .eq('x_user_id', token.sub)
            .single()

          if (user) {
            session.user.id = user.id
            session.user.handle = user.handle
            session.user.plan = user.plan
            session.user.sms_limit = user.sms_limit
            session.user.sms_used = user.sms_used
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
      return session
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.id
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
})
