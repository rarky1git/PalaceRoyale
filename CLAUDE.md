# PalaceRoyale — Game-Engine Mechanics Reference

This document describes the Palace card game rules as implemented in
`src/app/game-engine.ts`. It is the authoritative reference for developers
working on game logic, AI behaviour, or the multiplayer state machine.

---

## Table of Contents

1. [Core Data Model](#1-core-data-model)
2. [Game Phases](#2-game-phases)
3. [Card Play Rules](#3-card-play-rules)
4. [Special Cards](#4-special-cards)
5. [Draw Bonus Mechanism](#5-draw-bonus-mechanism)
6. [Steal / Counter Mechanics](#6-steal--counter-mechanics)
7. [Pile Pickup](#7-pile-pickup)
8. [Elimination & Winning](#8-elimination--winning)
9. [Robot (AI) Player Mechanics](#9-robot-ai-player-mechanics)
10. [State Immutability & Versioning](#10-state-immutability--versioning)
11. [Deck Scaling](#11-deck-scaling)
12. [Key Functions Quick-Reference](#12-key-functions-quick-reference)

---

## 1. Core Data Model

### Card

```ts
interface Card {
  id: string;       // unique: "{deckIndex}-{rank}-{suit}"
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: number;     // 2–14 (Jack=11, Queen=12, King=13, Ace=14)
}
```

### PalaceSlot

Each player has exactly **3 palace slots**. Every slot holds one face-down
card and one face-up card, placed during setup.

```ts
interface PalaceSlot {
  faceDown: Card | null;
  faceUp:   Card | null;
}
```

### Player

```ts
interface Player {
  id: string;              // "player-0" .. "player-N"
  name: string;
  emoji?: string;          // avatar chosen by the player
  hand: Card[];
  palace: PalaceSlot[];    // length 3
  setupPhase: 'select-facedown' | 'select-faceup' | 'done';
  setupCards: Card[];      // 9 cards dealt; cleared after setup completes
  stats?: PlayerStats;     // persisted win/loss counters
}
```

### GameState (top-level snapshot)

```ts
interface GameState {
  version: number;         // monotonically incremented on every mutation
  phase: 'waiting' | 'setup' | 'playing' | 'finished';
  players: Player[];
  drawPile: Card[];
  pickupPile: Card[];      // active pile that gets played onto
  discardPile: Card[];     // wiped cards go here permanently
  currentPlayerIndex: number;
  dealerIndex: number;
  log: string[];
  waitingForBonus: { type: '2' | '10' | 'four-of-a-kind' } | null;
  winner: string | null;
  eliminated: string[];    // player IDs that escaped safely
  loser: string | null;    // last active player = loser
  lastAction?: { ... };    // drives UI animations
  drawBonus?: { playerId: string } | null;
  pendingCounter?: { type: 'drawBonus'; bonusPlayerId: string } | null;
  nudgeCount?: number;
  newGameRequested?: string[];
}
```

---

## 2. Game Phases

### Phase progression

```
waiting  →  setup  →  playing  →  finished
```

`initGame()` (line 115) starts the game in `setup` and deals 9 cards to each
player.

### Setup sub-phases (per player)

Each player passes through three sub-phases in `player.setupPhase`:

| Sub-phase | Action | Function |
|---|---|---|
| `select-facedown` | Choose 3 of 9 cards to place face-down | `selectFaceDownCards()` |
| `select-faceup` | Choose 3 of remaining 6 to place face-up | `selectFaceUpCards()` |
| `done` | Remaining 3 cards become starting hand | — |

The game transitions from `setup` → `playing` once **every** player's
`setupPhase === 'done'`.

---

## 3. Card Play Rules

### Rank order

Cards rank from low to high: **2 3 4 5 6 7 8 9 10 J Q K A** (2=2, Ace=14).
Suits are irrelevant to play order.

### Basic rule: equal or higher

A card can be played on the pickup pile if its rank is **≥** the top card's
rank. Special exceptions are listed in §4.

Validation function: `canPlayCardOnPile(card, topCard)` — `game-engine.ts:258`

```
canPlayCardOnPile rules (in priority order):
  empty pile          → anything playable
  card.rank === 2     → always playable (§4.1)
  card.rank === 10    → always playable (§4.2)
  topCard.rank === 7  → card must be ≤ 7 (§4.3 reversal)
  topCard.rank === 2  → any card playable (2 is always lowest)
  default             → card.rank >= topCard.rank
```

### Playing multiple cards

A player may play **any number of cards of the same rank** in a single turn.
All cards in a multi-play must share the same rank (`playCards()` line 574
validates this). Playing multiples of a rank counts as one action, and the
rank's special ability fires once (e.g. two 10s = one wipeout + bonus turn).

### Card source progression

A player always plays from the **lowest available source** in this order:

| Priority | Source | Condition |
|---|---|---|
| 1 | Hand | `player.hand.length > 0` |
| 2 | Hand (still) | Draw pile not empty — player should draw first |
| 3 | Face-up palace | Hand empty AND draw pile empty |
| 4 | Face-down palace | All face-up cards gone |

Function: `getPlayerSource(player, drawPileEmpty)` — line 278

Face-down palace cards are played **blind** — the player does not know what
they hold. If the revealed card is not playable, the player picks up the
entire pile (see §7).

### Drawing after play

After playing from hand, `drawCards()` (line 446) refills the player's hand
to 3 cards from the draw pile. Drawing stops when the draw pile is empty.
Refilling happens **before** any win check or bonus trigger.

---

## 4. Special Cards

### 4.1 — 2 (Bonus Play)

- **Playable on anything**, including a 7-reversed pile.
- After playing, the pile is **not** cleared. The pile top is now a 2 (rank 2
  is treated as the lowest rank, so any card can follow).
- Grants the player an **immediate bonus turn** (`waitingForBonus = { type: '2' }`).
  The player may play any card equal to or higher than a 2 (i.e. any card)
  onto the still-active pile.
- **Cannot be used to win**: if the player has no other cards left after
  playing the 2, they pick up the pile instead of getting a bonus turn
  (line 639–648).
- `lastAction.type = 'sparkle'` — triggers sparkle particle animation.

### 4.2 — 10 (Wipeout / Slam)

- **Playable on anything**.
- Immediately moves all cards from the pickup pile to the **discard pile**
  (permanently removed from play).
- Grants an **immediate bonus turn** (`waitingForBonus = { type: '10' }`).
  The pile is now empty, so any card is valid for the bonus play.
- `lastAction.type = 'slam'` — triggers slam particle animation.

Implementation: lines 610–628.

### 4.3 — 7 (Reversal)

- When a 7 is the top card, the **next player** must play a card with rank
  **≤ 7**.
- 2 and 10 are still always playable (§4.1, §4.2 override the reversal).
- Reversal applies only to the immediate next play; once a card ≤ 7 lands
  on the 7 and the turn advances normally, the restriction lifts.
- No bonus turn; no pile wipe.

Implementation: `canPlayCardOnPile()` lines 262–265.

### 4.4 — Four of a Kind (Auto-Wipeout)

- When **4 cards of the same rank** sit on top of the pickup pile (played
  across one or more turns), the pile is automatically wiped.
- The player who **completed** the four-of-a-kind gets a bonus turn
  (`waitingForBonus = { type: 'four-of-a-kind' }`). The pile is empty so any
  card is valid.
- Four-of-a-kind can be completed by:
  - The current player playing the 4th card themselves.
  - Any other player **stealing** the turn (see §6).
- No `pendingCounter` is set — the bonus player acts immediately with no
  counter opportunity.

Implementation: `checkFourOfAKind()` line 333, `setFourOfAKindBonus()` line 389.

---

## 5. Draw Bonus Mechanism

After a **normal** card play (not a 2, 10, or four-of-a-kind), if the
playing player's hand contains cards matching the **rank of the pile's new
top card**, a simultaneous opportunity opens:

- The **playing player** (`drawBonus.playerId`) may immediately play the
  matching cards onto the pile.
- The **next player** (`pendingCounter`) may instead play a valid card to
  block the bonus and take their turn normally.

Both windows are open concurrently. Whichever player acts first resolves the
situation.

```
trySetDrawBonus() sets:
  s.drawBonus    = { playerId }          // bonus player
  s.pendingCounter = { type: 'drawBonus', bonusPlayerId }
  s.currentPlayerIndex = nextIdx         // counter player's turn
```

Function: `trySetDrawBonus()` — line 399

| Function | Who calls it | What it does |
|---|---|---|
| `playDrawBonus(state, playerId, cardIds)` | Bonus player | Plays matching cards; wipes pile on four-of-a-kind |
| `skipDrawBonus(state, playerId)` | Bonus player | Waives the bonus; turn passes normally |
| `playCounter(state, playerId, cardIds)` | Counter player | Plays a valid card; cancels the draw bonus |
| `passCounter(state, playerId)` | Counter player | Passes; draw bonus player can still act |

Lines 838–1182.

---

## 6. Steal / Counter Mechanics

### Steal (four-of-a-kind completion)

Any player (not the current player) who holds cards matching the rank of the
**top 1–3 consecutive cards** on the pile may play enough cards to complete a
four-of-a-kind.

Conditions checked by `canStealTurn(state, playerId)` (line 352):
1. Pickup pile is not empty.
2. The top-N cards all share the same rank (N = 1, 2, or 3).
3. `4 - N` cards of that rank are available from the stealing player's hand
   **or** face-up palace (face-down palace cannot be used for steals — cards
   are unknown).
4. The player is not the current player.

If valid, returns the exact cards needed; otherwise returns `null`.

On a successful steal (`stealTurn()`, line 971):
- The stealing player's cards are added to the pile.
- Four-of-a-kind wipe fires.
- The stealing player gets the bonus turn.
- `lastAction.type = 'wipeout'`.

### Counter (draw bonus block)

When `pendingCounter` is set, the next player may play any card that is valid
on the current pile top (`getCounterPlayableCards()`). This cancels the draw
bonus and the counter player's play counts as their normal turn.

If the counter player passes (`passCounter()`), the draw bonus player can
still act; then the turn advances to the counter player normally.

---

## 7. Pile Pickup

A player picks up the entire pickup pile when:

1. They have **no playable cards** in their current source.
2. They flip a **blind face-down palace card** that cannot be played
   (`lastAction.type = 'palace-invalid'`).
3. A bonus action has no valid cards to play (AI only — human gets the choice).
4. An AI counter player decides not to counter (see §9 AI counter strategy).

Function: `pickupPile(state, playerId)` — line 817

Pickup resets all bonus state:
- `waitingForBonus = null`
- `drawBonus = null`
- `pendingCounter = null`

All pile cards are appended to the player's hand. Turn then advances.

---

## 8. Elimination & Winning

### Win condition (per player)

A player is **eliminated** (safely out) when all of the following are empty:
- `player.hand`
- `state.drawPile` (nothing left to draw)
- `player.palace` (all 6 palace cards played or discarded)

Function: `checkWinner(state, playerId)` — line 453

`handleElimination()` (line 462) adds the player to `state.eliminated` and
logs their escape. It returns `true` if the game is now over.

### Game-over condition

The game ends when **≤ 1 non-eliminated player** remains. That player is
`state.loser` (the "Palace Player") and the game transitions to `finished`.

`advanceTurn()` (line 483) also checks this condition when cycling past
eliminated players, so the game can end mid-turn-advancement.

### Rankings (`PlayerStats`)

Finishing positions are recorded as:

| Field | Meaning |
|---|---|
| `gold` | 1st to escape |
| `silver` | 2nd to escape |
| `bronze` | 3rd to escape |
| `losses` | Last player remaining |
| `gamesPlayed` | Total games participated in |

Stats are persisted to browser `localStorage` under `palace-stats`.

### Rematch

`resetGame(state, numberOfDecks)` (line 1439) creates a fresh game with the
same players. The **loser of the previous game deals** (becomes
`dealerIndex`). Player stats and emoji carry forward.

---

## 9. Robot (AI) Player Mechanics

All AI logic lives in `src/app/game-engine.ts` lines 1203–1420.
AI players have IDs `player-1`, `player-2`, … (never `player-0`, which is
always the human in single-player mode).

The AI is driven from `GameBoard.tsx` via a `useEffect` that fires every
**1 200 ms** when it is an AI player's turn.

### 9.1 Setup — `aiSetup(state, playerId)` (line 1252)

| Step | Strategy |
|---|---|
| **Face-down selection** | Picks 3 cards at **random** from the 9 dealt cards |
| **Face-up selection** | Sorts remaining 6 cards and picks the **3 highest** |

Face-up priority values used in the sort:

| Card | Priority value |
|---|---|
| 10 | 16 (highest priority) |
| 2 | 15 |
| Ace (14) | 14 |
| King (13) | 13 |
| … | face value |

The AI deliberately places 10s and 2s face-up so they are visible and
playable before the blind face-down cards are needed.

### 9.2 Normal Turn — `aiPlayTurn(state)` (line 1277)

The AI follows this decision tree on each turn:

```
1. Source is palace-facedown?
      → Play the first available face-down card (blind).
      → If that card is invalid (playCards throws), PICK UP pile.

2. Get all playable cards (getPlayableCards).

3. No playable cards?
      → PICK UP pile.

4. Group playable cards by rank.
   Sort ranks: lowest first, EXCEPT save 2 (value 100) and 10 (value 99).

5. Play ALL cards of the chosen (lowest) rank.
   (Playing multiples of a rank in one action — always plays the full set.)

6. Handle chained bonus turns (waitingForBonus loop):
      a. Get bonus-playable cards (getBonusPlayableCards).
      b. No bonus cards? Pick up pile, advance turn, return.
      c. Apply same rank-priority sort (save 2 and 10).
      d. Play all cards of lowest bonus rank.
      e. Repeat until waitingForBonus is null.

7. Handle draw bonus (drawBonus set for this player):
      a. If pile is non-empty, check for matching hand cards.
      b. Matching cards found? Play them via playDrawBonus().
      c. No match? Skip via skipDrawBonus().
```

**Key insight — special card hoarding**: By assigning 2 → 100 and 10 → 99 in
the sort comparator, the AI treats those cards as last resort. It will exhaust
all other cards before using a 2 or 10. This creates more interesting
mid-game play rather than immediately nuking the pile.

### 9.3 Counter Decision — `aiHandleCounter(state)` (line 1203)

Called when `state.pendingCounter` is set and the current player is an AI.

```
1. Get counter-playable cards.

2. No counter cards?
      → PICK UP pile.

3. Source is palace-facedown?
      → Always try to counter (blind — no information to lose).

4. Sort available cards by rank (same 2→100, 10→99 weighting).
   Identify lowestRank.

5. shouldCounter = lowestRank is NOT 2 AND NOT 10 AND lowestRank <= 9

6. shouldCounter is true?
      → Counter by playing all cards of that rank.
   shouldCounter is false?
      → PICK UP pile (forfeit counter opportunity).
```

**Rationale**: The AI will only counter with cheap non-special cards (3–9).
It refuses to spend a special card (2 or 10) or a high-value face card just
to block the bonus. When no cheap option exists, it prefers to pick up rather
than waste premium cards.

### 9.4 Steal Detection — `checkAISteal(state)` (line 1403)

After every state change, `GameBoard.tsx` calls `checkAISteal()` to see if
any AI player can complete a four-of-a-kind from the side.

```
For each non-current player:
  Skip if player.id starts with 'player-0'  // never auto-steal for human
  canStealTurn(state, player.id)  // returns cards needed or null
  If cards available → stealTurn(state, player.id, cards)  // execute steal
  Return updated state
Return null if no steal possible
```

Multiple AI players could theoretically qualify simultaneously; the function
processes them in array order and returns after the **first** successful
steal.

### 9.5 AI Limitations (by design)

| Limitation | Notes |
|---|---|
| No hand tracking | AI has no memory of opponents' cards |
| No future planning | Each decision is greedy / immediate |
| No bluffing | AI always plays if it legally can |
| No pass option | AI never voluntarily skips a playable card to draw |
| Steals are automatic | Human player never auto-steals; human must act manually |

---

## 10. State Immutability & Versioning

Every exported action function (`playCards`, `pickupPile`, `playBonusAction`,
etc.) starts with `const s = deepClone(state)` — a full JSON-serialise +
deserialise copy. The original state is **never mutated**.

`state.version` is incremented exactly once at the end of every action
function (before `return s`). This integer is the optimistic concurrency key
used by the multiplayer server: a `PUT /games/:code` request that carries a
stale version receives a `409 Conflict` and the client must re-fetch before
retrying.

---

## 11. Deck Scaling

```ts
export const MAX_DECKS           = 3;
export const MAX_PLAYERS_PER_DECK = 5;
```

| Decks | Max players | Total cards |
|---|---|---|
| 1 | 5 | 52 |
| 2 | 10 | 104 |
| 3 | 15 | 156 |

`initGame()` accepts `numberOfDecks` (1–3) and creates that many standard
52-card decks. Each card has a unique `id` prefixed with its deck index
(`"0-..."`, `"1-..."`, `"2-..."`), preventing ID collisions when multiple
decks are in play.

---

## 12. Key Functions Quick-Reference

| Function | File location | Purpose |
|---|---|---|
| `initGame(names, dealerIdx, decks, emojis)` | line 115 | Create fresh game state |
| `selectFaceDownCards(state, playerId, cardIds)` | — | Setup phase step 1 |
| `selectFaceUpCards(state, playerId, cardIds)` | — | Setup phase step 2 |
| `canPlayCardOnPile(card, topCard)` | line 258 | Validate a single card against pile top |
| `getPlayerSource(player, drawPileEmpty)` | line 278 | Which card source is active |
| `getPlayableCards(state, playerId)` | line 287 | All legal cards for a player |
| `getBonusPlayableCards(state, playerId)` | line 308 | Cards valid during bonus turn |
| `canStealTurn(state, playerId)` | line 352 | Check steal eligibility; returns cards |
| `playCards(state, playerId, cardIds)` | line 514 | Main play action |
| `playBonusAction(state, playerId, cardIds)` | line 678 | Play during bonus turn (2/10/4oak) |
| `pickupPile(state, playerId)` | line 817 | Pick up entire pickup pile |
| `playDrawBonus(state, playerId, cardIds)` | line 838 | Play matching cards as draw bonus |
| `skipDrawBonus(state, playerId)` | — | Waive draw bonus |
| `playCounter(state, playerId, cardIds)` | line 1017 | Block draw bonus with a counter play |
| `passCounter(state, playerId)` | line 1161 | Pass counter opportunity |
| `stealTurn(state, playerId, cardIds)` | line 971 | Execute a four-of-a-kind steal |
| `trySetDrawBonus(state, playerId)` | line 399 | Set draw bonus after a normal play |
| `checkWinner(state, playerId)` | line 453 | True if player has cleared all cards |
| `handleElimination(state, playerId)` | line 462 | Mark player out; check game-over |
| `advanceTurn(state)` | line 483 | Move to next non-eliminated player |
| `resetGame(state, numberOfDecks)` | line 1439 | Rematch with same players |
| `aiSetup(state, playerId)` | line 1252 | AI palace selection |
| `aiPlayTurn(state)` | line 1277 | AI normal turn decision |
| `aiHandleCounter(state)` | line 1203 | AI counter decision |
| `checkAISteal(state)` | line 1403 | Check / execute AI steals |
