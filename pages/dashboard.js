import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [usage, setUsage] = useState({ used: 0, limit: 300 })
  const [alerts, setAlerts] = useState([])
  const [currentPlan, setCurrentPlan] = useState('free') // free, starter, growth, pro
  const router = useRouter()

  useEffect(() => {
    // Handle Stripe success redirect
    const handleStripeSuccess = () => {
      console.log('Dashboard loaded with query:', router.query)
      
      if (router.query.success === 'true' && router.query.session_id) {
        console.log('Stripe success detected! Setting onboarding cookie...')
        
        // Set onboarding completion cookie for successful payments
        document.cookie = 'onboarding_completed=true; Path=/; Secure; SameSite=Strict; Max-Age=31536000'
        
        // Show success message
        console.log('Payment successful! Session ID:', router.query.session_id)
        setShowSuccessMessage(true)
        
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccessMessage(false), 5000)
        
        // Clean up URL
        router.replace('/dashboard', undefined, { shallow: true })
      }
    }

    // Get user from session cookie and fetch data from Supabase
    const getUserFromSession = async () => {
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
            
            // Check if user has completed onboarding
            const hasCompletedOnboarding = cookies.onboarding_completed === 'true'
            console.log('Onboarding completion check:', { hasCompletedOnboarding, cookies })
            
            if (!hasCompletedOnboarding) {
              console.log('No onboarding completion cookie found, redirecting to onboarding')
              router.push('/onboarding')
              return
            }
            
            // Fetch user data from Supabase
            if (sessionData.user?.id) {
              try {
                const response = await fetch(`/api/users/get?userId=${sessionData.user.id}`)
                if (response.ok) {
                  const data = await response.json()
                  if (data.success && data.user) {
                    // Update user with Supabase data
                    setUser(prevUser => ({
                      ...prevUser,
                      ...data.user
                    }))
                    
                    // Set current plan from Supabase
                    setCurrentPlan(data.user.plan || 'free')
                  }
                }
              } catch (error) {
                console.error('Error fetching user data from Supabase:', error)
              }
            }
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

    // Handle Stripe success first, then check session
    handleStripeSuccess()
    
    // Small delay to ensure cookie is set if this is a Stripe success
    setTimeout(async () => {
      await getUserFromSession()
    }, 100)
  }, [router])

  const handleSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/')
  }

  const handleAddAlert = () => {
    // For now, add a simple keyword (in a real app, this would open a form)
    const newKeyword = {
      id: Date.now(),
      name: `Keyword ${alerts.length + 1}`,
      status: 'active',
      lastMatch: 'Never'
    }
    setAlerts([...alerts, newKeyword])
  }

  const handleUpgrade = async (plan) => {
    if (plan === currentPlan) return
    
    setShowUpgradeModal(false)
    
    if (plan === 'free') {
      // Handle downgrade to free
      setCurrentPlan('free')
      setUsage({ used: 0, limit: 25 })
      return
    }
    
    // For paid plans, redirect to Stripe checkout
    try {
      // Use real email from session, fallback to username-based email
      const userEmail = user?.email || (user?.username ? `${user.username}@earlyreply.app` : 'user@earlyreply.app')
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          userId: user?.id || 'unknown',
          userEmail: userEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Wait for Stripe to load if not already loaded
      if (typeof window !== 'undefined' && !window.Stripe) {
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
      }

      // Redirect to Stripe checkout
      const stripe = window.Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      })

      if (error) {
        throw new Error(error.message)
      }
    } catch (error) {
      console.error('Upgrade error:', error)
      console.error('Error details:', {
        message: error.message,
        plan: plan,
        userId: user?.id,
        userEmail: user?.email
      })
      alert(`Upgrade failed: ${error.message}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C2E]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16D9E3] mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
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
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 text-center">
          <p className="font-medium">🎉 Payment successful! Your account has been activated.</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0F1C2E]/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 lg:py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 lg:space-x-4">
              <img 
                src="https://lfvokdiatflpxnohmofo.supabase.co/storage/v1/object/sign/earlyreply/Untitled%20design-21.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OGNkMmM5Zi1jNDJlLTQ2NTgtYTMxNi1hM2ZkNTU2MjFhMjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlYXJseXJlcGx5L1VudGl0bGVkIGRlc2lnbi0yMS5wbmciLCJpYXQiOjE3NTQzMjQyODEsImV4cCI6MTc4NTg2MDI4MX0.0u_q6EYDmSciW3Fr8Ty3f-0PuUEY_e5Ea-zvIMJJiV4"
                alt="EarlyReply Logo"
                className="h-8 w-auto lg:h-10"
              />
              <span className="text-xl lg:text-2xl font-bold text-white">EarlyReply</span>
            </div>
            {user && (
              <div className="flex items-center space-x-3 lg:space-x-6">
                <div className="hidden sm:block text-right">
                  <p className="text-sm lg:text-base font-medium text-white">{user.name}</p>
                  <p className="text-xs lg:text-sm text-white/60">@{user.username}</p>
                </div>
                {user.image && (
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="w-8 h-8 lg:w-10 lg:h-10 rounded-full"
                  />
                )}
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Main Dashboard */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Usage Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold text-white">Usage</h2>
                <span className="text-sm lg:text-base text-white/60">{usage.used} sent</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4 lg:mb-6">
                <div className={`w-full bg-white/10 rounded-full h-3 lg:h-4 overflow-hidden ${
                  (usage.used / usage.limit) >= 0.8 ? 'ring-2 ring-orange-500/30' : ''
                }`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      (usage.used / usage.limit) >= 0.8 
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500' 
                        : 'bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80'
                    }`}
                    style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <span className="text-sm lg:text-base text-white/80">
                    {usage.used} / {usage.limit} texts sent
                  </span>
                  {(usage.used / usage.limit) >= 0.8 && (
                    <div className="mt-2">
                      <p className="text-orange-400 text-xs lg:text-sm font-medium">Upgrade for more SMS</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleAddAlert}
                  disabled={alerts.length >= 2} // Assuming 2 is the limit for demo
                  className={`px-4 py-2 lg:px-6 lg:py-3 font-semibold rounded-lg lg:rounded-xl transition-colors duration-200 text-sm lg:text-base ${
                    alerts.length >= 2 
                      ? 'bg-white/20 text-white/40 cursor-not-allowed' 
                      : 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                  }`}
                >
                  Add Alert
                </button>
              </div>
            </div>

            {/* Keywords Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <h2 className="text-lg lg:text-2xl font-semibold text-white mb-4 lg:mb-6">Keywords</h2>
              
              {alerts.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                    <span className="text-[#16D9E3] text-2xl lg:text-3xl">🔔</span>
                  </div>
                  <p className="text-white/60 mb-4 lg:mb-6 text-sm lg:text-base">Create your first keyword</p>
                                      <button
                      onClick={handleAddAlert}
                      className="px-6 py-3 lg:px-8 lg:py-4 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg lg:rounded-xl transition-colors duration-200 text-sm lg:text-base"
                    >
                      Create Your First Keyword
                    </button>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 lg:p-6 bg-white/5 rounded-lg lg:rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-200 cursor-pointer">
                      <div className="flex items-center space-x-3 lg:space-x-4">
                        <div className="w-3 h-3 lg:w-4 lg:h-4 bg-[#16D9E3] rounded-full"></div>
                        <div>
                          <h3 className="font-medium text-white text-sm lg:text-base">{alert.name}</h3>
                          <p className="text-sm lg:text-base text-white/60">Last match: {alert.lastMatch}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 lg:space-x-3">
                        <span className={`px-2 py-1 lg:px-3 lg:py-2 text-xs lg:text-sm rounded-full ${
                          alert.status === 'active' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {alert.status}
                        </span>
                        <div className="relative">
                          <button className="p-1 lg:p-2 text-white/60 hover:text-white transition-colors duration-200">
                            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          {/* Dropdown menu would go here */}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold text-white">Recent Activity</h2>
                <button className="text-sm text-[#16D9E3] hover:text-[#16D9E3]/80 transition-colors duration-200">
                  View all
                </button>
              </div>
                            <div className="space-y-3 lg:space-y-4">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-[#16D9E3] text-lg">📊</span>
                  </div>
                  <p className="text-white/60 text-sm">No activity yet</p>
                  <p className="text-white/40 text-xs mt-1">Your recent activity will appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions & Stats */}
          <div className="space-y-6 lg:space-y-8">
            {/* Quick Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <h3 className="text-lg lg:text-xl font-semibold text-white mb-4 lg:mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <button className="p-4 lg:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                      <span className="text-[#16D9E3] text-xl lg:text-2xl">⚙️</span>
                    </div>
                    <p className="text-white font-medium text-sm lg:text-base">Settings</p>
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="p-4 lg:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300 hover:scale-105"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                      <span className="text-[#FF6B4A] text-xl lg:text-2xl">⬆️</span>
                    </div>
                    <p className="text-white font-medium text-sm lg:text-base">Upgrade</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <h3 className="text-lg lg:text-xl font-semibold text-white mb-4 lg:mb-6">Stats</h3>
              <div className="space-y-4 lg:space-y-6">
                <div className="flex items-center justify-between p-3 lg:p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white/60 text-sm lg:text-base">Keywords</p>
                    <p className="text-white font-semibold text-lg lg:text-xl">{alerts.length}</p>
                  </div>
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#16D9E3]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#16D9E3] text-lg lg:text-xl">🔔</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 lg:p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white/60 text-sm lg:text-base">SMS Sent</p>
                    <p className="text-white font-semibold text-lg lg:text-xl">{usage.used}</p>
                  </div>
                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#FF6B4A] text-lg lg:text-xl">📱</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Upgrade Your Plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p className="text-white/60 text-center">Current: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</p>
            </div>

            <div className="grid md:grid-cols-4 gap-4 lg:gap-6">
              {/* Free Plan */}
              <div className={`p-4 lg:p-6 rounded-xl border transition-all duration-200 ${
                currentPlan === 'free' 
                  ? 'bg-[#16D9E3]/10 border-[#16D9E3]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}>
                <div className="text-center">
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Free</h3>
                  <p className="text-2xl lg:text-3xl font-bold text-white mb-4">$0</p>
                  <div className="text-sm lg:text-base text-white/80 space-y-1 mb-6">
                    <p>1 keyword tracked</p>
                    <p>25 SMS / mo</p>
                  </div>
                  <button
                    disabled={currentPlan === 'free'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      currentPlan === 'free'
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                  </button>
                </div>
              </div>

              {/* Starter Plan */}
              <div className={`p-4 lg:p-6 rounded-xl border transition-all duration-200 ${
                currentPlan === 'starter' 
                  ? 'bg-[#16D9E3]/10 border-[#16D9E3]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}>
                <div className="text-center">
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Starter</h3>
                  <p className="text-2xl lg:text-3xl font-bold text-white mb-4">$9<span className="text-sm font-normal text-white/60">/mo</span></p>
                  <div className="text-sm lg:text-base text-white/80 space-y-1 mb-6">
                    <p>2 keywords tracked</p>
                    <p>300 SMS / mo</p>
                  </div>
                  <button
                    onClick={() => handleUpgrade('starter')}
                    disabled={currentPlan === 'starter'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      currentPlan === 'starter'
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                    }`}
                  >
                    {currentPlan === 'starter' ? 'Current Plan' : currentPlan === 'free' ? 'Upgrade' : 'Downgrade'}
                  </button>
                </div>
              </div>

              {/* Growth Plan */}
              <div className={`p-4 lg:p-6 rounded-xl border transition-all duration-200 ${
                currentPlan === 'growth' 
                  ? 'bg-[#16D9E3]/10 border-[#16D9E3]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}>
                <div className="text-center">
                  <div className="bg-[#FF6B4A] text-white text-xs font-medium px-2 py-1 rounded-full inline-block mb-2">Popular</div>
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Growth</h3>
                  <p className="text-2xl lg:text-3xl font-bold text-white mb-4">$19<span className="text-sm font-normal text-white/60">/mo</span></p>
                  <div className="text-sm lg:text-base text-white/80 space-y-1 mb-6">
                    <p>10 keywords tracked</p>
                    <p>1,000 SMS / mo</p>
                  </div>
                  <button
                    onClick={() => handleUpgrade('growth')}
                    disabled={currentPlan === 'growth'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      currentPlan === 'growth'
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                    }`}
                  >
                    {currentPlan === 'growth' ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              </div>

              {/* Pro Plan */}
              <div className={`p-4 lg:p-6 rounded-xl border transition-all duration-200 ${
                currentPlan === 'pro' 
                  ? 'bg-[#16D9E3]/10 border-[#16D9E3]' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}>
                <div className="text-center">
                  <h3 className="text-lg lg:text-xl font-semibold text-white mb-2">Pro</h3>
                  <p className="text-2xl lg:text-3xl font-bold text-white mb-4">$49<span className="text-sm font-normal text-white/60">/mo</span></p>
                  <div className="text-sm lg:text-base text-white/80 space-y-1 mb-6">
                    <p>30 keywords tracked</p>
                    <p>3,000 SMS / mo</p>
                  </div>
                  <button
                    onClick={() => handleUpgrade('pro')}
                    disabled={currentPlan === 'pro'}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors duration-200 ${
                      currentPlan === 'pro'
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                    }`}
                  >
                    {currentPlan === 'pro' ? 'Current Plan' : 'Upgrade'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-white/60 text-sm">Change or cancel anytime.</p>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
} 