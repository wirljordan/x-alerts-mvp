// Twilio SMS integration
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_FROM_NUMBER

const client = twilio(accountSid, authToken)

// Function to send SMS notification
export async function sendSMSNotification(toNumber, message) {
  try {
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

// Function to format keyword alert SMS
export function formatKeywordAlertSMS(keyword, tweetData) {
  const { authorName, authorUsername, tweetText, tweetUrl } = tweetData
  
  return `🔔 Keyword Alert: "${keyword}"

👤 ${authorName} (@${authorUsername})
💬 ${tweetText}

🔗 Reply now: ${tweetUrl}

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