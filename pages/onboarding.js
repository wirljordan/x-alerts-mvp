import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Onboarding() {
  const [user, setUser] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    goal: '',
    phone: '',
    email: '',
    plan: 'starter'
  })
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

  const handleNext = () => {
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
    // TODO: Save user data to database
    console.log('Onboarding completed:', formData)
    
    // Set onboarding completion cookie
    document.cookie = 'onboarding_completed=true; Path=/; Secure; SameSite=Strict; Max-Age=31536000'
    
    router.push('/dashboard')
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.goal !== ''
      case 2:
        return formData.phone !== '' || formData.email !== ''
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
              <h1 className="text-xl font-bold text-white">EarlyReply</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/60">@{user.username}</p>
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
              className="bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            ></div>
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
                    className={`w-full p-4 rounded-lg border transition-all duration-200 text-left ${
                      formData.goal === option.value
                        ? 'border-[#16D9E3] bg-[#16D9E3]/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
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
                  <label className="block text-white font-medium mb-2">Phone Number (SMS)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                  />
                  <p className="text-xs text-white/60 mt-1">We'll send SMS notifications for instant alerts</p>
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                  />
                  <p className="text-xs text-white/60 mt-1">Optional: Receive email summaries</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose your plan</h2>
              <p className="text-white/70 mb-8">Start free, upgrade when you need more</p>
              
              <div className="space-y-4">
                {[
                  { 
                    value: 'starter', 
                    label: 'Starter', 
                    price: 'Free',
                    texts: '100 SMS/month',
                    alerts: '3 alerts',
                    features: ['Basic monitoring', 'SMS notifications', 'Email support']
                  },
                  { 
                    value: 'pro', 
                    label: 'Pro', 
                    price: '$19/month',
                    texts: '1,000 SMS/month',
                    alerts: '10 alerts',
                    features: ['Advanced monitoring', 'Priority notifications', 'Priority support', 'Analytics']
                  },
                  { 
                    value: 'team', 
                    label: 'Team', 
                    price: '$49/month',
                    texts: '5,000 SMS/month',
                    alerts: 'Unlimited alerts',
                    features: ['Team collaboration', 'API access', 'Custom integrations', 'Dedicated support']
                  }
                ].map((plan) => (
                  <button
                    key={plan.value}
                    onClick={() => updateFormData('plan', plan.value)}
                    className={`w-full p-6 rounded-lg border transition-all duration-200 text-left ${
                      formData.plan === plan.value
                        ? 'border-[#16D9E3] bg-[#16D9E3]/10'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white">{plan.label}</h3>
                        <p className="text-2xl font-bold text-[#16D9E3]">{plan.price}</p>
                      </div>
                      {plan.value === 'pro' && (
                        <span className="px-2 py-1 bg-[#FF6B4A] text-white text-xs rounded-full">Popular</span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <p className="text-white/80">{plan.texts}</p>
                      <p className="text-white/80">{plan.alerts}</p>
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
            
            <button
              onClick={handleNext}
              disabled={!isStepValid()}
              className="px-8 py-3 bg-[#16D9E3] hover:bg-[#16D9E3]/90 disabled:bg-white/20 disabled:cursor-not-allowed text-[#0F1C2E] font-semibold rounded-lg transition-colors"
            >
              {currentStep === 3 ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 