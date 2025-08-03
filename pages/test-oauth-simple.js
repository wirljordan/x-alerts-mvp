import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function TestOAuthSimple() {
  const router = useRouter()
  const [status, setStatus] = useState('ready')

  useEffect(() => {
    // Check if we're returning from OAuth
    if (router.query.code) {
      setStatus('success')
      console.log('✅ OAuth code received:', router.query.code)
      
      // Store the OAuth data
      if (typeof window !== 'undefined') {
        localStorage.setItem('oauth_code', router.query.code)
        localStorage.setItem('oauth_state', router.query.state || '')
        localStorage.setItem('oauth_success', 'true')
      }
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard?oauth=success')
      }, 1000)
    }
    
    if (router.query.error) {
      setStatus('error')
      console.log('❌ OAuth error:', router.query.error)
    }
  }, [router.query])

  const startOAuth = () => {
    setStatus('loading')
    
    const clientId = 'bbX8NbaeW0bQjc6WMCBW79xzd'
    const redirectUri = encodeURIComponent('https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/api/auth/callback/x')
    const scope = 'users.read tweet.read'
    const state = 'test123'
    
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`
    
    console.log('Starting OAuth with URL:', authUrl)
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-2xl font-bold">Simple OAuth Test</h1>
      
      <div className="text-center">
        {status === 'ready' && (
          <button
            onClick={startOAuth}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start X OAuth
          </button>
        )}
        
        {status === 'loading' && (
          <div className="text-blue-600">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            Redirecting to X...
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-green-600">
            ✅ OAuth successful! Redirecting to dashboard...
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-red-600">
            ❌ OAuth failed: {router.query.error}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        <p>URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}</p>
        <p>Query: {JSON.stringify(router.query)}</p>
      </div>

      <button
        onClick={() => router.push('/login')}
        className="px-4 py-2 bg-gray-600 text-white rounded"
      >
        Back to Login
      </button>
    </div>
  )
} 