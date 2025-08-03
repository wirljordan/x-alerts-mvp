import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchAlerts()
    }
  }, [session])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/list')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleAlertStatus = async (alertId, currentStatus) => {
    try {
      const response = await fetch('/api/alerts/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          alert_id: alertId, 
          status: currentStatus === 'active' ? 'paused' : 'active' 
        })
      })

      if (response.ok) {
        toast.success(`Alert ${currentStatus === 'active' ? 'paused' : 'activated'}`)
        fetchAlerts() // Refresh the list
      } else {
        toast.error('Failed to update alert')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }

  const deleteAlert = async (alertId) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      const response = await fetch('/api/alerts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId })
      })

      if (response.ok) {
        toast.success('Alert deleted')
        fetchAlerts() // Refresh the list
      } else {
        toast.error('Failed to delete alert')
      }
    } catch (error) {
      toast.error('Something went wrong')
    }
  }

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading…</div>
  if (!session) {
    router.push('/login')
    return null
  }

  // Check if user needs onboarding
  if (!session.user.phone) {
    router.push('/onboarding')
    return null
  }

  const usage = { 
    used: session.user.sms_used || 0, 
    limit: session.user.sms_limit || 300 
  }
  const percent = Math.min(100, Math.round((usage.used / usage.limit) * 100))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-gray-600">Welcome back, @{session.user.handle}</p>
            </div>
            <button 
              onClick={() => signOut()}
              className="text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Usage Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">SMS Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Current Plan: {session.user.plan?.charAt(0).toUpperCase() + session.user.plan?.slice(1)}</span>
              <span>{usage.used} / {usage.limit} texts used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  percent > 80 ? 'bg-red-500' : percent > 60 ? 'bg-yellow-500' : 'bg-blue-600'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {percent > 80 && (
              <p className="text-sm text-red-600">
                You're running low on SMS credits. Consider upgrading your plan.
              </p>
            )}
          </div>
        </div>

        {/* Alerts Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Your Alerts</h2>
            <Link 
              href="/alert/create"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Alert
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-4">🔔</div>
              <h3 className="text-lg font-medium mb-2">No alerts yet</h3>
              <p className="text-gray-600 mb-4">Create your first alert to start getting notified about relevant tweets.</p>
              <Link 
                href="/alert/create"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Alert
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          alert.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                        {alert.last_match_at && (
                          <span className="text-xs text-gray-500">
                            Last match: {new Date(alert.last_match_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 font-medium mb-1">"{alert.query_string}"</p>
                      <p className="text-sm text-gray-600">
                        Created {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleAlertStatus(alert.id, alert.status)}
                        className={`px-3 py-1 text-sm rounded border transition-colors ${
                          alert.status === 'active'
                            ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {alert.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="px-3 py-1 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
