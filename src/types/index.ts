export interface UserProfile {
  name: string
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  lookingFor?: 'any' | 'male' | 'female'
}

export interface ChatMessage {
  id: string
  sender: string
  content: string
  timestamp: number
}

export interface ServerToClientEvents {
  'matched': (data: { peerId: string; initiator: boolean }) => void
  'waiting': (position: number) => void
  'signal': (data: { signal: any; sender: string }) => void
  'peer-disconnected': () => void
  'peer-left': () => void
  'no-peers': () => void
  'user-count': (count: number) => void
}

export interface ClientToServerEvents {
  'find-peer': (profile: UserProfile) => void
  'signal': (data: { signal: any; target: string }) => void
  'skip': () => void
  'report': (data: { target: string; reason: string }) => void
  'stop-searching': () => void
}

export type CallState = 'idle' | 'entering' | 'searching' | 'connecting' | 'connected'
