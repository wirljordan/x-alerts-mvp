import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = () => {
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
            // Redirect authenticated users to dashboard
            router.push('/dashboard')
          } catch (error) {
            console.error('Error parsing session:', error)
            // Clear invalid session
            document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
            document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
            document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
          }
        }
        setIsCheckingSession(false)
      }
    }

    checkSession()

    // Handle OAuth errors
    if (router.query.error) {
      const errorMessages = {
        'oauth_failed': 'X authentication failed. Please try again.',
        'no_code': 'No authorization code received. Please try again.',
        'token_exchange_failed': 'Failed to complete authentication. Please try again.',
        'user_info_failed': 'Failed to get user information. Please try again.',
        'callback_error': 'Authentication callback failed. Please try again.',
        'no_verifier': 'Authentication session expired. Please try again.',
        'no_state': 'Authentication session expired. Please try again.',
        'state_mismatch': 'Security verification failed. Please try again.',
        'invalid_session': 'Session is invalid. Please sign in again.',
        'no_session': 'No active session found. Please sign in.'
      }
      setError(errorMessages[router.query.error] || 'Authentication failed. Please try again.')
    }
  }, [router.query.error, router])

  const handleSignIn = () => {
    setIsLoading(true)
    setError('')
    
    // Redirect to X OAuth in the same window
    window.location.href = '/api/auth/x-oauth'
  }

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F1C2E] to-[#16D9E3]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F1C2E] via-[#16D9E3] to-[#FF6B4A]">
      {/* Navigation Bar */}
      <nav className="bg-[#0F1C2E]/90 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center space-x-3">
                <img 
                  src="https://lfvokdiatflpxnohmofo.supabase.co/storage/v1/object/sign/earlyreply/Untitled%20design-21.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OGNkMmM5Zi1jNDJlLTQ2NTgtYTMxNi1hM2ZkNTU2MjFhMjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlYXJseXJlcGx5L1VudGl0bGVkIGRlc2lnbi0yMS5wbmciLCJpYXQiOjE3NTQzMjQyODEsImV4cCI6MTc4NTg2MDI4MX0.0u_q6EYDmSciW3Fr8Ty3f-0PuUEY_e5Ea-zvIMJJiV4"
                  alt="EarlyReply Logo"
                  className="h-8 w-auto lg:h-10"
                />
                <span className="text-2xl lg:text-3xl font-bold text-white">EarlyReply</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-baseline space-x-6 lg:space-x-8">
                <a href="#features" className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm lg:text-base font-medium transition-colors duration-200 hover:bg-white/10">
                  Features
                </a>
                <a href="#pricing" className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm lg:text-base font-medium transition-colors duration-200 hover:bg-white/10">
                  Pricing
                </a>
              </div>
              <button
                onClick={handleSignIn}
                className="bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
              >
                Log In with X
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 lg:mb-8 leading-tight">
                Be First to Reply
              </h1>
              <p className="text-xl lg:text-2xl xl:text-3xl text-white/90 mb-8 lg:mb-12 max-w-2xl lg:max-w-none">
                Get SMS notifications within 5 minutes of important posts. Never miss an opportunity to engage early.
              </p>
              
              {error && (
                <div className="mb-6 lg:mb-8 p-4 lg:p-6 bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg text-sm lg:text-base">
                  {error}
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="inline-flex items-center px-8 lg:px-12 py-4 lg:py-6 bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white font-semibold rounded-lg lg:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none text-lg lg:text-xl"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 lg:h-6 lg:w-6 border-b-2 border-white mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 lg:w-8 lg:h-8 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Log In with X
                  </>
                )}
              </button>

              <p className="text-white/70 text-sm lg:text-base mt-6 lg:mt-8">
                Secure OAuth 2.0 authentication • No password required
              </p>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Custom Phone Mockup Image */}
                <img 
                  src="https://lfvokdiatflpxnohmofo.supabase.co/storage/v1/object/sign/earlyreply/1111-2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OGNkMmM5Zi1jNDJlLTQ2NTgtYTMxNi1hM2ZkNTU2MjFhMjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlYXJseXJlcGx5LzExMTEtMi5wbmciLCJpYXQiOjE3NTQzMjM3OTMsImV4cCI6MTc4NTg1OTc5M30.m9QXZZIc8zyWBbim4-3HwrMCdZ66Czh8tKSDfFtaXCI"
                  alt="EarlyReply phone mockup showing X post and notification"
                  className="w-72 h-96 lg:w-96 lg:h-[28rem] xl:w-[28rem] xl:h-[32rem] object-contain drop-shadow-2xl lg:drop-shadow-3xl"
                />
                

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 lg:py-32 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 lg:mb-6">Why EarlyReply?</h2>
            <p className="text-xl lg:text-2xl xl:text-3xl text-white/80 max-w-4xl mx-auto">
              Stay ahead of the conversation with instant notifications and smart monitoring
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="text-center p-6 lg:p-8 rounded-lg lg:rounded-xl bg-[#0F1C2E]/80 backdrop-blur-sm border border-white/20 hover:bg-[#0F1C2E] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <span className="text-[#16D9E3] text-2xl lg:text-3xl">⚡</span>
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3 lg:mb-4">Instant Alerts</h3>
              <p className="text-white text-sm lg:text-base lg:text-lg font-medium">Get SMS notifications within 5 minutes of important posts</p>
            </div>
            
            <div className="text-center p-6 lg:p-8 rounded-lg lg:rounded-xl bg-[#0F1C2E]/80 backdrop-blur-sm border border-white/20 hover:bg-[#0F1C2E] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <span className="text-[#FF6B4A] text-2xl lg:text-3xl">🎯</span>
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3 lg:mb-4">Smart Monitoring</h3>
              <p className="text-white text-sm lg:text-base lg:text-lg font-medium">Monitor specific accounts and keywords that matter to you</p>
            </div>
            
            <div className="text-center p-6 lg:p-8 rounded-lg lg:rounded-xl bg-[#0F1C2E]/80 backdrop-blur-sm border border-white/20 hover:bg-[#0F1C2E] transition-all duration-300 hover:scale-105 shadow-lg">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                <span className="text-[#16D9E3] text-2xl lg:text-3xl">📱</span>
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-white mb-3 lg:mb-4">Mobile First</h3>
              <p className="text-white text-sm lg:text-base lg:text-lg font-medium">Optimized for mobile engagement and quick replies</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-20 lg:py-32 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-24">
            <h2 className="text-4xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 lg:mb-6">Pricing</h2>
            <p className="text-xl lg:text-2xl xl:text-3xl text-white/80 max-w-3xl mx-auto">
              Simple, transparent pricing for every stage of your journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Free Plan */}
            <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
              <div className="text-3xl font-extrabold text-[#16D9E3] mb-2">$0</div>
              <div className="text-white mb-4 font-medium">Testing the waters</div>
              <div className="space-y-4 mb-6 w-full">
                <div className="border-b border-white/10 pb-2">
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">1</span> keyword tracked</div>
                </div>
                <div>
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">25</span> SMS / mo</div>
                </div>
              </div>
              <button className="w-full py-3 rounded-lg bg-[#16D9E3]/10 text-[#16D9E3] font-semibold border border-[#16D9E3]/30 hover:bg-[#16D9E3]/20 hover:scale-105 transition-all duration-200">Get Started</button>
            </div>
            {/* Starter Plan */}
            <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
              <div className="text-3xl font-extrabold text-[#16D9E3] mb-2">$9</div>
              <div className="text-white mb-4 font-medium">Solo creators</div>
              <div className="space-y-4 mb-6 w-full">
                <div className="border-b border-white/10 pb-2">
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">2</span> keywords tracked</div>
                </div>
                <div>
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">300</span> SMS / mo</div>
                </div>
              </div>
              <button className="w-full py-3 rounded-lg bg-[#16D9E3]/10 text-[#16D9E3] font-semibold border border-[#16D9E3]/30 hover:bg-[#16D9E3]/20 hover:scale-105 transition-all duration-200">Choose Starter</button>
            </div>
            {/* Growth Plan - Most Popular */}
            <div className="bg-[#0F1C2E] border-2 border-[#16D9E3] rounded-2xl p-8 flex flex-col items-center shadow-2xl relative hover:scale-[1.02] transition-all duration-300">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#16D9E3] text-[#0F1C2E] text-xs font-bold px-4 py-1 rounded-full shadow-lg drop-shadow-md">★ Most Popular</div>
              <h3 className="text-2xl font-bold text-white mb-2">Growth</h3>
              <div className="text-3xl font-extrabold text-[#16D9E3] mb-2">$19</div>
              <div className="text-white mb-4 font-medium">Indie hackers & small shops</div>
              <div className="space-y-4 mb-6 w-full">
                <div className="border-b border-white/10 pb-2">
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">10</span> keywords tracked</div>
                </div>
                <div>
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">1,000</span> SMS / mo</div>
                </div>
              </div>
              <button className="w-full py-3 rounded-lg bg-[#16D9E3] text-[#0F1C2E] font-semibold border border-[#16D9E3] hover:bg-[#16D9E3]/90 hover:scale-105 transition-all duration-200">Choose Growth</button>
            </div>
            {/* Pro Plan */}
            <div className="bg-[#0F1C2E] border border-white/10 rounded-2xl p-8 flex flex-col items-center shadow-lg hover:scale-[1.02] transition-all duration-300">
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <div className="text-3xl font-extrabold text-[#16D9E3] mb-2">$49</div>
              <div className="text-white mb-4 font-medium">Small teams & agencies</div>
              <div className="space-y-4 mb-6 w-full">
                <div className="border-b border-white/10 pb-2">
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">30</span> keywords tracked</div>
                </div>
                <div>
                  <div className="text-white/90 text-base"><span className="font-semibold text-[#16D9E3]">3,000</span> SMS / mo</div>
                </div>
              </div>
              <button className="w-full py-3 rounded-lg bg-[#16D9E3]/10 text-[#16D9E3] font-semibold border border-[#16D9E3]/30 hover:bg-[#16D9E3]/20 hover:scale-105 transition-all duration-200">Choose Pro</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
