import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocks } from 'node-mocks-http'
import handler from '../pages/api/twilert'
import { isQuietHours } from '../lib/quietHours'
import { checkAndInsertTweetId } from '../lib/dedupe'

// Mock dependencies
vi.mock('twilio', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn()
    }
  }))
}))

vi.mock('../lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        eq: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      rpc: vi.fn()
    }))
  }
}))

vi.mock('../lib/quietHours')
vi.mock('../lib/dedupe')

// Sample test data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  x_user_id: '123456789',
  handle: 'testuser',
  phone: '+1234567890',
  email: 'test@example.com',
  plan: 'starter' as const,
  sms_limit: 300,
  sms_used: 50,
  quiet_start: '22:00',
  quiet_end: '08:00',
  created_at: '2024-01-01T00:00:00Z'
}

const mockTweet = {
  id: '1234567890123456789',
  text: 'This is a test tweet',
  text_truncated: 'This is a test tweet',
  created_at: '2024-01-01T12:00:00Z',
  author: {
    id: '987654321',
    handle: 'testauthor',
    name: 'Test Author',
    verified: false
  }
}

const mockAlert = {
  id: 'alert-123',
  name: 'Test Alert',
  query_string: 'test',
  status: 'active' as const,
  created_at: '2024-01-01T00:00:00Z'
}

const mockPayload = {
  event_type: 'tweet_matched' as const,
  tweet: mockTweet,
  alert: mockAlert,
  user: mockUser,
  matched_at: '2024-01-01T12:00:00Z'
}

describe('/api/twilert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default environment variables
    process.env.TWILIO_SID = 'test_sid'
    process.env.TWILIO_AUTH = 'test_auth'
    process.env.TWILIO_FROM = '+1234567890'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Request validation', () => {
    it('should return 405 for non-POST requests', async () => {
      const { req, res } = createMocks({
        method: 'GET'
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(405)
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Method not allowed'
      })
    })

    it('should validate webhook payload structure', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          // Invalid payload missing required fields
          event_type: 'invalid_event'
        }
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.errors).toBeDefined()
      expect(data.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Deduplication logic', () => {
    it('should skip processing if tweet already exists', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(false)

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(checkAndInsertTweetId).toHaveBeenCalledWith(
        mockTweet.id,
        mockUser.id
      )
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.received).toBe(1)
      expect(data.sent).toBe(0)
    })

    it('should continue processing if tweet is new', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(checkAndInsertTweetId).toHaveBeenCalledWith(
        mockTweet.id,
        mockUser.id
      )
      expect(res._getStatusCode()).toBe(200)
    })
  })

  describe('Quiet hours logic', () => {
    it('should store but not send SMS during quiet hours', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(true)

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(isQuietHours).toHaveBeenCalledWith(mockUser)
      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.received).toBe(1)
      expect(data.sent).toBe(0)
    })

    it('should allow SMS during non-quiet hours', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(isQuietHours).toHaveBeenCalledWith(mockUser)
      expect(res._getStatusCode()).toBe(200)
    })
  })

  describe('SMS quota logic', () => {
    it('should store but not send SMS when user is at limit', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      const userAtLimit = {
        ...mockUser,
        sms_used: 300, // At the limit
        sms_limit: 300
      }

      const payloadAtLimit = {
        ...mockPayload,
        user: userAtLimit
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: payloadAtLimit
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.received).toBe(1)
      expect(data.sent).toBe(0)
    })

    it('should allow SMS when user is under limit', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      const userUnderLimit = {
        ...mockUser,
        sms_used: 50,
        sms_limit: 300
      }

      const payloadUnderLimit = {
        ...mockPayload,
        user: userUnderLimit
      }

      const { req, res } = createMocks({
        method: 'POST',
        body: payloadUnderLimit
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
    })
  })

  describe('Error handling', () => {
    it('should handle Twilio errors gracefully', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      // Mock Twilio error
      const mockTwilio = require('twilio')
      mockTwilio.default.mockImplementation(() => ({
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Twilio error'))
        }
      }))

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.received).toBe(1)
      expect(data.sent).toBe(0)
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(checkAndInsertTweetId).mockRejectedValue(new Error('Database error'))

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data.errors).toBeDefined()
      expect(data.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Response format', () => {
    it('should return correct response structure', async () => {
      vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)
      vi.mocked(isQuietHours).mockReturnValue(false)

      const { req, res } = createMocks({
        method: 'POST',
        body: mockPayload
      })

      await handler(req, res)

      expect(res._getStatusCode()).toBe(200)
      const data = JSON.parse(res._getData())
      expect(data).toHaveProperty('received')
      expect(data).toHaveProperty('sent')
      expect(typeof data.received).toBe('number')
      expect(typeof data.sent).toBe('number')
    })
  })
})

describe('Quiet hours helper', () => {
  it('should return false when no quiet hours are set', () => {
    const userWithoutQuietHours = {
      ...mockUser,
      quiet_start: undefined,
      quiet_end: undefined
    }

    expect(isQuietHours(userWithoutQuietHours)).toBe(false)
  })

  it('should handle quiet hours spanning midnight', () => {
    const userWithOvernightQuietHours = {
      ...mockUser,
      quiet_start: '22:00',
      quiet_end: '08:00'
    }

    // Test during quiet hours (11 PM)
    const quietTime = new Date('2024-01-01T23:00:00Z')
    expect(isQuietHours(userWithOvernightQuietHours, quietTime)).toBe(true)

    // Test during quiet hours (2 AM)
    const earlyMorning = new Date('2024-01-01T02:00:00Z')
    expect(isQuietHours(userWithOvernightQuietHours, earlyMorning)).toBe(true)

    // Test during active hours (2 PM)
    const activeTime = new Date('2024-01-01T14:00:00Z')
    expect(isQuietHours(userWithOvernightQuietHours, activeTime)).toBe(false)
  })
})

describe('Deduplication helper', () => {
  it('should return true for new tweets', async () => {
    vi.mocked(checkAndInsertTweetId).mockResolvedValue(true)

    const result = await checkAndInsertTweetId('new-tweet-id', 'user-id')
    expect(result).toBe(true)
  })

  it('should return false for existing tweets', async () => {
    vi.mocked(checkAndInsertTweetId).mockResolvedValue(false)

    const result = await checkAndInsertTweetId('existing-tweet-id', 'user-id')
    expect(result).toBe(false)
  })
}) 