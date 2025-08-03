import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const router = useRouter()
  const [oauthSuccess, setOauthSuccess] = useState(false)
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if OAuth was successful
    if (router.query.oauth === 'success' || localStorage.getItem('oauth_success')) {
      setOauthSuccess(true)
      localStorage.removeItem('oauth_success')
    }

    // Get user from session cookie
    const getUserFromSession = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        
        if (cookies.x_session) {
          try {
            const sessionData = JSON.parse(decodeURIComponent(cookies.x_session))
            setUser(sessionData.user)
          } catch (error) {
            console.error('Error parsing session:', error)
          }
        }
      }
      setIsLoading(false)
    }

    getUserFromSession()
  }, [router.query])

  const handleSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    router.push('/login')
  }

  // Mock user data for testing
  const mockUser = {
    handle: 'testuser',
    plan: 'starter',
    sms_limit: 300,
    sms_used: 45
  }

  const currentUser = user || mockUser

  const usage = { 
    used: currentUser.sms_used || 0, 
    limit: currentUser.sms_limit || 300 
  }
  const percent = Math.min(100, Math.round((usage.used / usage.limit) * 100))

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* OAuth Success Message */}
        {oauthSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <div className="text-green-600 mr-2">✅</div>
              <div>
                <strong>Success!</strong> You've successfully signed in with X.
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-gray-600">Welcome back, @{currentUser.handle}</p>
              {!user && (
                <p className="text-sm text-orange-600 mt-1">⚠️ Mock user - OAuth not connected</p>
              )}
              {oauthSuccess && (
                <p className="text-sm text-green-600 mt-1">✅ OAuth connected successfully!</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Link 
                href="/onboarding"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Complete Setup
              </Link>
              {user && (
                <button 
                  onClick={handleSignOut}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">SMS Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Current Plan: {currentUser.plan?.charAt(0).toUpperCase() + currentUser.plan?.slice(1)}</span>
              <span>{usage.used} / {usage.limit} texts used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              {usage.used} SMS messages sent this month
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Create Alert</h3>
            <p className="text-gray-600 mb-4">Set up a new X alert to monitor keywords or mentions.</p>
            <Link 
              href="/alert/create"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Alert
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">View Alerts</h3>
            <p className="text-gray-600 mb-4">Manage your existing alerts and notifications.</p>
            <Link 
              href="/alerts"
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View Alerts
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
