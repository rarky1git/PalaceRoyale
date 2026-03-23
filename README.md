# PalaceRoyale

A web-based implementation of the **Palace** card game (also known as Scum or Shed), playable solo against AI or with friends in real-time multiplayer.

🃏 **Live:** https://palace-royale.vercel.app

---

## Features

- **Single-player** — play against AI bots with full Palace rule enforcement
- **Multiplayer** — create or join a lobby with a 6-character code, real-time state sync via Supabase
- **Full rule engine** — draw bonuses, counters, eliminations, card rank 2–Ace
- **Responsive UI** — works on desktop and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 + Tailwind CSS v4 |
| Components | Radix UI + MUI Icons + Lucide |
| Routing | React Router v7 |
| Animations | Motion (Framer Motion) |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Hosting | Vercel |

## Getting Started

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase credentials
cp .env.example .env.local

# Start dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project ID |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

See `.env.example` for the template.

## Project Structure

```
src/
├── app/
│   ├── game-engine.ts       # Core Palace rules engine + AI logic
│   ├── components/          # GameBoard, PlayingCard, UI primitives
│   └── pages/               # HomePage, RobotGamePage, MultiplayerGamePage, LobbyPage
supabase/
└── functions/server/        # Deno Edge Function (Hono) — game lobby API
utils/supabase/              # Supabase client config
```
