import { signIn } from 'next-auth/react'

export default function Login() {
  const handleSignIn = () => {
    signIn('twitter', { 
      callbackUrl: 'https://x-alerts-pw4mijo1v-wirljordan-gmailcoms-projects.vercel.app/dashboard'
    })
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
