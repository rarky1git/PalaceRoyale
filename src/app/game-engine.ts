// Palace Card Game Engine

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface Card {
  id: string;
  suit: Suit;
  rank: number; // 2-14 (14=Ace)
}

export interface PalaceSlot {
  faceDown: Card | null;
  faceUp: Card | null;
}

export interface PlayerStats {
  gold: number;       // 1st place finishes
  silver: number;     // 2nd place finishes
  bronze: number;     // 3rd place finishes
  losses: number;     // last place finishes
  gamesPlayed: number;
}

export interface Player {
  id: string;
  name: string;
  emoji?: string; // Player's chosen emoji avatar
  hand: Card[];
  palace: PalaceSlot[];
  setupPhase: 'select-facedown' | 'select-faceup' | 'done';
  setupCards: Card[]; // 9 cards dealt during setup
  stats?: PlayerStats; // Cumulative rankings for this player (persisted via device)
}

export interface GameState {
  version: number;
  phase: 'waiting' | 'setup' | 'playing' | 'finished';
  players: Player[];
  drawPile: Card[];
  pickupPile: Card[];
  discardPile: Card[];
  currentPlayerIndex: number;
  dealerIndex: number;
  log: string[];
  waitingForBonus: { type: '2' | '10' | 'four-of-a-kind' } | null;
  winner: string | null;
  eliminated: string[]; // players who cleared all cards (safe)
  loser: string | null; // last player standing = loser
  lastAction?: { type: 'play' | 'pickup' | 'wipeout' | 'draw' | 'slam' | 'sparkle' | 'nudge' | 'palace-invalid'; cards?: Card[]; playerId?: string } | null;
  drawBonus?: { playerId: string } | null; // After playing from hand and drawing, can play cards matching pile top rank
  pendingCounter?: {
    type: 'drawBonus';
    bonusPlayerId: string;
  } | null; // Next player can counter a draw bonus by playing a valid card
  nudgeCount?: number; // Incremented when a non-current player nudges the current player
}

// ---- Helpers ----

export function getRankDisplay(rank: number): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

export function getSuitSymbol(suit: Suit): string {
  const map: Record<Suit, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  return map[suit];
}

export function getSuitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function cardDisplay(card: Card): string {
  return `${getRankDisplay(card.rank)}${getSuitSymbol(card.suit)}`;
}

export function cardValue(rank: number): number {
  // For comparison: 3=3, 4=4, ..., K=13, A=14
  // 2 and 10 are special (always playable) handled separately
  return rank;
}

// ---- Deck ----

export const MAX_DECKS = 3;
export const MAX_PLAYERS_PER_DECK = 5;

// ---- Bot Profiles ----

export interface BotProfile {
  name: string;
  emoji: string;
  thinkDelayMin: number;   // ms — minimum thinking time before acting
  thinkDelayMax: number;   // ms — maximum thinking time before acting
  counterChance: number;   // 0–1: probability of attempting a counter
  saveSpecials: boolean;   // if true, hoard 2s and 10s for later; if false, use freely
  preferHighCards: boolean; // if true, play highest valid cards first
  riskTolerance: number;   // 0–1: willingness to gamble (e.g. Henry's chaos)
}

export const BOT_PROFILES: BotProfile[] = [
  { name: 'Arthur',  emoji: '⚔️',  thinkDelayMin: 800,  thinkDelayMax: 1800, counterChance: 0.5, saveSpecials: true,  preferHighCards: false, riskTolerance: 0.5 },
  { name: 'James',   emoji: '🏇',  thinkDelayMin: 500,  thinkDelayMax: 1200, counterChance: 0.7, saveSpecials: false, preferHighCards: true,  riskTolerance: 0.8 },
  { name: 'Francis', emoji: '🧙',  thinkDelayMin: 1200, thinkDelayMax: 2500, counterChance: 0.3, saveSpecials: true,  preferHighCards: false, riskTolerance: 0.2 },
  { name: 'Edward',  emoji: '🛡️',  thinkDelayMin: 900,  thinkDelayMax: 1600, counterChance: 0.9, saveSpecials: true,  preferHighCards: false, riskTolerance: 0.4 },
  { name: 'Henry',   emoji: '🎲',  thinkDelayMin: 600,  thinkDelayMax: 2000, counterChance: 0.5, saveSpecials: false, preferHighCards: false, riskTolerance: 0.9 },
  { name: 'Richard', emoji: '🦌',  thinkDelayMin: 1500, thinkDelayMax: 3000, counterChance: 0.4, saveSpecials: true,  preferHighCards: false, riskTolerance: 0.2 },
  { name: 'William', emoji: '🗡️',  thinkDelayMin: 700,  thinkDelayMax: 1400, counterChance: 0.6, saveSpecials: false, preferHighCards: false, riskTolerance: 0.7 },
  { name: 'Thomas',  emoji: '🧭',  thinkDelayMin: 2000, thinkDelayMax: 4000, counterChance: 0.4, saveSpecials: true,  preferHighCards: false, riskTolerance: 0.3 },
];

export function getBotProfile(name: string): BotProfile | undefined {
  return BOT_PROFILES.find(p => p.name === name);
}

export function getRandomBotDelay(profile: BotProfile): number {
  return Math.floor(profile.thinkDelayMin + Math.random() * (profile.thinkDelayMax - profile.thinkDelayMin));
}

export function createDeck(deckIndex: number = 0): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const cards: Card[] = [];
  for (const suit of suits) {
    for (let rank = 2; rank <= 14; rank++) {
      cards.push({ id: `${deckIndex}-${rank}-${suit}`, suit, rank });
    }
  }
  return cards;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Game Init ----

