'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, Send } from 'lucide-react'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
}

const reasons = [
  'Inappropriate behavior',
  'Harassment',
  'Nudity / Sexual content',
  'Spam / Scam',
  'Hate speech',
  'Other',
]

export default function ReportModal({ open, onClose, onSubmit }: ReportModalProps) {
  const [selected, setSelected] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleSubmit = () => {
    const reason = selected === 'Other' ? customReason : selected
    if (!reason) return
    onSubmit(reason)
    setSelected('')
    setCustomReason('')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold">Report User</h3>
              </div>
              <button onClick={onClose} className="text-text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setSelected(reason)}
                  className={`w-full text-left py-2.5 px-3 rounded-lg text-sm transition-all ${
                    selected === reason
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-surface border border-border text-text-muted hover:bg-surface-light'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {selected === 'Other' && (
              <motion.textarea
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe the issue..."
                className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-text-muted/50 focus:outline-none focus:border-red-400 resize-none mb-4"
                rows={3}
              />
            )}

            <button
              onClick={handleSubmit}
              disabled={!selected || (selected === 'Other' && !customReason.trim())}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-medium hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Report
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}