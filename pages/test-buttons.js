import { useState } from 'react'
import Head from 'next/head'

export default function TestButtons() {
  const [isTestingMonitoring, setIsTestingMonitoring] = useState(false)
  const [result, setResult] = useState('')

  const testTwitterAPI = async () => {
    setIsTestingMonitoring(true)
    try {
      const response = await fetch('/api/test/twitter-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setResult(`Twitter API test successful! Found ${data.data.data?.length || 0} tweets.`)
      } else {
        setResult(`Twitter API test failed: ${data.error || data.message}`)
      }
    } catch (error) {
      console.error('Error testing Twitter API:', error)
      setResult('Error testing Twitter API: ' + error.message)
    } finally {
      setIsTestingMonitoring(false)
    }
  }

  const testKeywordMonitoring = async () => {
    setIsTestingMonitoring(true)
    try {
      const response = await fetch('/api/test/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      if (response.ok) {
        setResult(`Keyword monitoring test completed! Processed ${data.totalProcessed} notifications, sent ${data.totalSmsSent} SMS.`)
      } else {
        setResult(`Test failed: ${data.error}`)
      }
    } catch (error) {
      console.error('Error testing keyword monitoring:', error)
      setResult('Error testing keyword monitoring: ' + error.message)
    } finally {
      setIsTestingMonitoring(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1C2E] text-white p-8">
      <Head>
        <title>Test Buttons - Early Reply</title>
      </Head>
      
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Buttons</h1>
        
        <div className="space-y-4">
          <button
            onClick={testTwitterAPI}
            disabled={isTestingMonitoring}
            className={`px-6 py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
              isTestingMonitoring
                ? 'bg-white/20 text-white/40 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isTestingMonitoring ? 'Testing...' : 'Test Twitter API'}
          </button>
          
          <button
            onClick={testKeywordMonitoring}
            disabled={isTestingMonitoring}
            className={`px-6 py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
              isTestingMonitoring
                ? 'bg-white/20 text-white/40 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isTestingMonitoring ? 'Testing...' : 'Test Monitoring'}
          </button>
        </div>
        
        {result && (
          <div className="mt-8 p-4 bg-white/10 rounded-lg">
            <h3 className="font-semibold mb-2">Result:</h3>
            <p className="text-sm">{result}</p>
          </div>
        )}
        
        <div className="mt-8">
          <a href="/dashboard" className="text-[#16D9E3] hover:underline">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
} 