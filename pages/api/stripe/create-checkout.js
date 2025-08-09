import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

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

    // Define plan configurations
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

    const selectedPlan = plans[plan]
    if (!selectedPlan) {
      return res.status(400).json({ error: 'Invalid plan selected' })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
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
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?canceled=true`,
      customer_email: validEmail,
      metadata: {
        userId: userId,
        plan: plan
      },
      subscription_data: {
        metadata: {
          userId: userId,
          plan: plan
        }
      }
    })

    res.status(200).json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    })
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      details: error.message 
    })
  }
} 