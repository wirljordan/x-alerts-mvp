import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const GOAL_TEMPLATES = {
  leads: {
    query: '("need help" OR "looking for" OR "recommendations") AND (your_industry_keywords)',
    description: 'Find people asking for recommendations or help in your industry'
  },
  followers: {
    query: '(your_niche_keywords) AND (follow OR following OR new)',
    description: 'Find people engaging with content in your niche'
  },
  competitors: {
    query: '(@competitor1 OR @competitor2 OR @competitor3)',
    description: 'Track mentions of your competitors'
  },
  custom: {
    query: '',
    description: 'Create your own custom search query'
  }
}

export default function CreateAlert() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [showTestModal, setShowTestModal] = useState(false)
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm()
  const selectedGoal = watch('goal', 'custom')
  const queryString = watch('query_string', '')

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!session) {
    router.push('/login')
    return null
  }

  const handleGoalChange = (goal) => {
    setValue('goal', goal)
    if (goal !== 'custom') {
      setValue('query_string', GOAL_TEMPLATES[goal].query)
    }
  }

  const handleTestQuery = async () => {
    if (!queryString.trim()) {
      toast.error('Please enter a query to test')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_string: queryString })
      })

      if (response.ok) {
        const data = await response.json()
        setTestResults(data.results)
        setShowTestModal(true)
      } else {
        toast.error('Failed to test query')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAlert = async (data) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/alerts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query_string: data.query_string,
          accounts_to_watch: data.accounts_to_watch
        })
      })

      if (response.ok) {
        toast.success('Alert created successfully!')
        router.push('/dashboard')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create alert')
      }
    } catch (error) {
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Alert</h1>

          <form onSubmit={handleSubmit(handleCreateAlert)} className="space-y-6">
            {/* Goal Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">What type of alert do you want?</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(GOAL_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleGoalChange(key)}
                    className={`p-4 text-left border rounded-lg transition-colors ${
                      selectedGoal === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                    }`}
                  >
                    <div className="font-medium capitalize">{key}</div>
                    <div className="text-sm text-gray-600">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Query String */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Search Query
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                {...register('query_string', { required: 'Query is required' })}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your X search query (e.g., 'marketing tips' OR 'growth hacking')"
              />
              {errors.query_string && (
                <p className="text-red-500 text-sm mt-1">{errors.query_string.message}</p>
              )}
              <p className="text-sm text-gray-600 mt-2">
                Use X's search operators like AND, OR, quotes, and @mentions
              </p>
            </div>

            {/* Accounts to Watch */}
            <div>
              <label className="block text-sm font-medium mb-2">Accounts to Watch (optional)</label>
              <input
                type="text"
                {...register('accounts_to_watch')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="@username1, @username2, @username3"
              />
              <p className="text-sm text-gray-600 mt-2">
                Add specific accounts to monitor (comma-separated)
              </p>
            </div>

            {/* Test Query Button */}
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleTestQuery}
                disabled={isLoading || !queryString.trim()}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Testing...' : 'Test Query'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Alert'}
            </button>
          </form>
        </div>
      </div>

      {/* Test Results Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Test Results</h3>
                <button
                  onClick={() => setShowTestModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {testResults && testResults.length > 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Found {testResults.length} recent tweets matching your query:
                  </p>
                  {testResults.map((tweet, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <div className="font-medium">@{tweet.user_handle}</div>
                          <div className="text-gray-800 mt-1">{tweet.text}</div>
                          <div className="text-sm text-gray-500 mt-2">
                            {new Date(tweet.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No recent tweets found matching your query.</p>
              )}
              
              <button
                onClick={() => setShowTestModal(false)}
                className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 