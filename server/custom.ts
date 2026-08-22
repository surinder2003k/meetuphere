import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { attachSignaling } from './signaling'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://meetuphere.vercel.app',
        'https://meetuphere-socket.onrender.com',
      ],
      methods: ['GET', 'POST'],
    },
    // Fast dead-peer detection for instant disconnection handling.
    pingInterval: 5000,
    pingTimeout: 8000,
  })

  attachSignaling(io)

  httpServer.listen(port, () => {
    console.log(`[Server] VibeLink running on http://localhost:${port}`)
  })
})
