'use client'

import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface SelfVideoProps {
  stream: MediaStream | null
  isVideoOn: boolean
  isMicOn: boolean
  onClick?: () => void
}

export default function SelfVideo({ stream, isVideoOn, isMicOn, onClick }: SelfVideoProps) {
  const mobileVideoRef = useRef<HTMLVideoElement>(null)
  const desktopVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (mobileVideoRef.current && stream) {
      mobileVideoRef.current.srcObject = stream
    }
    if (desktopVideoRef.current && stream) {
      desktopVideoRef.current.srcObject = stream
    }
  }, [stream])

  return (
    <>
      {/* Mobile: top-right, tap to swap */}
      <motion.div
        className="absolute z-20 md:hidden rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer active:scale-95 transition-transform"
        style={{ top: '52px', right: '12px', width: 90, height: 120 }}
        onClick={onClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {isVideoOn && stream ? (
          <video ref={mobileVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-black/60 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">YOU</span>
            </div>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isMicOn ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-[8px] text-white/80 font-medium">YOU</span>
          </div>
        </div>
      </motion.div>

      {/* Desktop: bottom-left, tap to swap */}
      <motion.div
        className="absolute z-20 hidden md:block rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer hover:scale-105 transition-transform"
        style={{ bottom: '80px', left: '16px', width: 120, height: 160 }}
        onClick={onClick}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 25 }}
      >
        {isVideoOn && stream ? (
          <video ref={desktopVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-black/60 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">YOU</span>
            </div>
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-1.5 py-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isMicOn ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-[8px] text-white/80 font-medium">YOU</span>
          </div>
        </div>
      </motion.div>
    </>
  )
}
