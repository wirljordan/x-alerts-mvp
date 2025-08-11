import Stripe from 'stripe'
import { supabaseAdmin } from '../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Function to get keyword limits for each plan
function getKeywordLimit(plan) {
  const limits = {
    'free': 1,
    'starter': 2,
    'growth': 10,
    'pro': 30
  }
  return limits[plan] || 1
}

// Function to handle keyword overflow when downgrading
async function handleKeywordOverflow(userId, targetPlan) {
  console.log(`Checking for keyword overflow when downgrading to ${targetPlan}`)
  
  const targetLimit = getKeywordLimit(targetPlan)
  
  // Get user's current keywords
  const { data: alerts, error: alertsError } = await supabaseAdmin
    .from('keyword_rules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true }) // Keep oldest keywords first
  
  if (alertsError) {
    console.error('Error fetching user alerts:', alertsError)
    return { removedCount: 0, error: 'Failed to fetch keywords' }
  }
  
  const currentKeywordCount = alerts.length
  console.log(`User has ${currentKeywordCount} keywords, target limit is ${targetLimit}`)
  
  if (currentKeywordCount <= targetLimit) {
    console.log('No keyword overflow detected')
    return { removedCount: 0, removedKeywords: [] }
  }
  
  // Calculate how many keywords need to be removed
  const keywordsToRemove = currentKeywordCount - targetLimit
  console.log(`Need to remove ${keywordsToRemove} keywords`)
  
  // Remove the newest keywords (keep the oldest ones)
  const keywordsToDelete = alerts.slice(-keywordsToRemove)
  const keywordIdsToDelete = keywordsToDelete.map(alert => alert.id)
  
  if (keywordIdsToDelete.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from('keyword_rules')
      .delete()
      .in('id', keywordIdsToDelete)
    
    if (deleteError) {
      console.error('Error deleting excess keywords:', deleteError)
      return { removedCount: 0, error: 'Failed to remove excess keywords' }
    }
    
    console.log(`Successfully removed ${keywordsToDelete.length} keywords`)
    return { 
      removedCount: keywordsToDelete.length, 
      removedKeywords: keywordsToDelete.map(k => k.query)
    }
  }
  
  return { removedCount: 0, removedKeywords: [] }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, targetPlan } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    console.log('Attempting to cancel subscription for user:', userId)
    console.log('Target plan for downgrade:', targetPlan || 'free')

    // Get user from Supabase to find their subscription
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('x_user_id', userId)
      .single()

    if (userError || !user) {
      console.error('User not found in database:', userId, userError)
      return res.status(404).json({ error: 'User not found in database' })
    }

    console.log('User found:', user.x_user_id, 'Plan:', user.plan, 'Stripe customer ID:', user.stripe_customer_id)

    // Handle keyword overflow if downgrading
    let keywordOverflowResult = { removedCount: 0, removedKeywords: [] }
    if (targetPlan && targetPlan !== user.plan) {
      // Get the internal user ID for the alerts table
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('x_user_id', userId)
        .single()
      
      if (userData) {
        keywordOverflowResult = await handleKeywordOverflow(userData.id, targetPlan)
      }
    }

    // If user doesn't have a stripe_customer_id, they might not have a subscription
    if (!user.stripe_customer_id) {
      console.log('User has no Stripe customer ID, checking if they have a paid plan')
      
      // If they're on a free plan, just update them to free (in case they were on a paid plan)
      if (user.plan === 'free') {
        return res.status(200).json({ 
          success: true, 
          message: 'You are already on the free plan',
          keywordOverflow: keywordOverflowResult
        })
      }
      
      // If they're on a paid plan but no Stripe customer ID, schedule the downgrade
      console.log('User on paid plan without Stripe customer ID, scheduling downgrade')
      
      // Calculate end of current billing period (30 days from now for simplicity)
      const cancelAt = new Date()
      cancelAt.setDate(cancelAt.getDate() + 30)
      
      const updateData = {
        subscription_status: 'canceling',
        subscription_cancel_at: cancelAt.toISOString()
      }
      
      // For partial downgrades, store the target plan
      if (targetPlan && targetPlan !== 'free') {
        updateData.pending_plan = targetPlan
      } else {
        // Full cancellation to free
        updateData.pending_plan = 'free'
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('x_user_id', userId)

      if (updateError) {
        console.error('Error scheduling user downgrade:', updateError)
        return res.status(500).json({ error: 'Failed to schedule downgrade' })
      }

      const message = targetPlan && targetPlan !== 'free' 
        ? `Successfully scheduled downgrade to ${targetPlan} plan at end of billing period`
        : 'Successfully scheduled cancellation at end of billing period'
        
      return res.status(200).json({ 
        success: true, 
        message: message,
        keywordOverflow: keywordOverflowResult
      })
    }

    // Find the user's active subscription in Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      console.log('No active Stripe subscription found, updating user to free plan')
      
      // No active subscription found, update user to free plan
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          plan: 'free',
          alerts_limit: 10,
          subscription_status: 'canceled'
        })
        .eq('x_user_id', userId)

      if (updateError) {
        console.error('Error updating user to free plan:', updateError)
        return res.status(500).json({ error: 'Failed to update user plan' })
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully downgraded to free plan',
        keywordOverflow: keywordOverflowResult
      })
    }

    const subscription = subscriptions.data[0]
    console.log('Found active subscription:', subscription.id)

    // Cancel the subscription at the end of the current period
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true
    })

    // Update user in Supabase to mark subscription as canceling
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'canceling',
        subscription_cancel_at: new Date(canceledSubscription.current_period_end * 1000).toISOString()
      })
      .eq('x_user_id', userId)

    if (updateError) {
      console.error('Error updating user subscription status:', updateError)
    }

    console.log('Subscription canceled at period end:', canceledSubscription.id)

    res.status(200).json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current billing period',
      cancelAt: canceledSubscription.current_period_end,
      keywordOverflow: keywordOverflowResult
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    })
  }
} 