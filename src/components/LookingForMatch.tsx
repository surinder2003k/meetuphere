'use client'

import { motion } from 'framer-motion'
import { Search, Loader2 } from 'lucide-react'

interface LookingForMatchProps {
  queuePosition: number | null
}

export default function LookingForMatch({ queuePosition }: LookingForMatchProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-background">
      <div className="relative mb-8">
        <motion.div
          className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/30 via-pink-500/30 to-cyan-500/30 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Search className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        </motion.div>
        <motion.div
          className="absolute -top-2 -right-2"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="w-6 h-6 rounded-full bg-cyan-500/40 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
          </div>
        </motion.div>
      </div>

      <motion.h2
        className="text-xl font-semibold gradient-text mb-2"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Looking for someone to vibe with...
      </motion.h2>

      <p className="text-text-muted text-sm mb-6">Connecting you to a random stranger</p>

      {queuePosition !== null && queuePosition > 0 && (
        <motion.div
          className="glass rounded-full px-5 py-2 flex items-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-text-muted text-sm">
            {queuePosition === 1
              ? "You're next in line..."
              : `${queuePosition} people ahead of you`}
          </span>
        </motion.div>
      )}

      <div className="flex gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/50"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  )
}