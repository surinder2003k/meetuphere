# VibeLink.live

Random video chat platform — connect with strangers instantly via WebRTC. Think Omegle, but modern.

## Live Demo

[VibeLink.live](https://vibelink.live)

## Features

- **Random Video Matching** — WebRTC peer-to-peer video calls with Socket.io signaling
- **Live Text Chat** — Real-time messaging during video calls
- **Swipe to Skip** — Swipe or click to skip to the next stranger
- **Tap to Swap Camera** — Tap your self-view to swap with the remote video
- **No Login Required** — Just pick a name and gender, start chatting
- **Mobile-First Design** — Optimized for both mobile and desktop
- **Dark Neon Theme** — Purple, cyan, pink accents with glass morphism

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion
- **Backend:** Socket.io server for WebRTC signaling and random matching
- **Video:** WebRTC via simple-peer library with STUN servers
- **State:** Zustand store, sessionStorage for profile persistence
- **Deployment:** Vercel (frontend) + custom server or Cloudflare Tunnel

## Getting Started

```bash
# Install dependencies
npm install

# Development (separate frontend + signaling server)
npm run dev

# Production (single server)
npm run build
npm run start
```

- Frontend: http://localhost:3000
- Socket.io (dev): http://localhost:3001

## Project Structure

```
src/
  app/
    page.tsx          # Main orchestrator
    layout.tsx        # Root layout
    globals.css       # Theme + utilities
  components/
    EntryModal.tsx    # Name + gender entry
    VideoCall.tsx     # Call interface (mobile + desktop)
    RemoteVideo.tsx   # Peer video display
    SelfVideo.tsx     # Local camera preview
    CallControls.tsx  # Desktop control buttons
    ChatPanel.tsx     # Desktop right-side chat
    LookingForMatch.tsx  # Search animation
    ReportModal.tsx   # Report user dialog
    ProfilePopover.tsx   # Profile settings
  hooks/
    useWebRTC.ts      # WebRTC peer management
    useSocket.ts      # Socket.io client
    useMediaPermissions.ts  # Camera/mic access
  lib/
    socket.ts         # Socket.io singleton
  store/
    useStore.ts       # Zustand state
  types/
    index.ts          # TypeScript types
server/
  index.ts            # Standalone signaling server (dev)
  custom.ts           # Combined Next.js + Socket.io (production)
```

## How It Works

1. User enters name + gender → camera/mic permission requested
2. Socket.io matches two random users
3. WebRTC peer connection established via STUN servers
4. Video streams flow peer-to-peer, chat messages relay through server
5. Skip/End call → re-enters the matching queue

## License

MIT
