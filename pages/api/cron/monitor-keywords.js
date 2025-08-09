import { supabaseAdmin } from '../../../lib/supabase'
import { searchTweetsByKeyword, formatTweetForSMS } from '../../../lib/twitter-api'
import { sendSMSNotification, formatKeywordAlertSMS, formatPhoneNumber } from '../../../lib/twilio'

export default async function handler(req, res) {
  // Verify this is a legitimate cron request (optional security)
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🔄 Starting keyword monitoring cron job...')

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

    const results = []
    let totalSmsSent = 0

    for (const alert of alerts) {
      try {
        const user = alert.users
        
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
        
        // Check if user has alerts credits remaining
        if (alertsUsed >= alertsLimit) {
          console.log(`⚠️ User ${user.x_user_id} has reached alerts limit (${alertsUsed}/${alertsLimit})`)
          continue
        }

        // Check if user has a valid phone number
        if (!user.phone || !user.phone.trim()) {
          console.log(`⚠️ User ${user.x_user_id} has no phone number`)
          continue
        }

        // Search for tweets containing the keyword
        const tweetsData = await searchTweetsByKeyword(alert.query_string, alert.last_match_at)
        
        if (!tweetsData.data || tweetsData.data.length === 0) {
          console.log(`🔍 No new tweets found for keyword: "${alert.query_string}"`)
          continue
        }

        console.log(`🎯 Found ${tweetsData.data.length} new tweets for keyword: "${alert.query_string}"`)

        // Process each new tweet
        for (const tweet of tweetsData.data) {
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

            // Update last_match_at for this alert
            const { error: alertUpdateError } = await supabaseAdmin
              .from('alerts')
              .update({ last_match_at: new Date().toISOString() })
              .eq('id', alert.id)

            if (alertUpdateError) {
              console.error('❌ Error updating alert last_match_at:', alertUpdateError)
            }

            // Log the successful notification
            results.push({
              keyword: alert.query_string,
              tweetId: tweet.id,
              userPhone: formattedPhone,
              success: true
            })

            totalSmsSent++
            console.log(`✅ SMS sent for keyword "${alert.query_string}" to ${formattedPhone}`)

          } catch (tweetError) {
            console.error(`❌ Error processing tweet ${tweet.id}:`, tweetError)
            results.push({
              keyword: alert.query_string,
              tweetId: tweet.id,
              error: tweetError.message,
              success: false
            })
          }
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

    console.log(`🎉 Keyword monitoring completed. Processed ${results.length} notifications, sent ${totalSmsSent} SMS.`)

    res.status(200).json({
      success: true,
      message: 'Keyword monitoring completed',
      results: results,
      totalProcessed: results.length,
      totalSmsSent: totalSmsSent,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in keyword monitoring:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
} 