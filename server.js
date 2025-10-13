import app from './app.js'

const PORT = process.env.PORT || 5000
const HOST = process.env.HOST || '0.0.0.0'

// Bind to 0.0.0.0 so the server is reachable by other devices on the same LAN.
app.listen(PORT, HOST)

console.log(`Mystore Admin backend listening on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`)
