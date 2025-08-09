import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByMultipleKeywords, formatTweetForSMS, findMatchingKeyword } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Starting optimized keyword monitoring...')

    // Get all active keywords from the database
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('alerts')
      .select(`
        *,
        users!inner(
          id,
          x_user_id,
          phone,
          plan,
          sms_used,
          sms_limit
        )
      `)
      .eq('status', 'active')

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    console.log(`📊 Found ${alerts.length} active keywords to monitor`)

    if (alerts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No active keywords to monitor',
        totalProcessed: 0,
        totalSmsSent: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Extract keywords and user info
    const keywords = alerts.map(alert => alert.query_string)
    const user = alerts[0].users // All alerts belong to the same user

    // Handle both old SMS and new alerts fields during transition
    const alertsUsed = user.sms_used || 0
    let alertsLimit = 10 // Default to free plan

    // Calculate limits based on plan since alerts_limit column doesn't exist yet
    const planLimits = {
      'free': 10,
      'starter': 100,
      'growth': 300,
      'pro': 1000
    }
    alertsLimit = planLimits[user.plan] || 10

    // Check if user has alerts credits remaining - STOP BEFORE QUERY to save credits
    if (alertsUsed >= alertsLimit) {
      console.log(`⚠️ User ${user.x_user_id} has reached alerts limit (${alertsUsed}/${alertsLimit}) - skipping API call to save credits`)
      return res.status(200).json({
        success: true,
        message: 'User has reached alerts limit - no API call made',
        totalProcessed: 0,
        totalSmsSent: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Check if user has a valid phone number
    if (!user.phone || !user.phone.trim()) {
      console.log(`⚠️ User ${user.x_user_id} has no phone number`)
      return res.status(200).json({
        success: true,
        message: 'User has no phone number',
        totalProcessed: 0,
        totalSmsSent: 0,
        timestamp: new Date().toISOString()
      })
    }

    // Get the most recent last_match_at to use as since_id
    const lastMatchTimes = alerts
      .map(alert => alert.last_match_at)
      .filter(time => time !== null)
      .sort()
      .reverse()

    const sinceId = lastMatchTimes.length > 0 ? lastMatchTimes[0] : null
    
    // Dynamic max_results based on previous performance
    const maxResults = 5 // Default to 5, can be increased if needed

    // Single API call for all keywords with since_id
    console.log(`🚀 Making single API call for ${keywords.length} keywords with since_id: ${sinceId || 'none'}`)
    
    try {
      const tweetsData = await searchTweetsByMultipleKeywords(keywords, sinceId, maxResults)
      
      if (!tweetsData.data || tweetsData.data.length === 0) {
        console.log(`🔍 No new tweets found for any keywords`)
        return res.status(200).json({
          success: true,
          message: 'No new tweets found',
          totalProcessed: 0,
          totalSmsSent: 0,
          timestamp: new Date().toISOString()
        })
      }

      console.log(`🎯 Found ${tweetsData.data.length} tweets, checking for keyword matches`)

      // Process tweets and find matches
      for (const tweet of tweetsData.data) {
        const matchingKeyword = findMatchingKeyword(tweet.text, keywords)
        
        if (matchingKeyword) {
          console.log(`✅ Found match for keyword: "${matchingKeyword}" in tweet ${tweet.id}`)
          
          try {
            // Find the user data for this tweet
            const tweetUser = tweetsData.includes?.users?.find(u => u.id === tweet.author_id)
            
            if (!tweetUser) {
              console.log(`⚠️ Could not find user data for tweet ${tweet.id}`)
              continue
            }

            // Format tweet data for SMS
            const tweetData = formatTweetForSMS(tweet, tweetUser)
            
            // Format SMS message
            const smsMessage = formatKeywordAlertSMS(matchingKeyword, tweetData)
            
            // Format phone number for Twilio
            const formattedPhone = formatPhoneNumber(user.phone)
            
            // Send SMS notification immediately
            await sendSMSNotification(formattedPhone, smsMessage)
            
            // Update alerts usage (handle both old and new field names)
            const newAlertsUsed = alertsUsed + 1
            const updateData = { sms_used: newAlertsUsed }
            
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update(updateData)
              .eq('id', user.id)

            if (updateError) {
              console.error('❌ Error updating SMS usage:', updateError)
            }

            // Update last_match_at for the matching alert
            const matchingAlert = alerts.find(alert => alert.query_string === matchingKeyword)
            if (matchingAlert) {
              const { error: alertUpdateError } = await supabaseAdmin
                .from('alerts')
                .update({ last_match_at: new Date().toISOString() })
                .eq('id', matchingAlert.id)

              if (alertUpdateError) {
                console.error('❌ Error updating alert last_match_at:', alertUpdateError)
              }
            }

            console.log(`🎉 SMS sent successfully for keyword: "${matchingKeyword}"`)

            return res.status(200).json({
              success: true,
              message: 'SMS sent successfully',
              results: [{
                keyword: matchingKeyword,
                tweetId: tweet.id,
                author: tweetUser.username,
                success: true
              }],
              totalProcessed: 1,
              totalSmsSent: 1,
              timestamp: new Date().toISOString()
            })

          } catch (tweetError) {
            console.error(`❌ Error processing tweet ${tweet.id}:`, tweetError)
          }
        }
      }

      console.log(`🔍 No matching keywords found in ${tweetsData.data.length} tweets`)

      return res.status(200).json({
        success: true,
        message: 'No matching keywords found',
        totalProcessed: tweetsData.data.length,
        totalSmsSent: 0,
        timestamp: new Date().toISOString()
      })

    } catch (apiError) {
      console.error('❌ Error in Twitter API call:', apiError)
      return res.status(500).json({
        error: 'Twitter API error',
        details: apiError.message
      })
    }

  } catch (error) {
    console.error('❌ Error in optimized keyword monitoring:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}