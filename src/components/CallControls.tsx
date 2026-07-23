'use client'

import { motion } from 'framer-motion'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  SkipForward,
} from 'lucide-react'

interface CallControlsProps {
  isMicOn: boolean
  isVideoOn: boolean
  onToggleMic: () => void
  onToggleVideo: () => void
  onEndCall: () => void
  onSkip: () => void
  onReport: () => void
}

export default function CallControls({
  isMicOn,
  isVideoOn,
  onToggleMic,
  onToggleVideo,
  onEndCall,
  onSkip,
  onReport,
}: CallControlsProps) {
  return (
    <motion.div
      className="flex items-center justify-center gap-4 py-3 px-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <button
        onClick={onToggleMic}
        title={isMicOn ? 'Mute' : 'Unmute'}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isMicOn
            ? 'bg-white/15 text-white hover:bg-white/20'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
      </button>

      <button
        onClick={onEndCall}
        title="End Call"
        className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-red-600/30"
      >
        <PhoneOff className="w-6 h-6 text-white" />
      </button>

      <button
        onClick={onSkip}
        title="Skip"
        className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white hover:from-purple-500 hover:to-pink-500 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-600/20"
      >
        <SkipForward className="w-5 h-5" />
      </button>

      <button
        onClick={onToggleVideo}
        title={isVideoOn ? 'Hide Camera' : 'Show Camera'}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isVideoOn
            ? 'bg-white/15 text-white hover:bg-white/20'
            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
        }`}
      >
        {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
      </button>
    </motion.div>
  )
}
