// Helper function to get X OAuth client for a user
export async function getXAPIClientForUser(userId, supabase) {
  try {
    console.log('🔍 Getting X API client for userId:', userId)
    
    // Try to find user by UUID first, then by x_user_id
    let userData, userError
    
    // First try: look for UUID
    const { data: uuidData, error: uuidError } = await supabase
      .from('users')
      .select('id, x_user_id, x_oauth_access_token')
      .eq('id', userId)
      .single()
    
    if (!uuidError && uuidData) {
      userData = uuidData
      console.log('✅ Found user by UUID:', userData.id)
    } else {
      // Second try: look for x_user_id
      const { data: xUserIdData, error: xUserIdError } = await supabase
        .from('users')
        .select('id, x_user_id, x_oauth_access_token')
        .eq('x_user_id', userId)
        .single()
      
      if (!xUserIdError && xUserIdData) {
        userData = xUserIdData
        console.log('✅ Found user by x_user_id:', userData.x_user_id)
      } else {
        userError = xUserIdError
      }
    }

    if (userError || !userData) {
      console.error('❌ User not found for userId:', userId)
      throw new Error('User not found')
    }

    if (!userData.x_oauth_access_token) {
      console.error('❌ No access token for user:', userData.id)
      throw new Error('X OAuth access token not found for user')
    }

    console.log('✅ Access token found, length:', userData.x_oauth_access_token.length)
    return new XAPIClient(userData.x_oauth_access_token)
  } catch (error) {
    console.error('Error getting X API client:', error)
    throw error
  }
}

// X API client using TwitterAPI.io for posting
export class XAPIClient {
  constructor(accessToken) {
    this.accessToken = accessToken
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
      
      // Use the correct TwitterAPI.io endpoint for creating tweets
      const response = await this.makeRequest('/twitter/create_tweet_v2', {
        method: 'POST',
        body: JSON.stringify({
          tweet_text: replyText,
          reply_to_tweet_id: tweetId,
          login_cookies: process.env.TWITTERAPI_LOGIN_COOKIES || '' // We'll need to get this from user login
        })
      })

      console.log('✅ TwitterAPI.io response:', response)

      return {
        success: true,
        tweetId: response.tweet_id || response.data?.id,
        text: replyText
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