import { signIn } from 'next-auth/react'
import { useRouter } from 'next/router'

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
      
      <div className="space-y-4">
        <button
          onClick={handleSignIn}
          className="w-full px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Sign in with X (Real)
        </button>
        
        <button
          onClick={handleMockLogin}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          Mock Login (Skip OAuth)
        </button>
      </div>

      <div className="text-sm text-gray-500 mt-4">
        <p>Current URL: {typeof window !== 'undefined' ? window.location.host : 'Loading...'}</p>
      </div>
    </main>
  )
}
