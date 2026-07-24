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
    <div className="relative w-full h-full bg-black">
      {stream && isVideoOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] to-[#12121a]">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-white/20" />
          </div>
          <p className="text-white/50 text-lg font-medium">{peerName}</p>
          <p className="text-white/25 text-sm capitalize">{peerGender.replace('-', ' ')}</p>
          <div className="mt-3 flex items-center gap-2 text-white/20">
            <VideoOff className="w-4 h-4" />
            <span className="text-xs">Camera is off</span>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-green-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-white font-medium text-sm">{peerName}</span>
            <span className="text-white/40 text-xs capitalize">({peerGender.replace('-', ' ')})</span>
          </div>
          <span className="text-white/50 text-xs bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full">
            {formatDuration(callDuration)}
          </span>
        </div>
      </div>
    </div>
  )
}
