'use client'

import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket() {
  if (!socket) {
    // Use NEXT_PUBLIC_SERVER_URL env var if set (production: Render/Railway server)
    // Otherwise default to localhost:3001 (dev mode) or same origin (custom server)
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://meetuphere-socket.onrender.com')

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
