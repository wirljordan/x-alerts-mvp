import Stripe from 'stripe'
import { supabaseAdmin } from '../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' })
    }

    // Get user from Supabase to find their subscription
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('x_user_id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Find the user's active subscription in Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' })
    }

    const subscription = subscriptions.data[0]

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