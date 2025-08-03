export default function TestOAuth() {
  const testOAuth = () => {
    const clientId = 'bbX8NbaeW0bQjc6WMCBW79xzd'
    const redirectUri = 'http://localhost:3000/api/auth/x-callback'
    // Add more scopes that should trigger permission prompt
    const scope = 'tweet.read users.read follows.read like.read'
    const state = Math.random().toString(36).substring(7)
    
    const authUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}&prompt=consent`
    
    console.log('Test OAuth URL:', authUrl)
    window.open(authUrl, '_blank')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Test OAuth</h1>
        <p className="text-gray-600 mb-6">This will open X OAuth in a new tab to see what happens.</p>
        
        <button
          onClick={testOAuth}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Test OAuth (New Tab)
        </button>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Check the browser console for the OAuth URL.</p>
          <p className="mt-2">Scopes: tweet.read users.read follows.read like.read</p>
          <p className="mt-2">Added: state parameter + prompt=consent</p>
        </div>
      </div>
    </div>
  )
} 