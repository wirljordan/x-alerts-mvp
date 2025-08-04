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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#16D9E3] rounded-lg flex items-center justify-center">
                <span className="text-[#0F1C2E] font-bold text-sm">ER</span>
              </div>
              <h1 className="text-xl font-bold text-white">EarlyReply</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
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
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Usage Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Usage</h2>
              <span className="text-sm text-white/60">sent {usage.used}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#16D9E3] to-[#16D9E3]/80 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(usage.used / usage.limit) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/80">
                {usage.used} / {usage.limit} texts sent
              </span>
              <button
                onClick={handleAddAlert}
                className="px-4 py-2 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg transition-colors"
              >
                Add Alert
              </button>
            </div>
          </div>

          {/* Alerts Section */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Alerts</h2>
            
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#16D9E3] text-2xl">🔔</span>
                </div>
                <p className="text-white/60 mb-4">No alerts set up yet</p>
                <button
                  onClick={handleAddAlert}
                  className="px-6 py-3 bg-[#16D9E3] hover:bg-[#16D9E3]/90 text-[#0F1C2E] font-semibold rounded-lg transition-colors"
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-[#16D9E3] rounded-full"></div>
                      <div>
                        <h3 className="font-medium text-white">{alert.name}</h3>
                        <p className="text-sm text-white/60">Last match: {alert.lastMatch}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alert.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {alert.status}
                      </span>
                      <button className="p-1 text-white/60 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#16D9E3] text-xl">⚙️</span>
                </div>
                <p className="text-white font-medium text-sm">Settings</p>
              </div>
            </button>
            
            <button className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg hover:bg-white/10 transition-colors">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-[#FF6B4A] text-xl">📊</span>
                </div>
                <p className="text-white font-medium text-sm">Analytics</p>
              </div>
            </button>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 bg-[#16D9E3]/20 rounded-full flex items-center justify-center">
                  <span className="text-[#16D9E3] text-sm">📱</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">SMS sent to +1 (555) 123-4567</p>
                  <p className="text-white/60 text-xs">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
                <div className="w-8 h-8 bg-[#FF6B4A]/20 rounded-full flex items-center justify-center">
                  <span className="text-[#FF6B4A] text-sm">🔔</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">New alert created: "Sneaker Leads"</p>
                  <p className="text-white/60 text-xs">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 