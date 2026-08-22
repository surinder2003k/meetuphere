'use client'

import { useRef, useCallback } from 'react'
import { getSocket, disconnectSocket } from '@/lib/socket'
import type { UserProfile } from '@/types'

interface UseSocketOptions {
  onMatched: (data: { peerId: string; initiator: boolean }) => void
  onSignal: (data: { signal: any; sender: string }) => void
  onPeerDisconnected: () => void
  onPeerLeft: () => void
  onNoPeers: () => void
  onWaiting: (position: number) => void
  onUserCount: (count: number) => void
  onDisconnect: () => void
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<ReturnType<typeof getSocket> | undefined>(undefined)
  const connectedRef = useRef(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const connect = useCallback(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on('connect', () => {
      connectedRef.current = true
    })

    socket.on('matched', (peerId) => {
      optionsRef.current.onMatched(peerId)
    })

    socket.on('signal', (data) => {
      optionsRef.current.onSignal(data)
    })

    socket.on('peer-disconnected', () => {
      optionsRef.current.onPeerDisconnected()
    })

    socket.on('peer-left', () => {
      optionsRef.current.onPeerLeft()
    })

    socket.on('no-peers', () => {
      optionsRef.current.onNoPeers()
    })

    socket.on('waiting', (position) => {
      optionsRef.current.onWaiting(position)
    })

    socket.on('user-count', (count) => {
      optionsRef.current.onUserCount(count)
    })

    socket.on('disconnect', () => {
      connectedRef.current = false
      optionsRef.current.onDisconnect?.()
    })

    if (!socket.connected) {
      socket.connect()
    }

    return socket
  }, [])

  const findPeer = useCallback((profile: UserProfile) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('find-peer', profile)
    }
  }, [])

  const sendSignal = useCallback((data: { signal: any; target: string }) => {
    socketRef.current?.emit('signal', data)
  }, [])

  const skip = useCallback(() => {
    socketRef.current?.emit('skip')
  }, [])

  const report = useCallback((data: { target: string; reason: string }) => {
    socketRef.current?.emit('report', data)
  }, [])

  const stopSearching = useCallback(() => {
    socketRef.current?.emit('stop-searching')
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.off('matched')
      socketRef.current.off('signal')
      socketRef.current.off('peer-disconnected')
      socketRef.current.off('peer-left')
      socketRef.current.off('no-peers')
      socketRef.current.off('waiting')
      socketRef.current.off('user-count')
      socketRef.current.off('disconnect')
    }
    disconnectSocket()
    connectedRef.current = false
  }, [])

  return {
    connect,
    findPeer,
    sendSignal,
    skip,
    report,
    stopSearching,
    disconnect,
    socketRef,
  }
}
