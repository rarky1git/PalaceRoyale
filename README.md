# PalaceRoyale

![version](https://img.shields.io/badge/version-0.7.0-yellow)

A web-based implementation of the **Palace** card game (also known as Scum or Shed), playable solo against AI or with friends in real-time multiplayer.

🃏 **Live:** https://palace-royale.vercel.app

---

## Features

- **Single-player** — play against AI bots with full Palace rule enforcement
- **Multiplayer** — create or join a lobby with a 6-character code, real-time state sync via Supabase
- **Rejoin multiplayer** — resume a disconnected game from the home screen
- **Full rule engine** — draw bonuses, counters, four-of-a-kind slams, eliminations, card rank 2–Ace
- **Particle effects** — visual animations for slams, wipeouts, and sparkles
- **Emoji avatars** — pick or enter a custom emoji to represent your player
- **How to Play** — in-app rules and tips page
- **Settings** — toggle sound effects, background music, fullscreen, particle effects, and debug overlay (all persisted locally)
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

## Update History

### v0.7.0 — March 2026

- **Interactive Tutorial** — First-time players see a swipeable "Learn to Play" banner on the home screen. Tapping it launches a guided game covering special cards (2, 7, 10), bonus turns, palace mechanics, and end-game scenarios. Dismissible by swipe; replayable anytime from Settings.
- **Chat View in All Game Modes** — The floating opponent overlay (📹) is no longer limited to online multiplayer. It now works in single-player robot games too.
- **Paginated Hand + Smart Card Sorting** — When your hand exceeds 10 cards it splits into pages with chevron navigation. On your turn, playable cards are automatically sorted to the front for faster decision-making.
- **Player Name Persistence** — Your name is saved when you start a game and pre-filled on your next visit.
- **UI Polish & Bug Fixes** — Palace card setup now animates with a tilt and glow. Opponent palace cards display deterministic per-slot rotations. Home page layout refreshed with a horizontal header row and new tagline. Particle effects now correctly respect the Settings toggle (two cases where animations fired unconditionally were fixed).

## Project Structure

```
src/
├── app/
│   ├── game-engine.ts       # Core Palace rules engine + AI logic
│   ├── components/          # GameBoard, PlayingCard, UI primitives
│   ├── contexts/            # SettingsContext (persistent game settings)
│   └── pages/               # HomePage, RobotGamePage, MultiplayerGamePage,
│                            #   LobbyPage, HowToPlayPage, SettingsPage
supabase/
└── functions/server/        # Deno Edge Function (Hono) — game lobby API
utils/supabase/              # Supabase client config
```
