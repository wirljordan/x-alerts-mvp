# TwitterAPI.io Authentication Integration

This document explains the enhanced authentication system for TwitterAPI.io integration, including API key rotation, rate limiting, and monitoring.

## Overview

The new authentication system provides:
- **API Key Rotation**: Automatic switching between multiple API keys
- **Rate Limit Management**: Intelligent handling of rate limits
- **Health Monitoring**: Real-time validation of API keys
- **Usage Statistics**: Track request counts and performance
- **Automatic Retry**: Built-in retry logic with exponential backoff

## Components

### 1. Authentication Manager (`lib/twitter-auth.js`)

The core authentication system that handles:
- Loading and managing multiple API keys
- Automatic key rotation based on usage
- Request authentication and retry logic
- Health checks and validation

### 2. Enhanced API Integration (`lib/twitter-api.js`)

Updated to use the new authentication system:
- All requests now use `makeAuthenticatedRequest()`
- Automatic handling of authentication errors
- Seamless API key rotation

### 3. Testing Endpoint (`pages/api/test/auth.js`)

API endpoint for testing and monitoring:
- Health checks for all API keys
- Usage statistics
- API key validation
- Test requests

### 4. Dashboard Component (`components/TwitterAuthStatus.js`)

React component for monitoring:
- Real-time authentication status
- Usage statistics display
- Manual testing capabilities

## Environment Variables

### Required
```env
TWITTER_API_KEY=your-primary-twitter-api-key
```

### Optional (for key rotation)
```env
TWITTER_API_KEY_1=your-secondary-twitter-api-key-1
TWITTER_API_KEY_2=your-secondary-twitter-api-key-2
TWITTER_API_KEY_3=your-secondary-twitter-api-key-3
TWITTER_API_KEY_4=your-secondary-twitter-api-key-4
TWITTER_API_KEY_5=your-secondary-twitter-api-key-5
```

## Configuration

The authentication system uses these default settings:

```javascript
const AUTH_CONFIG = {
  MAX_RETRIES: 3,                    // Maximum retry attempts
  RETRY_DELAY_MS: 1000,              // Base delay between retries
  RATE_LIMIT_WINDOW_MS: 60000,       // Rate limit window (1 minute)
  MAX_REQUESTS_PER_MINUTE: 1000,     // Max requests per minute per key
  API_KEY_ROTATION_THRESHOLD: 800,   // Rotate at 80% of limit
}
```

## API Key Rotation

### How It Works
1. **Automatic Rotation**: Keys rotate when usage reaches 80% of limit
2. **Error-Based Rotation**: Invalid or rate-limited keys trigger rotation
3. **Round-Robin**: Keys are used in sequence for even distribution

### Benefits
- **Higher Throughput**: Multiple keys = higher rate limits
- **Fault Tolerance**: If one key fails, others continue working
- **Cost Optimization**: Distribute load across multiple keys

## Usage Examples

### Basic Authentication
```javascript
import { makeAuthenticatedRequest, getAuthHeaders } from './lib/twitter-auth'

// Make an authenticated request
const response = await makeAuthenticatedRequest('https://api.twitterapi.io/endpoint')

// Get headers for custom requests
const headers = getAuthHeaders()
```

### Health Monitoring
```javascript
import { healthCheck, getUsageStats } from './lib/twitter-auth'

// Check system health
const health = await healthCheck()
console.log('System healthy:', health.healthy)
console.log('Valid keys:', health.validKeys)

// Get usage statistics
const stats = getUsageStats()
console.log('Total requests:', stats.totalRequests)
```

### API Testing
```bash
# Health check
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'

# Usage statistics
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"action": "usage"}'

# Test API request
curl -X POST http://localhost:3000/api/test/auth \
  -H "Content-Type: application/json" \
  -d '{"action": "test_request", "searchQuery": "test"}'
```

## Dashboard Integration

Add the authentication status component to your dashboard:

```javascript
import TwitterAuthStatus from '../components/TwitterAuthStatus'

// In your dashboard component
<TwitterAuthStatus />
```

This provides:
- Real-time authentication status
- API key validation results
- Usage statistics
- Manual testing buttons

## Error Handling

The system handles various error scenarios:

### Authentication Errors (401)
- Automatically rotates to next API key
- Retries the request
- Logs the rotation for monitoring

### Rate Limit Errors (429)
- Switches to next available key
- Implements exponential backoff
- Tracks rate limit events

### Network Errors
- Retries with increasing delays
- Maintains request integrity
- Provides detailed error logging

## Monitoring and Alerts

### Health Checks
- Validates all API keys every health check
- Reports invalid or expired keys
- Tracks system availability

### Usage Monitoring
- Tracks requests per API key
- Monitors rate limit usage
- Provides usage analytics

### Performance Metrics
- Response times
- Success/failure rates
- Key rotation frequency

## Best Practices

### 1. API Key Management
- Use multiple API keys for redundancy
- Monitor key usage and rotate regularly
- Keep keys secure and never commit to version control

### 2. Rate Limiting
- Stay well below rate limits (80% threshold)
- Monitor usage patterns
- Implement backoff strategies

### 3. Error Handling
- Always handle authentication errors gracefully
- Implement proper logging
- Set up alerts for critical failures

### 4. Testing
- Regularly test API key validity
- Monitor system health
- Validate rate limit handling

## Troubleshooting

### Common Issues

**No API Keys Configured**
```
Error: No Twitter API keys configured
```
Solution: Set `TWITTER_API_KEY` environment variable

**Invalid API Key**
```
Error: Authentication failed: 401
```
Solution: Check API key validity and regenerate if needed

**Rate Limit Exceeded**
```
Error: Rate limit exceeded: 429
```
Solution: Add more API keys or implement better rate limiting

**Network Errors**
```
Error: Failed to connect to authentication service
```
Solution: Check network connectivity and API endpoint availability

### Debug Mode

Enable detailed logging by setting:
```env
DEBUG_TWITTER_AUTH=true
```

This will log:
- API key rotations
- Request attempts
- Error details
- Usage statistics

## Migration from Old System

If you're upgrading from the old authentication system:

1. **Update Environment Variables**
   - Add new API keys if desired
   - Keep existing `TWITTER_API_KEY`

2. **Update Imports**
   - Replace direct `fetch` calls with `makeAuthenticatedRequest`
   - Import from `./lib/twitter-auth`

3. **Test Integration**
   - Run health checks
   - Test API requests
   - Monitor usage statistics

4. **Monitor Performance**
   - Watch for improved rate limit handling
   - Check for reduced authentication errors
   - Verify key rotation is working

## Security Considerations

- **API Key Storage**: Store keys in environment variables only
- **Key Rotation**: Regularly rotate API keys
- **Access Control**: Limit access to authentication endpoints
- **Monitoring**: Monitor for suspicious usage patterns
- **Logging**: Log authentication events for security auditing

## Future Enhancements

- **Redis Integration**: Use Redis for distributed rate limiting
- **Webhook Support**: Real-time notifications for key issues
- **Advanced Analytics**: Detailed usage analytics and reporting
- **Auto-Scaling**: Dynamic key provisioning based on usage
- **Multi-Region**: Support for multiple API endpoints 