import crypto from 'crypto'

// Encryption key should be stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key-here'
const ALGORITHM = 'aes-256-gcm'

export function encrypt(text) {
  if (!text) return null
  
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Return IV + AuthTag + EncryptedData
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

export function decrypt(encryptedText) {
  if (!encryptedText) return null
  
  try {
    const parts = encryptedText.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    return null
  }
}

// Helper function to encrypt account credentials
export function encryptAccountCredentials(account) {
  return {
    username: account.username,
    encrypted_password: encrypt(account.password),
    encrypted_email: encrypt(account.email),
    encrypted_auth_token: encrypt(account.auth_token),
    encrypted_totp_secret: encrypt(account.totp_secret),
    registration_year: account.registration_year
  }
}

// Helper function to decrypt account credentials
export function decryptAccountCredentials(encryptedAccount) {
  return {
    username: encryptedAccount.username,
    password: decrypt(encryptedAccount.encrypted_password),
    email: decrypt(encryptedAccount.encrypted_email),
    auth_token: decrypt(encryptedAccount.encrypted_auth_token),
    totp_secret: decrypt(encryptedAccount.encrypted_totp_secret),
    registration_year: encryptedAccount.registration_year
  }
} 