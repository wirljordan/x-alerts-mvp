import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Check if user is already logged in
    const checkSession = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        
        if (cookies.x_user_id) {
          router.push('/dashboard')
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

  const handleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      // Redirect to our custom OAuth handler
      window.location.href = '/api/auth/x-oauth'
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Sign in error:', err)
      setIsLoading(false)
    }
  }

  const handleMockLogin = () => {
    // Mock login - go directly to dashboard
    router.push('/dashboard')
  }

  const handleMockOAuth = () => {
    // Mock OAuth that stays on the website
    window.location.href = '/api/auth/mock-login'
  }

  if (!isClient) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Sign in with X</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </>
            ) : (
              'Sign in with X (Real OAuth)'
            )}
          </button>
          
          <button
            onClick={handleMockOAuth}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            🎭 Mock X Login (No External Auth)
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>
          
          <button
            onClick={handleMockLogin}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
          >
            🚀 Start App (Skip OAuth)
          </button>
        </div>

        <div className="text-sm text-gray-500 mt-6 space-y-2 text-center">
          <p>Current URL: {typeof window !== 'undefined' ? window.location.host : 'Loading...'}</p>
          <Link href="/debug-oauth" className="text-blue-600 hover:underline">
            Debug OAuth Issues
          </Link>
        </div>
      </div>
    </main>
  )
}
