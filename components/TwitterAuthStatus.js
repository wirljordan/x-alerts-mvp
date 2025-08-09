import { useState, useEffect } from 'react'

export default function TwitterAuthStatus() {
  const [authStatus, setAuthStatus] = useState(null)
  const [usageStats, setUsageStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const checkAuthHealth = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/test/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'health' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setAuthStatus(data)
      } else {
        setError(data.error || 'Failed to check authentication health')
      }
    } catch (err) {
      setError('Failed to connect to authentication service')
    } finally {
      setLoading(false)
    }
  }

  const getUsageStats = async () => {
    try {
      const response = await fetch('/api/test/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'usage' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setUsageStats(data)
      }
    } catch (err) {
      console.error('Failed to get usage stats:', err)
    }
  }

  const testAPIRequest = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/test/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_request', searchQuery: 'test' })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh usage stats after successful request
        await getUsageStats()
        alert(`✅ API test successful! Found ${data.result.tweetCount} tweets.`)
      } else {
        setError(data.error || 'API test failed')
      }
    } catch (err) {
      setError('Failed to test API request')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthHealth()
    getUsageStats()
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Checking authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          TwitterAPI.io Authentication Status
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={checkAuthHealth}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={testAPIRequest}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Test API
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {authStatus && (
        <div className="space-y-4">
          {/* Health Status */}
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${authStatus.healthy ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              Status: {authStatus.healthy ? 'Healthy' : 'Unhealthy'}
            </span>
          </div>

          {/* API Keys Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total API Keys:</span>
              <span className="ml-2 font-medium">{authStatus.totalKeys}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Valid Keys:</span>
              <span className="ml-2 font-medium">{authStatus.validKeys}</span>
            </div>
          </div>

          {/* Validation Results */}
          {authStatus.validationResults && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">API Key Validation:</h4>
              <div className="space-y-1">
                {authStatus.validationResults.map((result, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${result.valid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span>Key {result.keyIndex + 1}:</span>
                    <span className={result.valid ? 'text-green-600' : 'text-red-600'}>
                      {result.valid ? 'Valid' : result.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {usageStats && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Usage Statistics:</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Current Key:</span>
              <span className="ml-2 font-medium">{usageStats.currentKeyIndex + 1}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Requests:</span>
              <span className="ml-2 font-medium">{usageStats.totalRequests}</span>
            </div>
          </div>
          
          {/* Request Counts by Key */}
          {usageStats.requestCounts && Object.keys(usageStats.requestCounts).length > 0 && (
            <div className="mt-3">
              <h5 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Requests per Key:</h5>
              <div className="space-y-1">
                {Object.entries(usageStats.requestCounts).map(([key, count]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="capitalize">{key.replace('_', ' ')}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 