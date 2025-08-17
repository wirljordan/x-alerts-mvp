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
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [isCreatingBusinessProfile, setIsCreatingBusinessProfile] = useState(false)
  const [formData, setFormData] = useState({
    goal: 'leads', // Pre-select first option
    phone: '',
    email: '',
    plan: 'free',
    businessDescription: ''
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
    if (currentStep === 2) {
      if (!validateStep2()) {
        return
      }
      // Send verification code when moving to step 3
      const sent = await sendVerificationCode()
      if (!sent) {
        // Could show an error message here
        return
      }
    } else if (currentStep === 3) {
      const isValid = await validateVerificationCode()
      if (!isValid) {
        return
      }
    }
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const sendVerificationCode = async () => {
    try {
      const response = await fetch('/api/verify/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone
        })
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Failed to send verification code:', data.error)
        // You could show an error message to the user here
        return false
      }

      console.log('Verification code sent successfully:', data)
      return true
    } catch (error) {
      console.error('Error sending verification code:', error)
      return false
    }
  }

  const validateVerificationCode = async () => {
    if (!verificationCode.trim()) {
      setValidationErrors(prev => ({ ...prev, verificationCode: 'Please enter the verification code' }))
      return false
    }
    if (verificationCode.length !== 6) {
      setValidationErrors(prev => ({ ...prev, verificationCode: 'Verification code must be 6 digits' }))
      return false
    }

    try {
      setIsVerifying(true)
      const response = await fetch('/api/verify/check-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          code: verificationCode
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setValidationErrors(prev => ({ ...prev, verificationCode: data.error }))
        return false
      }

      setValidationErrors(prev => ({ ...prev, verificationCode: null }))
      return true
    } catch (error) {
      console.error('Error verifying code:', error)
      setValidationErrors(prev => ({ ...prev, verificationCode: 'Failed to verify code. Please try again.' }))
      return false
    } finally {
      setIsVerifying(false)
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
          email: formData.email,
          phone: formData.phone,
          goal: formData.goal,
          plan: formData.plan
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save user data')
      }

      console.log('User data saved to Supabase:', data)

      // Create business profile if description is provided
      if (formData.businessDescription.trim()) {
        setIsCreatingBusinessProfile(true)
        try {
          const businessResponse = await fetch('/api/business-profile/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user?.id || 'unknown',
              siteText: formData.businessDescription
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
      
      // Store user email in session for Stripe
      if (formData.email) {
        const currentSession = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          if (key && value) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        }, {})
        
        if (currentSession.x_session) {
          try {
            const sessionData = JSON.parse(currentSession.x_session)
            sessionData.user.email = formData.email
            document.cookie = `x_session=${JSON.stringify(sessionData)}; Path=/; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7}`
          } catch (error) {
            console.error('Error updating session with email:', error)
          }
        }
      }

      if (formData.plan === 'free') {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        router.push('/dashboard')
      } else {
        // For paid plans, redirect to Stripe checkout
        await handleStripeCheckout()
      }
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
          userEmail: formData.email
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

  const validateField = (field, value) => {
    let error = null
    
    if (field === 'phone') {
      if (!value.trim()) {
        error = 'Phone number is required'
      } else {
        // More strict phone validation - requires at least 10 digits
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '')
        if (cleanPhone.length < 10) {
          error = 'Phone number must be at least 10 digits'
        } else if (!/^[\+]?[1-9][\d]{9,15}$/.test(cleanPhone)) {
          error = 'Please enter a valid phone number'
        }
      }
    } else if (field === 'email') {
      if (value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          error = 'Please enter a valid email address'
        }
      }
    }
    
    setValidationErrors(prev => ({ ...prev, [field]: error }))
    return !error
  }

  const validateStep2 = () => {
    const phoneValid = validateField('phone', formData.phone)
    const emailValid = validateField('email', formData.email)
    
    // At least one contact method is required
    if (!formData.phone.trim() && !formData.email.trim()) {
      setValidationErrors(prev => ({ 
        ...prev, 
        phone: 'Please provide either a phone number or email address',
        email: 'Please provide either a phone number or email address'
      }))
      return false
    }
    
    return phoneValid && emailValid
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.goal !== ''
      case 2:
        const hasContact = formData.phone.trim() !== '' || formData.email.trim() !== ''
        const noErrors = !validationErrors.phone && !validationErrors.email
        return hasContact && noErrors
      case 3:
        return verificationCode.length === 6 && !validationErrors.verificationCode
      case 4:
        return true // Business description is optional
      case 5:
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
            <span className="text-sm text-white/60">Step {currentStep} of 5</span>
            <span className="text-sm text-white/60">{Math.round((currentStep / 5) * 100)}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-white/40 mt-2 text-center">
            Goal → Contact → Verify → Business → Plan
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 shadow-lg">
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">What's your goal?</h2>
              <p className="text-white/70 mb-8">Help us customize your experience</p>
              
              <div className="space-y-4">
                {[
                  { value: 'leads', label: 'Get Leads', description: 'Find potential customers and sales opportunities', icon: '🎯' },
                  { value: 'followers', label: 'Grow Followers', description: 'Build your audience and increase engagement', icon: '📈' },
                  { value: 'news', label: 'Stay Updated', description: 'Keep track of industry news and trends', icon: '📰' },
                  { value: 'competition', label: 'Monitor Competition', description: 'Track competitors and market movements', icon: '👀' }
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
              

            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">How should we notify you?</h2>
              <p className="text-white/70 mb-8">Choose how you want to receive alerts</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Phone Number (SMS) *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    onBlur={() => handleFieldBlur('phone')}
                    placeholder="+1 (555) 123-4567"
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none transition-colors ${
                      validationErrors.phone && touchedFields.phone
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/20 focus:border-[#16D9E3]'
                    }`}
                  />
                  {validationErrors.phone && touchedFields.phone ? (
                    <p className="text-xs text-red-400 mt-1">{validationErrors.phone}</p>
                  ) : (
                    <p className="text-xs text-white/70 mt-1">We'll send a one-time verification code</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    onBlur={() => handleFieldBlur('email')}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none transition-colors ${
                      validationErrors.email && touchedFields.email
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/20 focus:border-[#16D9E3]'
                    }`}
                  />
                  {validationErrors.email && touchedFields.email ? (
                    <p className="text-xs text-red-400 mt-1">{validationErrors.email}</p>
                  ) : (
                    <p className="text-xs text-white/70 mt-1">Optional: Receive email summaries</p>
                  )}
                </div>
                
                <div className="pt-2">
                  <p className="text-xs text-white/60 text-center">
                    We'll never share your contact info. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Verify your contact</h2>
              <p className="text-white/70 mb-8">We've sent a verification code to your contact method</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Verification Code</label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => {
                      setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      if (validationErrors.verificationCode) {
                        setValidationErrors(prev => ({ ...prev, verificationCode: null }))
                      }
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className={`w-full px-4 py-3 bg-white/10 border rounded-lg text-white placeholder-white/40 focus:outline-none transition-colors text-center text-2xl tracking-widest ${
                      validationErrors.verificationCode
                        ? 'border-red-400 focus:border-red-400'
                        : 'border-white/20 focus:border-[#16D9E3]'
                    }`}
                  />
                  {validationErrors.verificationCode ? (
                    <p className="text-xs text-red-400 mt-1 text-center">{validationErrors.verificationCode}</p>
                  ) : (
                    <p className="text-xs text-white/70 mt-1 text-center">Enter the 6-digit code we sent you</p>
                  )}
                </div>
                
                <div className="pt-2">
                  <p className="text-xs text-white/60 text-center">
                    Didn't receive the code or need a new one? <button 
                      onClick={async () => {
                        const sent = await sendVerificationCode()
                        if (sent) {
                          alert('Verification code resent!')
                        } else {
                          alert('Failed to resend code. Please try again.')
                        }
                      }}
                      className="text-[#16D9E3] hover:underline"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Tell us about your business</h2>
              <p className="text-white/70 mb-8">Help us create personalized AI replies for your brand</p>
              
              <div className="space-y-6">
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
                
                <div className="pt-2">
                  <p className="text-xs text-white/60 text-center">
                    💡 The more specific you are, the better our AI can help you engage with potential customers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose your plan</h2>
              <p className="text-white/70 mb-8">Start free, upgrade when you need more</p>
              <p className="text-xs text-white/60 mb-6 text-center">Change or cancel anytime. You'll only be charged after your 7-day trial.</p>
              
              <div className="space-y-4">
                {[
                  { 
                    value: 'free', 
                    label: 'Free', 
                    price: 'Free',
                    texts: '10 SMS / mo',
                    keywords: '1 keyword tracked',
                    features: ['Basic monitoring', 'SMS notifications', 'Email support']
                  },
                  { 
                    value: 'starter', 
                    label: 'Starter', 
                    price: '$9 / mo',
                    texts: '100 SMS / mo',
                    keywords: '3 keywords tracked',
                    features: ['Basic monitoring', 'SMS notifications', 'Email support']
                  },
                  { 
                    value: 'growth', 
                    label: 'Growth', 
                    price: '$19 / mo',
                    texts: '300 SMS / mo',
                    keywords: '10 keywords tracked',
                    features: ['Advanced monitoring', 'Priority notifications', 'Priority support'],
                    popular: true
                  },
                  { 
                    value: 'pro', 
                    label: 'Pro', 
                    price: '$49 / mo',
                    texts: '1,000 SMS / mo',
                    keywords: '30 keywords tracked',
                    features: ['Team collaboration', 'Custom integrations', 'Dedicated support']
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
                      {currentStep === 4 
                        ? (formData.plan === 'free' ? 'Complete Setup' : `Start ${formData.plan.charAt(0).toUpperCase() + formData.plan.slice(1)} Plan`)
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