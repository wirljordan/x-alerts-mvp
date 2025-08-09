import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function CreateAlert() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    query: '',
    accounts: '',
    description: ''
  })
  const [testResults, setTestResults] = useState([])
  const [showTestResults, setShowTestResults] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get user from session cookie
    const getUserFromSession = () => {
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          if (key && value) {
            acc[key] = decodeURIComponent(value)
          }
          return acc
        }, {})
        
        if (cookies.x_session) {
          try {
            const sessionData = JSON.parse(cookies.x_session)
            setUser(sessionData.user)
            
            // Check if user has completed onboarding
            const hasCompletedOnboarding = cookies.onboarding_completed === 'true'
            if (!hasCompletedOnboarding) {
              router.push('/onboarding')
              return
            }
          } catch (error) {
            console.error('Error parsing session:', error)
            router.push('/?error=invalid_session')
          }
        } else {
          router.push('/?error=no_session')
        }
        setIsLoading(false)
      }
    }

    getUserFromSession()
  }, [router])

  const handleBack = () => {
    router.push('/dashboard')
  }

  const handleTestQuery = async () => {
    if (!formData.query.trim()) return
    
    setIsTesting(true)
    setShowTestResults(false)
    
    try {
      // TODO: Implement actual test query API call
      // For now, simulate test results
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockResults = [
        {
          id: '1',
          text: 'Just launched our new product! 🚀 Early access available now.',
          author: '@techstartup',
          timestamp: '2m ago',
          engagement: { replies: 12, retweets: 45, likes: 128 }
        },
        {
          id: '2',
          text: 'Excited to announce our latest feature release. Check it out!',
          author: '@innovateco',
          timestamp: '15m ago',
          engagement: { replies: 8, retweets: 23, likes: 89 }
        },
        {
          id: '3',
          text: 'Breaking: Major industry news that could impact your business.',
          author: '@industrynews',
          timestamp: '1h ago',
          engagement: { replies: 34, retweets: 156, likes: 567 }
        }
      ]
      
      setTestResults(mockResults)
      setShowTestResults(true)
    } catch (error) {
      console.error('Test query failed:', error)
    } finally {
      setIsTesting(false)
    }
  }

  const handleCreateAlert = async () => {
    if (!formData.name.trim() || !formData.query.trim()) return
    
    setIsCreating(true)
    
    try {
      const response = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          name: formData.name.trim(),
          query: formData.query.trim(),
          description: formData.description.trim()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
      // Redirect to dashboard with success message
      router.push('/dashboard?alert_created=true')
      } else {
        throw new Error(data.error || 'Failed to create alert')
      }
    } catch (error) {
      console.error('Alert creation failed:', error)
      alert(`Failed to create alert: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isFormValid = () => {
    return formData.name.trim() !== '' && formData.query.trim() !== ''
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1C2E]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16D9E3] mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1C2E]">
      {/* Header */}
      <div className="bg-[#0F1C2E]/95 backdrop-blur-sm border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 text-white/60 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <img 
                src="https://lfvokdiatflpxnohmofo.supabase.co/storage/v1/object/sign/earlyreply/Untitled%20design-21.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85OGNkMmM5Zi1jNDJlLTQ2NTgtYTMxNi1hM2ZkNTU2MjFhMjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlYXJseXJlcGx5L1VudGl0bGVkIGRlc2lnbi0yMS5wbmciLCJpYXQiOjE3NTQzMjQyODEsImV4cCI6MTc4NTg2MDI4MX0.0u_q6EYDmSciW3Fr8Ty3f-0PuUEY_e5Ea-zvIMJJiV4"
                alt="EarlyReply Logo"
                className="h-8 w-auto"
              />
              <span className="text-xl font-bold text-white">EarlyReply</span>
              <span className="text-xl font-bold text-white/60">•</span>
              <h1 className="text-xl font-bold text-white">Create Alert</h1>
            </div>
            {user && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium text-white">{user.name}</p>
                  <p className="text-xs text-white/60">@{user.username}</p>
                </div>
                {user.image && (
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-6">Alert Details</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">Alert Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="e.g., Sneaker Leads, Crypto Alpha"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Query String</label>
                  <textarea
                    value={formData.query}
                    onChange={(e) => updateFormData('query', e.target.value)}
                    placeholder="Enter your search query (e.g., 'sneakers OR kicks -RT', 'crypto bitcoin')"
                    rows={4}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors resize-none"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Use X search operators: OR, AND, -RT (no retweets), from:username, etc.
                  </p>
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Accounts to Watch (Optional)</label>
                  <textarea
                    value={formData.accounts}
                    onChange={(e) => updateFormData('accounts', e.target.value)}
                    placeholder="Enter X usernames, one per line (e.g., @nike, @adidas)"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors resize-none"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Leave empty to monitor all accounts matching your query
                  </p>
                </div>
                
                <div>
                  <label className="block text-white font-medium mb-2">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => updateFormData('description', e.target.value)}
                    placeholder="Brief description of what this alert monitors"
                    rows={2}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#16D9E3] transition-colors resize-none"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-4 mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={handleTestQuery}
                  disabled={!formData.query.trim() || isTesting}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {isTesting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                      Testing...
                    </>
                  ) : (
                    'Test Query'
                  )}
                </button>
                
                <button
                  onClick={handleCreateAlert}
                  disabled={!isFormValid() || isCreating}
                  className="px-8 py-3 bg-[#16D9E3] hover:bg-[#16D9E3]/90 disabled:bg-white/20 disabled:cursor-not-allowed text-[#0F1C2E] font-semibold rounded-lg transition-colors"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0F1C2E] mr-2 inline"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Alert'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Test Results Section */}
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white mb-6">Test Results</h2>
              
              {!showTestResults ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#16D9E3]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-[#16D9E3] text-2xl">🔍</span>
                  </div>
                  <p className="text-white/60 mb-4">Test your query to see sample results</p>
                  <p className="text-sm text-white/40">
                    Enter a query above and click "Test Query" to see what posts would match your alert
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-white/60">
                      Showing {testResults.length} sample results
                    </span>
                    <button
                      onClick={() => setShowTestResults(false)}
                      className="text-[#16D9E3] text-sm hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  
                  {testResults.map((result) => (
                    <div key={result.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-[#16D9E3]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#16D9E3] text-xs">X</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-white font-medium text-sm">{result.author}</span>
                            <span className="text-white/40 text-xs">•</span>
                            <span className="text-white/40 text-xs">{result.timestamp}</span>
                          </div>
                          <p className="text-white/90 text-sm leading-relaxed mb-3">
                            {result.text}
                          </p>
                          <div className="flex items-center space-x-4 text-white/60 text-xs">
                            <span>💬 {result.engagement.replies}</span>
                            <span>🔄 {result.engagement.retweets}</span>
                            <span>❤️ {result.engagement.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips Section */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 shadow-lg">
              <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
              <div className="space-y-3 text-sm text-white/70">
                <div className="flex items-start space-x-2">
                  <span className="text-[#16D9E3] mt-1">•</span>
                  <p>Use quotes for exact phrases: "new product launch"</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#16D9E3] mt-1">•</span>
                  <p>Exclude retweets: add -RT to your query</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#16D9E3] mt-1">•</span>
                  <p>Monitor specific users: from:username</p>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-[#16D9E3] mt-1">•</span>
                  <p>Use OR for multiple terms: sneakers OR kicks</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 