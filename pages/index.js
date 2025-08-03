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
            // Redirect authenticated users to success page
            router.push('/success')
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

  const handleSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    setUser(null)
    router.push('/')
  }

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">EarlyReply</h1>
          <p className="text-gray-600 text-sm">Get notified about important X posts</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center text-sm font-medium"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Sign in with X
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          We'll redirect you to X for secure authorization
        </p>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">What EarlyReply does:</h2>
          <ul className="text-xs text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Monitors important X accounts for new posts
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Sends you instant notifications
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              Helps you reply early to trending topics
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
