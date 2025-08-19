import { supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' })
  }

  try {
    console.log('🔐 Assigning Twitter account to user:', userId)

    // Check if user already has an assigned account
    const { data: existingAssignment, error: checkError } = await supabaseAdmin
      .from('user_account_assignments')
      .select('twitter_account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing assignment:', checkError)
      return res.status(500).json({ error: 'Database error' })
    }

    if (existingAssignment) {
      console.log('✅ User already has assigned account:', existingAssignment.twitter_account_id)
      return res.status(200).json({ 
        success: true, 
        message: 'User already has assigned account',
        hasAccount: true
      })
    }

    // Find an available account
    const { data: availableAccount, error: accountError } = await supabaseAdmin
      .from('twitter_accounts')
      .select('id, username')
      .eq('is_active', true)
      .is('assigned_user_id', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (accountError) {
      console.error('❌ Error finding available account:', accountError)
      return res.status(500).json({ error: 'No available accounts' })
    }

    if (!availableAccount) {
      console.log('❌ No available accounts')
      return res.status(503).json({ error: 'No available accounts at the moment' })
    }

    // Assign account to user
    const { error: assignError } = await supabaseAdmin
      .from('twitter_accounts')
      .update({
        assigned_user_id: userId,
        assigned_at: new Date().toISOString()
      })
      .eq('id', availableAccount.id)

    if (assignError) {
      console.error('❌ Error assigning account:', assignError)
      return res.status(500).json({ error: 'Failed to assign account' })
    }

    // Create assignment record
    const { error: recordError } = await supabaseAdmin
      .from('user_account_assignments')
      .insert({
        user_id: userId,
        twitter_account_id: availableAccount.id
      })

    if (recordError) {
      console.error('❌ Error creating assignment record:', recordError)
      // Try to unassign the account
      await supabaseAdmin
        .from('twitter_accounts')
        .update({
          assigned_user_id: null,
          assigned_at: null
        })
        .eq('id', availableAccount.id)
      
      return res.status(500).json({ error: 'Failed to create assignment record' })
    }

    console.log('✅ Successfully assigned account', availableAccount.username, 'to user', userId)
    
    return res.status(200).json({ 
      success: true, 
      message: 'Twitter account assigned successfully',
      accountUsername: availableAccount.username,
      hasAccount: true
    })

  } catch (error) {
    console.error('❌ Error in assign-twitter-account:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 