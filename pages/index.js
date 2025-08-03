import { useState } from 'react'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = () => {
    setIsLoading(true)
    // Simple mock login - just redirect to success page
    window.location.href = '/success'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6">Sign in with X</h1>
        
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