export function initGame(playerNames: string[], dealerIndex: number = 0, numberOfDecks: number = 1, playerEmojis?: string[]): GameState {
  const clampedDecks = Math.max(1, Math.min(MAX_DECKS, numberOfDecks));
  const combined: Card[] = [];
  for (let d = 0; d < clampedDecks; d++) {
    combined.push(...createDeck(d));
  }
  const deck = shuffle(combined);
  const players: Player[] = playerNames.map((name, i) => ({
    id: `player-${i}`,
    name,
    emoji: playerEmojis?.[i],
    hand: [],
    palace: [
      { faceDown: null, faceUp: null },
      { faceDown: null, faceUp: null },
      { faceDown: null, faceUp: null },
    ],
    setupPhase: 'select-facedown' as const,
    setupCards: deck.splice(0, 9),
  }));

  return {
    version: 0,
    phase: 'setup',
    players,
    drawPile: deck,
    pickupPile: [],
    discardPile: [],
    currentPlayerIndex: (dealerIndex + 1) % playerNames.length,
    dealerIndex,
    log: ['Game started! Each player must set up their palace.'],
    waitingForBonus: null,
    winner: null,
    eliminated: [],
    loser: null,
    lastAction: null,
    drawBonus: null,
    pendingCounter: null,
    nudgeCount: 0,
  };
}

// ---- Emoji / Nudge ----

export function setPlayerEmoji(state: GameState, playerId: string, emoji: string): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId);
  if (!player) return state;
  player.emoji = emoji;
  s.version++;
  return s;
}

export function setPlayerStats(state: GameState, playerId: string, stats: PlayerStats): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId);
  if (!player) return state;
  player.stats = stats;
  s.version++;
  return s;
}

// Returns player IDs ordered by finish position (index 0 = 1st to finish/gold, last index = loser).
// state.eliminated is populated in finish order by handleElimination, so this preserves that order.
export function computeGameRankings(state: GameState): string[] {
  const ranked = [...(state.eliminated || [])];
  if (state.loser) ranked.push(state.loser);
  return ranked;
}

export function nudgeCurrentPlayer(state: GameState): GameState {
  const s = deepClone(state);
  s.nudgeCount = (s.nudgeCount ?? 0) + 1;
  s.lastAction = { type: 'nudge' };
  s.version++;
  return s;
}

// ---- Setup ----

export function selectFaceDownCards(state: GameState, playerId: string, cardIds: string[]): GameState {
  if (cardIds.length !== 3) throw new Error('Must select exactly 3 cards');
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;
  if (player.setupPhase !== 'select-facedown') throw new Error('Wrong setup phase');

  const selected = cardIds.map(id => {
    const card = player.setupCards.find(c => c.id === id);
    if (!card) throw new Error('Card not found in setup cards');
    return card;
  });

  // Place face down in palace slots
  for (let i = 0; i < 3; i++) {
    player.palace[i].faceDown = selected[i];
  }

  // Remove selected from setup cards
  player.setupCards = player.setupCards.filter(c => !cardIds.includes(c.id));
  player.setupPhase = 'select-faceup';
  s.log.push(`${player.name} placed 3 cards face down in their palace.`);
  s.version++;
  return s;
}

export function selectFaceUpCards(state: GameState, playerId: string, cardIds: string[]): GameState {
  if (cardIds.length !== 3) throw new Error('Must select exactly 3 cards');
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;
  if (player.setupPhase !== 'select-faceup') throw new Error('Wrong setup phase');

  const selected = cardIds.map(id => {
    const card = player.setupCards.find(c => c.id === id);
    if (!card) throw new Error('Card not found');
    return card;
  });

  for (let i = 0; i < 3; i++) {
    player.palace[i].faceUp = selected[i];
  }

  // Remaining 3 go to hand
  player.hand = player.setupCards.filter(c => !cardIds.includes(c.id));
  player.setupCards = [];
  player.setupPhase = 'done';
  s.log.push(`${player.name} completed palace setup.`);

  // Check if all players done
  if (s.players.every(p => p.setupPhase === 'done')) {
    s.phase = 'playing';
    // Auto-pull first card from draw pile
    const firstCard = s.drawPile.shift()!;
    s.pickupPile.push(firstCard);
    s.log.push(`All players ready! First card drawn: ${cardDisplay(firstCard)}`);
    s.log.push(`${s.players[s.currentPlayerIndex].name}'s turn.`);
  }

  s.version++;
  return s;
}

// ---- Play Validation ----

export function canPlayCardOnPile(card: Card, topCard: Card | null): boolean {
  if (!topCard) return true; // Empty pile, anything goes
  if (card.rank === 2) return true; // 2 always playable
  if (card.rank === 10) return true; // 10 always playable
  if (topCard.rank === 7) {
    // Must play equal or lower
    return cardValue(card.rank) <= 7;
  }
  if (topCard.rank === 2) {
    // 2 on top: any card works (2 is lowest)
    return true;
  }
  return cardValue(card.rank) >= cardValue(topCard.rank);
}

export function getTopCard(pile: Card[]): Card | null {
  return pile.length > 0 ? pile[pile.length - 1] : null;
}

// Get what source a player should play from
export function getPlayerSource(player: Player, drawPileEmpty: boolean): 'hand' | 'palace-faceup' | 'palace-facedown' | 'none' {
  if (player.hand.length > 0) return 'hand';
  if (!drawPileEmpty) return 'hand'; // Should have drawn
  // Hand is empty and draw pile is empty
  if (player.palace.some(s => s.faceUp !== null)) return 'palace-faceup';
  if (player.palace.some(s => s.faceDown !== null)) return 'palace-facedown';
  return 'none';
}

export function getPlayableCards(state: GameState, playerId: string): Card[] {
  const player = state.players.find(p => p.id === playerId)!;
  const topCard = getTopCard(state.pickupPile);
  const source = getPlayerSource(player, state.drawPile.length === 0);

  if (source === 'hand') {
    return player.hand.filter(c => canPlayCardOnPile(c, topCard));
  }
  if (source === 'palace-faceup') {
    return player.palace
      .filter(s => s.faceUp !== null)
      .map(s => s.faceUp!)
      .filter(c => canPlayCardOnPile(c, topCard));
  }
  // palace-facedown: can't know, so all are "playable" (blind)
  if (source === 'palace-facedown') {
    return player.palace.filter(s => s.faceDown !== null).map(s => s.faceDown!);
  }
  return [];
}

