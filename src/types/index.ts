export interface UserProfile {
  name: string
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say'
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
  'chat-message': (data: ChatMessage) => void
  'typing': (data: { sender: string }) => void
  'peer-disconnected': () => void
  'peer-left': () => void
  'no-peers': () => void
}

export interface ClientToServerEvents {
  'find-peer': (profile: UserProfile) => void
  'signal': (data: { signal: any; target: string }) => void
  'chat-message': (data: { content: string; target: string }) => void
  'typing': (data: { target: string }) => void
  'skip': () => void
  'report': (data: { target: string; reason: string }) => void
  'stop-searching': () => void
}

export type CallState = 'idle' | 'entering' | 'searching' | 'connecting' | 'connected'