// Helper function to get X OAuth client for a user
export async function getXAPIClientForUser(userId, supabase) {
  try {
    console.log('🔍 Getting X API client for userId:', userId)
    
    // Try to find user's assigned Twitter account
    const { data: userAccount, error: accountError } = await supabase
      .from('user_account_assignments')
      .select(`
        twitter_account_id,
        twitter_accounts (
          id,
          username,
          encrypted_password,
          encrypted_email,
          encrypted_auth_token,
          encrypted_totp_secret
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (accountError || !userAccount) {
      console.log('🔄 No assigned account found, using system credentials')
      return new XAPIClient('system')
    }

    // Decrypt account credentials
    const { decryptAccountCredentials } = await import('./encryption.js')
    const decryptedAccount = decryptAccountCredentials(userAccount.twitter_accounts)
    
    if (!decryptedAccount.password || !decryptedAccount.email) {
      console.log('🔄 Invalid account credentials, using system credentials')
      return new XAPIClient('system')
    }

    console.log('✅ Using assigned account:', decryptedAccount.username)
    return new XAPIClient(decryptedAccount)
  } catch (error) {
    console.error('Error getting X API client:', error)
    // Fall back to system credentials
    return new XAPIClient('system')
  }
}

// X API client using TwitterAPI.io for posting
export class XAPIClient {
  constructor(credentials) {
    if (credentials === 'system') {
      // System-level credentials
      this.isSystem = true
      this.accessToken = null
    } else {
      // User-specific account credentials
      this.isSystem = false
      this.account = credentials
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `https://api.twitterapi.io${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': process.env.TWITTER_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`TwitterAPI.io error: ${response.status} - ${errorData.detail || response.statusText}`)
    }

    return response.json()
  }

  // Post a reply to a tweet using TwitterAPI.io
  async postReply(tweetId, replyText) {
    try {
      console.log('📝 Posting reply via TwitterAPI.io:', { tweetId, replyText })
      
      if (this.isSystem) {
        // Use system-level credentials
        const loginCookie = process.env.TWITTERAPI_LOGIN_COOKIES
        
        if (!loginCookie) {
          throw new Error('TwitterAPI.io login cookie not found in environment variables. Please set TWITTERAPI_LOGIN_COOKIES.')
        }
        
        // Use the correct TwitterAPI.io endpoint for creating tweets
        const response = await this.makeRequest('/twitter/create_tweet_v2', {
          method: 'POST',
          body: JSON.stringify({
            tweet_text: replyText,
            reply_to_tweet_id: tweetId,
            login_cookies: loginCookie
          })
        })

        console.log('✅ TwitterAPI.io response (system):', response)

        return {
          success: true,
          tweetId: response.tweet_id || response.data?.id,
          text: replyText
        }
      } else {
        // Use user-specific account credentials
        console.log('🔐 Logging into TwitterAPI.io with user account:', this.account.username)
        
        // First, login with user credentials
        const loginResponse = await this.makeRequest('/twitter/user_login_v2', {
          method: 'POST',
          body: JSON.stringify({
            user_name: this.account.username,
            email: this.account.email,
            password: this.account.password,
            totp_secret: this.account.totp_secret || ''
          })
        })

        if (!loginResponse.login_cookie) {
          throw new Error('Failed to login with user account')
        }

        console.log('✅ User account login successful')

        // Now post the reply using the user's login cookie
        const response = await this.makeRequest('/twitter/create_tweet_v2', {
          method: 'POST',
          body: JSON.stringify({
            tweet_text: replyText,
            reply_to_tweet_id: tweetId,
            login_cookies: loginResponse.login_cookie
          })
        })

        console.log('✅ TwitterAPI.io response (user account):', response)

        return {
          success: true,
          tweetId: response.tweet_id || response.data?.id,
          text: replyText
        }
      }
    } catch (error) {
      console.error('Error posting reply via TwitterAPI.io:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Get user information
  async getUserInfo() {
    try {
      const response = await this.makeRequest('/users/me')
      return {
        success: true,
        user: response.data || response
      }
    } catch (error) {
      console.error('Error getting user info via X API:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Verify if API key is valid
  async verifyCredentials() {
    try {
      const response = await this.makeRequest('/users/me')
      return {
        valid: true,
        user: response.data || response
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      }
    }
  }
}

// Helper function to post reply and log it
export async function postReplyAndLog(userId, ruleId, tweetId, tweetText, replyText, supabase) {
  try {
    // Get X API client
    const xClient = await getXAPIClientForUser(userId, supabase)
    
    // Post reply
    const result = await xClient.postReply(tweetId, replyText)
    
    if (result.success) {
      // Log the reply in database
      const { error: logError } = await supabase
        .from('ai_replies')
        .insert({
          user_id: userId,
          rule_id: ruleId,
          tweet_id: tweetId,
          tweet_text: tweetText,
          generated_reply: replyText,
          posted_to_x: true,
          x_reply_id: result.tweetId,
          posted_at: new Date().toISOString()
        })

      if (logError) {
        console.error('Error logging AI reply:', logError)
      }

      return {
        success: true,
        replyId: result.tweetId,
        replyText: result.text
      }
    } else {
      // Log failed attempt
      const { error: logError } = await supabase
        .from('ai_replies')
        .insert({
          user_id: userId,
          rule_id: ruleId,
          tweet_id: tweetId,
          tweet_text: tweetText,
          generated_reply: replyText,
          posted_to_x: false
        })

      if (logError) {
        console.error('Error logging failed AI reply:', logError)
      }

      return {
        success: false,
        error: result.error
      }
    }
  } catch (error) {
    console.error('Error in postReplyAndLog:', error)
    
    // Log error attempt
    try {
      await supabase
        .from('ai_replies')
        .insert({
          user_id: userId,
          rule_id: ruleId,
          tweet_id: tweetId,
          tweet_text: tweetText,
          generated_reply: replyText,
          posted_to_x: false
        })
    } catch (logError) {
      console.error('Error logging error AI reply:', logError)
    }

    return {
      success: false,
      error: error.message
    }
  }
} 