// TwitterAPI.io Authentication Manager
// Handles API key management, rotation, and authentication validation

const TWITTER_API_BASE_URL = 'https://api.twitterapi.io'

// Configuration for API key management
const AUTH_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_MINUTE: 1000,
  API_KEY_ROTATION_THRESHOLD: 800, // Rotate when 80% of limit reached
}

// In-memory cache for rate limiting (in production, use Redis)
const rateLimitCache = new Map()

class TwitterAPIAuth {
  constructor() {
    this.apiKeys = this.loadAPIKeys()
    this.currentKeyIndex = 0
    this.requestCounts = new Map()
    this.lastRotation = Date.now()
  }

  // Load API keys from environment variables
  loadAPIKeys() {
    const keys = []
    
    // Primary API key
    if (process.env.TWITTER_API_KEY) {
      keys.push(process.env.TWITTER_API_KEY)
    }
    
    // Additional API keys for rotation (optional)
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`TWITTER_API_KEY_${i}`]
      if (key) {
        keys.push(key)
      }
    }
    
    if (keys.length === 0) {
      throw new Error('No Twitter API keys configured. Please set TWITTER_API_KEY environment variable.')
    }
    
    console.log(`🔑 Loaded ${keys.length} Twitter API key(s) for rotation`)
    return keys
  }

  // Get current API key
  getCurrentAPIKey() {
    return this.apiKeys[this.currentKeyIndex]
  }

  // Rotate to next API key
  rotateAPIKey() {
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length
    console.log(`🔄 Rotated to API key ${this.currentKeyIndex + 1}/${this.apiKeys.length}`)
    return this.getCurrentAPIKey()
  }

  // Check if we should rotate API key based on rate limits
  shouldRotateAPIKey() {
    const currentKey = this.getCurrentAPIKey()
    const requestCount = this.requestCounts.get(currentKey) || 0
    
    return requestCount >= AUTH_CONFIG.API_KEY_ROTATION_THRESHOLD
  }

  // Increment request count for current API key
  incrementRequestCount() {
    const currentKey = this.getCurrentAPIKey()
    const currentCount = this.requestCounts.get(currentKey) || 0
    this.requestCounts.set(currentKey, currentCount + 1)
  }

  // Reset request counts (call this periodically)
  resetRequestCounts() {
    this.requestCounts.clear()
    console.log('🔄 Reset API key request counts')
  }

  // Get authentication headers
  getAuthHeaders() {
    const apiKey = this.getCurrentAPIKey()
    
    if (!apiKey) {
      throw new Error('No valid API key available')
    }

    return {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'EarlyReply/1.0 (TwitterAPI.io Integration)'
    }
  }

  // Validate API key by making a test request
  async validateAPIKey(apiKey = null) {
    const keyToTest = apiKey || this.getCurrentAPIKey()
    
    try {
      const response = await fetch(`${TWITTER_API_BASE_URL}/twitter/user/info?screen_name=twitter`, {
        headers: {
          'x-api-key': keyToTest,
          'Content-Type': 'application/json'
        }
      })

      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' }
      }
      
      if (response.status === 429) {
        return { valid: false, error: 'Rate limit exceeded' }
      }
      
      if (response.ok) {
        return { valid: true }
      }
      
      return { valid: false, error: `HTTP ${response.status}` }
    } catch (error) {
      return { valid: false, error: error.message }
    }
  }

  // Validate all API keys
  async validateAllAPIKeys() {
    const results = []
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      const result = await this.validateAPIKey(this.apiKeys[i])
      results.push({
        keyIndex: i,
        valid: result.valid,
        error: result.error
      })
      
      // Add delay between validations to avoid rate limiting
      if (i < this.apiKeys.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    return results
  }

  // Make authenticated request with automatic retry and key rotation
  async makeAuthenticatedRequest(url, options = {}) {
    let lastError = null
    
    for (let attempt = 0; attempt < AUTH_CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check if we should rotate API key
        if (this.shouldRotateAPIKey()) {
          this.rotateAPIKey()
        }
        
        // Get authentication headers
        const authHeaders = this.getAuthHeaders()
        
        // Make the request
        const response = await fetch(url, {
          ...options,
          headers: {
            ...authHeaders,
            ...options.headers
          }
        })
        
        // Increment request count
        this.incrementRequestCount()
        
        // Handle different response statuses
        if (response.ok) {
          return response
        }
        
        if (response.status === 401) {
          // Invalid API key, try rotating
          console.log(`🔑 API key ${this.currentKeyIndex + 1} invalid, rotating...`)
          this.rotateAPIKey()
          lastError = new Error(`Authentication failed: ${response.statusText}`)
          continue
        }
        
        if (response.status === 429) {
          // Rate limit exceeded, try rotating
          console.log(`⏰ Rate limit exceeded for API key ${this.currentKeyIndex + 1}, rotating...`)
          this.rotateAPIKey()
          lastError = new Error(`Rate limit exceeded: ${response.statusText}`)
          continue
        }
        
        // For other errors, throw immediately
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        
      } catch (error) {
        lastError = error
        
        // If this is the last attempt, throw the error
        if (attempt === AUTH_CONFIG.MAX_RETRIES - 1) {
          throw error
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, AUTH_CONFIG.RETRY_DELAY_MS * (attempt + 1)))
      }
    }
    
    throw lastError
  }

  // Get API key usage statistics
  getUsageStats() {
    const stats = {
      totalKeys: this.apiKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      requestCounts: {},
      totalRequests: 0
    }
    
    for (let i = 0; i < this.apiKeys.length; i++) {
      const key = this.apiKeys[i]
      const count = this.requestCounts.get(key) || 0
      stats.requestCounts[`key_${i + 1}`] = count
      stats.totalRequests += count
    }
    
    return stats
  }

  // Health check for authentication system
  async healthCheck() {
    try {
      const validationResults = await this.validateAllAPIKeys()
      const validKeys = validationResults.filter(r => r.valid).length
      
      return {
        healthy: validKeys > 0,
        validKeys,
        totalKeys: this.apiKeys.length,
        validationResults,
        usageStats: this.getUsageStats()
      }
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        usageStats: this.getUsageStats()
      }
    }
  }
}

// Lazy singleton instance
let _twitterAuth = null

function getTwitterAuth() {
  if (!_twitterAuth) {
    _twitterAuth = new TwitterAPIAuth()
    
    // Auto-reset request counts every hour
    setInterval(() => {
      _twitterAuth.resetRequestCounts()
    }, 60 * 60 * 1000)
  }
  return _twitterAuth
}

// Export for CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TwitterAPIAuth,
    getAuthHeaders: () => getTwitterAuth().getAuthHeaders(),
    makeAuthenticatedRequest: (url, options) => getTwitterAuth().makeAuthenticatedRequest(url, options),
    validateAPIKey: (apiKey) => getTwitterAuth().validateAPIKey(apiKey),
    healthCheck: () => getTwitterAuth().healthCheck(),
    getUsageStats: () => getTwitterAuth().getUsageStats(),
    getTwitterAuth
  }
} 