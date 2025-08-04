import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phone } = req.body

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' })
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the verification code (in production, use a database)
    // For now, we'll use a simple in-memory store (not recommended for production)
    global.verificationCodes = global.verificationCodes || {}
    global.verificationCodes[phone] = {
      code: verificationCode,
      expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
      attempts: 0
    }

    // Send SMS via Twilio
    const message = await client.messages.create({
      body: `Your EarlyReply verification code is: ${verificationCode}. This code expires in 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    })

    console.log('Verification code sent:', { phone, messageSid: message.sid })

    res.status(200).json({ 
      success: true, 
      message: 'Verification code sent successfully',
      messageSid: message.sid
    })

  } catch (error) {
    console.error('Error sending verification code:', error)
    
    if (error.code === 21211) {
      return res.status(400).json({ error: 'Invalid phone number format' })
    } else if (error.code === 21608) {
      return res.status(400).json({ error: 'Phone number not verified (trial account)' })
    } else if (error.code === 21614) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }

    res.status(500).json({ error: 'Failed to send verification code' })
  }
} 