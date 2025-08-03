import { signIn } from 'next-auth/react'

export default function Login() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-3xl font-semibold">Sign in with X</h1>
      <button
        onClick={() => signIn('twitter')}
        className="px-6 py-3 bg-black text-white rounded-xl"
      >
        Sign in
      </button>
    </main>
  )
}
