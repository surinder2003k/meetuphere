const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
]

// Free public TURN relay (Metered OpenRelay). Without a TURN server, calls
// fail for users behind symmetric NATs / strict firewalls (~20-30% of mobile
// users). Override with NEXT_PUBLIC_TURN_URL / _USERNAME / _CREDENTIAL to use
// your own coturn or Cloudflare Turn deployment in production.
const DEFAULT_TURN_SERVERS = [
  'turn:openrelay.metered.ca:80',
  'turn:openrelay.metered.ca:443',
  'turn:openrelay.metered.ca:443?transport=tcp',
]

function parseUrls(envValue: string | undefined): string[] {
  if (!envValue) return []
  return envValue
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
}

export function getIceServers(): RTCIceServer[] {
  const stunUrls = parseUrls(process.env.NEXT_PUBLIC_STUN_URLS)
  const turnUrls = parseUrls(process.env.NEXT_PUBLIC_TURN_URL)
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME || 'openrelayproject'
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL || 'openrelayproject'

  const servers: RTCIceServer[] = []

  const stun = stunUrls.length > 0 ? stunUrls : DEFAULT_STUN_SERVERS
  servers.push({ urls: stun })

  const turn = turnUrls.length > 0 ? turnUrls : DEFAULT_TURN_SERVERS
  servers.push({
    urls: turn,
    username: turnUsername,
    credential: turnCredential,
  })

  return servers
}
