import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()

  const handleSignIn = () => {
    signIn('x', { 
      callbackUrl: '/dashboard'
    })
  }

  const handleMockLogin = () => {
    // Mock login - go directly to dashboard
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-semibold">Sign in with X</h1>
      
      <div className="space-y-4 w-full max-w-md">
        <button
          onClick={handleMockLogin}
          className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium"
        >
          🚀 Start App (Skip OAuth)
        </button>
        
        <button
          onClick={handleSignIn}
          className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Sign in with X (Real)
        </button>
      </div>

      <div className="text-sm text-gray-500 mt-4 space-y-2">
        <p>Current URL: {typeof window !== 'undefined' ? window.location.host : 'Loading...'}</p>
        <Link href="/debug-oauth" className="text-blue-600 hover:underline">
          Debug OAuth Issues
        </Link>
      </div>
    </main>
  )
}
