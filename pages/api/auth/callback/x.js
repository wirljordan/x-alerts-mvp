import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function XCallback() {
  const router = useRouter()

  useEffect(() => {
    // Check if we have an OAuth code
    if (router.query.code) {
      console.log('OAuth code received:', router.query.code)
      
      // Store the code in localStorage for the dashboard to use
      if (typeof window !== 'undefined') {
        localStorage.setItem('oauth_code', router.query.code)
        localStorage.setItem('oauth_state', router.query.state || '')
      }
      
      // Redirect to dashboard
      router.push('/dashboard?oauth=success')
    } else if (router.query.error) {
      console.log('OAuth error:', router.query.error)
      router.push('/login?error=oauth_failed')
    } else {
      // No code or error, redirect to login
      router.push('/login')
    }
  }, [router.query])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Completing login...</p>
      </div>
    </div>
  )
} 