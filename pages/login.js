import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function Login() {
  const router = useRouter()

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard')
      }
    })
  }, [router])

  const handleSignIn = async () => {
    try {
      const result = await signIn('twitter', { 
        callbackUrl: '/dashboard',
        redirect: true 
      })
      console.log('Sign in result:', result)
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-semibold">Sign in with X</h1>
      <button
        onClick={handleSignIn}
        className="px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
      >
        Sign in with X
      </button>
    </main>
  )
}
