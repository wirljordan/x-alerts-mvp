# AI-Powered Auto-Reply System

This document explains the new AI-powered auto-reply system that replaces the previous SMS alert functionality.

## Overview

The system now uses AI to automatically analyze tweets, determine relevance, and generate personalized replies that are posted directly to X (Twitter) on behalf of users. This creates a more engaging and automated lead generation system.

## Architecture

### 1. Business Profile Extraction (Onboarding)
- **Input**: User's business description (1-2 sentences)
- **Process**: AI analyzes the text to extract:
  - Business summary
  - Products/services
  - Target audience
  - Value propositions
  - Tone and style preferences
  - Safe topics to engage with
  - Keywords to avoid
  - Starter keywords for monitoring
  - Plug line for gentle promotion

### 2. Relevance Checking (Every 5 minutes)
- **Input**: Tweet text + business profile data
- **Process**: AI determines if tweet is relevant by checking:
  - Contains buyer-intent phrases ("any tools for...?", "recommend...?", etc.)
  - Not spam, politics, NSFW, or inappropriate content
  - Semantically similar to business's safe topics
  - Recent (within 5 minutes)

### 3. Reply Generation (Main)
- **Input**: Tweet + business profile
- **Process**: AI generates personalized reply that:
  - Provides practical, helpful advice
  - Matches business tone and style
  - Includes gentle plug when relevant
  - Stays under 240 characters
  - Avoids hype and inappropriate content

### 4. Reply Shortening (Fallback)
- **Input**: Generated reply that's too long
- **Process**: AI shortens while preserving key message

## Database Schema

### New Tables

#### `business_profiles`
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- summary (TEXT)
- products (JSONB)
- audience (JSONB)
- value_props (JSONB)
- tone (JSONB)
- safe_topics (JSONB)
- avoid (JSONB)
- starter_keywords (JSONB)
- plug_line (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `ai_replies`
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- rule_id (UUID, Foreign Key)
- tweet_id (TEXT)
- tweet_text (TEXT)
- generated_reply (TEXT)
- relevance_score (FLOAT)
- relevance_reason (TEXT)
- posted_to_x (BOOLEAN)
- x_reply_id (TEXT)
- created_at (TIMESTAMP)
- posted_at (TIMESTAMP)
```

#### `x_api_credentials`
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- access_token (TEXT) - TwitterAPI.io API key
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Endpoints

### Business Profile Management
- `POST /api/business-profile/create` - Create business profile using AI extraction
- `GET /api/business-profile/get` - Retrieve user's business profile

### TwitterAPI.io Integration
- `POST /api/auth/x-oauth-setup` - Save TwitterAPI.io API key

### AI Monitoring
- `GET/POST /api/cron/ai-monitor-keywords` - Main AI-powered monitoring cron job

## Environment Variables

```env
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# TwitterAPI.io (for posting replies)
TWITTER_API_KEY=your-twitterapi-io-key

# Existing variables
TWITTER_API_KEY=your-twitter-api-key
CRON_SECRET=your-cron-secret
```

## Workflow

### 1. User Onboarding
1. User completes 5-step onboarding process
2. Step 4: User provides business description
3. AI extracts business profile automatically
4. Profile saved to database

### 2. TwitterAPI.io Setup
1. User provides TwitterAPI.io API key
2. API key saved securely
3. System can now post replies on user's behalf

### 3. Keyword Monitoring
1. User adds keywords to track
2. System monitors every 5 minutes
3. AI analyzes new tweets for relevance
4. Generates and posts personalized replies

### 4. Reply Process
1. Tweet matches keyword
2. AI checks relevance using business profile
3. If relevant, generates personalized reply
4. Posts reply to X via API
5. Logs reply in database

## AI Prompts

### Business Extraction
```
You are extracting a tiny business profile for auto-reply generation on X.

Return strict JSON with keys:
summary (1 sentence),
products (max 3),
audience (2–3 words each),
value_props (3 bullets),
tone: {style: one of [casual, neutral, pro], emojis: one of [never, mirror]},
safe_topics (5–10 topic nouns/phrases),
avoid (list; must include politics, tragedy; add competitor names only if explicit in text),
starter_keywords (8–15 short buyer-intent tweet phrases),
plug_line (1 gentle sentence, no hype).

Rules:
- Keep it short and concrete.
- Infer tone from the text; default casual if unclear.
- Keywords must sound like tweets ("any tools for…?", "recommend ___?", "how do I ___?"), not SEO terms.
- Do not invent features not present in the text.
```

### Relevance Check
```
You are a relevance filter for auto-reply on X.

Return JSON:
{
  "relevant": true|false,
  "reason": "short explanation"
}

Rules:
- Tweet must contain a buyer-intent phrase such as: any tools, recommend, how do I, best way, quick way, tips for, stuck with, need help with, looking for.
- Skip if it looks like giveaway, hiring, politics, election, NSFW, or promo spam.
- Skip if older than 5 minutes.
- Otherwise, check semantic similarity to provided safe_topics/summary. If similarity feels medium+ → relevant=true.
- Keep it strict: only pass tweets that a business could reply helpfully to.
```

### Reply Generation
```
You are EarlyReply. Write ONE reply (≤240 chars) to the given tweet.

Rules:
- Start with one practical, concrete tip that addresses the author's need.
- If relevant, add a second short sentence using the provided plug_line.
- No hashtags. No links (unless CTA says link).
- Use "we" voice unless told otherwise.
- Mirror emoji use only if the author used them.
- Avoid hype, absolutes, politics, tragedy, harassment, health/finance advice.
- Reply must be helpful and natural, not salesy.

Return the reply text only.
```

## Benefits

### For Users
- **Automated Engagement**: No need to manually monitor and reply
- **Personalized Responses**: AI matches business tone and style
- **Better Lead Quality**: Only responds to relevant, buyer-intent tweets
- **Time Savings**: Focus on business while AI handles social engagement

### For Platform
- **Higher Engagement**: Direct replies vs. SMS notifications
- **Better User Experience**: Seamless integration with X
- **Scalable**: AI handles multiple users simultaneously
- **Data Rich**: Track reply performance and engagement

## Security & Privacy

- TwitterAPI.io API keys encrypted in database
- Secure API key storage
- No sensitive data stored in plain text
- User maintains full control over their account
- Can remove API key anytime

## Monitoring & Analytics

- Track reply success rates
- Monitor relevance accuracy
- Measure engagement metrics
- Log all AI decisions for improvement
- Cost tracking for API usage

## Future Enhancements

- Reply performance analytics
- A/B testing different reply styles
- Custom reply templates
- Integration with CRM systems
- Advanced sentiment analysis
- Multi-language support 