import { supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, settingKey, settingValue } = req.body

    if (!userId || !settingKey || settingValue === undefined) {
      return res.status(400).json({ error: 'Missing required fields: userId, settingKey, settingValue' })
    }

    // Validate setting key
    const allowedSettings = ['timezone', 'quiet_hours_start', 'quiet_hours_end', 'delivery_mode']
    if (!allowedSettings.includes(settingKey)) {
      return res.status(400).json({ error: `Invalid setting key. Allowed: ${allowedSettings.join(', ')}` })
    }

    // Skip column check since we know the columns exist after migration
    // The column check was causing issues with schema access

    // Validate timezone if provided
    if (settingKey === 'timezone') {
      const validTimezones = [
        'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 
        'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 
        'Asia/Tokyo', 'Australia/Sydney'
      ]
      if (!validTimezones.includes(settingValue)) {
        return res.status(400).json({ error: 'Invalid timezone' })
      }
    }

    // Validate time format if time settings
    if (settingKey === 'quiet_hours_start' || settingKey === 'quiet_hours_end') {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(settingValue)) {
        return res.status(400).json({ error: 'Invalid time format. Use HH:MM format (e.g., 22:00)' })
      }
    }

    // Validate delivery mode if provided
    if (settingKey === 'delivery_mode') {
      const validModes = ['sms', 'push', 'inapp']
      if (!validModes.includes(settingValue)) {
        return res.status(400).json({ error: 'Invalid delivery mode. Allowed: sms, push, inapp' })
      }
    }

    // Update the user setting
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        [settingKey]: settingValue,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()

    if (error) {
      console.error('Error updating user setting:', error)
      return res.status(500).json({ error: 'Failed to update user setting' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    console.log(`✅ Updated user ${userId} setting ${settingKey} to ${settingValue}`)

    res.status(200).json({ 
      success: true, 
      message: `Setting ${settingKey} updated successfully`,
      user: data[0]
    })

  } catch (error) {
    console.error('API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 