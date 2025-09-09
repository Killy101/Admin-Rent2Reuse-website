const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Define the paths to your certificate and key
const httpsOptions = {
  key: fs.readFileSync('./rent2reuse.com-key.pem'), // Path to the key
  cert: fs.readFileSync('./rent2reuse.com.pem')    // Path to the certificate
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(443, (err) => {
    if (err) {
      console.error('\x1b[31m%s\x1b[0m', '✖ Error starting server:', err) // Red text
      throw err
    }

    const now = new Date().toLocaleString() // Get the current date and time
    console.log('========================================') // Yellow separator
    console.log('\x1b[32m%s\x1b[0m', '✔ Rent2Reuse Server is Running!') // Green text
    console.log('\x1b[36m%s\x1b[0m', `> Environment: ${dev ? 'Development' : 'Production'}`) // Cyan text
    console.log('\x1b[36m%s\x1b[0m', `> Start Time: ${now}`) // Cyan text
    console.log('\x1b[34m%s\x1b[0m', '> Access it at:', '\x1b[4m\x1b[36mhttps://rent2reuse.com\x1b[0m') // Blue text with cyan underlined URL
    console.log('========================================') // Yellow separator
  })
})
