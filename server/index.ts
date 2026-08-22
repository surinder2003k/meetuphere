import { createServer } from 'http'
import { Server } from 'socket.io'
import { attachSignaling } from './signaling'

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
    return
  }
  res.writeHead(404)
  res.end()
})

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'https://meetuphere.vercel.app',
  'https://meetuphere-socket.onrender.com',
]
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Fast dead-peer detection: when a user's phone/network drops mid-call, the
  // survivor should recover quickly instead of waiting ~60s for the default
  // ping timeout. Worst-case detection here is ~pingInterval + pingTimeout.
  pingInterval: 5000,
  pingTimeout: 8000,
})

attachSignaling(io)

const PORT = Number(process.env.PORT) || 3001
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] VibeLink signaling server running on port ${PORT}`)
})
