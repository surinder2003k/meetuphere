'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Video, VideoOff, PhoneOff, SkipForward } from 'lucide-react'
import type { ChatMessage } from '@/types'

interface ChatPanelProps {
  messages: ChatMessage[]
  peerTyping: boolean
  peerName: string
  isOpen: boolean
  onToggle: () => void
  onSend: (content: string) => void
  onTyping: () => void
  onToggleMic?: () => void
  onToggleVideo?: () => void
  onEndCall?: () => void
  onSkip?: () => void
  onReport?: () => void
  isMicOn?: boolean
  isVideoOn?: boolean
}

export default function ChatPanel({
  messages,
  peerTyping,
  peerName,
  isOpen,
  onToggle,
  onSend,
  onTyping,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  onSkip,
  onReport,
  isMicOn = true,
  isVideoOn = true,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return
    onSend(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const totalVisible = messages.length

  return (
    <>
      {/* ═══════ MOBILE ═══════ */}
      <div className="md:hidden" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 }}>
        {/* Messages area - flex-end so messages stay at bottom */}
        <div style={{ maxHeight: '35vh', overflowY: 'auto', padding: '0 12px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }} className="no-scrollbar">
          <AnimatePresence initial={false}>
            {messages.map((msg, index) => {
              const distFromBottom = totalVisible - 1 - index
              if (distFromBottom >= 10) return null
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  style={{ marginBottom: 6 }}
                >
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
                </motion.div>
              )
            })}
          </AnimatePresence>

          {peerTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px 16px 16px 4px', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.05)', display: 'inline-block', marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls bar */}
        <div style={{ padding: '0 12px 16px' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)', padding: '6px 8px 6px 14px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); onTyping() }}
              onKeyDown={handleKeyDown}
              placeholder="Comment..."
              style={{ flex: 1, background: 'transparent', color: 'white', fontSize: 13, outline: 'none', minWidth: 0, border: 'none' }}
              maxLength={500}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : 0.3, flexShrink: 0, border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed' }}>
              <Send style={{ width: 12, height: 12, color: 'white' }} />
            </button>
            <button onClick={onToggleMic} style={{ width: 28, height: 28, borderRadius: '50%', background: isMicOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              {isMicOn ? <Mic style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} /> : <MicOff style={{ width: 14, height: 14, color: '#ef4444' }} />}
            </button>
            <button onClick={onToggleVideo} style={{ width: 28, height: 28, borderRadius: '50%', background: isVideoOn ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              {isVideoOn ? <Video style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} /> : <VideoOff style={{ width: 14, height: 14, color: '#ef4444' }} />}
            </button>
            <button onClick={onSkip} style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #9333ea, #db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(147,51,234,0.25)' }}>
              <SkipForward style={{ width: 16, height: 16, color: 'white' }} />
            </button>
            <button onClick={onEndCall} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: 'none', cursor: 'pointer' }}>
              <PhoneOff style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.6)' }} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ DESKTOP: right-side panel ═══════ */}
      <div className="hidden md:flex absolute top-0 right-0 bottom-0 z-20 w-[340px] flex-col bg-black/60 backdrop-blur-xl border-l border-white/10 pointer-events-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-white font-semibold text-sm tracking-wide">Chat</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 no-scrollbar">
          <div className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {messages.map((msg, index) => {
                const distFromBottom = totalVisible - 1 - index
                if (distFromBottom >= 20) return null
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
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
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {peerTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="bg-white/5 rounded-2xl rounded-bl-md px-3 py-2 border border-white/5 inline-block">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30" animate={{ y: [0, -3, 0] }} transition={{ duration: 0.5, delay: i * 0.15, repeat: Infinity }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
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
    </>
  )
}
