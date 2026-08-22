import type { Server as IOServer, Socket } from 'socket.io'
import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const VALID_GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'] as const

interface PeerProfile {
  name: string
  gender: string
  lookingFor: 'any' | 'opposite' | 'same'
}

interface WaitingPeer {
  socketId: string
  profile: PeerProfile
}

const waitingPeers: WaitingPeer[] = []
const activePairs = new Map<string, string>() // socketId -> pairedSocketId
const profilesBySocket = new Map<string, PeerProfile>() // last known profile per connection
const bannedPeers = new Set<string>() // socketIds blocked this session after repeat reports
let connectedCount = 0
const BAN_THRESHOLD = 3 // reports against the same target before auto-boot

// ---------------------------------------------------------------------------
// Rate limiting: sliding-window per socket + event type. Keeps abusive clients
// from flooding the signaling server with signals / reports / find-peer loops.
// ---------------------------------------------------------------------------
const rateBuckets = new Map<string, number[]>()
const RATE_LIMITS: Record<string, { max: number; windowMs: number }> = {
  'find-peer': { max: 8, windowMs: 10_000 },
  'signal': { max: 200, windowMs: 10_000 },
  'skip': { max: 12, windowMs: 10_000 },
  'stop-searching': { max: 10, windowMs: 10_000 },
  'report': { max: 5, windowMs: 60_000 },
}
function allowRate(socketId: string, event: string): boolean {
  const limit = RATE_LIMITS[event]
  if (!limit) return true
  const key = `${socketId}:${event}`
  const now = Date.now()
  const hits = (rateBuckets.get(key) || []).filter((ts) => now - ts < limit.windowMs)
  if (hits.length >= limit.max) {
    rateBuckets.set(key, hits)
    return false
  }
  hits.push(now)
  rateBuckets.set(key, hits)
  return true
}

// ---------------------------------------------------------------------------
// Input validation. Reject malformed / oversized profiles so a client can't
// inject huge payloads or spoof arbitrary fields.
// ---------------------------------------------------------------------------
function sanitizeProfile(raw: any): PeerProfile | null {
  if (!raw || typeof raw !== 'object') return null
  const name =
    typeof raw.name === 'string' ? raw.name.replace(/\s+/g, ' ').trim().slice(0, 30) : ''
  const gender = VALID_GENDERS.includes(raw.gender) ? raw.gender : null
  if (!name || !gender) return null
  const lookingFor = ['any', 'opposite', 'same'].includes(raw.lookingFor) ? raw.lookingFor : 'opposite'
  return { name, gender, lookingFor }
}

// ---------------------------------------------------------------------------
// Report persistence. No database in this project, so append a JSONL line to
// server/data/reports.jsonl — good enough for moderation review and survives
// restarts. Repeated reports against the same target are aggregated by count.
// ---------------------------------------------------------------------------
const REPORTS_DIR = join(process.cwd(), 'server', 'data')
const REPORTS_FILE = join(REPORTS_DIR, 'reports.jsonl')
let reportCounts = new Map<string, number>()

function persistReport(reporterId: string, targetId: string, targetProfile: PeerProfile | null, reason: string) {
  try {
    if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true })
    const count = (reportCounts.get(targetId) || 0) + 1
    reportCounts.set(targetId, count)
    const entry = {
      ts: new Date().toISOString(),
      reporterSocketId: reporterId,
      targetSocketId: targetId,
      targetProfile,
      reason: String(reason).slice(0, 200),
      count,
    }
    appendFileSync(REPORTS_FILE, JSON.stringify(entry) + '\n')
    console.log(`[!] Report #${count} from ${reporterId} against ${targetId}: ${entry.reason}`)
  } catch (err) {
    console.error('[!] Failed to persist report:', err)
  }
}

// ---------------------------------------------------------------------------
// Matching. Prefer pairing users with the opposite gender when one is waiting,
// but always fall back to the first available peer so nobody is stuck waiting.
// ---------------------------------------------------------------------------
function findTarget(me: WaitingPeer): WaitingPeer | null {
  const available = waitingPeers.filter(
    (p) => p.socketId !== me.socketId && !activePairs.has(p.socketId)
  )
  if (available.length === 0) return null

  const pref = me.profile.lookingFor
  let preferredGender: string | null = null
  if (pref === 'opposite') {
    preferredGender =
      me.profile.gender === 'male'
        ? 'female'
        : me.profile.gender === 'female'
          ? 'male'
          : null
  } else if (pref === 'same') {
    preferredGender = me.profile.gender
  }

  if (preferredGender) {
    const match = available.find((p) => p.profile.gender === preferredGender)
    if (match) return match
  }
  // No preferred-gender candidate waiting -> fall back to anyone so nobody is stuck.
  return available[0]
}

