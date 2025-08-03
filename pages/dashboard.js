import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Mock user data for testing
  const mockUser = {
    handle: 'testuser',
    plan: 'starter',
    sms_limit: 300,
    sms_used: 45
  }

  const user = session?.user || mockUser

  const usage = { 
    used: user.sms_used || 0, 
    limit: user.sms_limit || 300 
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
              <p className="text-gray-600">Welcome back, @{user.handle}</p>
              {!session && (
                <p className="text-sm text-orange-600 mt-1">⚠️ Mock user - OAuth not connected</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Link 
                href="/onboarding"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Complete Setup
              </Link>
              {session && (
                <button 
                  onClick={() => signOut()}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Usage Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">SMS Usage</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Current Plan: {user.plan?.charAt(0).toUpperCase() + user.plan?.slice(1)}</span>
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
            <p className="text-sm text-gray-600">
              {usage.used} SMS messages sent this month
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/alert/create"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium">Create Alert</div>
              <div className="text-sm text-gray-600">Set up a new X alert</div>
            </Link>
            <Link 
              href="/onboarding"
              className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="font-medium">Complete Setup</div>
              <div className="text-sm text-gray-600">Add phone & choose plan</div>
            </Link>
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="font-medium">View History</div>
              <div className="text-sm text-gray-600">Coming soon</div>
            </div>
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
        </div>
      </div>
    </div>
  )
}
