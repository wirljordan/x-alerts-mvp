#!/usr/bin/env node

// Script to get TwitterAPI.io login cookie
// Usage: node scripts/get-twitterapi-login.js

const fetch = require('node-fetch')

async function getTwitterAPILogin() {
  const username = process.argv[2]
  const password = process.argv[3]
  const email = process.argv[4] || ''
  const totp_secret = process.argv[5] || ''

  if (!username || !password) {
    console.log('❌ Usage: node scripts/get-twitterapi-login.js <username> <password> [email] [totp_secret]')
    console.log('Example: node scripts/get-twitterapi-login.js your_username your_password')
    process.exit(1)
  }

  try {
    console.log('🔐 Logging into TwitterAPI.io...')
    console.log('Username:', username)
    console.log('Email:', email || 'not provided')
    console.log('2FA Secret:', totp_secret || 'not provided')

    const response = await fetch('https://api.twitterapi.io/twitter/user_login_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.TWITTER_API_KEY
      },
      body: JSON.stringify({
        user_name: username,
        email: email,
        password: password,
        totp_secret: totp_secret
      })
    })

    console.log('Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Login failed:', errorText)
      process.exit(1)
    }

    const data = await response.json()
    console.log('✅ Login successful!')
    console.log('Status:', data.status)
    console.log('Message:', data.msg)
    console.log('\n🔑 LOGIN COOKIE:')
    console.log(data.login_cookie)
    console.log('\n📝 Add this to your environment variables as:')
    console.log('TWITTERAPI_LOGIN_COOKIES=' + data.login_cookie)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

getTwitterAPILogin() 