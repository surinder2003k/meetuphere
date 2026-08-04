'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { VideoOff, User } from 'lucide-react'

interface RemoteVideoProps {
  stream: MediaStream | null
  peerName: string
  peerGender: string
  isVideoOn: boolean
  callDuration: number
}

export default function RemoteVideo({
  stream,
  peerName,
  peerGender,
  isVideoOn,
  callDuration,
}: RemoteVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {stream && isVideoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain relative z-0"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] to-[#12121a]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-white/40" />
          </div>
          <p className="text-white text-lg font-semibold">{peerName}</p>
          <p className="text-white/40 text-sm capitalize">{peerGender.replace('-', ' ')}</p>
          <div className="mt-3 flex items-center gap-2 text-white/30">
            <VideoOff className="w-4 h-4" />
            <span className="text-xs">Camera is off</span>
          </div>
        </div>
      )}

      {/* Top bar - high z-index with solid gradient */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="bg-gradient-to-b from-black/90 via-black/60 to-transparent px-4 pt-4 pb-8">
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md rounded-full px-4 py-2 border border-white/10">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-green-400 flex-shrink-0"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white font-bold text-base">{peerName}</span>
              <span className="text-white/50 text-sm capitalize">({peerGender.replace('-', ' ')})</span>
            </div>
            <span className="text-white/80 text-xs bg-black/50 backdrop-blur-md px-3 py-2 rounded-full font-medium border border-white/10">
              {formatDuration(callDuration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
