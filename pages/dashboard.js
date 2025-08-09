import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'

// Alert Item Component
function AlertItem({ alert, onToggle, onDelete }) {
  const [showDropdown, setShowDropdown] = useState(false)



  return (
    <div className="flex items-center justify-between p-4 lg:p-6 bg-white/5 rounded-lg lg:rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-200">
      <div className="flex items-center space-x-3 lg:space-x-4">
        <div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full ${
          alert.status === 'active' ? 'bg-[#16D9E3]' : 'bg-yellow-500'
        }`}></div>
        <div>
          <h3 className="font-medium text-white text-sm lg:text-base">{alert.query_string}</h3>
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
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-1 lg:p-2 text-white/60 hover:text-white transition-colors duration-200"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0F1C2E] border border-white/10 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  onDelete(alert.id)
                  setShowDropdown(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Force deployment - ensure test buttons are visible on production
// Helper function to get keyword limits based on plan
function getKeywordLimit(plan) {
  const limits = {
    'free': 1,
    'starter': 2,
    'growth': 10,
    'pro': 30
  }
  return limits[plan] || 1
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showKeywordModal, setShowKeywordModal] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [keywordToDelete, setKeywordToDelete] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)
  const [downgradeInfo, setDowngradeInfo] = useState({ plan: '', message: '' })
  const [usage, setUsage] = useState({ used: 0, limit: 25 }) // Default to free plan limits
  const [alerts, setAlerts] = useState([])
  const [currentPlan, setCurrentPlan] = useState('free') // free, starter, growth, pro
  const [keywordForm, setKeywordForm] = useState({ keyword: '' })
  const [isCreatingKeyword, setIsCreatingKeyword] = useState(false)
  const [isTestingMonitoring, setIsTestingMonitoring] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Handle success messages
    const handleSuccessMessages = async () => {
      console.log('Dashboard loaded with query:', router.query)
      
      // Handle alert creation success  
      if (router.query.alert_created === 'true') {
        setShowSuccessMessage(true)
        setTimeout(() => setShowSuccessMessage(false), 5000)
        // Clean up URL
        router.replace('/dashboard', undefined, { shallow: true })
        return // Don't process other success messages
      }
      
      // Handle Stripe success redirect
      if (router.query.success === 'true' && router.query.session_id) {
        console.log('Stripe success detected! Setting onboarding cookie...')
        
        // Set onboarding completion cookie for successful payments
        document.cookie = 'onboarding_completed=true; Path=/; Secure; SameSite=Strict; Max-Age=31536000'
        
        // Show success message
        console.log('Payment successful! Session ID:', router.query.session_id)
        setShowSuccessMessage(true)
        
        // Hide success message after 5 seconds
        setTimeout(() => setShowSuccessMessage(false), 5000)
        
        // Refresh user data from Supabase to get updated plan
        try {
          const cookies = document.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=')
            if (key && value) {
              acc[key] = decodeURIComponent(value)
            }
            return acc
          }, {})
          
          if (cookies.x_session) {
            const sessionData = JSON.parse(cookies.x_session)
            if (sessionData.user?.id) {
              const response = await fetch(`/api/users/get?userId=${sessionData.user.id}`)
              if (response.ok) {
                const data = await response.json()
                if (data.success && data.user) {
                  // Update user data with new plan
                  setUser(prevUser => ({
                    ...prevUser,
                    ...data.user
                  }))
                  
                  // Update current plan
                  setCurrentPlan(data.user.plan || 'free')
                  console.log('User plan updated to:', data.user.plan)
                  
                  // Update usage limits from database
                  setUsage({ used: data.user.alerts_used || 0, limit: data.user.alerts_limit || 10 })
                }
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing user data after payment:', error)
        }
        
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
            
            // Fetch user data from Supabase to check if they exist (database is source of truth)
            if (sessionData.user?.id) {
              try {
                const response = await fetch(`/api/users/get?userId=${sessionData.user.id}`)
                if (response.ok) {
                  const data = await response.json()
                  if (data.success && data.user) {
                    // User exists in database, they have completed onboarding
                    console.log('User found in database:', data.user)
                    setUser(prevUser => ({
                      ...prevUser,
                      ...data.user
                    }))
                    
                    // Set current plan from Supabase
                    console.log('Setting current plan to:', data.user.plan || 'free')
                    setCurrentPlan(data.user.plan || 'free')
                    
                    // Update usage limits from database
                    setUsage({ used: data.user.alerts_used || 0, limit: data.user.alerts_limit || 10 })
                    
                    // Fetch user's alerts/keywords
                    await fetchUserAlerts(sessionData.user.id)
                  } else {
                    // User doesn't exist in database, redirect to onboarding
                    console.log('User not found in database, redirecting to onboarding')
                    router.push('/onboarding')
                    return
                  }
                } else {
                  // User doesn't exist in database, redirect to onboarding
                  console.log('User not found in database, redirecting to onboarding')
                  router.push('/onboarding')
                  return
                }
              } catch (error) {
                console.error('Error fetching user data from Supabase:', error)
                // On error, redirect to onboarding to be safe
                router.push('/onboarding')
                return
              }
            } else {
              // No user ID, redirect to onboarding
              console.log('No user ID in session, redirecting to onboarding')
              router.push('/onboarding')
              return
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

    // Handle success messages first, then check session
    handleSuccessMessages()
    
    // Small delay to ensure cookie is set if this is a Stripe success
    setTimeout(async () => {
      await getUserFromSession()
    }, 100)
  }, [router.query.success, router.query.session_id, router.query.alert_created])

  const handleSignOut = () => {
    setShowSignOutModal(true)
  }

  const confirmSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/')
  }

  const fetchUserAlerts = async (userId) => {
    try {
      const response = await fetch(`/api/alerts/list?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAlerts(data.alerts)
        }
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const handleAddAlert = () => {
    console.log('Add Alert clicked! Current plan:', currentPlan, 'Alerts length:', alerts.length, 'Limit:', getKeywordLimit(currentPlan))
    setShowKeywordModal(true)
  }

  const handleCreateKeyword = async () => {
    if (!keywordForm.keyword.trim()) {
      alert('Please enter a keyword to track')
      return
    }

    setIsCreatingKeyword(true)
    try {
      const response = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.x_user_id || user?.id,
          name: keywordForm.keyword.trim(),
          query: keywordForm.keyword.trim()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Reset form and close modal
        setKeywordForm({ keyword: '' })
        setShowKeywordModal(false)
        
        // Refresh alerts list
        await fetchUserAlerts(user?.x_user_id || user?.id)
        
        // Show success modal
        setSuccessMessage('Keyword created successfully!')
        setShowSuccessModal(true)
      } else {
        // Check if this is an onboarding issue
        if (data.code === 'ONBOARDING_REQUIRED') {
          setShowKeywordModal(false)
          alert('Please complete your account setup first')
          router.push('/onboarding')
          return
        }
        throw new Error(data.error || 'Failed to create keyword')
      }
    } catch (error) {
      console.error('Error creating keyword:', error)
      alert(`Failed to create keyword: ${error.message}`)
    } finally {
      setIsCreatingKeyword(false)
    }
  }

  const showDeleteConfirmation = (alertId) => {
    setKeywordToDelete(alertId)
    setShowDeleteModal(true)
  }

  const handleDeleteAlert = async () => {
    if (!keywordToDelete) return
    
    try {
      const response = await fetch('/api/alerts/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: keywordToDelete,
          userId: user?.x_user_id || user?.id
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh alerts list
        await fetchUserAlerts(user?.x_user_id || user?.id)
        setShowDeleteModal(false)
        setKeywordToDelete(null)
      } else {
        throw new Error(data.error || 'Failed to delete keyword')
      }
    } catch (error) {
      console.error('Error deleting keyword:', error)
      setShowDeleteModal(false)
      setKeywordToDelete(null)
      alert(`Failed to delete keyword: ${error.message}`)
    }
  }

  const handleToggleAlert = async (alertId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    
    try {
      const response = await fetch('/api/alerts/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alertId: alertId,
          userId: user?.id,
          status: newStatus
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Refresh alerts list
        await fetchUserAlerts(user?.x_user_id || user?.id)
      } else {
        throw new Error(data.error || 'Failed to update keyword')
      }
    } catch (error) {
      console.error('Error updating keyword:', error)
      alert(`Failed to update keyword: ${error.message}`)
    }
  }

  const refreshUserData = async () => {
    try {
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          acc[key] = decodeURIComponent(value)
        }
        return acc
      }, {})
      
      if (cookies.x_session) {
        const sessionData = JSON.parse(cookies.x_session)
        if (sessionData.user?.id) {
          const response = await fetch(`/api/users/get?userId=${sessionData.user.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              // Update user data with fresh data from Supabase
              setUser(prevUser => ({
                ...prevUser,
                ...data.user
              }))
              
              // Update current plan
              setCurrentPlan(data.user.plan || 'free')
              console.log('User data refreshed, plan updated to:', data.user.plan)
              
              // Update usage limits from database
              setUsage({ used: data.user.alerts_used || 0, limit: data.user.alerts_limit || 10 })
            }
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error)
    }
  }

  const handleDowngradeConfirm = async () => {
    const { plan, currentPlan, targetPlan } = downgradeInfo
    
    // Handle downgrade - cancel subscription at end of period
    console.log('Attempting downgrade for user:', user)
    console.log('User ID being sent:', user?.x_user_id || 'unknown')
    console.log('Downgrading from', currentPlan, 'to', plan)
    
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.x_user_id || 'unknown',
          targetPlan: plan // Include target plan for partial downgrades
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      // Show success message with keyword overflow info
      let message = ''
      if (plan === 'free') {
        message = 'Your subscription will be canceled at the end of your current billing period. You can continue using your current plan until then.'
      } else {
        message = `Your subscription will be downgraded to ${plan} at the end of your current billing period. You can continue using your current plan until then.`
      }
      
      // Add keyword overflow information if any keywords were removed
      if (data.keywordOverflow && data.keywordOverflow.removedCount > 0) {
        const removedKeywords = data.keywordOverflow.removedKeywords.join(', ')
        message += `\n\n⚠️ ${data.keywordOverflow.removedCount} keyword(s) were removed to fit your new plan limit: "${removedKeywords}"`
      }
      
      setSuccessMessage(message)
      setShowSuccessModal(true)
      
      // Close downgrade modal
      setShowDowngradeModal(false)
      setDowngradeInfo({ plan: '', message: '' })
      
      // Refresh user data to get updated subscription status
      await refreshUserData()
    } catch (error) {
      console.error('Downgrade error:', error)
      setSuccessMessage(`Downgrade failed: ${error.message}`)
      setShowSuccessModal(true)
      setShowDowngradeModal(false)
      setDowngradeInfo({ plan: '', message: '' })
    }
  }

  const testKeywordMonitoring = async () => {
    setIsTestingMonitoring(true)
    try {
      const response = await fetch('/api/test/monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok) {
        setSuccessMessage(`Keyword monitoring test completed! Processed ${data.totalProcessed} notifications, sent ${data.totalSmsSent} SMS.`)
      } else {
        setSuccessMessage(`Test failed: ${data.error}`)
      }
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error testing keyword monitoring:', error)
      setSuccessMessage('Error testing keyword monitoring: ' + error.message)
      setShowSuccessModal(true)
    } finally {
      setIsTestingMonitoring(false)
    }
  }

  const testTwitterAPI = async () => {
    setIsTestingMonitoring(true)
    try {
      const response = await fetch('/api/test/twitter-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      const data = await response.json()
      
      if (response.ok && data.success) {
        setSuccessMessage(`Twitter API test successful! Found ${data.data.data?.length || 0} tweets.`)
      } else {
        setSuccessMessage(`Twitter API test failed: ${data.error || data.message}`)
      }
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Error testing Twitter API:', error)
      setSuccessMessage('Error testing Twitter API: ' + error.message)
      setShowSuccessModal(true)
    } finally {
      setIsTestingMonitoring(false)
    }
  }

  const handleUpgrade = async (plan) => {
    if (plan === currentPlan) return
    
    setShowUpgradeModal(false)
    
    // Define plan hierarchy for upgrade/downgrade logic
    const planHierarchy = {
      'free': 0,
      'starter': 1,
      'growth': 2,
      'pro': 3
    }
    
    const currentPlanLevel = planHierarchy[currentPlan] || 0
    const targetPlanLevel = planHierarchy[plan] || 0
    
    // Check if this is a downgrade
    if (targetPlanLevel < currentPlanLevel) {
      // Show confirmation dialog for downgrades
      const planNames = {
        'free': 'Free',
        'starter': 'Starter', 
        'growth': 'Growth',
        'pro': 'Pro'
      }
      
      const currentPlanName = planNames[currentPlan] || currentPlan
      const targetPlanName = planNames[plan] || plan
      
      // Set downgrade info for custom modal
      setDowngradeInfo({
        plan: plan,
        currentPlan: currentPlanName,
        targetPlan: targetPlanName,
        message: plan === 'free' 
          ? `Are you sure you want to cancel your ${currentPlanName} subscription? Your subscription will remain active until the end of your current billing period.`
          : `Are you sure you want to downgrade from ${currentPlanName} to ${targetPlanName}? Your current plan will remain active until the end of your billing period, then you'll be moved to ${targetPlanName}.`
      })
      setShowDowngradeModal(true)
      return // Wait for user confirmation in modal
      

    }
    
    // For paid plans, redirect to Stripe checkout
    try {
      // Use real email from session, fallback to username-based email
      const userEmail = user?.email || (user?.username ? `${user.username}@earlyreply.app` : 'user@earlyreply.app')
      
      console.log('Creating checkout for user:', user)
      console.log('Sending userId:', user?.x_user_id || 'unknown')
      
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: plan,
          userId: user?.x_user_id || 'unknown',
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
          <p className="font-medium">
            {router.query.alert_created === 'true' 
              ? '🎉 Keyword created successfully!' 
              : router.query.success === 'true' 
              ? '🎉 Payment successful! Your account has been activated.'
              : '🎉 Success!'
            }
          </p>
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
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base bg-[#16D9E3] text-[#0F1C2E] rounded-lg hover:bg-[#16D9E3]/90 transition-colors duration-200 flex items-center space-x-2 font-semibold"
                  >
                    <span>🚀</span>
                    <span className="hidden sm:inline">Upgrade</span>
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-3 py-1 lg:px-4 lg:py-2 text-sm lg:text-base bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 lg:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Main Dashboard */}
          <div className="space-y-6 lg:space-y-8">
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
                  
                  {/* Billing Cycle Information */}
                  <div className="mt-2 space-y-1">
                    {/* Next reset date - calculate days until next billing cycle */}
                    <p className="text-xs lg:text-sm text-white/60">
                      SMS limit resets in {(() => {
                        if (!user?.created_at) return 'calculating...'
                        
                        const now = new Date()
                        const signupDate = new Date(user.created_at)
                        
                        // Calculate next billing cycle (30 days from signup, recurring monthly)
                        const daysSinceSignup = Math.floor((now - signupDate) / (1000 * 60 * 60 * 24))
                        const cyclesSinceSignup = Math.floor(daysSinceSignup / 30)
                        const nextResetDate = new Date(signupDate)
                        nextResetDate.setDate(nextResetDate.getDate() + ((cyclesSinceSignup + 1) * 30))
                        
                        const diffTime = nextResetDate - now
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return Math.max(0, diffDays)
                      })()} days
                    </p>
                    
                    {/* Pending plan change */}
                    {user?.subscription_status === 'canceling' && user?.subscription_cancel_at && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 mt-2">
                        <p className="text-orange-400 text-xs lg:text-sm font-medium">
                          {user?.pending_plan === 'free' 
                            ? `Subscription ends ${new Date(user.subscription_cancel_at).toLocaleDateString()}`
                            : `Downgrading to ${user.pending_plan} on ${new Date(user.subscription_cancel_at).toLocaleDateString()}`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {(usage.used / usage.limit) >= 0.8 && (
                    <div className="mt-2">
                      <p className="text-orange-400 text-xs lg:text-sm font-medium">Upgrade for more SMS</p>
                    </div>
                  )}
                </div>

                {/* Test Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={testTwitterAPI}
                    disabled={isTestingMonitoring}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isTestingMonitoring
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isTestingMonitoring ? 'Testing...' : 'Test Twitter API'}
                  </button>
                  <button
                    onClick={testKeywordMonitoring}
                    disabled={isTestingMonitoring}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isTestingMonitoring
                        ? 'bg-white/20 text-white/40 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isTestingMonitoring ? 'Testing...' : 'Test Monitoring'}
                  </button>
                </div>

              </div>
            </div>

            {/* Keywords Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-semibold text-white">Keywords</h2>
                <button
                  onClick={handleAddAlert}
                  disabled={alerts.length >= getKeywordLimit(currentPlan)}
                  className={`px-4 py-2 lg:px-6 lg:py-3 font-semibold rounded-lg lg:rounded-xl transition-colors duration-200 text-sm lg:text-base ${
                    alerts.length >= getKeywordLimit(currentPlan)
                      ? 'bg-white/20 text-white/40 cursor-not-allowed' 
                      : 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                  }`}
                >
                  Add Keyword ({alerts.length}/{getKeywordLimit(currentPlan)})
                </button>
              </div>
              
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
                    <AlertItem 
                      key={alert.id} 
                      alert={alert} 
                      onToggle={handleToggleAlert}
                      onDelete={showDeleteConfirmation}
                    />
                  ))}
                </div>
              )}
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
                    onClick={() => handleUpgrade('free')}
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
                        : currentPlan === 'free'
                        ? 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                        : 'bg-white/10 text-white hover:bg-white/20'
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
                        : (currentPlan === 'free' || currentPlan === 'starter')
                        ? 'bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {currentPlan === 'growth' ? 'Current Plan' : (currentPlan === 'free' || currentPlan === 'starter') ? 'Upgrade' : 'Downgrade'}
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

      {/* Keyword Creation Modal */}
      {showKeywordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-white">Add New Keyword</h2>
              <button
                onClick={() => {
                  setShowKeywordModal(false)
                  setKeywordForm({ keyword: '' })
                }}
                className="text-white/60 hover:text-white transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">What do you want to track?</label>
                <input
                  type="text"
                  value={keywordForm.keyword}
                  onChange={(e) => setKeywordForm(prev => ({ ...prev, keyword: e.target.value }))}
                  placeholder="e.g., sneakers, bitcoin, my brand name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                />
                <p className="text-xs text-white/60 mt-1">
                  Enter any word or phrase you want to get notified about when it's mentioned on X
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowKeywordModal(false)
                  setKeywordForm({ keyword: '' })
                }}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKeyword}
                disabled={!keywordForm.keyword.trim() || isCreatingKeyword}
                className="flex-1 px-4 py-2 bg-[#16D9E3] hover:bg-[#16D9E3]/90 disabled:bg-white/20 disabled:cursor-not-allowed text-[#0F1C2E] font-semibold rounded-lg transition-colors"
              >
                {isCreatingKeyword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F1C2E] mr-2 inline"></div>
                    Creating...
                  </>
                ) : (
                  'Create Keyword'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">Sign Out?</h2>
              <p className="text-white/60 mb-6">Are you sure you want to sign out of your account?</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSignOutModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Keyword Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-400 text-2xl">🗑️</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">Delete Keyword?</h2>
              <p className="text-white/60 mb-6">Are you sure you want to delete this keyword? This action cannot be undone.</p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setKeywordToDelete(null)
                  }}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAlert}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-400 text-2xl">✅</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">Success!</h2>
              <p className="text-white/60 mb-6">{successMessage}</p>
              
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Downgrade Confirmation Modal */}
      {showDowngradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-6 lg:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-400 text-2xl">⚠️</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
                {downgradeInfo.plan === 'free' ? 'Cancel Subscription?' : 'Downgrade Plan?'}
              </h2>
              <p className="text-white/60 mb-6">{downgradeInfo.message}</p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => { setShowDowngradeModal(false); setDowngradeInfo({ plan: '', message: '' }); }} 
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDowngradeConfirm}
                  className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                >
                  {downgradeInfo.plan === 'free' ? 'Cancel Subscription' : 'Downgrade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
} 