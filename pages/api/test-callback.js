export default function handler(req, res) {
  console.log('=== TEST CALLBACK HIT ===')
  console.log('Method:', req.method)
  console.log('Query params:', req.query)
  console.log('Headers:', req.headers)
  console.log('URL:', req.url)
  
  // Return a simple HTML page showing what we received
  res.status(200).send(`
    <html>
      <head><title>Test Callback</title></head>
      <body>
        <h1>Test Callback Received!</h1>
        <p>Method: ${req.method}</p>
        <p>Query: ${JSON.stringify(req.query)}</p>
        <p>URL: ${req.url}</p>
        <p>Headers: ${JSON.stringify(req.headers, null, 2)}</p>
      </body>
    </html>
  `)
} 