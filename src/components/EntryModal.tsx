'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Video } from 'lucide-react'
import type { UserProfile } from '@/types'

interface EntryModalProps {
  onSubmit: (profile: UserProfile) => void
}

export default function EntryModal({ onSubmit }: EntryModalProps) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState<UserProfile['gender'] | ''>('')
  const [lookingFor, setLookingFor] = useState<UserProfile['lookingFor']>('opposite')
  const [ageConfirmed, setAgeConfirmed] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem('vibelink_profile')
    if (saved) {
      try {
        const p = JSON.parse(saved) as UserProfile
        if (p.name && p.gender) {
          onSubmit(p)
        }
      } catch {}
    }
  }, [onSubmit])

  const handleSubmit = () => {
    if (!name.trim() || !gender || !ageConfirmed || hasStarted) return
    setHasStarted(true)
    const profile: UserProfile = {
      name: name.trim(),
      gender: gender as UserProfile['gender'],
      lookingFor,
    }
    sessionStorage.setItem('vibelink_profile', JSON.stringify(profile))
    onSubmit(profile)
  }

  const genders: { value: UserProfile['gender']; label: string }[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
    { value: 'prefer-not-to-say', label: 'Private' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0f]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[420px] mx-4 px-6"
      >
        {/* Heading */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Ready to vibe?</h1>
          <p className="text-white/40 text-sm">Join the live conversation</p>
        </div>

        {/* Identity */}
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">Identity</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choose a display name"
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-white/25 transition-all"
            maxLength={30}
            autoFocus
          />
        </div>

        {/* Gender */}
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">Identify as</label>
          <div className="grid grid-cols-2 gap-2.5">
            {genders.map((g) => (
              <button
                key={g.value}
                onClick={() => setGender(g.value)}
                className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                  gender === g.value
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:border-white/15'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Who to chat with */}
        <div className="mb-6">
          <label className="block text-[11px] font-semibold text-white/40 uppercase tracking-widest mb-2.5">Chat with</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: 'any', label: 'Anyone' },
              { value: 'opposite', label: 'Opposite' },
              { value: 'same', label: 'Same' },
            ] as const).map((o) => (
              <button
                key={o.value}
                onClick={() => setLookingFor(o.value)}
                className={`py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  lookingFor === o.value
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/8 hover:border-white/15'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions notice */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-5">
          <Video className="w-5 h-5 text-white/40 shrink-0" />
          <p className="text-white/35 text-xs leading-relaxed">Camera and microphone access required to start chatting.</p>
        </div>

        {/* 18+ age gate */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/5 accent-purple-500 shrink-0"
          />
          <span className="text-white/40 text-xs leading-relaxed">
            I confirm I am <span className="text-white/70 font-semibold">18 years or older</span> and agree to the{' '}
            <span className="underline cursor-pointer hover:text-white/60 transition-colors">Terms</span> &{' '}
            <span className="underline cursor-pointer hover:text-white/60 transition-colors">Community Guidelines</span>.
            You may encounter unfiltered content from strangers.
          </span>
        </label>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !gender || !ageConfirmed || hasStarted}
          className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Start Random Chat ✨
        </button>

        <p className="text-center text-white/20 text-[11px] mt-5">
          By continuing, you agree to our <span className="underline cursor-pointer hover:text-white/40 transition-colors">Terms</span>
        </p>
      </motion.div>
    </div>
  )
}
