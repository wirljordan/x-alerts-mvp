import Stripe from 'stripe'
import { buffer } from 'micro'
import { supabaseAdmin } from '../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const buf = await buffer(req)
  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object
        console.log('Checkout session completed:', session.id)
        console.log('Session metadata:', session.metadata)
        
        // Update user's subscription status in Supabase
        try {
          const { userId, plan } = session.metadata
          console.log('Processing webhook for user:', userId, 'plan:', plan)
          
          if (!userId || !plan) {
            console.error('Missing userId or plan in session metadata')
            break
          }
          
          // Map plan names to match our schema
          const planMapping = {
            'free': 'free',
            'starter': 'starter', 
            'growth': 'growth',
            'pro': 'pro'
          }

          const mappedPlan = planMapping[plan] || 'free'
          console.log('Plan mapping:', plan, '->', mappedPlan)

          // Calculate SMS limits based on plan
          const smsLimits = {
            'free': 25,
            'starter': 300,
            'growth': 1000,
            'pro': 3000
          }

          const smsLimit = smsLimits[plan] || 25
          console.log('SMS limit for plan:', plan, '=', smsLimit)

          // Try to find user by x_user_id first, then by internal UUID id if needed
          let userData = null
          let updateError = null
          
          // Check if userId looks like a UUID (internal database ID) vs X user ID (numeric string)
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
          const isXUserId = /^\d+$/.test(userId)
          
          if (isXUserId) {
            // This is an X user ID, use x_user_id field
            console.log('X user ID detected, searching by x_user_id:', userId)
            const { data: userData1, error: error1 } = await supabaseAdmin
              .from('users')
              .update({
                plan: mappedPlan,
                sms_limit: smsLimit
              })
              .eq('x_user_id', userId)
              .select()
              
            userData = userData1
            updateError = error1
          } else if (isUUID) {
            // This is an internal database ID, use id field
            console.log('Internal database ID detected, searching by id:', userId)
            const { data: userData2, error: error2 } = await supabaseAdmin
              .from('users')
              .update({
                plan: mappedPlan,
                sms_limit: smsLimit
              })
              .eq('id', userId)
              .select()
              
            userData = userData2
            updateError = error2
          } else {
            console.error('Unknown user ID format:', userId)
            updateError = { message: 'Unknown user ID format' }
          }

          if (updateError) {
            console.error('Failed to update user subscription:', updateError)
            console.error('Error details:', {
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              userId: userId,
              isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
            })
          } else {
            console.log('User subscription updated successfully in Supabase:', userData)
          }
        } catch (error) {
          console.error('Error updating user subscription:', error)
          console.error('Error stack:', error.stack)
        }
        
        console.log('User subscription activated:', {
          userId: session.metadata.userId,
          plan: session.metadata.plan,
          customerId: session.customer
        })
        break

      case 'checkout.session.async_payment_succeeded':
        console.log('Async payment succeeded for session:', event.data.object.id)
        break

      case 'checkout.session.async_payment_failed':
        console.log('Async payment failed for session:', event.data.object.id)
        break

      case 'customer.subscription.created':
        const subscription = event.data.object
        console.log('Subscription created:', subscription.id)
        break

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object
        console.log('Subscription updated:', updatedSubscription.id)
        
        // Handle subscription cancellation
        if (updatedSubscription.cancel_at_period_end) {
          try {
            const { userId } = updatedSubscription.metadata
            
            if (userId) {
              const { data, error } = await supabaseAdmin
                .from('users')
                .update({
                  subscription_status: 'canceling',
                  subscription_cancel_at: new Date(updatedSubscription.current_period_end * 1000).toISOString()
                })
                .eq('x_user_id', userId)
                .select()

              if (error) {
                console.error('Failed to update subscription status:', error)
              } else {
                console.log('User subscription marked as canceling:', data)
              }
            }
          } catch (error) {
            console.error('Error updating subscription status:', error)
          }
        }
        break

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object
        console.log('Subscription deleted:', deletedSubscription.id)
        
        // Update user to free plan when subscription is deleted
        try {
          const { userId } = deletedSubscription.metadata
          
          if (userId) {
            const { data, error } = await supabaseAdmin
              .from('users')
              .update({
                plan: 'free',
                sms_limit: 25,
                subscription_status: 'canceled'
              })
              .eq('x_user_id', userId)
              .select()

            if (error) {
              console.error('Failed to update user to free plan:', error)
            } else {
              console.log('User updated to free plan after subscription deletion:', data)
            }
          }
        } catch (error) {
          console.error('Error updating user after subscription deletion:', error)
        }
        break

      case 'invoice.payment_succeeded':
        const invoice = event.data.object
        console.log('Payment succeeded:', invoice.id)
        break

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object
        console.log('Payment failed:', failedInvoice.id)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    res.status(500).json({ error: 'Webhook handler failed' })
  }
} 