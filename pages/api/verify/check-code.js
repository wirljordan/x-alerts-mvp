export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { phone, code } = req.body

    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and verification code are required' })
    }

    // Get stored verification data
    const storedData = global.verificationCodes?.[phone]

    if (!storedData) {
      return res.status(400).json({ error: 'No verification code found for this phone number' })
    }

    // Check if code has expired
    if (Date.now() > storedData.expiresAt) {
      delete global.verificationCodes[phone]
      return res.status(400).json({ error: 'Verification code has expired' })
    }

    // Check if too many attempts
    if (storedData.attempts >= 3) {
      delete global.verificationCodes[phone]
      return res.status(400).json({ error: 'Too many failed attempts. Please request a new code.' })
    }

    // Increment attempts
    storedData.attempts++

    // Check if code matches
    if (storedData.code !== code) {
      return res.status(400).json({ 
        error: 'Invalid verification code',
        attemptsRemaining: 3 - storedData.attempts
      })
    }

    // Code is valid - mark as verified
    global.verificationCodes[phone] = {
      ...storedData,
      verified: true,
      verifiedAt: Date.now()
    }

    console.log('Phone number verified:', phone)

    res.status(200).json({ 
      success: true, 
      message: 'Phone number verified successfully'
    })

  } catch (error) {
    console.error('Error checking verification code:', error)
    res.status(500).json({ error: 'Failed to verify code' })
  }
} 