import { vi } from 'vitest'

// Mock environment variables for tests
process.env.TWILIO_SID = 'test_sid'
process.env.TWILIO_AUTH = 'test_auth'
process.env.TWILIO_FROM = '+1234567890'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
} 