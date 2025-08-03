import { getServerSession } from 'next-auth/next'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { phone, email, plan } = req.body

    // For now, just return success
    // We'll add Supabase integration later
    console.log('User update request:', { phone, email, plan })

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error in user update:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 