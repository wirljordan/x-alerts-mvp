import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = () => {
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
    }
    
    checkSession()

    // Handle OAuth errors
    if (router.query.error) {
      const errorMessages = {
        'oauth_failed': 'X authentication failed. Please try again.',
        'no_code': 'No authorization code received.',
        'token_failed': 'Failed to exchange authorization code.',
        'user_failed': 'Failed to get user information.',
        'callback_failed': 'OAuth callback failed.'
      }
      setError(errorMessages[router.query.error] || 'Authentication failed. Please try again.')
    }
  }, [router.query.error, router])

  const handleSignIn = () => {
    setIsLoading(true)
    setError('')
    // Redirect to X OAuth
    window.location.href = '/api/auth/x-oauth'
  }

  const handleSignOut = () => {
    // Clear session cookies
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    setUser(null)
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-4">Welcome, {user.name}!</h1>
          <p className="text-gray-600 mb-4">@{user.username}</p>
          {user.verified && (
            <p className="text-blue-600 mb-4">✓ Verified Account</p>
          )}
          
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Sign in with X</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing in...
            </>
          ) : (
            'Sign in with X'
          )}
        </button>
      </div>
    </div>
  )
}
