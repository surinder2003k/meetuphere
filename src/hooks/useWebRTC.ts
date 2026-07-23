'use client'

import { useState, useRef, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import type { UserProfile, ChatMessage } from '@/types'

interface WebRTCHooksOptions {
  localStream: MediaStream | null
  profile: UserProfile
  onPeerSignal: (data: { signal: any; target: string }) => void
  onConnected: () => void
}

export function useWebRTC({ localStream, profile, onPeerSignal, onConnected }: WebRTCHooksOptions) {
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [peerName, setPeerName] = useState('Stranger')
  const [peerGender, setPeerGender] = useState('unknown')
  const [peerId, setPeerId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [peerTyping, setPeerTyping] = useState(false)

  const peerRef = useRef<SimplePeer.Instance | null>(null)
  const peerIdRef = useRef<string | null>(null)
  const connectedRef = useRef(false)
  const pendingSignals = useRef<{ signal: any; sender: string }[]>([])

  const onPeerSignalRef = useRef(onPeerSignal)
  onPeerSignalRef.current = onPeerSignal
  const onConnectedRef = useRef(onConnected)
  onConnectedRef.current = onConnected
  const localStreamRef = useRef(localStream)
  localStreamRef.current = localStream
  const profileRef = useRef(profile)
  profileRef.current = profile

  const createPeer = useCallback((initiator: boolean, targetPeerId: string) => {
    const stream = localStreamRef.current
    if (!stream) {
      console.error('[WebRTC] createPeer: localStream is null, aborting')
      return
    }

    if (peerRef.current) {
      console.log('[WebRTC] Destroying existing peer before creating new one')
      peerRef.current.destroy()
      peerRef.current = null
    }

    connectedRef.current = false
    setRemoteStream(null)
    setMessages([])
    setPeerTyping(false)

    console.log('[WebRTC] Creating SimplePeer:', { initiator, targetPeerId, tracks: stream.getTracks().length })

    const peer = new SimplePeer({
      initiator,
      stream,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
        ],
      },
    })

    peer.on('signal', (signal) => {
      if (signal.type === 'candidate' && !signal.candidate) return
      console.log('[WebRTC] Sending signal:', signal.type, '->', targetPeerId)
      onPeerSignalRef.current({ signal, target: targetPeerId })
    })

    peer.on('stream', (stream) => {
      console.log('[WebRTC] Received remote stream!')
      setRemoteStream(stream)
      if (!connectedRef.current) {
        connectedRef.current = true
        onConnectedRef.current()
      }
    })

    peer.on('connect', () => {
      console.log('[WebRTC] Data channel connected!')
      if (!connectedRef.current) {
        connectedRef.current = true
        onConnectedRef.current()
      }
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'system',
        content: 'Connected! Say hi to your new vibe.',
        timestamp: Date.now(),
      }
      setMessages([msg])
    })

    peer.on('data', (chunk: any) => {
      try {
        const parsed = JSON.parse(chunk.toString())
        if (parsed.type === 'chat') {
          const msg = { ...parsed.data, sender: 'stranger' }
          setMessages((prev) => [...prev, msg])
        } else if (parsed.type === 'typing') {
          setPeerTyping(true)
        } else if (parsed.type === 'typing-end') {
          setPeerTyping(false)
        }
      } catch {}
    })

    peer.on('close', () => {
      console.log('[WebRTC] Peer closed')
      setRemoteStream(null)
      peerRef.current = null
    })

    peer.on('error', (err) => {
      console.error('[WebRTC] Peer error:', err.message)
    })

    peerRef.current = peer
    peerIdRef.current = targetPeerId
    setPeerId(targetPeerId)

    const pending = pendingSignals.current
    pendingSignals.current = []
    let processed = 0
    pending.forEach((s) => {
      if (s.sender === targetPeerId) {
        try {
          peer.signal(s.signal)
          processed++
        } catch (e) {
          console.error('[WebRTC] Error processing pending signal:', e)
        }
      }
    })
    if (processed > 0) {
      console.log(`[WebRTC] Processed ${processed} pending signals from ${targetPeerId}`)
    }
  }, [])

  const handleIncomingSignal = useCallback((data: { signal: any; sender: string }) => {
    if (data.signal?.type === 'profile') {
      setPeerName(data.signal.name || 'Stranger')
      setPeerGender(data.signal.gender || 'unknown')
      return
    }

    if (peerRef.current && peerIdRef.current === data.sender) {
      try {
        if (data.signal.type === 'candidate' && !data.signal.candidate) return
        console.log('[WebRTC] Receiving signal:', data.signal.type, 'from', data.sender)
        peerRef.current.signal(data.signal)
      } catch (e) {
        console.error('[WebRTC] Error signaling peer:', e)
      }
    } else {
      console.log('[WebRTC] Queueing signal from', data.sender, '(peer ready:', !!peerRef.current, ')')
      pendingSignals.current.push(data)
    }
  }, [])

  const sendChatMessage = useCallback((content: string, target: string) => {
    if (peerRef.current && peerRef.current.connected) {
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'me',
        content,
        timestamp: Date.now(),
      }
      peerRef.current.send(JSON.stringify({ type: 'chat', data: msg }))
      setMessages((prev) => [...prev, msg])
    }
  }, [])

  const sendTyping = useCallback((target: string) => {
    if (peerRef.current?.connected) {
      peerRef.current.send(JSON.stringify({ type: 'typing', data: { sender: profileRef.current.name } }))
      setTimeout(() => {
        if (peerRef.current?.connected) {
          peerRef.current.send(JSON.stringify({ type: 'typing-end', data: {} }))
        }
      }, 1500)
    }
  }, [])

  const cleanup = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    setRemoteStream(null)
    peerIdRef.current = null
    connectedRef.current = false
    setPeerId(null)
    setMessages([])
    setPeerTyping(false)
    pendingSignals.current = []
  }, [])

  return {
    remoteStream,
    peerName,
    peerGender,
    peerId,
    messages,
    peerTyping,
    setPeerTyping,
    createPeer,
    handleIncomingSignal,
    sendChatMessage,
    sendTyping,
    cleanup,
  }
}