export function getBonusPlayableCards(state: GameState, playerId: string): Card[] {
  const player = state.players.find(p => p.id === playerId)!;
  const source = getPlayerSource(player, state.drawPile.length === 0);

  if (state.waitingForBonus?.type === '10' || state.waitingForBonus?.type === 'four-of-a-kind') {
    // Start a new pile - any card works
    if (source === 'hand') return [...player.hand];
    if (source === 'palace-faceup') return player.palace.filter(s => s.faceUp).map(s => s.faceUp!);
    if (source === 'palace-facedown') return player.palace.filter(s => s.faceDown).map(s => s.faceDown!);
    return [];
  }

  if (state.waitingForBonus?.type === '2') {
    // Play any card (equal or higher to 2 = everything)
    const topCard = getTopCard(state.pickupPile);
    if (source === 'hand') return player.hand.filter(c => canPlayCardOnPile(c, topCard));
    if (source === 'palace-faceup') return player.palace.filter(s => s.faceUp).map(s => s.faceUp!).filter(c => canPlayCardOnPile(c, topCard));
    if (source === 'palace-facedown') return player.palace.filter(s => s.faceDown).map(s => s.faceDown!);
    return [];
  }

  return [];
}

// Check if top of pickup pile has four of a kind
function checkFourOfAKind(pile: Card[]): boolean {
  if (pile.length < 4) return false;
  const top4 = pile.slice(-4);
  return top4.every(c => c.rank === top4[0].rank);
}

// Count consecutive same-rank cards from top of pile
function countTopSameRank(pile: Card[]): { rank: number; count: number } {
  if (pile.length === 0) return { rank: 0, count: 0 };
  const topRank = pile[pile.length - 1].rank;
  let count = 0;
  for (let i = pile.length - 1; i >= 0; i--) {
    if (pile[i].rank === topRank) count++;
    else break;
  }
  return { rank: topRank, count };
}

// Check if a player can steal (complete four of a kind)
export function canStealTurn(state: GameState, playerId: string): Card[] | null {
  if (state.pickupPile.length === 0) return null;
  const { rank, count } = countTopSameRank(state.pickupPile);
  if (count >= 4) return null; // Already four of a kind
  const needed = 4 - count;
  const player = state.players.find(p => p.id === playerId)!;
  const source = getPlayerSource(player, state.drawPile.length === 0);

  let availableCards: Card[] = [];
  if (source === 'hand') {
    availableCards = player.hand.filter(c => c.rank === rank);
  } else if (source === 'palace-faceup') {
    availableCards = player.palace.filter(s => s.faceUp?.rank === rank).map(s => s.faceUp!);
  }
  // Can't steal with palace face-down (don't know what they are)

  if (availableCards.length >= needed) {
    return availableCards.slice(0, needed);
  }
  return null;
}

// ---- Actions ----

// Get next active (non-eliminated) player index
function getNextActivePlayerIndex(state: GameState, fromIndex: number): number {
  let idx = (fromIndex + 1) % state.players.length;
  let safety = 0;
  while (safety < state.players.length) {
    if (!state.eliminated.includes(state.players[idx].id)) return idx;
    idx = (idx + 1) % state.players.length;
    safety++;
  }
  return fromIndex;
}

// Set four-of-a-kind bonus — no counter allowed, bonus player acts immediately
function setFourOfAKindBonus(s: GameState, playerId: string): void {
  const playerIdx = s.players.findIndex(p => p.id === playerId);
  const bonusPlayer = s.players[playerIdx];
  s.waitingForBonus = { type: 'four-of-a-kind' };
  s.currentPlayerIndex = playerIdx;
  s.log.push(`${bonusPlayer.name} gets bonus turn. No counter allowed.`);
}

// If the current player's hand has a card matching the pile top rank, set drawBonus and return true.
// This is the "top card bonus": before the turn passes, the player may play a matching card.
function trySetDrawBonus(s: GameState, playerId: string): boolean {
  if (s.pickupPile.length === 0) return false;
  const player = s.players.find(p => p.id === playerId)!;
  if (player.hand.length === 0) return false;
  const pileTopRank = getTopCard(s.pickupPile)!.rank;
  const matchingCards = player.hand.filter(c => c.rank === pileTopRank) || player.palace.filter(s => s.faceUp?.rank === pileTopRank);
  if (matchingCards.length > 0) {
    const playerIdx = s.players.findIndex(p => p.id === playerId);
    const nextIdx = getNextActivePlayerIndex(s, playerIdx);
    if (nextIdx !== playerIdx) {
      // Both players can act simultaneously:
      // - next player may counter by playing a valid card
      // - bonus player may use their drawBonus at the same time
      s.pendingCounter = { type: 'drawBonus', bonusPlayerId: playerId };
      s.drawBonus = { playerId };
      s.currentPlayerIndex = nextIdx;
      const counterPlayer = s.players[nextIdx];
      s.log.push(`Bonus! ${player.name} has ${getRankDisplay(pileTopRank)}s matching the pile. ${counterPlayer.name} may counter — or ${player.name} may play the bonus now.`);
    } else {
      // Only one player left, give bonus directly
      s.drawBonus = { playerId };
      s.log.push(`Bonus! ${player.name} has ${getRankDisplay(pileTopRank)}s matching the pile — play or skip.`);
    }
    return true;
  }
  return false;
}

function removeCardsFromPlayer(player: Player, cardIds: string[], drawPileEmpty: boolean): void {
  const source = getPlayerSource(player, drawPileEmpty);
  if (source === 'hand') {
    player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  } else if (source === 'palace-faceup') {
    for (const slot of player.palace) {
      if (slot.faceUp && cardIds.includes(slot.faceUp.id)) {
        slot.faceUp = null;
      }
    }
  } else if (source === 'palace-facedown') {
    for (const slot of player.palace) {
      if (slot.faceDown && cardIds.includes(slot.faceDown.id)) {
        slot.faceDown = null;
      }
    }
  }
}

function drawCards(state: GameState, playerId: string): void {
  const player = state.players.find(p => p.id === playerId)!;
  while (player.hand.length < 3 && state.drawPile.length > 0) {
    player.hand.push(state.drawPile.shift()!);
  }
}

function checkWinner(state: GameState, playerId: string): boolean {
  const player = state.players.find(p => p.id === playerId)!;
  if (state.drawPile.length > 0) return false;
  if (player.hand.length > 0) return false;
  if (player.palace.some(s => s.faceUp !== null || s.faceDown !== null)) return false;
  return true;
}

