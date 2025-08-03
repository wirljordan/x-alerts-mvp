import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function SimpleTest() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then((session) => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  const testSignIn = () => {
    console.log('Starting OAuth flow...')
    signIn('twitter', { 
      callbackUrl: '/dashboard',
      redirect: true 
    })
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">OAuth Test</h1>
      
      {session ? (
        <div className="text-center">
          <p className="mb-4">✅ Signed in as: @{session.user.handle}</p>
          <p className="mb-4">User ID: {session.user.id}</p>
          <button
            onClick={() => signIn('twitter', { callbackUrl: '/dashboard' })}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Sign in again
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4">❌ Not signed in</p>
          <button
            onClick={testSignIn}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Test X OAuth
          </button>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <p>Debug Info:</p>
        <p>NEXTAUTH_URL: {process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'Not set'}</p>
        <p>Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
      </div>
    </div>
  )
} 