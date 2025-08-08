import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByKeyword, formatTweetForSMS } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

// Helper function to add delay between API calls
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧪 Starting test keyword monitoring...')

    // Get all active keywords from the database
    const { data: alerts, error: alertsError } = await supabaseAdmin
      .from('alerts')
      .select(`
        *,
        users!inner(
          id,
          x_user_id,
          phone,
          sms_used,
          sms_limit,
          plan
        )
      `)
      .eq('status', 'active')

    if (alertsError) {
      console.error('❌ Error fetching alerts:', alertsError)
      return res.status(500).json({ error: 'Failed to fetch alerts' })
    }

    console.log(`📊 Found ${alerts.length} active keywords to monitor`)

    const results = []
    let totalSmsSent = 0
    const usersNotified = new Set() // Track users who have been notified this cycle

    for (const alert of alerts) {
      try {
        const user = alert.users
        
        // Check if user has SMS credits remaining
        if (user.sms_used >= user.sms_limit) {
          console.log(`⚠️ User ${user.x_user_id} has reached SMS limit (${user.sms_used}/${user.sms_limit})`)
          continue
        }

        // Check if user has a valid phone number
        if (!user.phone || !user.phone.trim()) {
          console.log(`⚠️ User ${user.x_user_id} has no phone number`)
          continue
        }

        // Check if user has already been notified this cycle (rate limiting)
        if (usersNotified.has(user.id)) {
          console.log(`⚠️ User ${user.x_user_id} already notified this cycle, skipping`)
          continue
        }

        // Add longer delay between API calls to avoid rate limiting (3 seconds)
        console.log(`⏳ Waiting 3 seconds before API call for keyword: "${alert.query_string}"`)
        await delay(3000)

        // Search for tweets containing the keyword
        const tweetsData = await searchTweetsByKeyword(alert.query_string, alert.last_match_at)
        
        if (!tweetsData.data || tweetsData.data.length === 0) {
          console.log(`🔍 No new tweets found for keyword: "${alert.query_string}"`)
          continue
        }

        console.log(`🎯 Found ${tweetsData.data.length} new tweets for keyword: "${alert.query_string}"`)

        // Only process the first tweet to avoid spam (rate limiting)
        const tweet = tweetsData.data[0]
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
          const smsMessage = formatKeywordAlertSMS(alert.query_string, tweetData)
          
          // Format phone number for Twilio
          const formattedPhone = formatPhoneNumber(user.phone)
          
          // Send SMS notification
          await sendSMSNotification(formattedPhone, smsMessage)
          
          // Mark user as notified for this cycle
          usersNotified.add(user.id)
          
          // Update SMS usage
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ sms_used: user.sms_used + 1 })
            .eq('id', user.id)

          if (updateError) {
            console.error('❌ Error updating SMS usage:', updateError)
          }

          // Update last_match_at for this alert
          const { error: alertUpdateError } = await supabaseAdmin
            .from('alerts')
            .update({ last_match_at: new Date().toISOString() })
            .eq('id', alert.id)

          if (alertUpdateError) {
            console.error('❌ Error updating alert last_match_at:', alertUpdateError)
          }

          totalSmsSent++
          results.push({
            keyword: alert.query_string,
            tweetId: tweet.id,
            author: tweetUser.username,
            success: true
          })

        } catch (tweetError) {
          console.error(`❌ Error processing tweet ${tweet.id}:`, tweetError)
          results.push({
            keyword: alert.query_string,
            tweetId: tweet.id,
            error: tweetError.message,
            success: false
          })
        }

      } catch (alertError) {
        console.error(`❌ Error processing alert ${alert.id}:`, alertError)
        results.push({
          keyword: alert.query_string,
          error: alertError.message,
          success: false
        })
      }
    }

    console.log(`🎉 Test keyword monitoring completed. Processed ${results.length} notifications, sent ${totalSmsSent} SMS.`)

    res.status(200).json({
      success: true,
      message: 'Test keyword monitoring completed',
      results: results,
      totalProcessed: results.length,
      totalSmsSent: totalSmsSent,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in test keyword monitoring:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
}