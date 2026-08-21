'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EntryModal from '@/components/EntryModal'
import LookingForMatch from '@/components/LookingForMatch'
import VideoCall from '@/components/VideoCall'
import ProfilePopover from '@/components/ProfilePopover'
import { useStore } from '@/store/useStore'
import { useMediaPermissions } from '@/hooks/useMediaPermissions'
import { useSocket } from '@/hooks/useSocket'
import { useWebRTC } from '@/hooks/useWebRTC'
import type { UserProfile } from '@/types'

export default function Home() {
  const store = useStore()
  const { stream: localStream, error: mediaError, loading: mediaLoading, requestMedia, toggleMic, toggleVideo, cleanup: cleanupMedia } = useMediaPermissions()
  const currentPeerIdRef = useRef<string | null>(null)
  const [userCount, setUserCount] = useState(0)

  const handlePeerSignal = useCallback((data: { signal: any; target: string }) => {
    sendSignalRef.current(data)
  }, [])

  const [screenShareEndedVersion, setScreenShareEndedVersion] = useState(0)

  const handleScreenShareEnded = useCallback(() => {
    setScreenShareEndedVersion((v) => v + 1)
    store.setError('Screen share stopped')
    setTimeout(() => store.setError(null), 2000)
  }, [store])

  const webrtc = useWebRTC({
    localStream,
    profile: store.profile || { name: 'You', gender: 'other' },
    onPeerSignal: handlePeerSignal,
    onConnected: useCallback(() => {
      store.setCallState('connected')
    }, [store]),
    onScreenShareEnded: handleScreenShareEnded,
  })

  const createPeerRef = useRef(webrtc.createPeer)
  createPeerRef.current = webrtc.createPeer
  const handleIncomingSignalRef = useRef(webrtc.handleIncomingSignal)
  handleIncomingSignalRef.current = webrtc.handleIncomingSignal
  const cleanupRef = useRef(webrtc.cleanup)
  cleanupRef.current = webrtc.cleanup
  const sendChatMessageRef = useRef(webrtc.sendChatMessage)
  sendChatMessageRef.current = webrtc.sendChatMessage
  const sendTypingRef = useRef(webrtc.sendTyping)
  sendTypingRef.current = webrtc.sendTyping
  const startScreenShareRef = useRef(webrtc.startScreenShare)
  startScreenShareRef.current = webrtc.startScreenShare
  const stopScreenShareRef = useRef(webrtc.stopScreenShare)
  stopScreenShareRef.current = webrtc.stopScreenShare

  const sendSignalRef = useRef<(data: { signal: any; target: string }) => void>(() => {})
  const findPeerRef = useRef<(profile: UserProfile) => void>(() => {})
  const mySocketIdRef = useRef<string>('')
  // Live-track whether the user is currently in the search queue, so we can
  // re-sync with the signaling server on reconnect / periodically without any refresh.
  const searchingRef = useRef(false)
  searchingRef.current = store.callState === 'searching'
  const activeProfileRef = useRef<UserProfile | null>(null)
  activeProfileRef.current = store.profile || null

  const socketService = useSocket({
    onMatched: useCallback((data: any) => {
      const peerId = typeof data === 'string' ? data : data?.peerId
      const initiator = typeof data === 'object' && typeof data?.initiator === 'boolean'
        ? data.initiator
        : (mySocketIdRef.current || '') < peerId
      console.log('[App] Matched:', { peerId, initiator, myId: mySocketIdRef.current, raw: data })
      if (!peerId) return
      currentPeerIdRef.current = peerId
      store.setPeerId(peerId)
      store.setCallState('connecting')
      createPeerRef.current(initiator, peerId)
    }, [store]),

    onSignal: useCallback((data) => {
      handleIncomingSignalRef.current(data)
    }, []),

    onChatMessage: useCallback((data) => {
    }, []),

    onTyping: useCallback(() => {
    }, []),

    onPeerDisconnected: useCallback(() => {
      if (!currentPeerIdRef.current) return
      try { stopScreenShareRef.current() } catch {}
      cleanupRef.current()
      store.clearMessages()
      store.setPeerId(null)
      store.setQueuePosition(null)
      store.setMicOn(true)
      store.setVideoOn(true)
      currentPeerIdRef.current = null
      store.setError('Your match disconnected. Finding new vibe...')
      setTimeout(() => store.setError(null), 2000)
      store.setCallState('searching')
      if (store.profile) {
        setTimeout(() => findPeerRef.current(store.profile!), 300)
      }
    }, [store]),

    onPeerLeft: useCallback(() => {
      if (!currentPeerIdRef.current) return
      try { stopScreenShareRef.current() } catch {}
      cleanupRef.current()
      store.clearMessages()
      store.setPeerId(null)
      store.setQueuePosition(null)
      store.setMicOn(true)
      store.setVideoOn(true)
      currentPeerIdRef.current = null
      store.setCallState('searching')
      if (store.profile) {
        setTimeout(() => findPeerRef.current(store.profile!), 300)
      }
    }, [store]),

    onNoPeers: useCallback(() => {
      store.setCallState('searching')
      store.setQueuePosition(null)
    }, [store]),

    onWaiting: useCallback((position) => {
      store.setQueuePosition(position)
    }, [store]),

    onUserCount: useCallback((count) => {
      setUserCount(count)
    }, []),
  })

  useEffect(() => {
    sendSignalRef.current = socketService.sendSignal
    findPeerRef.current = socketService.findPeer
  }, [socketService])

  useEffect(() => {
    const socket = socketService.socketRef.current
    if (!socket) return
    const onConnect = () => { mySocketIdRef.current = socket.id || '' }
    socket.on('connect', onConnect)
    if (socket.connected) mySocketIdRef.current = socket.id || ''
    return () => { socket.off('connect', onConnect) }
  }, [socketService])

  // Periodic heartbeat while searching: re-emit findPeer so the server always
  // has an up-to-date view of who is waiting. This guarantees fast, refresh-free
  // syncing even if the first emit was dropped before the socket was fully ready.
  // Deps on callState/profile so the timer (re)starts exactly when the user enters
  // the searching state, reading live refs inside each tick.
  useEffect(() => {
    if (!searchingRef.current || !activeProfileRef.current) return
    findPeerRef.current(activeProfileRef.current)
    const timer = setInterval(() => {
      const current = activeProfileRef.current
      if (searchingRef.current && current) {
        findPeerRef.current(current)
      }
    }, 8000)
    return () => clearInterval(timer)
  }, [store.callState, store.profile])

  useEffect(() => {
    socketService.connect()
    return () => {
      try { stopScreenShareRef.current() } catch {}
      cleanupRef.current()
      cleanupMedia()
      socketService.disconnect()
    }
  }, [])

  // Re-sync with the search queue on every socket (re)connect.
  // The signaling server keeps the waiting list in memory, so if our socket
  // drops (server restart / Render idle timeout / network blip), the server forgets
  // us even though the online counter might still climb. Re-emitting find-peer here
  // gets us back into the matching queue instantly - no manual refresh needed.
  // This runs after socketService.connect() above so the listener always attaches
  // to a live socket.
  useEffect(() => {
    const socket = socketService.socketRef.current
    if (!socket) return
    const onConnect = () => {
      mySocketIdRef.current = socket.id || ''
      const profile = activeProfileRef.current
      if (searchingRef.current && profile) {
        console.log('[App] Reconnected while searching - re-emerging into queue')
        findPeerRef.current(profile)
      }
    }
    socket.on('connect', onConnect)
    if (socket.connected) onConnect()
    return () => { socket.off('connect', onConnect) }
  }, [socketService])

  const handleProfileSubmit = useCallback(async (profile: UserProfile) => {
    store.setProfile(profile)
    store.setCallState('entering')
    const stream = await requestMedia()
    if (stream) {
      store.setCallState('searching')
      socketService.findPeer(profile)
    }
  }, [store, requestMedia, socketService])

  const handleToggleMic = useCallback(() => {
    store.setMicOn(!store.isMicOn)
    toggleMic(!store.isMicOn)
  }, [store, toggleMic])

  const handleToggleVideo = useCallback(() => {
    store.setVideoOn(!store.isVideoOn)
    toggleVideo(!store.isVideoOn)
  }, [store, toggleVideo])

  const handleScreenShare = useCallback(async () => {
    const success = await startScreenShareRef.current()
    if (!success) {
      store.setError('Screen share cancelled or not available')
      setTimeout(() => store.setError(null), 3000)
    }
    return success
  }, [store])

  const handleStopScreenShare = useCallback(() => {
    stopScreenShareRef.current()
  }, [])

  const handleEndCall = useCallback(() => {
    try { stopScreenShareRef.current() } catch {}
    cleanupRef.current()
    currentPeerIdRef.current = null
    socketService.skip()
    store.clearMessages()
    store.setPeerId(null)
    store.setQueuePosition(null)
    store.setMicOn(true)
    store.setVideoOn(true)
    store.setError(null)
    store.setCallState('idle')
  }, [socketService, store])

  const handleSearchAgain = useCallback(() => {
    store.setMicOn(true)
    store.setVideoOn(true)
    store.setCallState('searching')
    socketService.findPeer(store.profile!)
  }, [store, socketService])

  const handleSkip = useCallback(() => {
    try { stopScreenShareRef.current() } catch {}
    cleanupRef.current()
    store.clearMessages()
    store.setPeerId(null)
    store.setQueuePosition(null)
    store.setMicOn(true)
    store.setVideoOn(true)
    currentPeerIdRef.current = null
    socketService.skip()
    store.setCallState('searching')
    if (store.profile) {
      findPeerRef.current(store.profile)
    }
  }, [store, socketService])

  const handleSendChat = useCallback((content: string) => {
    const target = currentPeerIdRef.current || store.peerId
    if (target) sendChatMessageRef.current(content, target)
  }, [store.peerId])

  const handleTyping = useCallback(() => {
    const target = currentPeerIdRef.current || store.peerId
    if (target) sendTypingRef.current(target)
  }, [store.peerId])

  const handleReport = useCallback((reason: string) => {
    const target = currentPeerIdRef.current || store.peerId
    if (target) {
      socketService.report({ target, reason })
      store.setError('User reported. Thank you.')
      setTimeout(() => store.setError(null), 3000)
    }
  }, [socketService, store])

  const handleProfileUpdate = useCallback((profile: UserProfile) => {
    store.setProfile(profile)
  }, [store])

  const handleDisconnect = useCallback(() => {
    cleanupRef.current()
    cleanupMedia()
    socketService.stopSearching()
    socketService.disconnect()
    store.clearProfile()
    sessionStorage.removeItem('vibelink_profile')
    window.location.reload()
  }, [cleanupMedia, socketService, store])

  const showEntry = !store.profile
  const isInCall = store.callState === 'connected'

  return (
    <>
      <AnimatePresence mode="wait">
        {showEntry && <EntryModal key="entry" onSubmit={handleProfileSubmit} />}
      </AnimatePresence>

      {store.profile && !showEntry && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 pointer-events-auto">
            <span className="text-sm md:text-base font-bold text-white tracking-wide">MEETUP<span className="text-purple-400">.HERE</span></span>
            {userCount > 0 && (
              <span className="text-[10px] md:text-xs text-white/50 bg-white/10 rounded-full px-2 py-0.5 backdrop-blur-sm">
                {userCount} online
              </span>
            )}
          </div>
          <div className="pointer-events-auto">
            <ProfilePopover
              profile={store.profile}
              onUpdate={handleProfileUpdate}
              onDisconnect={handleDisconnect}
            />
          </div>
        </motion.div>
      )}

      <div className="h-full w-full">
        {store.callState === 'searching' && (
          <LookingForMatch queuePosition={store.queuePosition} localStream={localStream} />
        )}

        {store.callState === 'entering' && (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="glass-strong rounded-xl p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {mediaLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  <p className="text-text-muted">Accessing camera & microphone...</p>
                </div>
              ) : mediaError ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-red-400">{mediaError}</p>
                  <button
                    onClick={() => store.profile && handleProfileSubmit(store.profile)}
                    className="py-2 px-4 rounded-lg bg-primary/20 text-primary text-sm hover:bg-primary/30 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}

        {store.callState === 'connecting' && (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full border-2 border-cyan-500 border-t-transparent mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-text-muted">Connecting to your match...</p>
            </motion.div>
          </div>
        )}

        {store.callState === 'idle' && store.profile && (
          <div className="flex items-center justify-center h-full">
            <motion.div
              className="glass-strong rounded-xl p-8 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <p className="text-lg font-semibold mb-2">Call Ended</p>
              <p className="text-text-muted text-sm mb-6">Ready for your next vibe?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleSearchAgain}
                  className="py-2.5 px-6 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-all"
                >
                  Search Again
                </button>
                <button
                  onClick={handleDisconnect}
                  className="py-2.5 px-6 rounded-lg glass text-text-muted text-sm font-medium hover:text-foreground transition-all"
                >
                  Leave
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {store.callState === 'connected' && (
          <VideoCall
            localStream={localStream}
            remoteStream={webrtc.remoteStream}
            profile={store.profile!}
            peerName={webrtc.peerName}
            peerGender={webrtc.peerGender}
            isMicOn={store.isMicOn}
            isVideoOn={store.isVideoOn}
            messages={webrtc.messages}
            peerTyping={webrtc.peerTyping}
            onToggleMic={handleToggleMic}
            onToggleVideo={handleToggleVideo}
            onEndCall={handleEndCall}
            onSkip={handleSkip}
            onSendChat={handleSendChat}
            onTyping={handleTyping}
            onReport={handleReport}
            onScreenShare={handleScreenShare}
            onStopScreenShare={handleStopScreenShare}
            screenShareEndedVersion={screenShareEndedVersion}
          />
        )}
      </div>

      <AnimatePresence>
        {store.error && (
          <motion.div
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-full px-5 py-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <p className="text-sm text-foreground">{store.error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
