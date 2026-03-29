# CLAUDE.md — Palace Royale

AI assistant guide for the Palace Royale codebase. Read this before making any changes.

---

## Project Overview

**Palace Royale** is a browser-based implementation of the card game Palace (also known as Scum/Shed). It supports single-player vs AI bots and real-time online multiplayer.

- **Live app**: https://palace-royale.vercel.app
- **Version**: 0.5.0
- **Stack**: React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Supabase

---

## Repository Structure

```
/
├── src/
│   └── app/
│       ├── game-engine.ts          # Core game rules, types, and AI logic (~1500 lines)
│       ├── routes.ts               # React Router route definitions
│       ├── App.tsx                 # Root component (SettingsProvider + RouterProvider)
│       ├── components/
│       │   ├── GameBoard.tsx       # Main game UI and interaction logic (~52KB)
│       │   ├── PalaceDisplay.tsx   # Palace card grid visualization
│       │   ├── PlayingCard.tsx     # Card component (face-up, face-down, mini variants)
│       │   ├── HowToPlayModal.tsx  # Rules modal
│       │   ├── AddToHomeScreenModal.tsx
│       │   └── ui/                 # 45+ Radix UI component wrappers (shadcn/ui pattern)
│       ├── contexts/
│       │   └── SettingsContext.tsx # Global settings (sound, music, particles, debug mode)
│       └── pages/
│           ├── HomePage.tsx        # Main menu, bot/multiplayer setup, local stats
│           ├── RobotGamePage.tsx   # Single-player vs AI bots
│           ├── MultiplayerGamePage.tsx # Online multiplayer (polling-based)
│           ├── LobbyPage.tsx       # Join/create multiplayer game lobby
│           ├── RejoinGamesPage.tsx # Resume disconnected games
│           ├── HowToPlayPage.tsx   # Rules & tips accordion
│           └── SettingsPage.tsx    # Audio, display, developer settings
├── supabase/
│   └── functions/server/           # Deno Edge Function (Hono HTTP server)
│       └── index.ts                # API: /games CRUD + version-based concurrency
├── utils/
│   └── supabase/
│       └── info.tsx                # Exports projectId and publicAnonKey from env vars
├── styles/
│   ├── index.css                   # Font imports + Tailwind + theme imports
│   ├── tailwind.css                # Tailwind v4 directives + source scanning config
│   └── theme.css                   # CSS custom properties (oklch colors, radii, fonts)
├── guidelines/
│   └── Guidelines.md               # Placeholder for additional AI guidelines
├── vite.config.ts                  # Vite + React + Tailwind plugins; @ alias → src/app
├── vercel.json                     # SPA fallback: all routes → /index.html
├── .env.example                    # Environment variable template
├── package.json                    # npm scripts + dependencies
├── README.md                       # User-facing documentation
└── ATTRIBUTIONS.md                 # Third-party license credits
```

---

## Development Setup

```bash
npm install
cp .env.example .env.local   # Fill in Supabase credentials
npm run dev                  # Start Vite dev server
npm run build                # Production build → dist/
```

### Required Environment Variables

```
VITE_SUPABASE_PROJECT_ID=your_supabase_project_id
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Both are exposed client-side via `import.meta.env`. The anon key is a public read-only Supabase key — it is safe to expose in the browser.

---

## Path Aliases

The `@` alias maps to `./src/app`. Always use `@/` for imports within the app:

```ts
import { GameState } from '@/game-engine';
import { Button } from '@/components/ui/button';
```

---

## Key Files to Understand

### `src/app/game-engine.ts`

The single most important file. Contains:
- **Type definitions**: `Card`, `Suit`, `PalaceSlot`, `Player`, `GameState`, `PlayerStats`
- **Game rules engine**: `playCards()`, `canPlay()`, `drawCards()`, `pickupPile()`, etc.
- **AI logic**: `getBotMove()` — deterministic bot decision-making
- **Helpers**: `getRankDisplay()`, `getSuitSymbol()`, `cardDisplay()`, `shuffleDeck()`, etc.

**Special card ranks** (game mechanics):
- `2` — reset: can be played on anything, resets the pile
- `10` — wipeout: burns the discard pile, player gets a bonus turn
- Four-of-a-kind — wipeout: same as 10, burns pile + bonus turn
- `7` — low card: next player must play ≤ 7
- `8` — transparent: inherits the rank of the card below it

When modifying game rules, **only touch `game-engine.ts`**. Both the robot game and multiplayer game share this engine.

### `src/app/components/GameBoard.tsx`

The main game UI — handles rendering and user interaction for both robot and multiplayer modes. It is large (~52KB). Be careful making changes here; understand the full component before editing.

### `src/app/pages/MultiplayerGamePage.tsx`

Handles online multiplayer via polling the Supabase backend. Uses optimistic concurrency (version numbers) to detect conflicts. Key patterns:
- Poll the server every ~1.5 seconds
- On conflict (409 Stale State), re-fetch and retry
- Palace setup is deferred and synced via `setupDoneRef`

---

## Routing

Routes are defined in `src/app/routes.ts` using React Router v7:

| Path | Page | Purpose |
|------|------|---------|
| `/` | `HomePage` | Main menu |
| `/robot` | `RobotGamePage` | Single-player vs bots |
| `/lobby` | `LobbyPage` | Online lobby |
| `/multiplayer` | `MultiplayerGamePage` | Online game |
| `/how-to-play` | `HowToPlayPage` | Rules |
| `/settings` | `SettingsPage` | App settings |
| `/rejoin-games` | `RejoinGamesPage` | Reconnect |

All routes are client-side only; `vercel.json` rewrites everything to `/index.html`.

---

## Backend API

The backend is a Deno Hono Edge Function deployed on Supabase. Base URL is constructed from env vars in `utils/supabase/info.tsx`.

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/health` | Health check |
| `POST` | `/games` | Create new game |
| `POST` | `/games/:code/join` | Join existing game |
| `GET` | `/games/:code` | Fetch game state |
| `PUT` | `/games/:code` | Update game state (version-checked) |
| `DELETE` | `/games/:code` | Delete game |

