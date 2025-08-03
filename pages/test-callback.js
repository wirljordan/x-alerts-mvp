export default function TestCallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm text-center">
        <div className="text-blue-500 text-6xl mb-4">🔗</div>
        <h1 className="text-2xl font-bold mb-4">Callback Test</h1>
        <p className="text-gray-600 mb-6">This page confirms the callback URL is working.</p>
        
        <div className="bg-gray-100 p-4 rounded-lg text-sm">
          <p><strong>Callback URL:</strong></p>
          <p className="break-all">https://x-alerts-fa8qlucz6-wirljordan-gmailcoms-projects.vercel.app/api/auth/x-callback</p>
        </div>
        
        <button
          onClick={() => window.location.href = '/'}
          className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  )
} 