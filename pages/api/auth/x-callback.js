export default async function handler(req, res) {
  console.log('Callback hit!', req.query)
  
  if (req.method === 'GET') {
    const { code, error } = req.query

    if (error) {
      console.error('OAuth error:', error)
      return res.redirect('/?error=oauth_failed')
    }

    if (code) {
      console.log('Got authorization code:', code)
      // For now, just redirect to success
      res.redirect('/success')
    } else {
      console.log('No code received')
      res.redirect('/?error=no_code')
    }
  } else {
    res.status(405).end('Method not allowed')
  }
} 