// Handle player elimination - returns true if game is over
function handleElimination(state: GameState, playerId: string): boolean {
  if (!checkWinner(state, playerId)) return false;
  if (state.eliminated.includes(playerId)) return false;

  const player = state.players.find(p => p.id === playerId)!;
  state.eliminated.push(playerId);
  state.log.push(`✅ ${player.name} is OUT! All cards gone — they're safe!`);

  // Check how many non-eliminated remain
  const remaining = state.players.filter(p => !state.eliminated.includes(p.id));
  if (remaining.length <= 1) {
    state.loser = remaining[0]?.id || null;
    state.phase = 'finished';
    const loserName = remaining[0]?.name || 'Nobody';
    state.log.push(`💀💀💀 ${loserName} is the LOSER! The Palace Player! 💀💀💀`);
    state.log.push(`👑 Everyone else escapes! ${loserName} deals next game!`);
    return true;
  }
  return false;
}

function advanceTurn(state: GameState): void {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  // Skip winners and eliminated
  let safety = 0;
  while (safety < state.players.length) {
    const p = state.players[state.currentPlayerIndex];
    if (state.eliminated.includes(p.id) || checkWinner(state, p.id)) {
      // Auto-eliminate if not already
      if (!state.eliminated.includes(p.id) && checkWinner(state, p.id)) {
        state.eliminated.push(p.id);
        state.log.push(`✅ ${p.name} is OUT! All cards gone!`);
      }
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
      safety++;
    } else {
      break;
    }
  }
  // Check if game should end after skipping
  const remaining = state.players.filter(p => !state.eliminated.includes(p.id));
  if (remaining.length <= 1 && state.phase !== 'finished') {
    state.loser = remaining[0]?.id || null;
    state.phase = 'finished';
    const loserName = remaining[0]?.name || 'Nobody';
    state.log.push(`💀💀💀 ${loserName} is the LOSER! The Palace Player! 💀💀💀`);
    state.log.push(`👑 Everyone else escapes! ${loserName} deals next game!`);
    return;
  }
  state.log.push(`${state.players[state.currentPlayerIndex].name}'s turn.`);
}