function tryMatch(socketId: string, io: IOServer) {
  const me = waitingPeers.find((p) => p.socketId === socketId)
  if (!me) return

  const target = findTarget(me)
  if (target) {
    removeFromWaiting(socketId)
    removeFromWaiting(target.socketId)

    activePairs.set(socketId, target.socketId)
    activePairs.set(target.socketId, socketId)

    io.to(socketId).emit('matched', { peerId: target.socketId, initiator: true })
    io.to(target.socketId).emit('matched', { peerId: socketId, initiator: false })

    // Exchange profile info via signal
    io.to(socketId).emit('signal', {
      signal: { type: 'profile', name: target.profile.name, gender: target.profile.gender },
      sender: target.socketId,
    })
    io.to(target.socketId).emit('signal', {
      signal: { type: 'profile', name: me.profile.name, gender: me.profile.gender },
      sender: socketId,
    })
  } else {
    const pos = waitingPeers.filter((p) => p.socketId !== socketId).length
    io.to(socketId).emit('waiting', pos || 0)
  }
}

function removeFromWaiting(socketId: string) {
  const idx = waitingPeers.findIndex((p) => p.socketId === socketId)
  if (idx !== -1) waitingPeers.splice(idx, 1)
}

function removeFromActive(socketId: string) {
  const pairedId = activePairs.get(socketId)
  if (pairedId) activePairs.delete(pairedId)
  activePairs.delete(socketId)
}

export function attachSignaling(io: IOServer) {
  function broadcastUserCount() {
    io.emit('user-count', connectedCount)
  }

  io.on('connection', (socket: Socket) => {
    connectedCount++
    broadcastUserCount()
    console.log(`[+] Connected: ${socket.id} (online: ${connectedCount})`)

    socket.on('find-peer', (rawProfile: any) => {
      if (!allowRate(socket.id, 'find-peer')) {
        console.log(`[rate] find-peer throttled for ${socket.id}`)
        return
      }
      const profile = sanitizeProfile(rawProfile)
      if (!profile) {
        // Invalid profile -> don't queue, surface a waiting position of 0 so
        // the client knows it failed without a confusing stuck state.
        socket.emit('waiting', 0)
        console.log(`[x] Rejected invalid find-peer from ${socket.id}`)
        return
      }
      profilesBySocket.set(socket.id, profile)
      if (bannedPeers.has(socket.id)) {
        // Repeat offender blocked this session -> don't queue.
        socket.emit('waiting', 0)
        console.log(`[ban] blocked find-peer from ${socket.id}`)
        return
      }
      removeFromWaiting(socket.id)
      waitingPeers.push({ socketId: socket.id, profile })
      console.log(`[?] ${socket.id} looking for peer (${profile.name}/${profile.gender}/${profile.lookingFor})`)
      tryMatch(socket.id, io)
    })

    socket.on('signal', (data: { signal: any; target: string }) => {
      if (activePairs.get(socket.id) !== data.target) return
      if (!allowRate(socket.id, 'signal')) {
        console.log(`[rate] signal throttled for ${socket.id}`)
        return
      }
      io.to(data.target).emit('signal', { signal: data.signal, sender: socket.id })
    })

    socket.on('skip', () => {
      if (!allowRate(socket.id, 'skip')) return
      const pairedId = activePairs.get(socket.id)
      if (pairedId) {
        io.to(pairedId).emit('peer-left')
        removeFromActive(socket.id)
      }
      removeFromWaiting(socket.id)
    })

    socket.on('report', (data: { target: string; reason: string }) => {
      if (!allowRate(socket.id, 'report')) {
        console.log(`[rate] report throttled for ${socket.id}`)
        return
      }
      if (activePairs.get(socket.id) !== data.target) return
      const targetProfile = profilesBySocket.get(data.target) || null
      persistReport(socket.id, data.target, targetProfile, data.reason || 'no reason')

      // Repeat-offender auto-ban: boot the target from their current match and
      // block them from re-queueing for the rest of this server session.
      const count = (reportCounts.get(data.target) || 0)
      if (count >= BAN_THRESHOLD && !bannedPeers.has(data.target)) {
        bannedPeers.add(data.target)
        const pairedId = activePairs.get(data.target)
        if (pairedId) {
          io.to(pairedId).emit('peer-disconnected')
          removeFromActive(data.target)
        }
        removeFromWaiting(data.target)
        io.to(data.target).emit('peer-left')
        console.log(`[ban] auto-banned ${data.target} after ${count} reports`)
      }
    })

    socket.on('stop-searching', () => {
      removeFromWaiting(socket.id)
    })

    socket.on('disconnect', () => {
      connectedCount = Math.max(0, connectedCount - 1)
      broadcastUserCount()
      console.log(`[-] Disconnected: ${socket.id} (online: ${connectedCount})`)

      const pairedId = activePairs.get(socket.id)
      if (pairedId) {
        io.to(pairedId).emit('peer-disconnected')
        removeFromActive(socket.id)
      }
      removeFromWaiting(socket.id)
      profilesBySocket.delete(socket.id)
      bannedPeers.delete(socket.id)
      rateBuckets.forEach((_, key) => {
        if (key.startsWith(`${socket.id}:`)) rateBuckets.delete(key)
      })

      // Try to re-match remaining waiting peers
      if (waitingPeers.length > 0) {
        tryMatch(waitingPeers[0].socketId, io)
      }
    })
  })
}
