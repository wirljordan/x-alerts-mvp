import { User } from '../types/TwilertPayload'

/**
 * Check if the current time falls within user's quiet hours
 * @param user - User object with quiet_start and quiet_end times
 * @param now - Current date/time (defaults to now)
 * @returns true if current time is within quiet hours, false otherwise
 */
export function isQuietHours(user: User, now: Date = new Date()): boolean {
  // If no quiet hours are set, always allow notifications
  if (!user.quiet_start || !user.quiet_end) {
    return false
  }

  try {
    // Parse quiet hours (HH:MM format)
    const [startHour, startMinute] = user.quiet_start.split(':').map(Number)
    const [endHour, endMinute] = user.quiet_end.split(':').map(Number)

    // Validate time format
    if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
      console.warn('Invalid quiet hours format for user:', user.id)
      return false
    }

    // Create Date objects for today with the specified times
    const today = new Date(now)
    const startTime = new Date(today)
    startTime.setHours(startHour, startMinute, 0, 0)
    
    const endTime = new Date(today)
    endTime.setHours(endHour, endMinute, 0, 0)

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      // Quiet hours span midnight (e.g., 22:00 to 08:00)
      return now >= startTime || now <= endTime
    } else {
      // Quiet hours within same day (e.g., 08:00 to 22:00)
      return now >= startTime && now <= endTime
    }
  } catch (error) {
    console.error('Error checking quiet hours for user:', user.id, error)
    return false
  }
}

/**
 * Get the next time notifications will be allowed
 * @param user - User object with quiet hours
 * @param now - Current date/time (defaults to now)
 * @returns Date when quiet hours end, or null if no quiet hours set
 */
export function getNextNotificationTime(user: User, now: Date = new Date()): Date | null {
  if (!user.quiet_start || !user.quiet_end) {
    return null
  }

  try {
    const [endHour, endMinute] = user.quiet_end.split(':').map(Number)
    
    if (isNaN(endHour) || isNaN(endMinute)) {
      return null
    }

    const nextTime = new Date(now)
    nextTime.setHours(endHour, endMinute, 0, 0)

    // If the end time has already passed today, it's tomorrow
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1)
    }

    return nextTime
  } catch (error) {
    console.error('Error calculating next notification time for user:', user.id, error)
    return null
  }
} 