export function playCards(state: GameState, playerId: string, cardIds: string[]): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;
  const pIdx = s.players.findIndex(p => p.id === playerId);

  if (s.phase !== 'playing') throw new Error('Game not in play phase');
  if (pIdx !== s.currentPlayerIndex) throw new Error('Not your turn');
  if (s.waitingForBonus) throw new Error('Must complete bonus action first');
  if (s.pendingCounter) throw new Error('Must resolve counter opportunity first');
  // if (s.drawBonus) throw new Error('Must complete or skip draw bonus first');
  if (cardIds.length === 0) throw new Error('Must play at least one card');

  const source = getPlayerSource(player, s.drawPile.length === 0);
  let cards: Card[];

  if (source === 'palace-facedown') {
    // Blind play - only one card
    if (cardIds.length !== 1) throw new Error('Must play exactly one palace face-down card');
    const slotIdx = player.palace.findIndex(sl => sl.faceDown && cardIds.includes(sl.faceDown.id));
    if (slotIdx === -1) throw new Error('Card not found');
    const card = player.palace[slotIdx].faceDown!;
    cards = [card];

    const topCard = getTopCard(s.pickupPile);
    const isValid = canPlayCardOnPile(card, topCard);

    s.log.push(`${player.name} blindly reveals ${cardDisplay(card)} from palace.`);
    player.palace[slotIdx].faceDown = null;

    if (!isValid) {
      // Invalid - pick up pile + the card
      s.pickupPile.push(card);
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.log.push(`${cardDisplay(card)} can't be played! ${player.name} picks up the pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'palace-invalid', cards: [card], playerId };
      s.version++;
      return s;
    }

    // Valid - add to pile
    s.pickupPile.push(card);
    s.log.push(`${player.name} plays ${cardDisplay(card)} from palace face-down.`);
  } else {
    // Normal play from hand or palace face-up
    cards = cardIds.map(id => {
      if (source === 'hand') {
        const c = player.hand.find(c => c.id === id);
        if (!c) throw new Error('Card not in hand');
        return c;
      } else {
        for (const slot of player.palace) {
          if (slot.faceUp?.id === id) return slot.faceUp;
        }
        throw new Error('Card not found');
      }
    });

    // All must be same rank
    if (!cards.every(c => c.rank === cards[0].rank)) throw new Error('All cards must be same rank');

    const topCard = getTopCard(s.pickupPile);
    if (!canPlayCardOnPile(cards[0], topCard)) throw new Error('Cannot play this card');

    // Add to pile
    for (const card of cards) {
      s.pickupPile.push(card);
    }
    removeCardsFromPlayer(player, cardIds, s.drawPile.length === 0);
    s.log.push(`${player.name} plays ${cards.map(cardDisplay).join(', ')}.`);
  }

  const playedRank = cards[0].rank;

  // Check four of a kind
  if (checkFourOfAKind(s.pickupPile)) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('Four of a kind! Pile is wiped out!');

    // Check win before bonus
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'wipeout', cards, playerId };
      s.version++;
      return s;
    }

    setFourOfAKindBonus(s, playerId);
    s.lastAction = { type: 'wipeout', cards, playerId };
    s.version++;
    return s;
  }

  // Check 10 (wipeout)
  if (playedRank === 10) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('10 played! Pile is wiped out!');

    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'slam', cards, playerId };
      s.version++;
      return s;
    }

    s.waitingForBonus = { type: '10' };
    s.lastAction = { type: 'slam', cards, playerId };
    s.version++;
    return s;
  }

  // Check 2 (bonus action)
  if (playedRank === 2) {
    drawCards(s, playerId);

    // Check if player has any cards to play as bonus
    const hasCards = player.hand.length > 0 ||
      player.palace.some(sl => sl.faceUp !== null) ||
      player.palace.some(sl => sl.faceDown !== null);

    if (!hasCards && s.drawPile.length === 0) {
      // Can't win with 2, pick up pile
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.log.push(`${player.name} has no bonus action for 2! Picks up the pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'pickup', playerId };
      s.version++;
      return s;
    }

    s.waitingForBonus = { type: '2' };
    s.lastAction = { type: 'sparkle', cards, playerId };
    s.version++;
    return s;
  }

  // Normal play - draw and advance
  drawCards(s, playerId);

  if (handleElimination(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  // Bonus: if hand matches pile top rank, offer one bonus play before passing turn
  if (trySetDrawBonus(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  advanceTurn(s);
  s.lastAction = { type: 'play', cards, playerId };
  s.version++;
  return s;
}

export function playBonusAction(state: GameState, playerId: string, cardIds: string[]): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;

  if (!s.waitingForBonus) throw new Error('No bonus action pending');
  if (cardIds.length === 0) throw new Error('Must play at least one card');

  const source = getPlayerSource(player, s.drawPile.length === 0);
  let cards: Card[];

  if (source === 'palace-facedown') {
    if (cardIds.length !== 1) throw new Error('Must play one card');
    const slotIdx = player.palace.findIndex(sl => sl.faceDown && cardIds.includes(sl.faceDown.id));
    if (slotIdx === -1) throw new Error('Card not found');
    const card = player.palace[slotIdx].faceDown!;
    cards = [card];
    player.palace[slotIdx].faceDown = null;
    s.log.push(`${player.name} blindly reveals ${cardDisplay(card)} as bonus.`);

    if (s.waitingForBonus.type === '2') {
      const topCard = getTopCard(s.pickupPile);
      if (!canPlayCardOnPile(card, topCard)) {
        s.pickupPile.push(card);
        player.hand = [...player.hand, ...s.pickupPile];
        s.pickupPile = [];
        s.waitingForBonus = null;
        s.log.push(`${cardDisplay(card)} can't be played! ${player.name} picks up the pile.`);
        advanceTurn(s);
        s.lastAction = { type: 'palace-invalid', cards: [card], playerId };
        s.version++;
        return s;
      }
    }

    s.pickupPile.push(card);
  } else {
    cards = cardIds.map(id => {
      if (source === 'hand') return player.hand.find(c => c.id === id)!;
      for (const slot of player.palace) {
        if (slot.faceUp?.id === id) return slot.faceUp;
      }
      throw new Error('Card not found');
    });

    if (!cards.every(c => c.rank === cards[0].rank)) throw new Error('All cards must be same rank');

    if (s.waitingForBonus.type === '2') {
      const topCard = getTopCard(s.pickupPile);
      if (!canPlayCardOnPile(cards[0], topCard)) throw new Error('Cannot play this card');
    }
    // For 10/four-of-a-kind bonus: any card to start new pile

    for (const card of cards) {
      s.pickupPile.push(card);
    }
    removeCardsFromPlayer(player, cardIds, s.drawPile.length === 0);
  }

  const playedRank = cards[0].rank;
  s.log.push(`${player.name} plays ${cards.map(cardDisplay).join(', ')} as bonus action.`);

  s.waitingForBonus = null;

  // Check four of a kind again
  if (checkFourOfAKind(s.pickupPile)) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('Four of a kind! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'wipeout', cards, playerId };
      s.version++;
      return s;
    }
    setFourOfAKindBonus(s, playerId);
    s.lastAction = { type: 'wipeout', cards, playerId };
    s.version++;
    return s;
  }

  if (playedRank === 10) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('10 played! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'slam', cards, playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '10' };
    s.lastAction = { type: 'slam', cards, playerId };
    s.version++;
    return s;
  }

  if (playedRank === 2) {
    drawCards(s, playerId);
    const hasCards = player.hand.length > 0 ||
      player.palace.some(sl => sl.faceUp !== null) ||
      player.palace.some(sl => sl.faceDown !== null);
    if (!hasCards && s.drawPile.length === 0) {
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.log.push(`${player.name} has no bonus for 2! Picks up pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'pickup', playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '2' };
    s.lastAction = { type: 'sparkle', cards, playerId };
    s.version++;
    return s;
  }

  drawCards(s, playerId);

  if (handleElimination(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  // Bonus: if hand matches pile top rank after bonus action, offer one more bonus play
  if (trySetDrawBonus(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  advanceTurn(s);
  s.lastAction = { type: 'play', cards, playerId };
  s.version++;
  return s;
}

export function pickupPile(state: GameState, playerId: string): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;
  const pIdx = s.players.findIndex(p => p.id === playerId);

  if (pIdx !== s.currentPlayerIndex) throw new Error('Not your turn');

  // Skip steal check during counter scenarios (player is forced to pick up)
  if (!s.pendingCounter) {
    // Check if anyone can steal first
    for (const otherPlayer of s.players) {
      if (otherPlayer.id === playerId) continue;
      if (canStealTurn(s, otherPlayer.id)) {
        throw new Error(`Turn must be stolen by ${otherPlayer.name} (four of a kind available)`);
      }
    }
  }

  player.hand = [...player.hand, ...s.pickupPile];
  s.log.push(`${player.name} picks up the pile (${s.pickupPile.length} cards).`);
  s.pickupPile = [];
  s.waitingForBonus = null;
  s.drawBonus = null;
  s.pendingCounter = null;
  s.lastAction = { type: 'pickup', playerId };

  advanceTurn(s);
  s.version++;
  return s;
}

// Play cards matching pile top rank as draw bonus (after playing from hand and drawing)
export function playDrawBonus(state: GameState, playerId: string, cardIds: string[]): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;

  if (!s.drawBonus || s.drawBonus.playerId !== playerId) throw new Error('No draw bonus pending');
  if (s.pickupPile.length === 0) throw new Error('Pile is empty, no draw bonus');
  if (cardIds.length === 0) throw new Error('Must play at least one card');

  // Track whether the counter window was open before bonus player acts.
  // If so, currentPlayerIndex is already at the counter player for their normal turn.
  const counterWasOpen = s.pendingCounter?.type === 'drawBonus' && s.pendingCounter.bonusPlayerId === playerId;

  // If counter player hasn't acted yet, bonus player playing their drawBonus closes the window
  if (counterWasOpen) {
    s.pendingCounter = null;
  }

  const pileTopRank = getTopCard(s.pickupPile)!.rank;

  // All cards must be from hand and match the pile top rank
  const cards = cardIds.map(id => {
    const c = player.hand.find(c => c.id === id);
    if (!c) throw new Error('Card not in hand');
    if (c.rank !== pileTopRank) throw new Error(`Can only play ${getRankDisplay(pileTopRank)}s as draw bonus`);
    return c;
  });

  // Play the cards onto the pile
  for (const card of cards) {
    s.pickupPile.push(card);
  }
  player.hand = player.hand.filter(c => !cardIds.includes(c.id));
  s.drawBonus = null;
  s.log.push(`${player.name} plays ${cards.map(cardDisplay).join(', ')} as draw bonus!`);

  const playedRank = cards[0].rank;

  // Check four of a kind
  if (checkFourOfAKind(s.pickupPile)) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('Four of a kind! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'wipeout', cards, playerId };
      s.version++;
      return s;
    }
    setFourOfAKindBonus(s, playerId);
    s.lastAction = { type: 'wipeout', cards, playerId };
    s.version++;
    return s;
  }

  // Check 10 wipeout
  if (playedRank === 10) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('10 played! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'slam', cards, playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '10' };
    s.lastAction = { type: 'slam', cards, playerId };
    s.version++;
    return s;
  }

  // Check 2 bonus
  if (playedRank === 2) {
    drawCards(s, playerId);
    const hasCards = player.hand.length > 0 ||
      player.palace.some(sl => sl.faceUp !== null) ||
      player.palace.some(sl => sl.faceDown !== null);
    if (!hasCards && s.drawPile.length === 0) {
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.log.push(`${player.name} has no bonus for 2! Picks up pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'pickup', playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '2' };
    s.lastAction = { type: 'sparkle', cards, playerId };
    s.version++;
    return s;
  }

  // Normal - ensure player still has minimum of 3 cards, then check elimination and advance turn
  drawCards(s, playerId);
  if (handleElimination(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  if (counterWasOpen) {
    // currentPlayerIndex is already at the counter player for their normal turn — don't advance
    s.log.push(`${s.players[s.currentPlayerIndex].name}'s turn.`);
  } else {
    advanceTurn(s);
  }
  s.lastAction = { type: 'play', cards, playerId };
  s.version++;
  return s;
}

// Skip draw bonus and end turn
export function skipDrawBonus(state: GameState, playerId: string): GameState {
  const s = deepClone(state);
  if (!s.drawBonus || s.drawBonus.playerId !== playerId) throw new Error('No draw bonus pending');
  s.drawBonus = null;
  const bonusPlayerName = s.players.find(p => p.id === playerId)!.name;
  // If counter window is still open, closing the bonus also closes the counter opportunity.
  // currentPlayerIndex is already at the counter player for their normal turn — don't advance.
  if (s.pendingCounter?.type === 'drawBonus' && s.pendingCounter.bonusPlayerId === playerId) {
    s.pendingCounter = null;
    s.log.push(`${bonusPlayerName} skips draw bonus.`);
    s.log.push(`${s.players[s.currentPlayerIndex].name}'s turn.`);
  } else {
    s.log.push(`${bonusPlayerName} skips draw bonus.`);
    advanceTurn(s);
  }
  s.version++;
  return s;
}

export function stealTurn(state: GameState, stealingPlayerId: string, cardIds: string[]): GameState {
  const s = deepClone(state);
  const stealer = s.players.find(p => p.id === stealingPlayerId)!;

  const stealCards = canStealTurn(s, stealingPlayerId);
  if (!stealCards) throw new Error('Cannot steal');

  // Play the cards to complete four of a kind
  const cards = cardIds.map(id => stealer.hand.find(c => c.id === id) || (() => {
    for (const slot of stealer.palace) {
      if (slot.faceUp?.id === id) return slot.faceUp;
    }
    throw new Error('Card not found');
  })());

  for (const card of cards) {
    s.pickupPile.push(card as Card);
  }
  removeCardsFromPlayer(stealer, cardIds, s.drawPile.length === 0);

  s.discardPile.push(...s.pickupPile);
  s.pickupPile = [];
  s.log.push(`${stealer.name} steals the turn with four of a kind! Pile wiped!`);

  s.currentPlayerIndex = s.players.findIndex(p => p.id === stealingPlayerId);
  drawCards(s, stealingPlayerId);

  if (handleElimination(s, stealingPlayerId)) {
    s.lastAction = { type: 'wipeout', cards: cardIds.map(id => ({ id, suit: 'spades' as Suit, rank: 0 })), playerId: stealingPlayerId };
    s.version++;
    return s;
  }

  setFourOfAKindBonus(s, stealingPlayerId);
  s.lastAction = { type: 'wipeout', playerId: stealingPlayerId };
  s.version++;
  return s;
}

// ---- Counter Mechanic ----
// When drawBonus triggers, the next player gets a chance
// to "counter" by playing a valid card, skipping the bonus entirely.
// Note: four-of-a-kind bonuses cannot be countered.

// Counter player plays a valid card, cancelling the pending bonus
export function playCounter(state: GameState, playerId: string, cardIds: string[]): GameState {
  const s = deepClone(state);
  if (!s.pendingCounter) throw new Error('No counter opportunity pending');

  const pIdx = s.players.findIndex(p => p.id === playerId);
  if (pIdx !== s.currentPlayerIndex) throw new Error('Not your turn to counter');
  if (cardIds.length === 0) throw new Error('Must play at least one card');

  const player = s.players[pIdx];
  const source = getPlayerSource(player, s.drawPile.length === 0);
  let cards: Card[];

  // drawBonus counter - must play a valid card on the existing pile
  const topCard = getTopCard(s.pickupPile);

  if (source === 'palace-facedown') {
    if (cardIds.length !== 1) throw new Error('Must play exactly one card');
    const slotIdx = player.palace.findIndex(sl => sl.faceDown && cardIds.includes(sl.faceDown.id));
    if (slotIdx === -1) throw new Error('Card not found');
    const card = player.palace[slotIdx].faceDown!;
    cards = [card];

    s.log.push(`${player.name} counters! Blindly reveals ${cardDisplay(card)}.`);
    player.palace[slotIdx].faceDown = null;

    if (!canPlayCardOnPile(card, topCard)) {
      // Invalid blind counter - pick up pile
      s.pickupPile.push(card);
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.pendingCounter = null;
      s.drawBonus = null;
      s.log.push(`${cardDisplay(card)} can't be played! ${player.name} picks up the pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'palace-invalid', cards: [card], playerId };
      s.version++;
      return s;
    }
    s.pickupPile.push(card);
  } else {
    cards = cardIds.map(id => {
      if (source === 'hand') {
        const c = player.hand.find(c => c.id === id);
        if (!c) throw new Error('Card not in hand');
        return c;
      } else {
        for (const slot of player.palace) {
          if (slot.faceUp?.id === id) return slot.faceUp;
        }
        throw new Error('Card not found');
      }
    });
    if (!cards.every(c => c.rank === cards[0].rank)) throw new Error('All cards must be same rank');
    if (!canPlayCardOnPile(cards[0], topCard)) throw new Error('Cannot play this card on the pile');
    for (const card of cards) {
      s.pickupPile.push(card);
    }
    removeCardsFromPlayer(player, cardIds, s.drawPile.length === 0);
    s.log.push(`${player.name} counters! Plays ${cards.map(cardDisplay).join(', ')}.`);
  }

  // Clear the pending counter - bonus is cancelled
  s.pendingCounter = null;
  s.drawBonus = null; // Cancel drawBonus if counter player acted first

  const playedRank = cards[0].rank;

  // Now handle the played cards as if it were a normal play (check specials)
  if (checkFourOfAKind(s.pickupPile)) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('Four of a kind! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'wipeout', cards, playerId };
      s.version++;
      return s;
    }
    setFourOfAKindBonus(s, playerId);
    s.lastAction = { type: 'wipeout', cards, playerId };
    s.version++;
    return s;
  }

  if (playedRank === 10) {
    s.discardPile.push(...s.pickupPile);
    s.pickupPile = [];
    s.log.push('10 played! Pile wiped!');
    drawCards(s, playerId);
    if (handleElimination(s, playerId)) {
      s.lastAction = { type: 'slam', cards, playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '10' };
    s.lastAction = { type: 'slam', cards, playerId };
    s.version++;
    return s;
  }

  if (playedRank === 2) {
    drawCards(s, playerId);
    const hasCards = player.hand.length > 0 ||
      player.palace.some(sl => sl.faceUp !== null) ||
      player.palace.some(sl => sl.faceDown !== null);
    if (!hasCards && s.drawPile.length === 0) {
      player.hand = [...player.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.log.push(`${player.name} has no bonus for 2! Picks up pile.`);
      advanceTurn(s);
      s.lastAction = { type: 'pickup', playerId };
      s.version++;
      return s;
    }
    s.waitingForBonus = { type: '2' };
    s.lastAction = { type: 'sparkle', cards, playerId };
    s.version++;
    return s;
  }

  // Normal - draw, check elimination, check drawBonus, advance
  drawCards(s, playerId);

  if (handleElimination(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  if (trySetDrawBonus(s, playerId)) {
    s.lastAction = { type: 'play', cards, playerId };
    s.version++;
    return s;
  }

  advanceTurn(s);
  s.lastAction = { type: 'play', cards, playerId };
  s.version++;
  return s;
}

// Counter player passes - bonus activates for the original player
export function passCounter(state: GameState, playerId: string): GameState {
  const s = deepClone(state);
  if (!s.pendingCounter) throw new Error('No counter opportunity pending');

  const pIdx = s.players.findIndex(p => p.id === playerId);
  if (pIdx !== s.currentPlayerIndex) throw new Error('Not your turn to counter');

  const bonusPlayerId = s.pendingCounter.bonusPlayerId;
  const bonusPlayerIdx = s.players.findIndex(p => p.id === bonusPlayerId);
  const bonusPlayer = s.players[bonusPlayerIdx];
  const counterPlayerName = s.players[pIdx].name;

  if (s.pendingCounter.type === 'drawBonus') {
    // drawBonus was already set when the counter was triggered — just return turn to bonus player
    s.currentPlayerIndex = bonusPlayerIdx;
    s.log.push(`${counterPlayerName} passes. ${bonusPlayer.name} may play draw bonus.`);
  }

  s.pendingCounter = null;
  s.version++;
  return s;
}

// Get playable cards for counter opportunity
export function getCounterPlayableCards(state: GameState, playerId: string): Card[] {
  if (!state.pendingCounter) return [];
  const player = state.players.find(p => p.id === playerId)!;
  const source = getPlayerSource(player, state.drawPile.length === 0);

  if (state.pendingCounter.type === 'drawBonus') {
    // Must play valid card on existing pile
    const topCard = getTopCard(state.pickupPile);
    if (source === 'hand') return player.hand.filter(c => canPlayCardOnPile(c, topCard));
    if (source === 'palace-faceup') return player.palace.filter(s => s.faceUp).map(s => s.faceUp!).filter(c => canPlayCardOnPile(c, topCard));
    if (source === 'palace-facedown') return player.palace.filter(s => s.faceDown).map(s => s.faceDown!);
    return [];
  }

  return [];
}

// AI handles counter opportunity
export function aiHandleCounter(state: GameState): GameState {
  const s = deepClone(state);
  if (!s.pendingCounter) return s;

  const player = s.players[s.currentPlayerIndex];
  const playable = getCounterPlayableCards(s, player.id);

  // AI strategy: counter ~50% of the time if they have playable cards (to keep it interesting)
  // Always counter with low-value cards, pass if only high-value cards available
  if (playable.length > 0) {
    const source = getPlayerSource(player, s.drawPile.length === 0);

    if (source === 'palace-facedown') {
      // Blind - always try to counter
      try {
        return playCounter(s, player.id, [playable[0].id]);
      } catch {
        return pickupPile(s, player.id);
      }
    }

    // Pick lowest card to counter with
    const sorted = [...playable].sort((a, b) => {
      const aVal = a.rank === 2 ? 100 : a.rank === 10 ? 99 : a.rank;
      const bVal = b.rank === 2 ? 100 : b.rank === 10 ? 99 : b.rank;
      return aVal - bVal;
    });

    const lowestRank = sorted[0].rank;
    // Counter if lowest available card is relatively low (not wasting specials)
    const shouldCounter = lowestRank !== 2 && lowestRank !== 10 && lowestRank <= 9;

    if (shouldCounter) {
      // Play all cards of the chosen rank
      const counterCards = sorted.filter(c => c.rank === lowestRank);
      try {
        return playCounter(s, player.id, counterCards.map(c => c.id));
      } catch {
        return pickupPile(s, player.id);
      }
    }
  }

  // No valid counter cards available - pick up pile
  return pickupPile(s, player.id);
}

// ---- AI ----

export function aiSetup(state: GameState, playerId: string): GameState {
  let s = deepClone(state);
  const player = s.players.find(p => p.id === playerId)!;

  if (player.setupPhase === 'select-facedown') {
    // Randomly pick 3
    const shuffled = shuffle(player.setupCards);
    s = selectFaceDownCards(s, playerId, shuffled.slice(0, 3).map(c => c.id));
  }

  const player2 = s.players.find(p => p.id === playerId)!;
  if (player2.setupPhase === 'select-faceup') {
    // Pick the 3 highest cards for face-up
    const sorted = [...player2.setupCards].sort((a, b) => {
      // Prefer high cards and special cards (2, 10) for face-up
      const aVal = a.rank === 2 ? 15 : a.rank === 10 ? 16 : a.rank;
      const bVal = b.rank === 2 ? 15 : b.rank === 10 ? 16 : b.rank;
      return bVal - aVal;
    });
    s = selectFaceUpCards(s, playerId, sorted.slice(0, 3).map(c => c.id));
  }

  return s;
}

export function aiPlayTurn(state: GameState): GameState {
  let s = deepClone(state);
  const player = s.players[s.currentPlayerIndex];

  // Check if AI can steal for any other player
  // (Only relevant if it's not their turn - but this is called on their turn)

  const source = getPlayerSource(player, s.drawPile.length === 0);

  if (source === 'palace-facedown') {
    // Play first available face-down
    const slotIdx = player.palace.findIndex(sl => sl.faceDown !== null);
    if (slotIdx >= 0) {
      try {
        return playCards(s, player.id, [player.palace[slotIdx].faceDown!.id]);
      } catch {
        return pickupPile(s, player.id);
      }
    }
  }

  const playable = getPlayableCards(s, player.id);

  if (playable.length === 0) {
    // Try to pick up, but check steal
    try {
      s = pickupPile(s, player.id);
    } catch {
      // Someone can steal - but in robot mode we handle this differently
      // For now, force pickup
      const forcedState = deepClone(s);
      const fp = forcedState.players[forcedState.currentPlayerIndex];
      fp.hand = [...fp.hand, ...forcedState.pickupPile];
      forcedState.pickupPile = [];
      forcedState.log.push(`${fp.name} picks up the pile.`);
      advanceTurn(forcedState);
      forcedState.version++;
      return forcedState;
    }
    return s;
  }

  // Strategy: play lowest valid cards, prefer multiples
  // Group by rank
  const byRank = new Map<number, Card[]>();
  for (const c of playable) {
    if (!byRank.has(c.rank)) byRank.set(c.rank, []);
    byRank.get(c.rank)!.push(c);
  }

  // Sort ranks by value (play lowest first), but save 2s and 10s
  const ranks = [...byRank.keys()].sort((a, b) => {
    const aVal = a === 2 ? 100 : a === 10 ? 99 : a;
    const bVal = b === 2 ? 100 : b === 10 ? 99 : b;
    return aVal - bVal;
  });

  const chosenRank = ranks[0];
  const chosenCards = byRank.get(chosenRank)!;

  try {
    s = playCards(s, player.id, chosenCards.map(c => c.id));
  } catch {
    try {
      return pickupPile(s, player.id);
    } catch {
      return s;
    }
  }

  // Handle bonus actions
  while (s.waitingForBonus) {
    const bp = s.players[s.currentPlayerIndex];
    const bonusPlayable = getBonusPlayableCards(s, bp.id);

    if (bonusPlayable.length === 0) {
      // Pick up
      bp.hand = [...bp.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.waitingForBonus = null;
      s.log.push(`${bp.name} has no bonus action. Picks up pile.`);
      advanceTurn(s);
      s.version++;
      return s;
    }

    const bonusByRank = new Map<number, Card[]>();
    for (const c of bonusPlayable) {
      if (!bonusByRank.has(c.rank)) bonusByRank.set(c.rank, []);
      bonusByRank.get(c.rank)!.push(c);
    }

    const bonusRanks = [...bonusByRank.keys()].sort((a, b) => {
      const aVal = a === 2 ? 100 : a === 10 ? 99 : a;
      const bVal = b === 2 ? 100 : b === 10 ? 99 : b;
      return aVal - bVal;
    });

    const bonusRank = bonusRanks[0];
    const bonusCards = bonusByRank.get(bonusRank)!;

    try {
      s = playBonusAction(s, bp.id, bonusCards.map(c => c.id));
    } catch {
      bp.hand = [...bp.hand, ...s.pickupPile];
      s.pickupPile = [];
      s.waitingForBonus = null;
      advanceTurn(s);
      s.version++;
      return s;
    }
  }

  // Handle draw bonus for AI
  if (s.drawBonus && s.drawBonus.playerId === player.id) {
    if (s.pickupPile.length > 0) {
      const pileTopRank = getTopCard(s.pickupPile)!.rank;
      const matchCards = s.players[s.currentPlayerIndex].hand.filter(c => c.rank === pileTopRank);
      if (matchCards.length > 0) {
        try {
          s = playDrawBonus(s, player.id, matchCards.map(c => c.id));
        } catch {
          s = skipDrawBonus(s, player.id);
        }
      } else {
        s = skipDrawBonus(s, player.id);
      }
    } else {
      s = skipDrawBonus(s, player.id);
    }
  }

  return s;
}

// Check if any AI player can steal
export function checkAISteal(state: GameState): GameState | null {
  const s = deepClone(state);
  const currentPlayerId = s.players[s.currentPlayerIndex].id;

  for (const player of s.players) {
    if (player.id === currentPlayerId) continue;
    if (player.id.startsWith('player-0')) continue; // Don't auto-steal for human player
    const stealCards = canStealTurn(s, player.id);
    if (stealCards) {
      try {
        return stealTurn(s, player.id, stealCards.map(c => c.id));
      } catch {
        continue;
      }
    }
  }
  return null;
}

// Reveal all face-down palace cards for a player (post-game display only)
export function revealFaceDownCards(state: GameState, playerId: string): GameState {
  const s = deepClone(state);
  const player = s.players.find(p => p.id === playerId);
  if (!player) return s;
  for (const slot of player.palace) {
    if (slot.faceDown !== null && slot.faceUp === null) {
      // Move face-down card to face-up slot so PalaceDisplay shows it face-up
      slot.faceUp = slot.faceDown;
      slot.faceDown = null;
    }
  }
  s.version++;
  return s;
}

// ---- Utility ----

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export { deepClone };