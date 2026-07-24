'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, PanInfo } from 'framer-motion'
import RemoteVideo from './RemoteVideo'
import SelfVideo from './SelfVideo'
import CallControls from './CallControls'
import ReportModal from './ReportModal'
import { Send, Mic, MicOff, Video, VideoOff, PhoneOff, SkipForward, MonitorUp } from 'lucide-react'
import type { ChatMessage, UserProfile } from '@/types'

interface VideoCallProps {
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  profile: UserProfile
  peerName: string
  peerGender: string
  isMicOn: boolean
  isVideoOn: boolean
  messages: ChatMessage[]
  peerTyping: boolean
  onToggleMic: () => void
  onToggleVideo: () => void
  onEndCall: () => void
  onSkip: () => void
  onSendChat: (content: string) => void
  onTyping: () => void
  onReport: (reason: string) => void
  onScreenShare: () => Promise<boolean | void>
  onStopScreenShare: () => void
}

export default function VideoCall({
  localStream,
  remoteStream,
  profile,
  peerName,
  peerGender,
  isMicOn,
  isVideoOn,
  messages,
  peerTyping,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  onSkip,
  onSendChat,
  onTyping,
  onReport,
  onScreenShare,
  onStopScreenShare,
}: VideoCallProps) {
  const [showReport, setShowReport] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [swapped, setSwapped] = useState(false)
  const [input, setInput] = useState('')
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const swipeRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => setCallDuration((c) => c + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSwipe = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSkip()
    }
  }

  const handleSend = () => {
    if (!input.trim()) return
    onSendChat(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      onStopScreenShare()
      setIsScreenSharing(false)
    } else {
      const success = await onScreenShare()
      if (success !== false) setIsScreenSharing(true)
    }
  }

  const totalVisible = messages.length

  return (
    <div className="relative w-full h-full flex flex-col md:flex-row bg-black">
      {/* ═══════ MAIN VIDEO AREA ═══════ */}
      <motion.div
        ref={swipeRef}
        className="flex-1 relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        onDragEnd={handleSwipe}
        whileDrag={{ scale: 0.98 }}
      >
        {/* Main video - swapable */}
        {swapped ? (
          <div className="relative w-full h-full bg-black">
            {localStream && isVideoOn ? (
              <video
                ref={(el) => { if (el) el.srcObject = localStream }}
                autoPlay playsInline muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#0a0a0f]">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <span className="text-white/30 text-lg font-bold">YOU</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <RemoteVideo
            stream={remoteStream}
            peerName={peerName}
            peerGender={peerGender}
            isVideoOn={true}
            callDuration={callDuration}
          />
        )}

        {/* Self video - click to swap (not swapped) */}
        {!swapped && (
          <SelfVideo stream={localStream} isVideoOn={isVideoOn} isMicOn={isMicOn} onClick={() => setSwapped(true)} />
        )}

        {/* Remote video in corner - click to swap back (swapped) */}
        {swapped && (
          <>
            {/* Mobile */}
            <motion.div
              className="absolute z-20 md:hidden rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer active:scale-95 transition-transform"
              style={{ top: '52px', right: '12px', width: 90, height: 120 }}
              onClick={() => setSwapped(false)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <RemoteVideo
                stream={remoteStream}
                peerName={peerName}
                peerGender={peerGender}
                isVideoOn={true}
                callDuration={callDuration}
              />
            </motion.div>
            {/* Desktop */}
            <motion.div
              className="absolute z-20 hidden md:block rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
              style={{ bottom: '80px', left: '16px', width: 120, height: 160 }}
              onClick={() => setSwapped(false)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', damping: 25 }}
            >
              <RemoteVideo
                stream={remoteStream}
                peerName={peerName}
                peerGender={peerGender}
                isVideoOn={true}
                callDuration={callDuration}
              />
            </motion.div>
          </>
        )}

        {/* Desktop controls */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 z-10">
          <CallControls
            isMicOn={isMicOn}
            isVideoOn={isVideoOn}
            isScreenSharing={isScreenSharing}
            onToggleMic={onToggleMic}
            onToggleVideo={onToggleVideo}
            onEndCall={onEndCall}
            onSkip={onSkip}
            onReport={() => setShowReport(true)}
            onScreenShare={handleScreenShareToggle}
          />
        </div>
      </motion.div>

      {/* ═══════ MOBILE CONTROLS (always visible on mobile) ═══════ */}
      <div className="md:hidden" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100 }}>
        {/* Mobile messages */}
        <div style={{ maxHeight: '30vh', overflowY: 'auto', padding: '0 12px 8px' }} className="no-scrollbar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {messages.slice(-10).map((msg) => (
              <div key={msg.id}>
                {msg.sender === 'system' ? (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)', borderRadius: 9999, padding: '2px 10px', display: 'inline-block' }}>
                    {msg.content}
                  </span>
                ) : msg.sender === 'me' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#f472b6', marginBottom: 2 }}>You</span>
                    <div style={{ background: 'rgba(147,51,234,0.8)', color: 'white', fontSize: 13, lineHeight: 1.4, padding: '8px 12px', borderRadius: '16px 16px 16px 4px' }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '75%' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#c084fc', marginBottom: 2 }}>{peerName || 'Stranger'}</span>
                    <div style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontSize: 13, lineHeight: 1.4, padding: '8px 12px', borderRadius: '16px 16px 16px 4px' }}>
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {peerTyping && (
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: '8px 12px', display: 'inline-block', alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Mobile input + controls */}
        <div style={{ padding: '0 12px 16px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px 6px 14px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="Comment..."
              style={{ flex: 1, background: 'transparent', color: 'white', fontSize: 13, outline: 'none', minWidth: 0, border: 'none' }}
              maxLength={500}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.3, flexShrink: 0, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
              <Send style={{ width: 13, height: 13, color: 'white' }} />
            </button>
            <button onClick={onToggleMic} style={{ width: 30, height: 30, borderRadius: '50%', background: isMicOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              {isMicOn ? <Mic style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} /> : <MicOff style={{ width: 14, height: 14, color: '#ef4444' }} />}
            </button>
            <button onClick={onToggleVideo} style={{ width: 30, height: 30, borderRadius: '50%', background: isVideoOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              {isVideoOn ? <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} /> : <VideoOff style={{ width: 14, height: 14, color: '#ef4444' }} />}
            </button>
            <button onClick={handleScreenShareToggle} style={{ width: 30, height: 30, borderRadius: '50%', background: isScreenSharing ? 'rgba(6,182,212,0.25)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              <MonitorUp style={{ width: 14, height: 14, color: isScreenSharing ? '#06b6d4' : 'rgba(255,255,255,0.7)' }} />
            </button>
            <button onClick={onSkip} style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #9333ea, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(147,51,234,0.3)' }}>
              <SkipForward style={{ width: 16, height: 16, color: 'white' }} />
            </button>
            <button onClick={onEndCall} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              <PhoneOff style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ DESKTOP CHAT PANEL ═══════ */}
      <div className="hidden md:flex absolute top-0 right-0 bottom-0 z-20 w-[340px] flex-col bg-black/60 backdrop-blur-xl border-l border-white/10 pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">Chat</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          <div className="flex flex-col gap-2">
            {messages.slice(-20).map((msg) => (
              <div key={msg.id}>
                {msg.sender === 'system' ? (
                  <span className="text-[10px] text-white/40 bg-white/5 rounded-full px-2.5 py-0.5 inline-block">{msg.content}</span>
                ) : msg.sender === 'me' ? (
                  <div className="flex flex-col items-end max-w-[85%]">
                    <span className="text-[10px] font-semibold text-white/40 mb-0.5 uppercase tracking-wider">You</span>
                    <div className="bg-purple-600/80 text-white text-[13px] leading-snug px-3.5 py-2 rounded-2xl rounded-br-md">{msg.content}</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-start max-w-[85%]">
                    <span className="text-[10px] font-semibold text-purple-300/70 mb-0.5 uppercase tracking-wider">{peerName || 'Stranger'}</span>
                    <div className="bg-white/10 border border-white/5 text-white text-[13px] leading-snug px-3.5 py-2 rounded-2xl rounded-bl-md">{msg.content}</div>
                  </div>
                )}
              </div>
            ))}
            {peerTyping && (
              <div className="bg-white/5 rounded-2xl rounded-bl-md px-3 py-2 border border-white/5 inline-block self-start">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="px-3 pb-3 pt-1">
          <div className="flex gap-2 items-center bg-white/5 backdrop-blur-md rounded-full border border-white/10 pl-4 pr-2 py-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none"
              maxLength={500}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        onSubmit={onReport}
      />
    </div>
  )
}
