'use client'

import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { User, Settings, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserProfile } from '@/types'

interface ProfilePopoverProps {
  profile: UserProfile
  onUpdate: (profile: UserProfile) => void
  onDisconnect: () => void
}

export default function ProfilePopover({ profile, onUpdate, onDisconnect }: ProfilePopoverProps) {
  const [name, setName] = useState(profile.name)
  const [gender, setGender] = useState(profile.gender)
  const [open, setOpen] = useState(false)

  const handleSave = () => {
    if (!name.trim()) return
    onUpdate({ name: name.trim(), gender })
    sessionStorage.setItem('vibelink_profile', JSON.stringify({ name: name.trim(), gender }))
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-all">
          <User className="w-4 h-4 text-white/70" />
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={8} align="end">
              <motion.div
                className="glass-strong rounded-xl p-4 w-64 z-50"
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
              >
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{profile.name}</p>
                    <p className="text-text-muted text-xs capitalize">{profile.gender.replace('-', ' ')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                      maxLength={30}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as UserProfile['gender'])}
                      className="w-full bg-surface border border-border rounded-lg py-2 px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
                  >
                    <Settings className="w-3.5 h-3.5 inline mr-1" />
                    Save
                  </button>
                  <button
                    onClick={() => { onDisconnect(); setOpen(false) }}
                    className="flex-1 py-2 rounded-lg border border-danger/30 text-danger text-sm font-medium hover:bg-danger/10 transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5 inline mr-1" />
                    Leave
                  </button>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  )
}