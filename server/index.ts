import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

interface PeerProfile {
  name: string
  gender: string
}

interface WaitingPeer {
  socketId: string
  profile: PeerProfile
}

const waitingPeers: WaitingPeer[] = []
const activePairs = new Map<string, string>() // socketId -> pairedSocketId

function removeFromWaiting(socketId: string) {
  const idx = waitingPeers.findIndex((p) => p.socketId === socketId)
  if (idx !== -1) {
    waitingPeers.splice(idx, 1)
  }
}

function removeFromActive(socketId: string) {
  const pairedId = activePairs.get(socketId)
  if (pairedId) {
    activePairs.delete(pairedId)
  }
  activePairs.delete(socketId)
}

function tryMatch(socketId: string) {
  const me = waitingPeers.find((p) => p.socketId === socketId)
  if (!me) return

  // Find another waiting peer (prefer opposite gender if possible)
  const target = waitingPeers.find(
    (p) => p.socketId !== socketId && !activePairs.has(p.socketId)
  )

  if (target) {
    removeFromWaiting(socketId)
    removeFromWaiting(target.socketId)

    activePairs.set(socketId, target.socketId)
    activePairs.set(target.socketId, socketId)

    io.to(socketId).emit('matched', { peerId: target.socketId, initiator: true })
    io.to(target.socketId).emit('matched', { peerId: socketId, initiator: false })

    // Exchange profile info via signal
    io.to(socketId).emit('signal', {
      signal: { type: 'profile', name: target.profile.name, gender: target.profile.gender },
      sender: target.socketId,
    })
    io.to(target.socketId).emit('signal', {
      signal: { type: 'profile', name: me.profile.name, gender: me.profile.gender },
      sender: socketId,
    })
  } else {
    const pos = waitingPeers.filter((p) => p.socketId !== socketId).length
    io.to(socketId).emit('waiting', pos || 0)
  }
}

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`)

  socket.on('find-peer', (profile: PeerProfile) => {
    // Remove from waiting if already there
    removeFromWaiting(socket.id)

    waitingPeers.push({ socketId: socket.id, profile })
    console.log(`[?] ${socket.id} looking for peer (${profile.name})`)

    tryMatch(socket.id)
  })

  socket.on('signal', (data: { signal: any; target: string }) => {
    io.to(data.target).emit('signal', {
      signal: data.signal,
      sender: socket.id,
    })
  })

  socket.on('chat-message', (data: { content: string; target: string }) => {
    const msg = {
      id: crypto.randomUUID(),
      sender: 'stranger',
      content: data.content,
      timestamp: Date.now(),
    }
    io.to(data.target).emit('chat-message', msg)
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
    // In production, log to database
  })

  socket.on('stop-searching', () => {
    removeFromWaiting(socket.id)
  })

  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`)

    const pairedId = activePairs.get(socket.id)
    if (pairedId) {
      io.to(pairedId).emit('peer-disconnected')
      removeFromActive(socket.id)
    }

    removeFromWaiting(socket.id)

    // Try to re-match remaining waiting peers
    if (waitingPeers.length > 0) {
      const next = waitingPeers[0]
      tryMatch(next.socketId)
    }
  })
})

const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`[Server] VibeLink signaling server running on port ${PORT}`)
})