import { supabaseAdmin } from './supabase'

/**
 * Check if tweet ID already exists and insert if not
 * Uses a transaction to prevent race conditions
 * @param tweetId - The tweet ID to check/insert
 * @param userId - The user ID
 * @returns true if tweet was inserted (new), false if already exists
 */
export async function checkAndInsertTweetId(tweetId: string, userId: string): Promise<boolean> {
  try {
    // Use a transaction to check and insert atomically
    const { data, error } = await supabaseAdmin.rpc('check_and_insert_tweet_id', {
      p_tweet_id: tweetId,
      p_user_id: userId
    })

    if (error) {
      console.error('Error in deduplication check:', error)
      // If the function doesn't exist, fall back to manual check
      return await manualDedupeCheck(tweetId, userId)
    }

    return data === true
  } catch (error) {
    console.error('Error in deduplication:', error)
    // Fall back to manual check
    return await manualDedupeCheck(tweetId, userId)
  }
}

/**
 * Manual deduplication check as fallback
 * @param tweetId - The tweet ID to check
 * @param userId - The user ID
 * @returns true if tweet should be processed (not duplicate), false if duplicate
 */
async function manualDedupeCheck(tweetId: string, userId: string): Promise<boolean> {
  try {
    // Check if tweet already exists
    const { data: existingMessage, error: checkError } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('tweet_id', tweetId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected
      console.error('Error checking for existing tweet:', checkError)
      return false
    }

    if (existingMessage) {
      console.log('Tweet already processed:', tweetId)
      return false
    }

    // Insert the tweet ID to mark it as processed
    const { error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        tweet_id: tweetId,
        user_id: userId,
        alert_name: 'dedupe_check',
        sent_via: 'dedupe',
        sent_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error inserting dedupe record:', insertError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in manual dedupe check:', error)
    return false
  }
}

/**
 * Create the database function for atomic check-and-insert
 * This should be run once to set up the database function
 */
export async function createDedupeFunction(): Promise<void> {
  const functionSql = `
    CREATE OR REPLACE FUNCTION check_and_insert_tweet_id(p_tweet_id TEXT, p_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    AS $$
    DECLARE
      exists_count INTEGER;
    BEGIN
      -- Check if tweet already exists
      SELECT COUNT(*) INTO exists_count
      FROM messages
      WHERE tweet_id = p_tweet_id AND user_id = p_user_id;
      
      -- If exists, return false (don't process)
      IF exists_count > 0 THEN
        RETURN FALSE;
      END IF;
      
      -- Insert dedupe record
      INSERT INTO messages (tweet_id, user_id, alert_name, sent_via, sent_at)
      VALUES (p_tweet_id, p_user_id, 'dedupe_check', 'dedupe', NOW());
      
      RETURN TRUE;
    EXCEPTION
      WHEN OTHERS THEN
        -- If insert fails (e.g., concurrent insert), return false
        RETURN FALSE;
    END;
    $$;
  `

  try {
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: functionSql })
    if (error) {
      console.error('Error creating dedupe function:', error)
    } else {
      console.log('Dedupe function created successfully')
    }
  } catch (error) {
    console.error('Error creating dedupe function:', error)
  }
} 