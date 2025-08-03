import { useSession, signIn, signOut } from 'next-auth/react'
import { useState } from 'react'

export default function TestAuth() {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('x', { callbackUrl: '/test-auth' })
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'loading') {
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
        <h1 className="text-2xl font-bold text-center mb-6">Authentication Test</h1>
        
        {session ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <h3 className="font-semibold">✅ Authenticated!</h3>
              <p>Name: {session.user?.name}</p>
              <p>Username: @{session.user?.handle}</p>
              <p>Email: {session.user?.email}</p>
              <p>Verified: {session.user?.verified ? 'Yes' : 'No'}</p>
            </div>
            
            <button
              onClick={() => signOut()}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <h3 className="font-semibold">⚠️ Not Authenticated</h3>
              <p>Click the button below to sign in with X</p>
            </div>
            
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
                'Sign in with X'
              )}
            </button>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Status: {status}</p>
          <p>Session: {session ? 'Active' : 'None'}</p>
        </div>
      </div>
    </div>
  )
} 