**Concurrency**: The `PUT` endpoint checks `version` for optimistic locking. Returns `409` if the client's version is stale. The frontend must re-fetch on 409.

**Storage**: Single `kv_store_990c827f` table in Supabase PostgreSQL with `key TEXT PRIMARY KEY` and `value JSONB`.

---

## State Management

- **Global settings**: `SettingsContext` (sound, music, particles, debug) — persisted to `localStorage` under key `palace-settings`
- **Game state**: local `useState` in each game page; multiplayer state is also synced to the Supabase backend
- **Player stats**: stored in `localStorage` under `palace-stats`
- **Saved game references**: stored in `localStorage` under `palace-save-{code}`
- **Player emoji**: stored in `localStorage` under `palace-player-emoji`

There is **no global state library** (no Redux, Zustand, etc.). State is kept close to where it's used.

---

## Styling Conventions

- **Tailwind CSS v4** — use utility classes. No CSS modules or styled-components.
- **Theme tokens** are defined in `styles/theme.css` as CSS custom properties using the oklch color space. Reference them via Tailwind semantic names (`bg-primary`, `text-foreground`, etc.).
- **Dark mode** is supported via the `dark:` variant.
- **Animations**: use the `motion` library (Framer Motion fork) for animated components.
- **Do not** use inline styles or arbitrary Tailwind values unless absolutely necessary.
- Layout defaults: prefer `flex` and `grid` over `absolute` positioning.

---

## UI Components

UI primitives live in `src/app/components/ui/` and follow the **shadcn/ui** pattern — they are thin wrappers around **Radix UI** primitives with Tailwind styling. They are local copies, not imported from a package.

When you need a new UI primitive:
1. Check `src/app/components/ui/` first — it likely already exists.
2. If adding a new Radix primitive, follow the existing wrapper pattern in that directory.
3. Use `class-variance-authority` (`cva`) for variant-based component APIs.

Icons come from two sources:
- **Lucide React** — preferred for standard icons
- **MUI Icons** — available but prefer Lucide for consistency

---

## TypeScript Conventions

- All game types are defined and exported from `game-engine.ts`. Import them from there.
- Prefer explicit return types on exported functions.
- Use `interface` for object shapes; `type` for unions and aliases.
- No `any` — use proper types or `unknown`.
- The project uses Vite's implicit TypeScript config. There is no separate `tsconfig.json`.

---

## No Test Suite

There are currently **no automated tests**. When making changes to `game-engine.ts`, manually verify game logic by:
1. Running `npm run dev`
2. Playing through affected scenarios in the browser
3. Enabling **debug mode** in Settings to expose additional state information

---

## Git Workflow

- **Main branch**: `main` (production, deployed to Vercel)
- **Feature branches**: descriptive names, e.g., `copilot/fix-bug-player-bonus-turn`
- Commit messages follow the pattern: `feat:`, `fix:`, `chore:`, `update:`
- Changes merged to `main` via pull requests

### Current Feature Branch

Active development branch: `claude/combine-prs-deployment-fix-RwRXX`

---

## Deployment

- **Platform**: Vercel (automatic deploys from `main`)
- **Build command**: `npm run build` → `dist/`
- **Output directory**: `dist/`
- **SPA routing**: `vercel.json` rewrites all paths to `/index.html`
- **Backend**: Supabase Edge Functions (deployed separately via Supabase CLI)

### Critical Vercel Config

`vercel.json` must include `"framework": null` to prevent Vercel from auto-detecting this as a Next.js project (triggered by the `next-themes` dependency). Without it, Vercel uses the Next.js builder and fails with "No Next.js version detected".

`react` and `react-dom` must be in `dependencies` (not `peerDependencies`) so Vercel CI installs them. See `package.json`.

If a Vercel build fails with "No Next.js version detected", verify `vercel.json` has:
```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

---

## Common Patterns & Gotchas

1. **Game engine is the source of truth** — never replicate game rule logic outside `game-engine.ts`. Both the AI game and multiplayer game call the same functions.

2. **Optimistic concurrency in multiplayer** — always increment `version` when writing state. Handle 409 responses by re-fetching before retrying.

3. **Palace setup is asynchronous** — in multiplayer, each player selects their face-down/face-up cards independently. The game transitions to `playing` phase only when all players have completed setup. The deferred sync pattern (`setupDoneRef`) prevents race conditions.

4. **Bot logic is deterministic** — `getBotMove()` in `game-engine.ts` makes decisions based solely on visible game state. No randomness beyond the initial shuffle.

5. **Emoji avatars** — always rebuild the emoji map from server state on every poll, never assume local index order matches server order (players can join in different order than expected).

6. **`waitingForBonus`** — after a wipeout (10, four-of-a-kind), the game enters `waitingForBonus` state. The current player gets a free turn. If that player becomes safe (clears all cards) during the wipeout, the bonus turn must be skipped.

7. **`eliminated` vs `loser`** — `eliminated` is an array of players who finished safely (cleared all cards). The last player remaining is `loser`. The game ends when `players.length - eliminated.length === 1`.

8. **Local storage keys** — never change existing key names without a migration strategy; they persist across sessions on user devices.
