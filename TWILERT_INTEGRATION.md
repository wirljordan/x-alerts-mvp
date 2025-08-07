# Twilert Webhook Integration

This document describes the Twilert webhook integration for EarlyReply, which processes incoming tweet alerts and sends SMS notifications via Twilio.

## Overview

The `/api/twilert` endpoint receives POST requests from Twilert Agency webhooks and processes them according to the following workflow:

1. **Deduplication** - Prevents duplicate processing of the same tweet
2. **Quiet Hours** - Respects user's quiet hours settings
3. **SMS Quota** - Checks user's SMS usage limits
4. **SMS Delivery** - Sends SMS via Twilio
5. **Data Persistence** - Stores message records in database
6. **Usage Tracking** - Increments SMS usage counters

## API Endpoint

```
POST /api/twilert
```

### Request Body

The webhook expects a JSON payload with the following structure:

```typescript
{
  event_type: 'tweet_matched',
  tweet: {
    id: string,
    text: string,
    text_truncated: string,
    created_at: string,
    author: {
      id: string,
      handle: string,
      name: string,
      profile_image_url?: string,
      verified?: boolean
    },
    url?: string
  },
  alert: {
    id: string,
    name: string,
    query_string: string,
    status: 'active' | 'paused',
    created_at: string
  },
  user: {
    id: string,
    x_user_id: string,
    handle: string,
    phone?: string,
    email?: string,
    plan: 'free' | 'starter' | 'growth' | 'pro',
    sms_limit: number,
    sms_used: number,
    quiet_start?: string, // HH:MM format
    quiet_end?: string,   // HH:MM format
    created_at: string
  },
  matched_at: string
}
```

### Response

```typescript
{
  received: number,  // Number of webhooks received
  sent: number,      // Number of SMS messages sent
  errors?: string[]  // Array of error messages (if any)
}
```

## Features

### 1. Deduplication

- Uses atomic database operations to prevent race conditions
- Checks `messages` table for existing `tweet_id` + `user_id` combinations
- Falls back to manual check if database function is unavailable

### 2. Quiet Hours

- Supports HH:MM format (e.g., "22:00" to "08:00")
- Handles overnight quiet hours (spanning midnight)
- Stores messages during quiet hours but doesn't send SMS

### 3. SMS Quota Management

- Checks `users.sms_used` against `users.sms_limit`
- Stores messages when quota is exceeded but doesn't send SMS
- Increments usage counter after successful SMS delivery

### 4. SMS Delivery

- Formats messages as: `EarlyReply alert:\n@{author}: {text}\n{url}`
- Uses Twilio for SMS delivery
- Handles delivery errors gracefully

### 5. Data Persistence

- Stores all processed messages in `messages` table
- Tracks whether SMS was sent or just stored
- Maintains audit trail of all alerts

## Environment Variables

```bash
# Twilio Configuration
TWILIO_SID=your_twilio_account_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_FROM=your_twilio_phone_number

# Twilert API Configuration
TWILERT_API_KEY=your_twilert_api_key
TWILERT_WEBHOOK_SECRET=your_twilert_webhook_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Schema

### Messages Table

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tweet_id TEXT NOT NULL,
  alert_name TEXT NOT NULL,
  sent_via TEXT NOT NULL CHECK (sent_via IN ('sms', 'stored_only', 'dedupe')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for deduplication
CREATE INDEX idx_messages_tweet_user ON messages(tweet_id, user_id);
```

### Users Table (Extended)

```sql
-- Add quiet hours columns to existing users table
ALTER TABLE users ADD COLUMN quiet_start TEXT; -- HH:MM format
ALTER TABLE users ADD COLUMN quiet_end TEXT;   -- HH:MM format
```

## Helper Functions

### `lib/quietHours.ts`

- `isQuietHours(user, now?)` - Checks if current time is within quiet hours
- `getNextNotificationTime(user, now?)` - Returns when quiet hours end

### `lib/dedupe.ts`

- `checkAndInsertTweetId(tweetId, userId)` - Atomic deduplication check
- `createDedupeFunction()` - Sets up database function for atomic operations

### `types/TwilertPayload.ts`

- `TwilertPayloadSchema` - Zod schema for payload validation
- `validateTwilertPayload(data)` - Validates incoming webhook data

### `lib/twilert.ts`

- `TwilertClient` - API client for managing Twilert alerts and webhooks
- `twilertClient` - Default client instance

## Testing

Run the test suite:

```bash
# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run
```

### Test Coverage

- Request validation
- Deduplication logic
- Quiet hours handling
- SMS quota management
- Error handling
- Response format validation

## Error Handling

The webhook handler is designed to be resilient:

- **Validation Errors**: Returns 200 with error details
- **Database Errors**: Logs errors and continues processing
- **Twilio Errors**: Logs errors but doesn't fail the webhook
- **Network Errors**: Graceful degradation with fallback mechanisms

## Monitoring

Key metrics to monitor:

- Webhook processing time
- SMS delivery success rate
- Database operation latency
- Error rates by type
- Quiet hours effectiveness
- Quota usage patterns

## Security Considerations

- Validate all incoming webhook data
- Use environment variables for secrets
- Implement rate limiting if needed
- Monitor for unusual webhook patterns
- Log all operations for audit trail
- Verify Twilert webhook signatures
- Use secure API key management

## Twilert API Setup

### 1. Get Twilert API Credentials

1. Sign up for a Twilert account at [twilert.com](https://twilert.com)
2. Navigate to your API settings
3. Generate an API key
4. Create a webhook secret for signature verification

### 2. Configure Webhook

1. Set your webhook URL to: `https://yourdomain.com/api/twilert`
2. Configure webhook events to include `tweet_matched`
3. Set the webhook secret in your environment variables

### 3. Test Webhook

Use the Twilert API client to test connectivity:

```typescript
import { twilertClient } from '../lib/twilert'

// Test webhook connectivity
const isConnected = await twilertClient.testWebhook('your_webhook_id')
console.log('Webhook connected:', isConnected)
```

## Deployment

1. Set up environment variables (including Twilert credentials)
2. Deploy the API route
3. Configure Twilert webhook URL
4. Set up database functions
5. Test with sample payloads
6. Monitor logs and metrics 