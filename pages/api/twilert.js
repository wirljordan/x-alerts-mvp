import { supabaseAdmin } from '../../lib/supabase'
import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify webhook signature (basic implementation)
  const signature = req.headers['x-twilert-signature']
  if (signature !== process.env.TWILERT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { alert_id, tweet_id, tweet_text, tweet_url, user_handle } = req.body

    if (!alert_id || !tweet_id) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get alert details
    const { data: alert, error: alertError } = await supabaseAdmin
      .from('alerts')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('id', alert_id)
      .eq('status', 'active')
      .single()

    if (alertError || !alert) {
      console.error('Alert not found or inactive:', alert_id)
      return res.status(404).json({ error: 'Alert not found' })
    }

    const user = alert.users

    // Check if message already sent (deduplication)
    const { data: existingMessage } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('tweet_id', tweet_id)
      .eq('alert_id', alert_id)
      .single()

    if (existingMessage) {
      console.log('Message already sent for tweet:', tweet_id)
      return res.status(200).json({ message: 'Already processed' })
    }

    // Check SMS usage limit
    if (user.sms_used >= user.sms_limit) {
      console.log('SMS limit reached for user:', user.id)
      return res.status(429).json({ error: 'SMS limit reached' })
    }

    // Check quiet hours (basic implementation - 10 PM to 8 AM UTC)
    const now = new Date()
    const hour = now.getUTCHours()
    if (hour >= 22 || hour < 8) {
      console.log('Quiet hours - skipping notification')
      return res.status(200).json({ message: 'Quiet hours' })
    }

    // Send SMS
    if (user.phone) {
      try {
        const message = `🚨 X Alert: ${user_handle} tweeted: "${tweet_text.substring(0, 100)}${tweet_text.length > 100 ? '...' : ''}"\n\nView: ${tweet_url}`
        
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: user.phone
        })

        // Record message
        await supabaseAdmin
          .from('messages')
          .insert({
            alert_id: alert_id,
            tweet_id: tweet_id,
            sent_via: 'sms'
          })

        // Update SMS usage
        await supabaseAdmin
          .from('users')
          .update({ sms_used: user.sms_used + 1 })
          .eq('id', user.id)

        // Update alert last match
        await supabaseAdmin
          .from('alerts')
          .update({ last_match_at: new Date().toISOString() })
          .eq('id', alert_id)

        console.log('SMS sent successfully for alert:', alert_id)
      } catch (twilioError) {
        console.error('Twilio error:', twilioError)
        return res.status(500).json({ error: 'Failed to send SMS' })
      }
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 