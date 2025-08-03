import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'

export default function TestCustomOAuth() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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
      setIsLoading(false)
    }

    getUserFromSession()
  }, [])

  const handleSignIn = () => {
    window.location.href = '/api/auth/x-oauth'
  }

  const handleSignOut = () => {
    document.cookie = 'x_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    document.cookie = 'x_user_id=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    setUser(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Custom X OAuth Test</h1>
        
        {user ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <h3 className="font-semibold">✅ Authenticated!</h3>
              <p>Name: {user.name}</p>
              <p>Username: @{user.username}</p>
              <p>ID: {user.id}</p>
              <p>Verified: {user.verified ? 'Yes' : 'No'}</p>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <h3 className="font-semibold">⚠️ Not Authenticated</h3>
              <p>Click the button below to sign in with X using custom OAuth</p>
            </div>
            
            <button
              onClick={handleSignIn}
              className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              Sign in with X (Custom OAuth)
            </button>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This page tests the custom OAuth flow that bypasses NextAuth.</p>
          <p>Check browser console for debug info.</p>
        </div>
      </div>
    </div>
  )
} 