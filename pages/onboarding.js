import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

// Add Stripe script to head
const loadStripe = () => {
  if (typeof window !== 'undefined' && !window.Stripe) {
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    document.head.appendChild(script)
  }
}

export default function Onboarding() {
  const [user, setUser] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)

  const [isCompleting, setIsCompleting] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isCreatingBusinessProfile, setIsCreatingBusinessProfile] = useState(false)
  const [formData, setFormData] = useState({
    goal: 'leads', // Pre-select first option
    plan: 'starter',
    companyName: '',
    businessDescription: '',
    websiteUrl: ''
  })
  const [validationErrors, setValidationErrors] = useState({})
  const [touchedFields, setTouchedFields] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get user from session cookie
    const getUserFromSession = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          if (key && value) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        }, {})
        
        if (cookies.x_session) {
          try {
            const sessionData = JSON.parse(cookies.x_session)
            setUser(sessionData.user)
          } catch (error) {
            console.error('Error parsing session:', error)
            router.push('/?error=invalid_session')
          }
        } else {
          router.push('/?error=no_session')
        }
        setIsLoading(false)
      }
    }

    getUserFromSession()
  }, [router])

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }



  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    
    try {
      // Save user data to Supabase
      const response = await fetch('/api/users/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id || 'unknown',
          username: user?.username || 'unknown',
          goal: formData.goal,
          plan: formData.plan
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save user data')
      }

      console.log('User data saved to Supabase:', data)

              // Create business profile if company name is provided
        if (formData.companyName.trim()) {
          setIsCreatingBusinessProfile(true)
          try {
          
          const businessResponse = await fetch('/api/business-profile/create-enhanced', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user?.id || 'unknown',
              companyName: formData.companyName,
              websiteUrl: formData.websiteUrl,
              businessDescription: formData.businessDescription
            })
          })

          const businessData = await businessResponse.json()
          
          if (!businessResponse.ok) {
            console.error('Failed to create business profile:', businessData.error)
            // Continue anyway - business profile is optional
          } else {
            console.log('Business profile created:', businessData.businessProfile)
          }
        } catch (error) {
          console.error('Error creating business profile:', error)
          // Continue anyway - business profile is optional
        } finally {
          setIsCreatingBusinessProfile(false)
        }
      }

      // Set onboarding completion cookie for all plans
      document.cookie = 'onboarding_completed=true; Path=/; Secure; SameSite=Strict; Max-Age=31536000'
      


      // All plans now go through Stripe checkout
      await handleStripeCheckout()
    } catch (error) {
      console.error('Error saving user data:', error)
      alert('Failed to save your information. Please try again.')
      setIsCompleting(false)
    }
  }

  const handleStripeCheckout = async () => {
    setIsProcessingPayment(true)
    
    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: formData.plan,
          userId: user?.id || 'unknown',
          userEmail: user?.email || 'user@earlyreply.app'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Load Stripe
      loadStripe()
      
      // Wait for Stripe to load
      await new Promise(resolve => {
        const checkStripe = () => {
          if (window.Stripe) {
            resolve()
          } else {
            setTimeout(checkStripe, 100)
          }
        }
        checkStripe()
      })

      // Redirect to Stripe checkout
      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Stripe checkout error:', error)
      alert('Payment setup failed. Please try again.')
      setIsProcessingPayment(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }))
    validateField(field, formData[field])
  }





  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.goal !== ''
      case 2:
        return formData.companyName.trim() !== '' // Company name is required
      case 3:
        return formData.plan !== ''
      default:
        return false
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C2E]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16D9E3] mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <script src="https://js.stripe.com/v3/" async></script>
      </Head>
      <div className="min-h-screen bg-[#0F1C2E]">
      {/* Header */}
      <div className="bg-[#0F1C2E]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://lfvokdiatflpxnohmofo.supabase.co/storage/v1/object/sign/earlyreply/Untitled%20design-21.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OGNkMmM5Zi1jNDJlLTQ2NTgtYTMxNi1hM2ZkNTU2MjFhMjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlYXJseXJlcGx5L1VudGl0bGVkIGRlc2lnbi0yMS5wbmciLCJpYXQiOjE3NTQzMjQyODEsImV4cCI6MTc4NTg2MDI4MX0.0u_q6EYDmSciW3Fr8Ty3f-0PuUEY_e5Ea-zvIMJJiV4"
                alt="EarlyReply Logo"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">EarlyReply</span>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white truncate max-w-32">{user.name}</p>
                  <p className="text-xs text-white/60 truncate max-w-32">@{user.username}</p>
                </div>
                {user.image && (
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/60">Step {currentStep} of 3</span>
            <span className="text-sm text-white/60">{Math.round((currentStep / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-white/40 mt-2 text-center">
            Goal → Company → Plan
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 shadow-lg">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">What's your goal?</h2>
              <p className="text-white/70 mb-8">Help us customize your AI-powered auto-reply experience</p>
              
              <div className="space-y-4">
                {[
                  { value: 'leads', label: 'Get Leads', description: 'Find potential customers and generate sales opportunities', icon: '🎯' },
                  { value: 'engagement', label: 'Increase Engagement', description: 'Build relationships and grow your audience', icon: '📈' },
                  { value: 'brand', label: 'Build Brand Awareness', description: 'Establish your brand voice and presence', icon: '🌟' },
                  { value: 'support', label: 'Customer Support', description: 'Help customers and provide value', icon: '💬' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFormData('goal', option.value)}
                    className={`w-full p-4 rounded-lg border transition-all duration-200 text-left cursor-pointer ${
                      formData.goal === option.value
                        ? 'border-[#16D9E3] bg-[#16D9E3]/10 shadow-lg shadow-[#16D9E3]/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{option.icon}</span>
                      <div>
                        <h3 className="font-semibold text-white">{option.label}</h3>
                        <p className="text-sm text-white/60">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm">
                  🤖 Our AI will automatically reply to relevant tweets with personalized, helpful responses that match your goal.
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Tell us about your business</h2>
              <p className="text-white/70 mb-8">Help our AI create personalized replies for your brand</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Company Name *</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => updateFormData('companyName', e.target.value)}
                    placeholder="Your Company Name"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Your company name will be used in AI-generated replies and business profile.
                  </p>
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Website URL</label>
                  <input
                    type="url"
                    value={formData.websiteUrl}
                    onChange={(e) => updateFormData('websiteUrl', e.target.value)}
                    placeholder="https://yourcompany.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Optional: Our AI can analyze your website to better understand your business and generate more relevant replies.
                  </p>
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Business Description</label>
                  <textarea
                    value={formData.businessDescription}
                    onChange={(e) => updateFormData('businessDescription', e.target.value)}
                    placeholder="Describe your business, products, services, or what you do. For example: 'We help small businesses automate their social media marketing with AI-powered tools that save time and increase engagement.'"
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors resize-none"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    This helps our AI understand your business and generate relevant, helpful replies to potential customers. Optional but recommended for better results.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    🤖 Our AI will analyze your website and business description to create a comprehensive profile for generating personalized, helpful replies.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose your plan</h2>
              <p className="text-white/70 mb-8">Choose the plan that fits your needs</p>
              <p className="text-xs text-white/60 mb-6 text-center">Change or cancel anytime. You'll only be charged after your 7-day trial.</p>
              
              <div className="space-y-4">
                {[
                  { 
                    value: 'starter', 
                    label: 'Starter', 
                    price: '$29 / mo',
                    texts: '100 auto-replies / month',
                    keywords: '3 keyword sets',
                    features: ['AI-powered auto-replies', 'Core relevance & safety filters', 'Email support']
                  },
                  { 
                    value: 'growth', 
                    label: 'Growth', 
                    price: '$79 / mo',
                    texts: '300 auto-replies / month',
                    keywords: '10 keyword sets',
                    features: ['AI-powered auto-replies', 'Priority posting window (5-min freshness)', 'Priority support'],
                    popular: true
                  },
                  { 
                    value: 'pro', 
                    label: 'Pro', 
                    price: '$149 / mo',
                    texts: '1,000 auto-replies / month',
                    keywords: '30 keyword sets',
                    features: ['AI-powered auto-replies', 'Advanced filters for safe, on-brand replies', 'Dedicated support']
                  }
                ].map((plan) => (
                  <button
                    key={plan.value}
                    onClick={() => updateFormData('plan', plan.value)}
                    className={`w-full p-6 rounded-lg border transition-all duration-200 text-left hover:scale-[1.02] ${
                      formData.plan === plan.value
                        ? 'border-[#16D9E3] bg-[#16D9E3]/10'
                        : plan.popular
                        ? 'border-[#FF6B4A]/30 bg-white/5 hover:bg-white/10 hover:ring-1 hover:ring-[#FF6B4A]/50 shadow-lg shadow-[#FF6B4A]/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10 hover:ring-1 hover:ring-[#16D9E3]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{plan.label}</h3>
                        <p className="text-2xl font-bold text-[#16D9E3]">{plan.price}</p>
                      </div>
                      {plan.popular && (
                        <span className="px-2 py-1 bg-[#FF6B4A] text-white text-xs rounded-full">Popular</span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-white/80">{plan.texts}</p>
                      <p className="text-white/80">{plan.keywords}</p>
                    </div>
                    
                    <ul className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="text-sm text-white/60 flex items-center">
                          <span className="text-[#16D9E3] mr-2">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 text-white/60 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            
            <div className="flex flex-col items-end space-y-2">
              <button
                onClick={handleNext}
                disabled={!isStepValid() || isCompleting || isProcessingPayment}
                className={`px-8 py-3 font-semibold rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                  isStepValid() && !isCompleting && !isProcessingPayment
                    ? 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] hover:scale-105' 
                    : 'bg-white/20 text-white/40 cursor-not-allowed'
                }`}
              >
                {isCompleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F1C2E]"></div>
                    <span>Creating your account...</span>
                  </>
                ) : isProcessingPayment ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F1C2E]"></div>
                    <span>Setting up payment...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {currentStep === 3 
                        ? `Start ${formData.plan.charAt(0).toUpperCase() + formData.plan.slice(1)} Plan`
                        : 'Continue'
                      }
                    </span>
                    {isStepValid() && <span>→</span>}
                  </>
                )}
              </button>
              {currentStep === 1 && (
                <button
                  onClick={handleNext}
                  className="text-xs text-white/50 hover:text-white/70 transition-colors underline"
                >
                  Skip for now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
} 