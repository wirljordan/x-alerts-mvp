import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function AuthError() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { error: errorType, token } = router.query
    
    if (errorType === 'api_unavailable' && token) {
      setError('X API is temporarily unavailable. Please try again in a few minutes.')
    } else if (errorType === 'callback_error') {
      setError('Authentication failed. Please try again.')
    } else {
      setError('An unknown error occurred during authentication.')
    }
  }, [router.query])

  const handleRetry = async () => {
    setIsLoading(true)
    // Clear any existing session
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_session_secure=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    
    // Redirect back to home page to restart OAuth flow
    router.push('/')
  }

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EarlyReply</h1>
          </div>

          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          {/* Error Message */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Authentication Error
          </h2>
          
          <p className="text-gray-600 mb-6">
            {error || 'Something went wrong during the authentication process.'}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying...
                </div>
              ) : (
                'Try Again'
              )}
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Go to Home
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-sm text-gray-500">
            <p>If this problem persists, please:</p>
            <ul className="mt-2 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Try again in a few minutes</li>
              <li>• Contact support if the issue continues</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
} 