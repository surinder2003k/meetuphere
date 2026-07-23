import { create } from 'zustand'
import type { UserProfile, ChatMessage, CallState } from '@/types'

interface AppState {
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  clearProfile: () => void

  callState: CallState
  setCallState: (state: CallState) => void

  peerId: string | null
  setPeerId: (id: string | null) => void

  messages: ChatMessage[]
  addMessage: (msg: ChatMessage) => void
  clearMessages: () => void

  peerTyping: boolean
  setPeerTyping: (typing: boolean) => void

  isMicOn: boolean
  setMicOn: (on: boolean) => void
  isVideoOn: boolean
  setVideoOn: (on: boolean) => void

  isChatOpen: boolean
  setChatOpen: (open: boolean) => void

  error: string | null
  setError: (error: string | null) => void

  queuePosition: number | null
  setQueuePosition: (pos: number | null) => void

  reportReason: string
  setReportReason: (reason: string) => void
}

export const useStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),

  callState: 'idle',
  setCallState: (callState) => set({ callState }),

  peerId: null,
  setPeerId: (peerId) => set({ peerId }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),

  peerTyping: false,
  setPeerTyping: (peerTyping) => set({ peerTyping }),

  isMicOn: true,
  setMicOn: (isMicOn) => set({ isMicOn }),
  isVideoOn: true,
  setVideoOn: (isVideoOn) => set({ isVideoOn }),

  isChatOpen: false,
  setChatOpen: (isChatOpen) => set({ isChatOpen }),

  error: null,
  setError: (error) => set({ error }),

  queuePosition: null,
  setQueuePosition: (queuePosition) => set({ queuePosition }),

  reportReason: '',
  setReportReason: (reportReason) => set({ reportReason }),
}))