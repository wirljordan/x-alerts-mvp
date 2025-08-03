import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSession } from 'next-auth/react'

export default function DebugOAuth() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState({})
  const [session, setSession] = useState(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Get current session
    getSession().then((session) => {
      setSession(session)
    })

    // Log all URL parameters
    if (typeof window !== 'undefined') {
      console.log('URL:', window.location.href)
      console.log('Query params:', router.query)
      
      setDebugInfo({
        url: window.location.href,
        query: router.query,
        pathname: router.pathname,
        asPath: router.asPath,
        host: window.location.host,
        protocol: window.location.protocol
      })

      // Check if we're in a callback
      if (router.query.code) {
        console.log('✅ OAuth code received:', router.query.code)
      }
      
      if (router.query.error) {
        console.log('❌ OAuth error:', router.query.error)
      }
    }
  }, [router.query])

  const testDirectOAuth = () => {
    if (typeof window === 'undefined') return
    
    // This is for testing only - use NextAuth in production
    const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || 'your-client-id'
    const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/x`)
    const scope = 'users.read tweet.read offline.access'
    const state = 'test123'
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`
    
    console.log('Auth URL:', authUrl)
    window.open(authUrl, '_blank')
  }

  const checkEnvironmentVariables = () => {
    const envVars = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? 'Set' : 'Missing',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? 'Set' : 'Missing',
    }
    
    console.log('Environment Variables:', envVars)
    setDebugInfo(prev => ({ ...prev, envVars }))
  }

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading debug information...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4 bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-4xl w-full">
        <h1 className="text-2xl font-bold mb-6">OAuth Debug & Setup</h1>
        
        {session && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <h3 className="font-semibold">✅ User is logged in!</h3>
            <p>Name: {session.user?.name}</p>
            <p>Username: @{session.user?.handle}</p>
            <p>Email: {session.user?.email}</p>
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">Setup Instructions:</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create a Twitter Developer App at <a href="https://developer.twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.twitter.com</a></li>
              <li>Get your Client ID and Client Secret</li>
              <li>Set redirect URI to: <code className="bg-gray-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your-domain'}/api/auth/callback/x</code></li>
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env.local</code> file with your credentials</li>
              <li>Restart your development server</li>
            </ol>
          </div>
          
          <div>
            <h2 className="font-semibold mb-2">Environment Variables Needed:</h2>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <pre>{`NEXTAUTH_URL=${typeof window !== 'undefined' ? window.location.origin : 'your-domain'}
NEXTAUTH_SECRET=your-secret-key
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret`}</pre>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Debug Info:</h2>
          <div className="bg-gray-100 p-4 rounded-lg max-h-64 overflow-auto">
            <pre className="text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <button
            onClick={checkEnvironmentVariables}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mr-2"
          >
            Check Environment Variables
          </button>

          <button
            onClick={testDirectOAuth}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 mr-2"
          >
            Test Direct OAuth
          </button>

          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Login
          </button>
        </div>

        <div className="text-sm text-gray-600 mt-4">
          <p>Check browser console for more debug info</p>
        </div>
      </div>
    </div>
  )
} 