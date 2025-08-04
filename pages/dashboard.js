import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [usage, setUsage] = useState({ used: 185, limit: 300 })
  const [alerts, setAlerts] = useState([
    { id: 1, name: 'Sneaker Leads', status: 'active', lastMatch: '2m ago' },
    { id: 2, name: 'Crypto Alpha', status: 'active', lastMatch: '15m ago' }
  ])
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
            
            // Check if user has completed onboarding
            const hasCompletedOnboarding = cookies.onboarding_completed === 'true'
            if (!hasCompletedOnboarding) {
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

    getUserFromSession()
  }, [router])

  const handleSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/')
  }

  const handleAddAlert = () => {
    router.push('/alert/create')
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
    <div className="min-h-screen bg-[#0F1C2E]">
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
              <h1 className="text-xl lg:text-2xl font-bold text-white">EarlyReply</h1>
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
                <span className="text-sm lg:text-base text-white/60">sent {usage.used}</span>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-4 lg:mb-6">
                <div className="w-full bg-white/10 rounded-full h-3 lg:h-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm lg:text-base text-white/80">
                  {usage.used} / {usage.limit} texts sent
                </span>
                <button
                  onClick={handleAddAlert}
                  className="px-4 py-2 lg:px-6 lg:py-3 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg lg:rounded-xl transition-colors duration-200 text-sm lg:text-base"
                >
                  Add Alert
                </button>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <h2 className="text-lg lg:text-2xl font-semibold text-white mb-4 lg:mb-6">Alerts</h2>
              
              {alerts.length === 0 ? (
                <div className="text-center py-8 lg:py-12">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4 lg:mb-6">
                    <span className="text-[#16D9E3] text-2xl lg:text-3xl">🔔</span>
                  </div>
                  <p className="text-white/60 mb-4 lg:mb-6 text-sm lg:text-base">No alerts set up yet</p>
                  <button
                    onClick={handleAddAlert}
                    className="px-6 py-3 lg:px-8 lg:py-4 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg lg:rounded-xl transition-colors duration-200 text-sm lg:text-base"
                  >
                    Create Your First Alert
                  </button>
                </div>
              ) : (
                <div className="space-y-3 lg:space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-4 lg:p-6 bg-white/5 rounded-lg lg:rounded-xl border border-white/10 hover:bg-white/10 transition-colors duration-200">
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
                        <button className="p-1 lg:p-2 text-white/60 hover:text-white transition-colors duration-200">
                          <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl lg:rounded-2xl p-6 lg:p-8 border border-white/10 shadow-lg">
              <h2 className="text-lg lg:text-2xl font-semibold text-white mb-4 lg:mb-6">Recent Activity</h2>
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center space-x-3 lg:space-x-4 p-3 lg:p-4 bg-white/5 rounded-lg lg:rounded-xl hover:bg-white/10 transition-colors duration-200">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#16D9E3]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#16D9E3] text-sm lg:text-base">📱</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm lg:text-base">SMS sent to +1 (555) 123-4567</p>
                    <p className="text-white/60 text-xs lg:text-sm">2 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 lg:space-x-4 p-3 lg:p-4 bg-white/5 rounded-lg lg:rounded-xl hover:bg-white/10 transition-colors duration-200">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center">
                    <span className="text-[#FF6B4A] text-sm lg:text-base">🔔</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm lg:text-base">New alert created: "Sneaker Leads"</p>
                    <p className="text-white/60 text-xs lg:text-sm">1 hour ago</p>
                  </div>
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
                
                <button className="p-4 lg:p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-all duration-300 hover:scale-105">
                  <div className="text-center">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                      <span className="text-[#FF6B4A] text-xl lg:text-2xl">📊</span>
                    </div>
                    <p className="text-white font-medium text-sm lg:text-base">Analytics</p>
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
                    <p className="text-white/60 text-sm lg:text-base">Total Alerts</p>
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
    </div>
  )
} 