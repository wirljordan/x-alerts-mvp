# AI Auto-Reply System Deployment Guide

This guide walks you through deploying the new AI-powered auto-reply system.

## Prerequisites

1. **OpenAI API Key**: Get an API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **TwitterAPI.io Access**: You already have this set up
3. **Database Migration**: Run the new database schema

## Step 1: Database Migration

Run the new migration to add AI-related tables:

```sql
-- Run this in your Supabase SQL editor
-- File: supabase/add-business-profiles.sql
```

This creates:
- `business_profiles` table
- `ai_replies` table  
- `x_api_credentials` table
- Required indexes and constraints

## Step 2: Environment Variables

Add these new environment variables to your `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# TwitterAPI.io (for posting replies) - You already have this
TWITTER_API_KEY=your-twitterapi-io-key
```

## Step 3: Install Dependencies

Install the new OpenAI dependency:

```bash
npm install openai@^4.28.0
```

## Step 4: Update Cron Job

The cron job has been updated to use AI monitoring. Update your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ai-monitor-keywords",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Step 5: Test the System

### 1. Test Business Profile Creation

```bash
curl -X POST http://localhost:3000/api/business-profile/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "siteText": "We help small businesses automate their social media marketing with AI-powered tools that save time and increase engagement."
  }'
```

### 2. Test AI Reply Generation

```bash
curl -X POST http://localhost:3000/api/cron/ai-monitor-keywords \
  -H "Authorization: Bearer your-cron-secret"
```

## Step 6: TwitterAPI.io Setup

### Option A: Use Existing Setup (Recommended)

1. You already have TwitterAPI.io configured
2. The system will use your existing `TWITTER_API_KEY`
3. Users can add their own API keys for posting replies

### Option B: Individual User API Keys

1. Users provide their own TwitterAPI.io API keys
2. Store securely in the `x_api_credentials` table
3. Each user can post replies with their own account

## Step 7: Monitor and Debug

### Check Logs

Monitor Vercel logs for:
- AI processing errors
- X API posting failures
- Database connection issues

### Key Metrics to Track

- Reply success rate
- Relevance accuracy
- API usage costs
- User engagement

## Step 8: User Onboarding

### Update Onboarding Flow

The onboarding now includes:
1. Goal selection
2. Contact information
3. Phone verification
4. **Business description** (NEW)
5. Plan selection

### Business Profile Creation

Users can now provide a business description that gets processed by AI to create a comprehensive business profile.

## Troubleshooting

### Common Issues

1. **OpenAI API Errors**
   - Check API key validity
   - Monitor rate limits
   - Verify account billing

2. **TwitterAPI.io Errors**
   - Verify API key validity
   - Check rate limits
   - Ensure proper permissions

3. **Database Errors**
   - Run migration scripts
   - Check table permissions
   - Verify foreign key constraints

### Debug Commands

```bash
# Check OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check TwitterAPI.io
curl -H "x-api-key: $TWITTER_API_KEY" \
  https://api.twitterapi.io/twitter/user/me

# Test cron job manually
curl -X POST https://your-domain.vercel.app/api/cron/ai-monitor-keywords \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Performance Optimization

### Cost Management

- Monitor OpenAI API usage
- Set up billing alerts
- Optimize prompt efficiency

### Rate Limiting

- Respect X API rate limits
- Implement exponential backoff
- Queue requests when needed

## Security Considerations

1. **API Key Security**
   - Use environment variables
   - Rotate keys regularly
   - Monitor for unauthorized access

2. **Data Privacy**
   - Encrypt sensitive data
   - Implement data retention policies
   - Comply with privacy regulations

3. **User Consent**
   - Clear terms of service
   - Opt-in for AI replies
   - Easy opt-out process

## Rollback Plan

If issues arise, you can:

1. **Revert to SMS System**
   - Switch cron job back to `/api/cron/monitor-keywords`
   - Keep existing SMS functionality

2. **Disable AI Features**
   - Turn off AI processing
   - Keep keyword monitoring only

3. **Gradual Rollout**
   - Enable for select users first
   - Monitor performance
   - Scale gradually

## Support

For issues or questions:

1. Check the logs in Vercel dashboard
2. Review the AI_AUTO_REPLY_SYSTEM.md documentation
3. Test individual components
4. Monitor system health metrics 