# TwitterAPI.io & Twilio Integration

This document explains how the TwitterAPI.io and Twilio integration works for keyword monitoring and SMS notifications.

## Overview

The system monitors Twitter for keywords and sends SMS notifications via Twilio when matches are found. Users can add keywords, and when those keywords appear in tweets, they receive an SMS with the tweet details and a direct link to reply.

## Components

### 1. TwitterAPI.io Integration (`lib/twitter-api.js`)

- **`searchTweetsByKeyword(keyword, sinceId)`**: Searches for tweets containing the keyword
- **`getTweetById(tweetId)`**: Gets detailed information about a specific tweet
- **`getUserById(userId)`**: Gets user information for tweet authors
- **`formatTweetForSMS(tweet, user)`**: Formats tweet data for SMS messages

### 2. Twilio SMS Integration (`lib/twilio.js`)

- **`sendSMSNotification(toNumber, message)`**: Sends SMS via Twilio
- **`formatKeywordAlertSMS(keyword, tweetData)`**: Formats the SMS message
- **`isValidPhoneNumber(phoneNumber)`**: Validates phone numbers
- **`formatPhoneNumber(phoneNumber)`**: Formats phone numbers for Twilio

### 3. Keyword Monitoring (`pages/api/cron/monitor-keywords.js`)

- Runs every 5 minutes via Vercel Cron
- Checks all active keywords for new tweets
- Sends SMS notifications when matches are found
- Updates SMS usage and last match timestamps

### 4. Test Endpoint (`pages/api/test/monitor.js`)

- Manual testing endpoint for keyword monitoring
- Can be triggered from the dashboard

## Environment Variables Required

```env
# Twitter API
TWITTER_API_KEY=your-twitter-api-key

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=your-twilio-phone-number

# Cron Security
CRON_SECRET=your-cron-secret-key
```

## SMS Message Format

```
🔔 Keyword Alert: "keyword"

👤 Author Name (@username)
💬 Tweet text (truncated to 100 chars)...

🔗 Reply now: https://twitter.com/username/status/tweetId

- EarlyReply
```

## Workflow

1. **User adds keyword**: User creates a keyword in the dashboard
2. **Cron job runs**: Every 5 minutes, the system checks for new tweets
3. **Keyword matching**: Searches Twitter API for tweets containing keywords
4. **SMS notification**: Sends formatted SMS with tweet details
5. **Usage tracking**: Updates SMS usage count in database
6. **Timestamp update**: Records when the keyword was last matched

## Testing

### Manual Test
1. Go to the dashboard
2. Click "Test Monitoring" button in the Usage section
3. Check the success modal for results

### API Test
```bash
curl -X POST http://localhost:3000/api/test/monitor
```

## Vercel Cron Configuration

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/monitor-keywords",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs every 5 minutes.

## Error Handling

- **API rate limits**: Handled gracefully with retries
- **Invalid phone numbers**: Skipped with logging
- **SMS limits reached**: Users are skipped until next billing cycle
- **Twitter API errors**: Logged and handled without breaking the process

## Security

- Cron endpoint requires `CRON_SECRET` authentication
- Phone numbers are validated and formatted
- SMS usage is tracked to prevent abuse
- All API calls are logged for monitoring

## Monitoring

Check Vercel logs for:
- Keyword monitoring results
- SMS delivery status
- Error messages
- Usage statistics

## Future Enhancements

- Webhook support for real-time notifications
- Email notifications as backup
- Custom SMS templates
- Keyword analytics and reporting
- Rate limiting per user 