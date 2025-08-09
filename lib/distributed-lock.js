// Simple distributed lock implementation using Supabase
// This provides basic locking to prevent parallel rule scans for the same user
import { supabaseAdmin } from './supabase'

// Lock table structure (will be created by migration)
// CREATE TABLE IF NOT EXISTS distributed_locks (
//   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
//   lock_key TEXT UNIQUE NOT NULL,
//   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
//   acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
//   expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
//   instance_id TEXT NOT NULL
// );

const INSTANCE_ID = process.env.VERCEL_URL || `local_${Date.now()}`

/**
 * Try to acquire a distributed lock
 * @param {string} lockKey - Unique key for the lock
 * @param {string} userId - User ID for the lock
 * @param {number} ttlSeconds - Time to live in seconds (default: 240s = 4 minutes)
 * @returns {Promise<boolean>} - True if lock acquired, false if already locked
 */
export async function acquireLock(lockKey, userId, ttlSeconds = 240) {
  try {
    // First check if the distributed_locks table exists
    try {
      const { error: tableCheckError } = await supabaseAdmin
        .from('distributed_locks')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.log(`⚠️ Distributed locks table not available: ${tableCheckError.message}`)
        return false
      }
    } catch (tableError) {
      console.log(`⚠️ Cannot access distributed locks table: ${tableError?.message || 'Unknown error'}`)
      return false
    }
    
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000)
    
    // Try to insert the lock
    const { data, error } = await supabaseAdmin
      .from('distributed_locks')
      .insert({
        lock_key: lockKey,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
        instance_id: INSTANCE_ID
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`🔒 Lock already exists for key: ${lockKey}`)
        return false
      }
      throw error
    }
    
    console.log(`🔓 Lock acquired for key: ${lockKey}, expires at: ${expiresAt.toISOString()}`)
    return true
    
  } catch (error) {
    console.error(`❌ Error acquiring lock for key: ${lockKey}:`, {
      message: error?.message || 'Unknown error',
      code: error?.code || 'No code',
      details: error?.details || 'No details',
      hint: error?.hint || 'No hint',
      stack: error?.stack || 'No stack',
      fullError: error
    })
    return false
  }
}

/**
 * Release a distributed lock
 * @param {string} lockKey - Unique key for the lock
 * @param {string} userId - User ID for the lock
 * @returns {Promise<boolean>} - True if lock released, false if error
 */
export async function releaseLock(lockKey, userId) {
  try {
    // First check if the distributed_locks table exists
    try {
      const { error: tableCheckError } = await supabaseAdmin
        .from('distributed_locks')
        .select('id')
        .limit(1)
      
      if (tableCheckError) {
        console.log(`⚠️ Distributed locks table not available for release: ${tableCheckError.message}`)
        return false
      }
    } catch (tableError) {
      console.log(`⚠️ Cannot access distributed locks table for release: ${tableError?.message || 'Unknown error'}`)
      return false
      }
    
    const { error } = await supabaseAdmin
      .from('distributed_locks')
      .delete()
      .eq('lock_key', lockKey)
      .eq('user_id', userId)
    
    if (error) {
      throw error
    }
    
    console.log(`🔓 Lock released for key: ${lockKey}`)
    return true
    
  } catch (error) {
    console.error(`❌ Error releasing lock for key: ${lockKey}:`, error)
    return false
  }
}

/**
 * Clean up expired locks
 * @returns {Promise<number>} - Number of locks cleaned up
 */
export async function cleanupExpiredLocks() {
  try {
    const { data, error } = await supabaseAdmin
      .from('distributed_locks')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select()
    
    if (error) {
      throw error
    }
    
    const cleanedCount = data?.length || 0
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired locks`)
    }
    
    return cleanedCount
    
  } catch (error) {
    console.error('❌ Error cleaning up expired locks:', error)
    return 0
  }
}

/**
 * Check if a lock exists and is still valid
 * @param {string} lockKey - Unique key for the lock
 * @returns {Promise<boolean>} - True if lock exists and is valid
 */
export async function isLocked(lockKey) {
  try {
    const { data, error } = await supabaseAdmin
      .from('distributed_locks')
      .select('expires_at')
      .eq('lock_key', lockKey)
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return false
      }
      throw error
    }
    
    return !!data
    
  } catch (error) {
    console.error(`❌ Error checking lock status for key: ${lockKey}:`, error)
    return false
  }
} 