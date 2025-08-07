// Twilert API Client
// TODO: Replace with actual Twilert API credentials
const TWILERT_API_KEY = process.env.TWILERT_API_KEY || 'your_twilert_api_key_here'
const TWILERT_API_BASE_URL = 'https://api.twilert.com/v1' // TODO: Replace with actual Twilert API URL

interface TwilertAlert {
  id: string
  name: string
  query: string
  status: 'active' | 'paused'
  created_at: string
  updated_at: string
}

interface TwilertWebhook {
  id: string
  url: string
  events: string[]
  status: 'active' | 'inactive'
  created_at: string
}

interface CreateAlertRequest {
  name: string
  query: string
  status?: 'active' | 'paused'
}

interface CreateWebhookRequest {
  url: string
  events: string[]
  status?: 'active' | 'inactive'
}

/**
 * Twilert API Client
 */
export class TwilertClient {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || TWILERT_API_KEY
    this.baseUrl = baseUrl || TWILERT_API_BASE_URL
  }

  /**
   * Create a new alert
   */
  async createAlert(alert: CreateAlertRequest): Promise<TwilertAlert> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      })

      if (!response.ok) {
        throw new Error(`Failed to create alert: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Twilert alert:', error)
      throw error
    }
  }

  /**
   * Get all alerts
   */
  async getAlerts(): Promise<TwilertAlert[]> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get alerts: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting Twilert alerts:', error)
      throw error
    }
  }

  /**
   * Update an alert
   */
  async updateAlert(alertId: string, updates: Partial<CreateAlertRequest>): Promise<TwilertAlert> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update alert: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating Twilert alert:', error)
      throw error
    }
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete alert: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting Twilert alert:', error)
      throw error
    }
  }

  /**
   * Create a webhook
   */
  async createWebhook(webhook: CreateWebhookRequest): Promise<TwilertWebhook> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhook)
      })

      if (!response.ok) {
        throw new Error(`Failed to create webhook: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Twilert webhook:', error)
      throw error
    }
  }

  /**
   * Get all webhooks
   */
  async getWebhooks(): Promise<TwilertWebhook[]> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get webhooks: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting Twilert webhooks:', error)
      throw error
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete webhook: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting Twilert webhook:', error)
      throw error
    }
  }

  /**
   * Test webhook connectivity
   */
  async testWebhook(webhookId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      return response.ok
    } catch (error) {
      console.error('Error testing Twilert webhook:', error)
      return false
    }
  }
}

// Export default instance
export const twilertClient = new TwilertClient() 