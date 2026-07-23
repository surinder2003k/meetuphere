'use client'

import { io, Socket } from 'socket.io-client'
import type { ServerToClientEvents, ClientToServerEvents } from '@/types'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

export function getSocket() {
  if (!socket) {
    let serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'

    // Production custom server serves both Next.js + Socket.io on the same port.
    // Dev mode runs separate servers; set NEXT_PUBLIC_SERVER_URL=http://localhost:3001
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      serverUrl = window.location.origin
    }

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