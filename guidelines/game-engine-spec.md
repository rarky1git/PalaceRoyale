# Game Engine Specification — `game-engine.ts`

A precise technical reference for Palace Royale's core rules engine.

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Game Phases](#2-game-phases)
3. [Initialization](#3-initialization)
4. [Setup Phase](#4-setup-phase)
5. [Card Validity Rules](#5-card-validity-rules)
6. [Player Sources](#6-player-sources)
7. [Core Actions](#7-core-actions)
8. [Special Card Mechanics](#8-special-card-mechanics)
9. [Bonus Mechanics](#9-bonus-mechanics)
10. [Steal Mechanic](#10-steal-mechanic)
11. [Counter Mechanic](#11-counter-mechanic)
12. [Elimination & Win Condition](#12-elimination--win-condition)
13. [AI Behaviour](#13-ai-behaviour)
14. [Public API Reference](#14-public-api-reference)
15. [State Mutation Rules](#15-state-mutation-rules)

---

## 1. Data Model

### `Card`

```ts
interface Card {
  id: string;     // unique, format: "{deckIndex}-{rank}-{suit}"
  suit: Suit;     // 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: number;   // 2–14 (11=J, 12=Q, 13=K, 14=A)
}
```

### `PalaceSlot`

Each player has exactly **3 palace slots**. Each slot holds one face-down card and one face-up card.

```ts
interface PalaceSlot {
  faceDown: Card | null;
  faceUp: Card | null;
}
```

### `Player`

```ts
interface Player {
  id: string;             // 'player-0', 'player-1', …
  name: string;
  emoji?: string;
  hand: Card[];
  palace: PalaceSlot[];   // always length 3
  setupPhase: 'select-facedown' | 'select-faceup' | 'done';
  setupCards: Card[];     // 9 cards dealt at init; empty after setup completes
  stats?: PlayerStats;
}
```

### `GameState`

```ts
interface GameState {
  version: number;                // Incremented on every mutation; used for optimistic locking
  phase: 'waiting' | 'setup' | 'playing' | 'finished';
  players: Player[];
  drawPile: Card[];
  pickupPile: Card[];             // Active pile cards are played onto
  discardPile: Card[];            // Wiped-out cards; never re-enter play
  currentPlayerIndex: number;
  dealerIndex: number;
  log: string[];
  waitingForBonus: { type: '2' | '10' | 'four-of-a-kind' } | null;
  winner: string | null;          // Unused in current engine; use eliminated/loser
  eliminated: string[];           // Player IDs who finished safely, in finish order
  loser: string | null;           // ID of last remaining player
  lastAction: LastAction | null;
  drawBonus: { playerId: string } | null;
  pendingCounter: { type: 'drawBonus'; bonusPlayerId: string } | null;
  nudgeCount: number;
  newGameRequested: string[];     // Multiplayer rematch requests
}
```

### `PlayerStats`

```ts
interface PlayerStats {
  gold: number;         // 1st-place finishes
  silver: number;       // 2nd-place finishes
  bronze: number;       // 3rd-place finishes
  losses: number;       // Last-place finishes
  gamesPlayed: number;
}
```

### `lastAction` types

| `type` | Meaning |
|---|---|
| `play` | Normal card play |
| `pickup` | Player picked up the pile |
| `wipeout` | Four-of-a-kind wipeout |
| `draw` | Draw from pile |
| `slam` | 10 wipeout |
| `sparkle` | 2 played |
| `nudge` | Another player nudged the current player |
| `palace-invalid` | Blind palace card couldn't be played; pile picked up |

---

## 2. Game Phases

```
waiting → setup → playing → finished
```

| Phase | Description |
|---|---|
| `waiting` | Lobby state; not used by the engine itself |
| `setup` | All players select their palace cards |
| `playing` | Main game loop |
| `finished` | Game over; `loser` is set |

The transition `setup → playing` happens automatically inside `selectFaceUpCards` once every player's `setupPhase === 'done'`. The first card of the draw pile is immediately moved to `pickupPile`.

---

## 3. Initialization

```ts
function initGame(
  playerNames: string[],
  dealerIndex: number = 0,
  numberOfDecks: number = 1,       // 1–3 decks (clamped)
  playerEmojis?: string[]
): GameState
```

- Clamps `numberOfDecks` to `[1, MAX_DECKS]` (MAX_DECKS = 3).
- Creates and shuffles `numberOfDecks × 52` cards.
- Deals **9 cards** to each player as `setupCards`; remainder goes to `drawPile`.
- Sets `phase: 'setup'`, `currentPlayerIndex: (dealerIndex + 1) % players.length`.
- `version` starts at `0`.

For a **rematch**, use `resetGame(state, numberOfDecks)`:
- Preserves player names, emojis, and stats.
- Loser of the previous game becomes the new dealer.
- Carries `version` forward as `state.version + 1`.

---

## 4. Setup Phase

Each player goes through two steps in order:

### Step 1 — `selectFaceDownCards(state, playerId, cardIds: string[])`

- Requires exactly **3 card IDs** from `player.setupCards`.
- Places the 3 cards into `palace[0..2].faceDown`.
- Removes them from `setupCards`.
- Advances player to `setupPhase: 'select-faceup'`.

### Step 2 — `selectFaceUpCards(state, playerId, cardIds: string[])`

- Requires exactly **3 card IDs** from the remaining 6 `setupCards`.
- Places them into `palace[0..2].faceUp`.
- The remaining 3 `setupCards` become the player's starting `hand`.
- Clears `setupCards`; sets `setupPhase: 'done'`.
- If **all** players are now `'done'`, transitions game to `'playing'` and moves the first draw-pile card onto `pickupPile`.

---

## 5. Card Validity Rules

```ts
function canPlayCardOnPile(card: Card, topCard: Card | null): boolean
```

| Condition | Result |
|---|---|
| `pickupPile` is empty (`topCard === null`) | Any card is playable |
| `card.rank === 2` | Always playable |
| `card.rank === 10` | Always playable |
| `topCard.rank === 7` | Card must have `rank ≤ 7` |
| `topCard.rank === 2` | Any card is playable (2 is lowest) |
| Otherwise | `card.rank >= topCard.rank` |

### Effective top card

`getTopCard(pile)` returns `pile[pile.length - 1]` or `null`.

> **Note on 8 (transparent):** The 8 is transparent in the game's *visual rules*, but the engine does **not** implement transparency in `canPlayCardOnPile`. An 8 inherits the rank of the card below it as a UI/display concern, not an engine concern. The engine treats 8 as a normal card with rank 8.

---

## 6. Player Sources

```ts
function getPlayerSource(player: Player, drawPileEmpty: boolean): 'hand' | 'palace-faceup' | 'palace-facedown' | 'none'
```

Priority order:

1. `'hand'` — if `hand.length > 0` **or** draw pile is not yet empty (player should have drawn).
2. `'palace-faceup'` — if hand is empty and draw pile is empty, play from visible palace cards.
3. `'palace-facedown'` — if no face-up palace cards remain.
4. `'none'` — player has no cards left (they should have been eliminated).

Playing from `palace-facedown` is **blind** — the card is unknown until flipped. If it fails validity, the player picks up the whole pile (see `playCards`).

---

## 7. Core Actions

### `playCards(state, playerId, cardIds): GameState`

The primary play action. Validates turn order, source, and card validity.

**Preconditions (throws on failure):**
- `phase === 'playing'`
- `playerId` is `currentPlayerIndex`
- `waitingForBonus === null`
- `pendingCounter === null`
- `cardIds.length >= 1`
- All played cards must be the same rank (unless playing from face-down palace)
- Card(s) must pass `canPlayCardOnPile`

**After playing — post-play resolution order:**
1. Check for **four-of-a-kind** on the pile → wipeout + bonus.
2. Check if `playedRank === 10` → wipeout + bonus.
3. Check if `playedRank === 2` → `waitingForBonus: '2'`.
4. Draw cards up to 3 (hand only, from draw pile).
5. Check elimination (`checkWinner`).
6. Check for **draw bonus** (`trySetDrawBonus`).
7. Advance turn.

**Face-down palace play** diverges early: if the revealed card is invalid, it is added to the pile and the player picks up the whole pile, then the turn advances.

### `pickupPile(state, playerId): GameState`

- Only valid on the current player's turn.
- Moves all `pickupPile` cards into `player.hand`.
- Clears `waitingForBonus`, `drawBonus`, `pendingCounter`.
- Advances turn.

---

## 8. Special Card Mechanics

### Rank 2 — Reset

- Always playable on any pile.
- After playing, sets `waitingForBonus: { type: '2' }`.
- Bonus action: play any card that is valid on the current pile top.
- If the player has no cards to follow up with (and draw pile is empty), they must pick up the pile instead.
- The `'2'` bonus **can chain** — if the bonus card is also a 2, another `waitingForBonus: '2'` is set.

### Rank 10 — Wipeout

- Always playable on any pile.
- Playing a 10 burns the entire `pickupPile` into `discardPile` (pile is cleared).
- Sets `waitingForBonus: { type: '10' }`.
- Bonus action: play **any** card (fresh pile, no restriction).
- If the player becomes safe after the wipeout (draw + elimination check passes), the bonus turn is **skipped** — `advanceTurn` is called instead.

### Four-of-a-Kind — Wipeout

- Triggered whenever the top 4 cards of `pickupPile` share the same rank after any play (including bonus plays, draw bonuses, steal plays, and counter plays).
- Burns the pile into `discardPile`.
- Sets turn via `setFourOfAKindBonus` — no counter allowed.
- Player gets bonus turn with **any** card (same as 10 wipeout).
- If the player becomes safe after the wipeout, the bonus turn is skipped.

### Rank 7 — Low Gate

- After a 7 is played, the next card(s) must have `rank ≤ 7`.
- 2 and 10 remain playable (they bypass the gate).
- 7 itself satisfies the gate.

### Rank 8 — Transparent (UI only)

- The engine treats 8 as a normal card.
- UI layers display 8 as if the card below it were the effective rank.

---

## 9. Bonus Mechanics

Three concurrent bonus states can exist on `GameState`. They are mutually exclusive in practice.

### `waitingForBonus`

Set by: playing a 2, playing a 10, or completing a four-of-a-kind.

Resolution functions:

| Function | Usage |
|---|---|
| `playBonusAction(state, playerId, cardIds)` | Play the bonus card(s) |
| `pickupPile(state, playerId)` | Pick up instead of playing bonus |

For `type: '2'`: played card must pass `canPlayCardOnPile`.
For `type: '10'` and `type: 'four-of-a-kind'`: any card can be played (fresh pile).

Bonus play recursively checks for further wipeouts and 2s, so chains are possible.

### `drawBonus`

Set by: `trySetDrawBonus` — triggered after a normal play and draw, if the player's hand contains cards matching the current pile top rank.

State shape: `{ playerId: string }`

When a `drawBonus` is set, the next player simultaneously gets a `pendingCounter` window (see §11). Turn passes to the next player, but both can act:
- The **bonus player** can call `playDrawBonus` to play matching cards.
- The **counter player** can call `playCounter` to cancel the bonus and play themselves.

Resolution functions:

| Function | Usage |
|---|---|
| `playDrawBonus(state, playerId, cardIds)` | Bonus player plays matching cards |
| `skipDrawBonus(state, playerId)` | Bonus player waives the bonus |

- Cards played via `playDrawBonus` must all match the current pile top rank.
- Playing a draw bonus resolves all the same post-play checks (four-of-a-kind, 10, 2, elimination, further draw bonus).
- If the counter window was open when the bonus player acts, `pendingCounter` is cleared and turn stays with the counter player (already set).

### Simultaneous drawBonus + pendingCounter

Both `drawBonus` and `pendingCounter` can be set at the same time.
`currentPlayerIndex` points to the **counter player** while both are pending.
Either player can act first; the other's opportunity is cancelled when one acts.

---

## 10. Steal Mechanic

Any non-current player can "steal" the turn by completing a four-of-a-kind on the pile.

```ts
function canStealTurn(state, playerId): Card[] | null
```

Returns the cards needed to complete four-of-a-kind (or `null` if not possible).
Steal is only possible from `hand` or `palace-faceup` — not blind from face-down.

```ts
function stealTurn(state, stealingPlayerId, cardIds): GameState
```

- Plays the completing cards onto the pile.
- Burns the pile.
- Sets `currentPlayerIndex` to the stealer.
- Stealer draws up to 3 cards.
- Checks elimination; if safe, skips bonus.
- Otherwise calls `setFourOfAKindBonus` — stealer gets the bonus turn.

`checkAISteal(state)` iterates all non-human, non-current AI players and triggers a steal automatically if one is possible. Returns the updated state or `null` if no steal occurred.

> Human player (index 0, `player-0`) is excluded from auto-steal.

---

## 11. Counter Mechanic

Triggered automatically by `trySetDrawBonus` when a draw bonus is set and there is more than one active player.

State shape:
```ts
pendingCounter: { type: 'drawBonus'; bonusPlayerId: string } | null
```

The counter player (next active player after the bonus player) can:

| Function | Effect |
|---|---|
| `playCounter(state, playerId, cardIds)` | Play a valid card, cancel the bonus |
| `passCounter(state, playerId)` | Pass; bonus activates for the original player |

**`playCounter`:** Card must pass normal pile validity. Handles all post-play checks (four-of-a-kind, 10, 2, draw, elimination, further draw bonus). Clears both `pendingCounter` and `drawBonus`.

**`passCounter`:** Clears `pendingCounter`. Moves `currentPlayerIndex` back to the bonus player. `drawBonus` remains set.

**AI counter strategy** (`aiHandleCounter`):
- Always tries to counter blind palace cards.
- For known cards: only counters with non-special cards of rank ≤ 9.
- Falls back to `pickupPile` if no valid counter cards.

> Four-of-a-kind bonuses (`waitingForBonus: 'four-of-a-kind'`) cannot be countered.

---

## 12. Elimination & Win Condition

### `checkWinner(state, playerId): boolean`

A player has won (become safe) when **all** of the following are true:
- `drawPile.length === 0`
- `player.hand.length === 0`
- All 3 palace slots have `faceUp === null` and `faceDown === null`

### `handleElimination(state, playerId): boolean`

- Calls `checkWinner`; no-ops if already eliminated.
- Appends player ID to `state.eliminated` (in finish order).
- If only 1 non-eliminated player remains, sets `state.loser` and `state.phase = 'finished'`. Returns `true`.
- Otherwise returns `false`.

### `advanceTurn(state): void`

- Increments `currentPlayerIndex` (wrapping).
- Skips eliminated players; auto-eliminates any player who now satisfies `checkWinner`.
- If only 1 player remains, finalises the game.

### Game-over condition

```
state.players.length - state.eliminated.length === 1
→ state.phase = 'finished', state.loser = remaining player id
```

Rankings are derived from `computeGameRankings(state)`:
`[...eliminated (in order), loser]` → index 0 = gold, last index = loser.

---

## 13. AI Behaviour

### Setup — `aiSetup(state, playerId): GameState`

1. **Face-down selection**: random 3 cards.
2. **Face-up selection**: the 3 highest-value cards, treating 10 as rank 16 and 2 as rank 15 (i.e. specials are preferred face-up).

### Play turn — `aiPlayTurn(state): GameState`

Called when `currentPlayerIndex` is an AI player.

**Decision logic:**

1. If source is `palace-facedown`, play the first available face-down card.
2. If no playable cards exist, pick up the pile.
3. Group all playable cards by rank.
4. Sort ranks ascending, treating 2 as 100 and 10 as 99 (specials saved for last).
5. Play **all** cards of the chosen rank (maximise potential four-of-a-kind).
6. Loop `while (waitingForBonus)`:
   - If no bonus cards available, pick up pile.
   - Otherwise play lowest-ranked bonus card(s).
7. If `drawBonus` is pending for this AI, play it (or skip if pile is empty or no matching hand cards).

### Counter decision — `aiHandleCounter(state): GameState`

See §11 counter strategy above.

### Steal check — `checkAISteal(state): GameState | null`

Runs automatically each tick; skips `player-0` (human).

---

## 14. Public API Reference

All exported functions return a **new `GameState`** (immutable updates via `deepClone`). Every mutation increments `state.version`.

### Initialization

| Function | Description |
|---|---|
| `initGame(names, dealerIdx?, decks?, emojis?)` | Create a new game |
| `resetGame(state, decks?)` | Rematch with same players |

### Setup

| Function | Description |
|---|---|
| `selectFaceDownCards(state, playerId, cardIds)` | Place 3 face-down palace cards |
| `selectFaceUpCards(state, playerId, cardIds)` | Place 3 face-up palace cards, receive hand |
| `aiSetup(state, playerId)` | Run both setup steps for an AI player |

### Play

| Function | Description |
|---|---|
| `playCards(state, playerId, cardIds)` | Main play action |
| `playBonusAction(state, playerId, cardIds)` | Resolve `waitingForBonus` |
| `playDrawBonus(state, playerId, cardIds)` | Resolve draw bonus |
| `skipDrawBonus(state, playerId)` | Waive draw bonus |
| `pickupPile(state, playerId)` | Pick up the pile |
| `stealTurn(state, stealingPlayerId, cardIds)` | Complete four-of-a-kind to steal |
| `playCounter(state, playerId, cardIds)` | Counter a pending draw bonus |
| `passCounter(state, playerId)` | Pass on counter opportunity |
| `nudgeCurrentPlayer(state)` | Nudge the current player |

### AI

| Function | Description |
|---|---|
| `aiPlayTurn(state)` | Execute one full AI turn |
| `aiHandleCounter(state)` | AI handles a pending counter |
| `checkAISteal(state)` | Check and execute AI steal if possible |

### Query helpers

| Function | Description |
|---|---|
| `getPlayableCards(state, playerId)` | Cards the player can legally play on their turn |
| `getBonusPlayableCards(state, playerId)` | Cards playable during a bonus action |
| `getCounterPlayableCards(state, playerId)` | Cards playable as a counter |
| `canStealTurn(state, playerId)` | Whether player can steal; returns cards needed |
| `getPlayerSource(player, drawPileEmpty)` | Where a player should be playing from |
| `getTopCard(pile)` | Top card of any pile |
| `canPlayCardOnPile(card, topCard)` | Pile validity check |
| `computeGameRankings(state)` | Ordered player IDs by finish position |

### Display helpers

| Function | Description |
|---|---|
| `getRankDisplay(rank)` | `14 → 'A'`, `13 → 'K'`, etc. |
| `getSuitSymbol(suit)` | `'hearts' → '♥'`, etc. |
| `getSuitColor(suit)` | `'red'` or `'black'` |
| `cardDisplay(card)` | `'A♥'`, `'10♠'`, etc. |

### Other mutations

| Function | Description |
|---|---|
| `setPlayerEmoji(state, playerId, emoji)` | Update a player's emoji avatar |
| `setPlayerStats(state, playerId, stats)` | Attach stats to a player |
| `revealFaceDownCards(state, playerId)` | Post-game reveal of face-down palace cards |
| `requestNewGame(state, playerId)` | Add player to rematch request list |

### Deck utilities

| Function | Description |
|---|---|
| `createDeck(deckIndex?)` | One 52-card deck |
| `shuffle(arr)` | Fisher-Yates shuffle (returns new array) |
| `deepClone(obj)` | JSON-based deep clone (exported) |

### Constants

| Constant | Value |
|---|---|
| `MAX_DECKS` | `3` |
| `MAX_PLAYERS_PER_DECK` | `5` |

---

## 15. State Mutation Rules

1. **Never mutate state directly.** Every exported function calls `deepClone(state)` at the top.
2. **Always increment `version`** at the end of every function that modifies state. The Supabase backend uses this for optimistic concurrency; an outdated version returns a `409`.
3. **Game rules live exclusively in `game-engine.ts`.** Do not replicate or re-implement any logic in UI components or page files.
4. **`deepClone` is JSON-based** — state must remain JSON-serialisable at all times. No `Date` objects, `undefined` values, functions, or circular references.
5. **`log` is append-only** — never splice or modify existing log entries.
6. **`discardPile` is permanent** — wiped cards never re-enter the game.
7. **`eliminated` preserves finish order** — always append, never sort or reorder.
