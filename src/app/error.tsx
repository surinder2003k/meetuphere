'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App] Unexpected error:', error)
  }, [error])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f] p-6">
      <div className="glass-strong rounded-xl p-8 text-center max-w-sm w-full">
        <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
        <p className="text-text-muted text-sm mb-6">
          The app hit an unexpected error. Your camera and mic are safe — try again.
        </p>
        <button
          onClick={reset}
          className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
