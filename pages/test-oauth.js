import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function TestOAuth() {
  const router = useRouter()

  useEffect(() => {
    // Log the current URL and query parameters
    console.log('Current URL:', window.location.href)
    console.log('Query params:', router.query)
    
    // Check if we're in a callback
    if (router.query.code) {
      console.log('OAuth code received:', router.query.code)
    }
    
    if (router.query.error) {
      console.log('OAuth error:', router.query.error)
    }
  }, [router.query])

  const testOAuth = () => {
    const clientId = 'bbX8NbaeW0bQjc6WMCBW79xzd'
    const redirectUri = encodeURIComponent('https://x-alerts-pw4mijo1v-wirljordan-gmailcoms-projects.vercel.app/api/auth/callback/twitter')
    const scope = 'tweet.read users.read'
    
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=test123`
    
    console.log('Auth URL:', authUrl)
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">OAuth Test Page</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg max-w-md">
        <h2 className="font-semibold mb-2">Debug Info:</h2>
        <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
        <p>Query: {JSON.stringify(router.query)}</p>
      </div>

      <button
        onClick={testOAuth}
        className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
      >
        Test Direct OAuth
      </button>

      <button
        onClick={() => router.push('/login')}
        className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
      >
        Back to Login
      </button>
    </div>
  )
} 