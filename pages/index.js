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
      <nav className="bg-[#0F1C2E]/90 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-white">EarlyReply</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Features
                </a>
                <a href="#pricing" className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  Pricing
                </a>
                <a href="#about" className="text-white/80 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  About
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Be First to Reply
              </h1>
              <p className="text-xl text-white/90 mb-8 max-w-lg">
                Get instant SMS notifications when important X accounts post. Never miss an opportunity to engage early.
              </p>
              
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-400/30 text-red-100 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={isLoading}
                className="inline-flex items-center px-8 py-4 bg-[#FF6B4A] hover:bg-[#FF6B4A]/90 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Log In with X
                  </>
                )}
              </button>

              <p className="text-white/70 text-sm mt-4">
                Secure OAuth 2.0 authentication • No password required
              </p>
            </div>

            {/* Right Column - Phone Mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative">
                {/* Phone Frame */}
                <div className="w-72 h-96 bg-[#0F1C2E] rounded-[3rem] p-3 shadow-2xl">
                  <div className="w-full h-full bg-[#0F1C2E] rounded-[2.5rem] overflow-hidden relative">
                    {/* Phone Screen Content */}
                    <div className="w-full h-full bg-gradient-to-b from-[#0F1C2E] to-[#1a2a3e] p-4">
                      {/* Mock X Post */}
                      <div className="bg-[#0F1C2E] rounded-lg p-4 border border-white/10">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 bg-[#16D9E3] rounded-full flex items-center justify-center">
                            <span className="text-[#0F1C2E] font-bold text-sm">JD</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-white font-semibold text-sm">Jordan Desjardins</span>
                              <span className="text-white/60 text-xs">@Jordan_Desj</span>
                            </div>
                            <p className="text-white/90 text-sm leading-relaxed">
                              Just launched our new product! 🚀 Early access available now. DM for details.
                            </p>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                              <div className="flex items-center space-x-4 text-white/60 text-xs">
                                <span>💬 12</span>
                                <span>🔄 45</span>
                                <span>❤️ 128</span>
                              </div>
                              <span className="text-white/40 text-xs">2m</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* EarlyReply Notification */}
                      <div className="mt-4 bg-[#16D9E3]/20 border border-[#16D9E3]/30 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-[#16D9E3] rounded-full flex items-center justify-center">
                            <span className="text-[#0F1C2E] text-xs font-bold">ER</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[#16D9E3] text-sm font-medium">EarlyReply Alert</p>
                            <p className="text-white/80 text-xs">New post from @Jordan_Desj</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#16D9E3] rounded-full opacity-60"></div>
                <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-[#FF6B4A] rounded-full opacity-60"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="py-20 bg-white/5 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why EarlyReply?</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Stay ahead of the conversation with instant notifications and smart monitoring
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
              <div className="w-16 h-16 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#16D9E3] text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Instant Alerts</h3>
              <p className="text-white/70">Get SMS notifications within seconds of important posts</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
              <div className="w-16 h-16 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#FF6B4A] text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart Monitoring</h3>
              <p className="text-white/70">Monitor specific accounts and keywords that matter to you</p>
            </div>
            
            <div className="text-center p-6 rounded-lg bg-white/5 border border-white/10">
              <div className="w-16 h-16 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#16D9E3] text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Mobile First</h3>
              <p className="text-white/70">Optimized for mobile engagement and quick replies</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
