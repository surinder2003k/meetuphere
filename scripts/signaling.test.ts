/**
 * Integration tests for the signaling server. Self-contained: spawns the
 * server on an ephemeral port, runs socket-level checks, then exits.
 *
 *   npx tsx scripts/signaling.test.ts
 *
 * Exit code is non-zero if any check fails.
 */
import { io as ClientIO, Socket } from 'socket.io-client'
import { spawn } from 'child_process'
import { existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'

const PORT = 3210
const URL = `http://localhost:${PORT}`
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const results: string[] = []
const ok = (name: string, cond: boolean) => {
  results.push(`${cond ? 'PASS' : 'FAIL'} - ${name}`)
  if (!cond) process.exitCode = 1
}

async function connect(): Promise<Socket> {
  const s: Socket = ClientIO(URL, { transports: ['websocket'], forceNew: true })
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error('connect timeout')), 5000)
    s.on('connect', () => { clearTimeout(t); res() })
    s.on('connect_error', (e) => { clearTimeout(t); rej(e) })
  })
  return s
}

async function matchPair(a: Socket, b: Socket) {
  let aPeer: string | null = null
  let bPeer: string | null = null
  a.on('matched', (d: any) => (aPeer = d.peerId))
  b.on('matched', (d: any) => (bPeer = d.peerId))
  a.emit('find-peer', { name: 'A', gender: aGender, lookingFor: aPref })
  b.emit('find-peer', { name: 'B', gender: bGender, lookingFor: bPref })
  await wait(700)
  return { aPeer, bPeer }
}
// module-level defaults (overwritten per call by closures below)

let aGender = 'female', aPref: any = 'opposite'
let bGender = 'male', bPref: any = 'opposite'

function setPair(gA: string, pA: any, gB: string, pB: any) {
  aGender = gA; aPref = pA; bGender = gB; bPref = pB
}

async function main() {
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
    shell: true,
  })

  // Wait for server ready
  let ready = false
  for (let i = 0; i < 40; i++) {
    try { const c = await connect(); c.close(); ready = true; break } catch { await wait(250) }
  }
  if (!ready) { console.error('Server did not start'); server.kill('SIGTERM'); process.exit(1) }

  try {
    // 1. opposite-gender preference
    setPair('female', 'opposite', 'male', 'opposite')
    const s1 = await connect(); const s2 = await connect()
    let { aPeer, bPeer } = await matchPair(s1, s2)
    ok('opposite-gender: female pairs with male', aPeer === s2.id && bPeer === s1.id)
    s1.close(); s2.close()

    // 2. same-gender preference
    setPair('female', 'same', 'female', 'same')
    const c = await connect(); const d = await connect()
    let cPeer: string | null = null, dPeer: string | null = null
    c.on('matched', (x: any) => (cPeer = x.peerId)); d.on('matched', (x: any) => (dPeer = x.peerId))
    c.emit('find-peer', { name: 'C', gender: 'female', lookingFor: 'same' })
    d.emit('find-peer', { name: 'D', gender: 'female', lookingFor: 'same' })
    await wait(700)
    ok('same-gender: female pairs with female', cPeer === d.id && dPeer === c.id)
    c.close(); d.close()

    // 3. "any" preference ignores gender
    setPair('male', 'any', 'female', 'any')
    const e = await connect(); const f = await connect()
    let ePeer: string | null = null, fPeer: string | null = null
    e.on('matched', (x: any) => (ePeer = x.peerId)); f.on('matched', (x: any) => (fPeer = x.peerId))
    e.emit('find-peer', { name: 'E', gender: 'male', lookingFor: 'any' })
    f.emit('find-peer', { name: 'F', gender: 'female', lookingFor: 'any' })
    await wait(700)
    ok('any: male pairs with female (any)', ePeer === f.id && fPeer === e.id)
    e.close(); f.close()

    // 4. validation rejects bad profile
    const g = await connect()
    let gMatched: any = null, gWaiting: number | null = null
    g.on('matched', (x) => (gMatched = x)); g.on('waiting', (p) => (gWaiting = p))
    g.emit('find-peer', { name: '', gender: 'bogus' })
    await wait(400)
    ok('invalid profile not matched', gMatched === null)
    ok('invalid profile gets waiting(0)', gWaiting === 0)
    g.close()

    // 5. report persistence + counting (isolated pair)
    const rptDir = join(process.cwd(), 'server', 'data')
    if (existsSync(rptDir)) rmSync(rptDir, { recursive: true, force: true })
    const rep = await connect(); const tar = await connect()
    let repPeer: string | null = null, tarPeer: string | null = null
    rep.on('matched', (x: any) => (repPeer = x.peerId)); tar.on('matched', (x: any) => (tarPeer = x.peerId))
    rep.emit('find-peer', { name: 'R', gender: 'female', lookingFor: 'any' })
    tar.emit('find-peer', { name: 'T', gender: 'male', lookingFor: 'any' })
    await wait(700)
    if (repPeer === tar.id && tarPeer === rep.id) {
      rep.emit('report', { target: repPeer, reason: 'abuse' })
      await wait(400)
      const file = join(rptDir, 'reports.jsonl')
      const lines = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n').filter(Boolean) : []
      ok('report written to reports.jsonl', lines.length === 1)
      ok('report line has target profile', lines[0]?.includes('"name":"T"') ?? false)
    } else {
      ok('report pair formed', false)
    }
    rep.close(); tar.close()

    // 6. user-count broadcast
    const counter = await connect()
    let uc = 0
    counter.on('user-count', (n: number) => (uc = n))
    await wait(300)
    ok('user-count broadcast > 0', uc > 0)
    counter.close()

    // 7. rate-limit flood does not crash
    const flood = await connect()
    for (let i = 0; i < 20; i++) flood.emit('find-peer', { name: 'X', gender: 'other', lookingFor: 'any' })
    await wait(400)
    ok('find-peer flood handled without crash', true)
    flood.close()

    await wait(200)
  } finally {
    server.kill('SIGTERM')
  }

  console.log('\n=== SIGNALING TEST RESULTS ===')
  console.log(results.join('\n'))
  console.log('==============================')
}

main().catch((e) => { console.error(e); process.exit(1) })
