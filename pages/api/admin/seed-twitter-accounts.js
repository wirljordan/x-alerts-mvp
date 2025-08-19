import { supabaseAdmin } from '../../../lib/supabase'
import { encryptAccountCredentials } from '../../../lib/encryption'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Basic admin check (you should implement proper admin authentication)
  const adminKey = req.headers['x-admin-key']
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    console.log('🔐 Seeding Twitter accounts with encrypted credentials...')

    // Twitter accounts data (encrypted)
    const accounts = [
      {
        username: 'Meggy50069709',
        password: 'BZMTBdM7VX',
        email: 'madeleine35@web.de',
        auth_token: '730d5fb8ac49948405aa564754f6e944e1aa623a',
        totp_secret: 'CB7D2XR3JJRJ5HBJ',
        registration_year: 2020
      },
      {
        username: 'JuebH80875',
        password: 'AeQtwEUCqZ',
        email: 'heynjueb@gmail.com',
        auth_token: 'bae9fe924a5a9c54462dcb139998efaac5c6c921',
        totp_secret: 'UVQRN2RGANIYK3UI',
        registration_year: 2023
      },
      {
        username: 'NicholasHamel12',
        password: 'aafz8RLLBr',
        email: 'nicholashamel89@gmail.com',
        auth_token: 'd40ad9ed61fa2b88ce473ce1ed8b64f648843abb',
        totp_secret: '3VUXZUPIP73FM3QX',
        registration_year: 2022
      },
      {
        username: 'Marchel1510739',
        password: 'QaGfeuXrVG',
        email: 'yuliamarchel26@gmail.com',
        auth_token: '09f8d8fb20c514a0ad2885d670e9ebb3d3783022',
        totp_secret: 'LHJTMGBR6GGWQWXZ',
        registration_year: 2023
      },
      {
        username: 'KondakovVa9067',
        password: 'hwYZauEtJu',
        email: 'vadimdecember@gmail.com',
        auth_token: '9ff7d6bdca5bc3da7a1b88f02a3e4452a0635eae',
        totp_secret: 'XEHQRN6P5UXZOCST',
        registration_year: 2023
      },
      {
        username: 'DiegoArturoLun9',
        password: 'JKt4GfZCTL',
        email: 'ganaya113646@gmail.com',
        auth_token: '3ba60807a3ad00d609f741c857d6ad71c6848782',
        totp_secret: 'UEUDG6AWQGZJ3DXH',
        registration_year: 2022
      },
      {
        username: 'NguynVn91541411',
        password: 'EraqzqYhjP',
        email: 'boynhangheo809@gmail.com',
        auth_token: 'bd7fb44551e44e682473c5e199e25920032b7e75',
        totp_secret: 'UOVFXV6DQHHVJDAO',
        registration_year: 2020
      },
      {
        username: 'Mykymax3d',
        password: 'CtmMPuGZny',
        email: 'michael.durand.fr@gmail.com',
        auth_token: '8f760e586491afac006a1e998fc469f15cb0fc2a',
        totp_secret: 'PMOL6OG5YRLARXSH',
        registration_year: 2023
      },
      {
        username: 'NUMNUMsleeepy',
        password: '3Q5ZYKfnJY',
        email: 'Tnnaw243@gmail.com',
        auth_token: '062d550aaa4dfa1b395a597118d160ca0dac88c3',
        totp_secret: 'KKNSCUSHYMZCLTPQ',
        registration_year: 2023
      },
      {
        username: 'Mariann30251922',
        password: 'NqQZqFFFDM',
        email: 'mb-1981@gmx.at',
        auth_token: '83d2a42157ba1a23760be17e92223cf6215643fc',
        totp_secret: 'KM6OYH7SMTXEGPCQ',
        registration_year: 2021
      }
    ]

    // Encrypt and insert accounts
    const encryptedAccounts = accounts.map(account => encryptAccountCredentials(account))
    
    const { data, error } = await supabaseAdmin
      .from('twitter_accounts')
      .insert(encryptedAccounts)

    if (error) {
      console.error('❌ Error seeding accounts:', error)
      return res.status(500).json({ error: 'Failed to seed accounts', details: error.message })
    }

    console.log('✅ Successfully seeded', encryptedAccounts.length, 'Twitter accounts')
    
    return res.status(200).json({ 
      success: true, 
      message: `Successfully seeded ${encryptedAccounts.length} Twitter accounts`,
      accountsCount: encryptedAccounts.length
    })

  } catch (error) {
    console.error('❌ Error in seed-twitter-accounts:', error)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
} 