import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function DebugOAuth() {
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    // Log all URL parameters
    console.log('URL:', window.location.href)
    console.log('Query params:', router.query)
    
    setDebugInfo({
      url: window.location.href,
      query: router.query,
      pathname: router.pathname,
      asPath: router.asPath
    })

    // Check if we're in a callback
    if (router.query.code) {
      console.log('✅ OAuth code received:', router.query.code)
    }
    
    if (router.query.error) {
      console.log('❌ OAuth error:', router.query.error)
    }
  }, [router.query])

  const testDirectOAuth = () => {
    const clientId = 'bbX8NbaeW0bQjc6WMCBW79xzd'
    const redirectUri = encodeURIComponent('https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/api/auth/callback/x')
    const scope = 'users.read tweet.read offline.access'
    const state = 'test123'
    
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`
    
    console.log('Auth URL:', authUrl)
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">OAuth Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg max-w-2xl w-full">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <button
          onClick={testDirectOAuth}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

      <div className="text-sm text-gray-600">
        <p>Check browser console for more debug info</p>
      </div>
    </div>
  )
} 