import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Success() {
  const [user, setUser] = useState(null)
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
        
        console.log('Available cookies:', Object.keys(cookies))
        
        if (cookies.x_session) {
          try {
            const sessionData = JSON.parse(cookies.x_session)
            console.log('Session data found:', sessionData)
            setUser(sessionData.user)
          } catch (error) {
            console.error('Error parsing session:', error)
            // Redirect to home if session is invalid
            router.push('/?error=invalid_session')
          }
        } else {
          console.log('No x_session cookie found')
          // No session found, redirect to home
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold text-gray-900">EarlyReply</h1>
              <span className="text-sm text-gray-500">Dashboard</span>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">@{user.username}</p>
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
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {user ? (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center space-x-4">
                <div className="text-green-500 text-3xl">✅</div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Welcome to EarlyReply!</h2>
                  <p className="text-gray-600">You're successfully signed in with X.</p>
                </div>
              </div>
            </div>

            {/* User Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Account</h3>
              <div className="flex items-center space-x-4">
                {user.image && (
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-gray-600">@{user.username}</p>
                  {user.verified && (
                    <p className="text-blue-600 text-sm">✓ Verified Account</p>
                  )}
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-blue-500 text-2xl mb-2">📱</div>
                  <h4 className="font-medium text-gray-900">Monitor Accounts</h4>
                  <p className="text-sm text-gray-600">Add important X accounts to monitor</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-green-500 text-2xl mb-2">🔔</div>
                  <h4 className="font-medium text-gray-900">Get Notifications</h4>
                  <p className="text-sm text-gray-600">Receive instant alerts for new posts</p>
                </div>
                <div className="text-center p-4 border border-gray-200 rounded-lg">
                  <div className="text-purple-500 text-2xl mb-2">⚡</div>
                  <h4 className="font-medium text-gray-900">Reply Early</h4>
                  <p className="text-sm text-gray-600">Be first to engage with trending topics</p>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 Coming Soon</h3>
              <p className="text-blue-800 text-sm">
                We're building the monitoring and notification features. Stay tuned for updates!
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">Loading user data...</p>
          </div>
        )}
      </div>
    </div>
  )
} 