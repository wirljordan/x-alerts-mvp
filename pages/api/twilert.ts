import type { NextApiRequest, NextApiResponse } from 'next'
import twilio from 'twilio'
import crypto from 'crypto'
import { validateTwilertPayload, type TwilertPayload } from '../../types/TwilertPayload'
import { isQuietHours } from '../../lib/quietHours'
import { checkAndInsertTweetId } from '../../lib/dedupe'
import { supabaseAdmin } from '../../lib/supabase'

// Initialize Twilio client
// TODO: Replace with actual environment variables
const twilioClient = twilio(
  process.env.TWILIO_SID || 'your_twilio_sid_here',
  process.env.TWILIO_AUTH || 'your_twilio_auth_token_here'
)

const FROM_NUMBER = process.env.TWILIO_FROM || '+1234567890'

// Twilert API Configuration
// TODO: Replace with actual Twilert API credentials
const TWILERT_API_KEY = process.env.TWILERT_API_KEY || 'your_twilert_api_key_here'
const TWILERT_WEBHOOK_SECRET = process.env.TWILERT_WEBHOOK_SECRET || 'your_twilert_webhook_secret_here'

interface TwilertResponse {
  received: number
  sent: number
  errors?: string[]
}

/**
 * Verify Twilert webhook signature
 */
function verifyTwilertSignature(req: NextApiRequest): boolean {
  try {
    const signature = req.headers['x-twilert-signature'] as string
    const timestamp = req.headers['x-twilert-timestamp'] as string
    
    if (!signature || !timestamp) {
      console.warn('Missing Twilert signature headers')
      return false
    }

    // Create expected signature
    const payload = JSON.stringify(req.body)
    const expectedSignature = crypto
      .createHmac('sha256', TWILERT_WEBHOOK_SECRET)
      .update(`${timestamp}.${payload}`)
      .digest('hex')

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )

    if (!isValid) {
      console.warn('Invalid Twilert webhook signature')
    }

    return isValid
  } catch (error) {
    console.error('Error verifying Twilert signature:', error)
    return false
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TwilertResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify Twilert webhook signature
  if (!verifyTwilertSignature(req)) {
    return res.status(401).json({ error: 'Invalid webhook signature' })
  }

  let receivedCount = 0
  let sentCount = 0
  const errors: string[] = []

  try {
    // Validate the webhook payload
    const payload: TwilertPayload = validateTwilertPayload(req.body)
    receivedCount++

    console.log('Processing Twilert webhook:', {
      tweetId: payload.tweet.id,
      userId: payload.user.id,
      alertName: payload.alert.name
    })

    // 1. Deduplicate - check if tweet already exists
    const isNewTweet = await checkAndInsertTweetId(payload.tweet.id, payload.user.id)
    if (!isNewTweet) {
      console.log('Tweet already processed, skipping:', payload.tweet.id)
      return res.status(200).json({ received: receivedCount, sent: sentCount })
    }

    // 2. Quiet hours check
    if (isQuietHours(payload.user)) {
      console.log('User in quiet hours, storing but not sending SMS:', payload.user.id)
      await storeMessageRecord(payload, false)
      return res.status(200).json({ received: receivedCount, sent: sentCount })
    }

    // 3. SMS quota check
    if (payload.user.sms_used >= payload.user.sms_limit) {
      console.log('User at SMS limit, storing but not sending SMS:', payload.user.id)
      await storeMessageRecord(payload, false)
      return res.status(200).json({ received: receivedCount, sent: sentCount })
    }

    // 4. Send SMS via Twilio
    const smsSent = await sendSMS(payload)
    if (smsSent) {
      sentCount++
    }

    // 5. Store the message record
    await storeMessageRecord(payload, smsSent)

    // 6. Increment SMS usage if SMS was sent
    if (smsSent) {
      await incrementSMSUsage(payload.user.id)
    }

    console.log('Twilert webhook processed successfully:', {
      tweetId: payload.tweet.id,
      smsSent,
      received: receivedCount,
      sent: sentCount
    })

    return res.status(200).json({ 
      received: receivedCount, 
      sent: sentCount,
      ...(errors.length > 0 && { errors })
    })

  } catch (error) {
    console.error('Error processing Twilert webhook:', error)
    
    if (error instanceof Error) {
      errors.push(error.message)
    } else {
      errors.push('Unknown error occurred')
    }

    return res.status(200).json({ 
      received: receivedCount, 
      sent: sentCount,
      errors 
    })
  }
}

/**
 * Send SMS via Twilio
 */
async function sendSMS(payload: TwilertPayload): Promise<boolean> {
  try {
    // Format the SMS message
    const message = `EarlyReply alert:\n@${payload.tweet.author.handle}: ${payload.tweet.text_truncated}\nhttps://twitter.com/i/web/status/${payload.tweet.id}`

    // TODO: Get user's phone number from payload or database
    const toNumber = payload.user.phone
    if (!toNumber) {
      console.warn('No phone number found for user:', payload.user.id)
      return false
    }

    // Send SMS via Twilio
    const twilioMessage = await twilioClient.messages.create({
      body: message,
      from: FROM_NUMBER,
      to: toNumber
    })

    console.log('SMS sent successfully:', {
      messageId: twilioMessage.sid,
      to: toNumber,
      tweetId: payload.tweet.id
    })

    return true
  } catch (error) {
    console.error('Error sending SMS:', error)
    return false
  }
}

/**
 * Store message record in database
 */
async function storeMessageRecord(payload: TwilertPayload, smsSent: boolean): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('messages')
      .insert({
        user_id: payload.user.id,
        tweet_id: payload.tweet.id,
        alert_name: payload.alert.name,
        sent_via: smsSent ? 'sms' : 'stored_only',
        sent_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error storing message record:', error)
      throw new Error('Failed to store message record')
    }

    console.log('Message record stored successfully:', payload.tweet.id)
  } catch (error) {
    console.error('Error storing message record:', error)
    throw error
  }
}

/**
 * Increment user's SMS usage count
 */
async function incrementSMSUsage(userId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ 
        sms_used: supabaseAdmin.rpc('increment_sms_used', { user_uuid: userId })
      })
      .eq('id', userId)

    if (error) {
      console.error('Error incrementing SMS usage:', error)
      // Fallback to manual increment
      await manualIncrementSMSUsage(userId)
    }
  } catch (error) {
    console.error('Error incrementing SMS usage:', error)
    await manualIncrementSMSUsage(userId)
  }
}

/**
 * Manual SMS usage increment as fallback
 */
async function manualIncrementSMSUsage(userId: string): Promise<void> {
  try {
    // Get current usage
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('sms_used')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching user SMS usage:', fetchError)
      return
    }

    // Increment and update
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ sms_used: (user.sms_used || 0) + 1 })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating SMS usage:', updateError)
    }
  } catch (error) {
    console.error('Error in manual SMS usage increment:', error)
  }
} 