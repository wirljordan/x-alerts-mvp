// TwitterAPI.io integration for posting replies
export class TwitterAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = 'https://api.twitterapi.io'
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`TwitterAPI.io error: ${response.status} - ${errorData.message || response.statusText}`)
    }

    return response.json()
  }

  // Post a reply to a tweet
  async postReply(tweetId, replyText) {
    try {
      const response = await this.makeRequest('/twitter/tweet/create', {
        method: 'POST',
        body: JSON.stringify({
          text: replyText,
          reply: {
            in_reply_to_tweet_id: tweetId
          }
        })
      })

      return {
        success: true,
        tweetId: response.data?.id || response.id,
        text: response.data?.text || response.text
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
      const response = await this.makeRequest('/twitter/user/me')
      return {
        success: true,
        user: response.data || response
      }
    } catch (error) {
      console.error('Error getting user info via TwitterAPI.io:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Verify if API key is valid
  async verifyCredentials() {
    try {
      const response = await this.makeRequest('/twitter/user/me')
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

// Helper function to get TwitterAPI.io client for a user
export async function getTwitterAPIClientForUser(userId, supabase) {
  try {
    // Use the system's TwitterAPI.io API key from environment
    const apiKey = process.env.TWITTER_API_KEY
    
    if (!apiKey) {
      throw new Error('TwitterAPI.io API key not configured')
    }

    return new TwitterAPIClient(apiKey)
  } catch (error) {
    console.error('Error getting TwitterAPI.io client:', error)
    throw error
  }
}

// Helper function to post reply and log it
export async function postReplyAndLog(userId, ruleId, tweetId, tweetText, replyText, supabase) {
  try {
    // Get TwitterAPI.io client
    const twitterClient = await getTwitterAPIClientForUser(userId, supabase)
    
    // Post reply
    const result = await twitterClient.postReply(tweetId, replyText)
    
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