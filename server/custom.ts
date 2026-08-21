import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

interface PeerProfile {
  name: string
  gender: string
}
interface WaitingPeer {
  socketId: string
  profile: PeerProfile
}

const waitingPeers: WaitingPeer[] = []
const activePairs = new Map<string, string>()
let connectedCount = 0

function removeFromWaiting(socketId: string) {
  const idx = waitingPeers.findIndex((p) => p.socketId === socketId)
  if (idx !== -1) waitingPeers.splice(idx, 1)
}

function removeFromActive(socketId: string) {
  const pairedId = activePairs.get(socketId)
  if (pairedId) activePairs.delete(pairedId)
  activePairs.delete(socketId)
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001', 'https://meetuphere.vercel.app'],
      methods: ['GET', 'POST'],
    },
    // Fast dead-peer detection for instant disconnection handling.
    pingInterval: 5000,
    pingTimeout: 8000,
  })

  function tryMatch(socketId: string) {
    const me = waitingPeers.find((p) => p.socketId === socketId)
    if (!me) return
    const target = waitingPeers.find((p) => p.socketId !== socketId && !activePairs.has(p.socketId))
    if (target) {
      removeFromWaiting(socketId)
      removeFromWaiting(target.socketId)
      activePairs.set(socketId, target.socketId)
      activePairs.set(target.socketId, socketId)

      io.to(socketId).emit('matched', { peerId: target.socketId, initiator: true })
      io.to(target.socketId).emit('matched', { peerId: socketId, initiator: false })
      io.to(socketId).emit('signal', { signal: { type: 'profile', name: target.profile.name, gender: target.profile.gender }, sender: target.socketId })
      io.to(target.socketId).emit('signal', { signal: { type: 'profile', name: me.profile.name, gender: me.profile.gender }, sender: socketId })
    } else {
      const pos = waitingPeers.filter((p) => p.socketId !== socketId).length
      io.to(socketId).emit('waiting', pos || 0)
    }
  }

  io.on('connection', (socket) => {
    connectedCount++
    io.emit('user-count', connectedCount)
    console.log(`[+] Connected: ${socket.id} (online: ${connectedCount})`)

    socket.on('find-peer', (profile: PeerProfile) => {
      removeFromWaiting(socket.id)
      waitingPeers.push({ socketId: socket.id, profile })
      console.log(`[?] ${socket.id} looking for peer (${profile.name})`)
      tryMatch(socket.id)
    })

    socket.on('signal', (data: { signal: any; target: string }) => {
      if (activePairs.get(socket.id) !== data.target) return
      io.to(data.target).emit('signal', { signal: data.signal, sender: socket.id })
    })

    socket.on('chat-message', (data: { content: string; target: string }) => {
      io.to(data.target).emit('chat-message', {
        id: crypto.randomUUID(),
        sender: 'stranger',
        content: data.content,
        timestamp: Date.now(),
      })
    })

    socket.on('typing', (data: { target: string }) => {
      io.to(data.target).emit('typing', { sender: socket.id })
    })

    socket.on('skip', () => {
      const pairedId = activePairs.get(socket.id)
      if (pairedId) {
        io.to(pairedId).emit('peer-left')
        removeFromActive(socket.id)
      }
      removeFromWaiting(socket.id)
    })

    socket.on('report', (data: { target: string; reason: string }) => {
      console.log(`[!] Report from ${socket.id} against ${data.target}: ${data.reason}`)
    })

    socket.on('stop-searching', () => {
      removeFromWaiting(socket.id)
    })

    socket.on('disconnect', () => {
      connectedCount = Math.max(0, connectedCount - 1)
      io.emit('user-count', connectedCount)
      console.log(`[-] Disconnected: ${socket.id} (online: ${connectedCount})`)
      const pairedId = activePairs.get(socket.id)
      if (pairedId) {
        io.to(pairedId).emit('peer-disconnected')
        removeFromActive(socket.id)
      }
      removeFromWaiting(socket.id)
      if (waitingPeers.length > 0) {
        tryMatch(waitingPeers[0].socketId)
      }
    })
  })

  httpServer.listen(port, () => {
    console.log(`[Server] VibeLink running on http://localhost:${port}`)
  })
})
