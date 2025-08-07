import { z } from 'zod'

// Tweet author schema
const TweetAuthorSchema = z.object({
  id: z.string(),
  handle: z.string(),
  name: z.string(),
  profile_image_url: z.string().url().optional(),
  verified: z.boolean().optional()
})

// Tweet schema
const TweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  text_truncated: z.string(),
  created_at: z.string().datetime(),
  author: TweetAuthorSchema,
  url: z.string().url().optional()
})

// Alert schema
const AlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  query_string: z.string(),
  status: z.enum(['active', 'paused']),
  created_at: z.string().datetime()
})

// User schema
const UserSchema = z.object({
  id: z.string().uuid(),
  x_user_id: z.string(),
  handle: z.string(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  plan: z.enum(['free', 'starter', 'growth', 'pro']),
  sms_limit: z.number().int().positive(),
  sms_used: z.number().int().nonnegative(),
  quiet_start: z.string().optional(), // HH:MM format
  quiet_end: z.string().optional(), // HH:MM format
  created_at: z.string().datetime()
})

// Main Twilert webhook payload schema
export const TwilertPayloadSchema = z.object({
  event_type: z.literal('tweet_matched'),
  tweet: TweetSchema,
  alert: AlertSchema,
  user: UserSchema,
  matched_at: z.string().datetime()
})

// Type exports
export type TwilertPayload = z.infer<typeof TwilertPayloadSchema>
export type Tweet = z.infer<typeof TweetSchema>
export type Alert = z.infer<typeof AlertSchema>
export type User = z.infer<typeof UserSchema>
export type TweetAuthor = z.infer<typeof TweetAuthorSchema>

// Validation function
export function validateTwilertPayload(data: unknown): TwilertPayload {
  return TwilertPayloadSchema.parse(data)
} 