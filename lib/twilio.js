// Twilio SMS integration
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

// Debug environment variables
console.log('Twilio Config:', {
  hasAccountSid: !!accountSid,
  hasAuthToken: !!authToken,
  hasFromNumber: !!fromNumber,
  fromNumber: fromNumber
})

const client = twilio(accountSid, authToken)

// Function to send SMS notification
export async function sendSMSNotification(toNumber, message) {
  try {
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER environment variable is not set')
    }

    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: toNumber
    })

    console.log('SMS sent successfully:', result.sid)
    return result
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw error
  }
}

// Function to format keyword alert SMS - optimized for cost and mobile
export function formatKeywordAlertSMS(keyword, tweetData) {
  const { authorName, authorUsername, tweetText, tweetUrl, tweetId } = tweetData
  
  // Create mobile-friendly X.com link that can open the app
  const mobileUrl = `https://x.com/i/status/${tweetId}`
  
  // Truncate tweet text to save SMS costs
  const shortText = tweetText.length > 50 ? tweetText.substring(0, 50) + '...' : tweetText
  
  return `🔔 New "${keyword}" post! Tap 👉 ${mobileUrl}

${shortText}

- EarlyReply`
}

// Function to check if phone number is valid
export function isValidPhoneNumber(phoneNumber) {
  // Basic validation - you might want to use a library like libphonenumber-js for more robust validation
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''))
}

// Function to format phone number for Twilio
export function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters except +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')
  
  // If it doesn't start with +, assume it's a US number
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+' + cleaned
    } else if (cleaned.length === 10) {
      cleaned = '+1' + cleaned
    }
  }
  
  return cleaned
} 