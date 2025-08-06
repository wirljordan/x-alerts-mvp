import Stripe from 'stripe'
import { supabaseAdmin } from '../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

    // If user doesn't have a stripe_customer_id, they might not have a subscription
    if (!user.stripe_customer_id) {
      console.log('User has no Stripe customer ID, checking if they have a paid plan')
      
      // If they're on a free plan, just update them to free (in case they were on a paid plan)
      if (user.plan === 'free') {
        return res.status(200).json({ 
          success: true, 
          message: 'You are already on the free plan'
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
        message: message
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
          sms_limit: 25,
          subscription_status: 'canceled'
        })
        .eq('x_user_id', userId)

      if (updateError) {
        console.error('Error updating user to free plan:', updateError)
        return res.status(500).json({ error: 'Failed to update user plan' })
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Successfully downgraded to free plan'
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
      cancelAt: canceledSubscription.current_period_end
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    })
  }
} 