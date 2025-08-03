import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const GOALS = [
  { id: 'leads', label: 'Get leads', description: 'Find potential customers mentioning your industry' },
  { id: 'followers', label: 'Grow followers', description: 'Engage with people interested in your niche' },
  { id: 'competitors', label: 'Monitor competitors', description: 'Track mentions of your competitors' },
  { id: 'custom', label: 'Custom alerts', description: 'Set up your own specific keyword alerts' }
]

const PLANS = [
  { id: 'starter', name: 'Starter', price: 9, sms_limit: 300, features: ['Basic alerts', 'SMS notifications', 'Email support'] },
  { id: 'pro', name: 'Pro', price: 29, sms_limit: 1000, features: ['Advanced filters', 'Priority support', 'Analytics'] },
  { id: 'team', name: 'Team', price: 99, sms_limit: 5000, features: ['Team management', 'API access', 'Dedicated support'] }
]

export default function Onboarding() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedGoal, setSelectedGoal] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('starter')
  
  const { register, handleSubmit, formState: { errors } } = useForm()

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!session) {
    router.push('/login')
    return null
  }

  const handleGoalSelect = (goalId) => {
    setSelectedGoal(goalId)
    setStep(2)
  }

  const handleContactSubmit = async (data) => {
    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          email: data.email
        })
      })

      if (response.ok) {
        setStep(3)
      } else {
        toast.error('Failed to save contact information')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }

  const handlePlanSelect = async (planId) => {
    setSelectedPlan(planId)
    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId })
      })

      if (response.ok) {
        // Redirect to Stripe checkout
        const checkoutResponse = await fetch('/api/stripe/create-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId })
        })

        if (checkoutResponse.ok) {
          const { url } = await checkoutResponse.json()
          window.location.href = url
        } else {
          toast.error('Failed to create checkout session')
        }
      } else {
        toast.error('Failed to update plan')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {step} of 3</span>
            <span className="text-sm text-gray-500">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Goal Selection */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">What's your goal?</h1>
            <p className="text-gray-600 mb-6">Choose the primary reason you want X alerts</p>
            
            <div className="space-y-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => handleGoalSelect(goal.id)}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium">{goal.label}</div>
                  <div className="text-sm text-gray-600">{goal.description}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Contact Information */}
        {step === 2 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">How should we notify you?</h1>
            <p className="text-gray-600 mb-6">We'll send alerts via SMS and/or email</p>
            
            <form onSubmit={handleSubmit(handleContactSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number (SMS)</label>
                <input
                  type="tel"
                  {...register('phone', { 
                    required: 'Phone number is required',
                    pattern: {
                      value: /^\+?[1-9]\d{1,14}$/,
                      message: 'Please enter a valid phone number'
                    }
                  })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1234567890"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email (optional)</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        )}

        {/* Step 3: Plan Selection */}
        {step === 3 && (
          <div>
            <h1 className="text-2xl font-bold mb-2">Choose your plan</h1>
            <p className="text-gray-600 mb-6">Start with Starter, upgrade anytime</p>
            
            <div className="space-y-4">
              {PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`w-full p-4 text-left border rounded-lg transition-colors ${
                    selectedPlan === plan.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-sm text-gray-600">{plan.sms_limit} SMS/month</div>
                    </div>
                    <div className="text-lg font-bold">${plan.price}/mo</div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {plan.features.map((feature, index) => (
                      <li key={index}>• {feature}</li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 