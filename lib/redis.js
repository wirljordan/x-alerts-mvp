// Shared Redis helper functions for OAuth and background workers

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

export async function redisGet(key) {
  try {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.result ? JSON.parse(data.result) : null
  } catch (error) {
    console.error('Redis GET error:', error)
    return null
  }
}

export async function redisSet(key, value, ttlSeconds) {
  try {
    const response = await fetch(`${REDIS_URL}/set/${key}/${encodeURIComponent(JSON.stringify(value))}?ex=${ttlSeconds}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.result === 'OK'
  } catch (error) {
    console.error('Redis SET error:', error)
    return false
  }
}

export async function redisDel(key) {
  try {
    const response = await fetch(`${REDIS_URL}/del/${key}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.result === 1
  } catch (error) {
    console.error('Redis DEL error:', error)
    return false
  }
}

export async function redisLpush(key, value) {
  try {
    const response = await fetch(`${REDIS_URL}/lpush/${key}/${encodeURIComponent(JSON.stringify(value))}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.result > 0
  } catch (error) {
    console.error('Redis LPUSH error:', error)
    return false
  }
}

export async function redisRpop(key) {
  try {
    const response = await fetch(`${REDIS_URL}/rpop/${key}`, {
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.result ? JSON.parse(decodeURIComponent(data.result)) : null
  } catch (error) {
    console.error('Redis RPOP error:', error)
    return null
  }
}

// TTL constants
export const REDIS_TTLS = {
  STATE: 600,        // 10 minutes
  CODE: 600,         // 10 minutes  
  PROFILE: 86400,    // 24 hours
  JOB: 3600,         // 1 hour
  TOKEN: 600         // 10 minutes
} 