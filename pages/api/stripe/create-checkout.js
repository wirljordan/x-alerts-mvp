import Stripe from 'stripe'
import { supabaseAdmin } from '../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Plan configurations
const plans = {
  starter: {
    price: 900, // $9.00 in cents
    name: 'Starter Plan',
    description: '3 keywords tracked, 100 SMS/month'
  },
  growth: {
    price: 1900, // $19.00 in cents
    name: 'Growth Plan',
    description: '10 keywords tracked, 300 SMS/month'
  },
  pro: {
    price: 4900, // $49.00 in cents
    name: 'Pro Plan',
    description: '30 keywords tracked, 1,000 SMS/month'
  }
}

// Calculate proration for plan upgrades
async function calculateProration(userId, newPlan) {
  try {
    // Get user's current subscription info
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('stripe_customer_id, plan')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.log('User not found or no stripe_customer_id, treating as new subscription')
      return { isUpgrade: false, prorationAmount: 0, currentPlan: null }
    }

    if (!user.stripe_customer_id || user.plan === 'free') {
      console.log('No existing subscription, treating as new subscription')
      return { isUpgrade: false, prorationAmount: 0, currentPlan: null }
    }

    // Get current subscription from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    })

    if (subscriptions.data.length === 0) {
      console.log('No active subscription found, treating as new subscription')
      return { isUpgrade: false, prorationAmount: 0, currentPlan: null }
    }

    const currentSubscription = subscriptions.data[0]
    const currentPlan = user.plan

    // Check if this is actually an upgrade
    const planHierarchy = { 'free': 0, 'starter': 1, 'growth': 2, 'pro': 3 }
    const currentPlanLevel = planHierarchy[currentPlan] || 0
    const newPlanLevel = planHierarchy[newPlan] || 0

    if (newPlanLevel <= currentPlanLevel) {
      console.log('Not an upgrade, treating as new subscription')
      return { isUpgrade: false, prorationAmount: 0, currentPlan: null }
    }

    console.log(`Upgrade detected: ${currentPlan} (${currentPlanLevel}) -> ${newPlan} (${newPlanLevel})`)

    // Calculate proration
    const currentPrice = plans[currentPlan]?.price || 0
    const newPrice = plans[newPlan]?.price || 0

    if (currentPrice === 0) {
      console.log('Current plan has no price, no proration needed')
      return { isUpgrade: true, prorationAmount: 0, currentPlan, currentSubscription }
    }

    // Calculate remaining days in current billing period
    const now = new Date()
    const currentPeriodEnd = new Date(currentSubscription.current_period_end * 1000)
    const remainingDays = Math.max(0, (currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
    const totalDaysInPeriod = 30 // Assuming monthly billing

    // Calculate prorated credit for remaining days
    const dailyRate = currentPrice / totalDaysInPeriod
    const prorationCredit = Math.round(dailyRate * remainingDays)

    console.log(`Proration calculation: ${remainingDays} days remaining, $${(prorationCredit/100).toFixed(2)} credit`)

    return {
      isUpgrade: true,
      prorationAmount: prorationCredit,
      currentPlan,
      currentSubscription,
      remainingDays: Math.round(remainingDays)
    }

  } catch (error) {
    console.error('Error calculating proration:', error)
    return { isUpgrade: false, prorationAmount: 0, currentPlan: null }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Debug: Check if environment variables are loaded
  console.log('Environment check:', {
    hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
    stripeKeyLength: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.length : 0,
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL
  })

  try {
    // Check if Stripe key is available
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set')
      return res.status(500).json({ 
        error: 'Stripe configuration error',
        details: 'API key not configured'
      })
    }

    const { plan, userId, userEmail } = req.body

    // Validate and fix email
    let validEmail = userEmail
    if (!validEmail || validEmail === 'unknown' || !validEmail.includes('@')) {
      // Extract username from userId or use a default
      const username = userId && userId !== 'unknown' ? userId : 'user'
      validEmail = `${username}@earlyreply.app`
    }

    console.log('Email validation:', { original: userEmail, valid: validEmail })

    const selectedPlan = plans[plan]
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' })
    }

    // Calculate proration for upgrades
    const proration = await calculateProration(userId, plan)
    console.log('Proration result:', proration)

    // Prepare line items
    const lineItems = []

    if (proration.isUpgrade && proration.prorationAmount > 0) {
      // Add proration credit as a negative line item
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Credit for remaining ${proration.remainingDays} days on ${proration.currentPlan} plan`,
            description: `Prorated credit applied to upgrade`,
          },
          unit_amount: -proration.prorationAmount, // Negative amount for credit
        },
        quantity: 1,
      })
    }

    // Add the new subscription
    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: selectedPlan.name,
          description: selectedPlan.description,
        },
        unit_amount: selectedPlan.price,
        recurring: {
          interval: 'month',
        },
      },
      quantity: 1,
    })

    // Create Stripe checkout session
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?canceled=true`,
      customer_email: validEmail,
      metadata: {
        userId: userId,
        plan: plan,
        isUpgrade: proration.isUpgrade.toString(),
        prorationAmount: proration.prorationAmount.toString()
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan,
          isUpgrade: proration.isUpgrade.toString()
        }
      }
    }

    // If this is an upgrade, add subscription update logic
    if (proration.isUpgrade && proration.currentSubscription) {
      sessionConfig.subscription_data = {
        ...sessionConfig.subscription_data,
        // This will be handled in the webhook
        metadata: {
          ...sessionConfig.subscription_data.metadata,
          currentSubscriptionId: proration.currentSubscription.id
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)

    console.log(`Checkout session created: ${session.id}, Upgrade: ${proration.isUpgrade}, Proration: $${(proration.prorationAmount/100).toFixed(2)}`)

    res.status(200).json({ 
      sessionId: session.id,
      isUpgrade: proration.isUpgrade,
      prorationAmount: proration.prorationAmount,
      remainingDays: proration.remainingDays
    })

  } catch (error) {
    console.error('Stripe checkout error:', error)
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    })
  }
} 