import { useState, useEffect } from 'react'

export default function Success() {
  const [user, setUser] = useState(null)

  useEffect(() => {
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
    }

    getUserFromSession()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <div className="text-green-500 text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-4">Success!</h1>
        
        {user ? (
          <div className="mb-6">
            <p className="text-gray-600 mb-4">You have successfully signed in with X.</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold">{user.name}</p>
              <p className="text-gray-600">@{user.username}</p>
              {user.verified && (
                <p className="text-blue-600 text-sm">✓ Verified Account</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-600 mb-6">You have successfully signed in with X.</p>
        )}
        
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  )
} 