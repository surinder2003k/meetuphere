'use client'

import { useState, useRef, useCallback } from 'react'
import SimplePeer from 'simple-peer'
import type { UserProfile, ChatMessage } from '@/types'

interface WebRTCHooksOptions {
  localStream: MediaStream | null
  profile: UserProfile
  onPeerSignal: (data: { signal: any; target: string }) => void
  onConnected: () => void
  onScreenShareEnded?: () => void
}

export function useWebRTC({ localStream, profile, onPeerSignal, onConnected, onScreenShareEnded }: WebRTCHooksOptions) {
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
  const screenStreamRef = useRef<MediaStream | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onPeerSignalRef = useRef(onPeerSignal)
  onPeerSignalRef.current = onPeerSignal
  const onConnectedRef = useRef(onConnected)
  onConnectedRef.current = onConnected
  const onScreenShareEndedRef = useRef(onScreenShareEnded)
  onScreenShareEndedRef.current = onScreenShareEnded
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
    setPeerName('Stranger') // don't show the previous peer's name before the new profile arrives
    setPeerGender('unknown')
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
      setMessages((prev) => [...prev, msg])
    })

    peer.on('data', (chunk: any) => {
      try {
        const parsed = JSON.parse(chunk.toString())
        if (parsed.type === 'chat') {
          const msg = { ...parsed.data, sender: 'stranger' }
          setMessages((prev) => [...prev, msg])
        } else if (parsed.type === 'typing') {
          setPeerTyping(true)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
          typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 5000)
        } else if (parsed.type === 'typing-end') {
          setPeerTyping(false)
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        }
      } catch {}
    })

    peer.on('close', () => {
      console.log('[WebRTC] Peer closed')
      setRemoteStream(null)
      setPeerName('Stranger')
      setPeerGender('unknown')
      setPeerTyping(false)
      peerRef.current = null
      peerIdRef.current = null
      connectedRef.current = false
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
      console.log('[WebRTC] Received profile:', data.signal)
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
      // Guard against the queue growing forever (dropped/stale peers can keep
      // emitting after a match ends). Cap to latest 100 signals.
      if (pendingSignals.current.length >= 100) pendingSignals.current.shift()
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
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => {
        if (peerRef.current?.connected) {
          peerRef.current.send(JSON.stringify({ type: 'typing-end', data: {} }))
        }
      }, 1500)
    }
  }, [])

  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.destroy()
      peerRef.current = null
    }
    setRemoteStream(null)
    setPeerName('Stranger')
    setPeerGender('unknown')
    peerIdRef.current = null
    connectedRef.current = false
    setPeerId(null)
    setMessages([])
    setPeerTyping(false)
    pendingSignals.current = []
  }, [])

  const startScreenShare = useCallback(async (): Promise<boolean> => {
    try {
      // Check if getDisplayMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        console.error('[WebRTC] getDisplayMedia not supported on this device')
        return false
      }

      console.log('[WebRTC] Requesting screen share...')
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })
      console.log('[WebRTC] Screen stream obtained:', screenStream.getTracks().length, 'tracks')
      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) {
        console.error('[WebRTC] No video track in screen stream')
        return false
      }
      console.log('[WebRTC] Screen track:', screenTrack.label)

      // Stop any previous screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      screenStreamRef.current = screenStream

      const peer = peerRef.current
      if (!peer) {
        console.error('[WebRTC] No peer available for screen share')
        screenStream.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
        return false
      }

      const localStream = localStreamRef.current
      if (!localStream) {
        console.error('[WebRTC] No local stream for screen share')
        screenStream.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
        return false
      }

      const oldVideoTrack = localStream.getVideoTracks()[0]
      if (!oldVideoTrack) {
        console.error('[WebRTC] No video track in local stream')
        screenStream.getTracks().forEach((t) => t.stop())
        screenStreamRef.current = null
        return false
      }

      // Try SimplePeer's replaceTrack first
      try {
        console.log('[WebRTC] Using SimplePeer replaceTrack')
        peer.replaceTrack(oldVideoTrack, screenTrack, localStream)
        console.log('[WebRTC] SimplePeer replaceTrack success')
      } catch (spErr) {
        console.error('[WebRTC] SimplePeer replaceTrack failed, trying native:', spErr)
        // Fallback: try native RTCPeerConnection
        const pc = (peer as any)._pc as RTCPeerConnection | undefined
        if (pc) {
          const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(screenTrack)
            console.log('[WebRTC] Native replaceTrack success')
          } else {
            console.error('[WebRTC] No video sender found')
          }
        } else {
          console.error('[WebRTC] No RTCPeerConnection found')
        }
      }

      screenTrack.onended = () => {
        stopScreenShare()
        onScreenShareEndedRef.current?.()
      }

      return true
    } catch (err) {
      console.error('[WebRTC] Screen share failed:', err)
      return false
    }
  }, [])

  const stopScreenShare = useCallback(async () => {
    // Stop screen share tracks
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }

    const peer = peerRef.current
    const stream = localStreamRef.current
    const videoTrack = stream?.getVideoTracks()[0]
    if (!peer || !videoTrack || !stream) return

    // Use SimplePeer's replaceTrack to restore camera
    peer.replaceTrack(videoTrack, videoTrack, stream)
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
    startScreenShare,
    stopScreenShare,
  }
}
