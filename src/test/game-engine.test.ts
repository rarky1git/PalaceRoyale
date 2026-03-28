import { describe, it, expect } from 'vitest'
import {
  createDeck,
  shuffle,
  initGame,
  canPlayCardOnPile,
  getPlayableCards,
  getTopCard,
  getPlayerSource,
  canStealTurn,
  selectFaceDownCards,
  selectFaceUpCards,
  playCards,
  pickupPile,
  playBonusAction,
  skipDrawBonus,
  playDrawBonus,
  playCounter,
  passCounter,
  stealTurn,
  computeGameRankings,
  resetGame,
  requestNewGame,
  nudgeCurrentPlayer,
  aiSetup,
  getRankDisplay,
  getSuitSymbol,
  getSuitColor,
  cardDisplay,
  cardValue,
  type Card,
  type GameState,
  type Player,
} from '../app/game-engine'

// ---- Helpers ----

function makeCard(rank: number, suit: Card['suit'] = 'spades', id?: string): Card {
  return { id: id ?? `${rank}-${suit}`, suit, rank }
}

/**
 * Build a minimal 2-player GameState already in 'playing' phase.
 * p0 is current player. Both players have empty palaces (cleared).
 * Callers can mutate hand / pickupPile / drawPile as needed.
 */
function makePlayingState(overrides: Partial<GameState> = {}): GameState {
  const base = initGame(['Alice', 'Bob'])
  // Fast-forward through setup by calling aiSetup on both players
  let s = aiSetup(base, 'player-0')
  s = aiSetup(s, 'player-1')
  // After setup both players are done → phase becomes 'playing'
  return { ...s, ...overrides }
}

/**
 * Build a state where the given player has exactly the specified hand cards,
 * an empty draw pile, empty palace, and the pickupPile provided.
 */
function stateWithHand(
  playerId: string,
  hand: Card[],
  pickupPile: Card[] = [],
  currentPlayerIndex = 0
): GameState {
  const s = makePlayingState()
  const player = s.players.find(p => p.id === playerId)!
  player.hand = hand
  player.palace = [
    { faceDown: null, faceUp: null },
    { faceDown: null, faceUp: null },
    { faceDown: null, faceUp: null },
  ]
  s.drawPile = []
  s.pickupPile = pickupPile
  s.currentPlayerIndex = currentPlayerIndex
  s.waitingForBonus = null
  s.pendingCounter = null
  s.drawBonus = null
  return s
}

// ---- Helper function tests ----

describe('getRankDisplay', () => {
  it('returns number string for 2-10', () => {
    expect(getRankDisplay(2)).toBe('2')
    expect(getRankDisplay(10)).toBe('10')
  })
  it('returns face card letters', () => {
    expect(getRankDisplay(11)).toBe('J')
    expect(getRankDisplay(12)).toBe('Q')
    expect(getRankDisplay(13)).toBe('K')
    expect(getRankDisplay(14)).toBe('A')
  })
})

describe('getSuitSymbol', () => {
  it('returns correct symbols', () => {
    expect(getSuitSymbol('hearts')).toBe('♥')
    expect(getSuitSymbol('diamonds')).toBe('♦')
    expect(getSuitSymbol('clubs')).toBe('♣')
    expect(getSuitSymbol('spades')).toBe('♠')
  })
})

describe('getSuitColor', () => {
  it('red for hearts and diamonds', () => {
    expect(getSuitColor('hearts')).toBe('red')
    expect(getSuitColor('diamonds')).toBe('red')
  })
  it('black for clubs and spades', () => {
    expect(getSuitColor('clubs')).toBe('black')
    expect(getSuitColor('spades')).toBe('black')
  })
})

describe('cardDisplay', () => {
  it('formats card correctly', () => {
    expect(cardDisplay(makeCard(14, 'spades'))).toBe('A♠')
    expect(cardDisplay(makeCard(11, 'hearts'))).toBe('J♥')
    expect(cardDisplay(makeCard(2, 'diamonds'))).toBe('2♦')
  })
})

describe('cardValue', () => {
  it('returns rank directly', () => {
    expect(cardValue(7)).toBe(7)
    expect(cardValue(14)).toBe(14)
  })
})

// ---- Deck ----

describe('createDeck', () => {
  it('creates 52 cards', () => {
    expect(createDeck()).toHaveLength(52)
  })
  it('has ranks 2-14 for each suit', () => {
    const deck = createDeck()
    const hearts = deck.filter(c => c.suit === 'hearts')
    expect(hearts).toHaveLength(13)
    expect(hearts.map(c => c.rank).sort((a, b) => a - b)).toEqual(
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    )
  })
  it('produces unique ids per deck index', () => {
    const d0 = createDeck(0)
    const d1 = createDeck(1)
    expect(d0[0].id).not.toBe(d1[0].id)
  })
})

describe('shuffle', () => {
  it('preserves length', () => {
    const deck = createDeck()
    expect(shuffle(deck)).toHaveLength(52)
  })
  it('does not mutate original', () => {
    const deck = createDeck()
    const original = [...deck]
    shuffle(deck)
    expect(deck).toEqual(original)
  })
  it('contains same cards as input', () => {
    const deck = createDeck()
    const shuffled = shuffle(deck)
    expect(shuffled.map(c => c.id).sort()).toEqual(deck.map(c => c.id).sort())
  })
})

// ---- initGame ----

describe('initGame', () => {
  it('creates correct number of players', () => {
    const s = initGame(['Alice', 'Bob', 'Carol'])
    expect(s.players).toHaveLength(3)
  })
  it('deals 9 setupCards to each player', () => {
    const s = initGame(['Alice', 'Bob'])
    for (const p of s.players) {
      expect(p.setupCards).toHaveLength(9)
    }
  })
  it('starts in setup phase', () => {
    expect(initGame(['Alice', 'Bob']).phase).toBe('setup')
  })
  it('sets currentPlayerIndex to dealerIndex + 1', () => {
    const s = initGame(['Alice', 'Bob', 'Carol'], 1)
    expect(s.currentPlayerIndex).toBe(2)
  })
  it('wraps currentPlayerIndex correctly', () => {
    const s = initGame(['Alice', 'Bob'], 1)
    expect(s.currentPlayerIndex).toBe(0)
  })
  it('assigns emojis when provided', () => {
    const s = initGame(['Alice', 'Bob'], 0, 1, ['🐱', '🐶'])
    expect(s.players[0].emoji).toBe('🐱')
    expect(s.players[1].emoji).toBe('🐶')
  })
  it('version starts at 0', () => {
    expect(initGame(['Alice', 'Bob']).version).toBe(0)
  })
})

// ---- canPlayCardOnPile ----

describe('canPlayCardOnPile', () => {
  it('any card playable on empty pile', () => {
    expect(canPlayCardOnPile(makeCard(3), null)).toBe(true)
    expect(canPlayCardOnPile(makeCard(7), null)).toBe(true)
  })
  it('2 is always playable regardless of pile top', () => {
    expect(canPlayCardOnPile(makeCard(2), makeCard(14))).toBe(true)
    expect(canPlayCardOnPile(makeCard(2), makeCard(7))).toBe(true)
  })
  it('10 is always playable regardless of pile top', () => {
    expect(canPlayCardOnPile(makeCard(10), makeCard(14))).toBe(true)
    expect(canPlayCardOnPile(makeCard(10), makeCard(10))).toBe(true)
  })
  it('when top is 7, must play 7 or lower', () => {
    expect(canPlayCardOnPile(makeCard(7), makeCard(7))).toBe(true)
    expect(canPlayCardOnPile(makeCard(6), makeCard(7))).toBe(true)
    expect(canPlayCardOnPile(makeCard(3), makeCard(7))).toBe(true)
    expect(canPlayCardOnPile(makeCard(8), makeCard(7))).toBe(false)
    expect(canPlayCardOnPile(makeCard(14), makeCard(7))).toBe(false)
  })
  it('when top is 2, any card is playable', () => {
    expect(canPlayCardOnPile(makeCard(3), makeCard(2))).toBe(true)
    expect(canPlayCardOnPile(makeCard(14), makeCard(2))).toBe(true)
  })
  it('normal card must be >= pile top rank', () => {
    expect(canPlayCardOnPile(makeCard(9), makeCard(8))).toBe(true)
    expect(canPlayCardOnPile(makeCard(8), makeCard(8))).toBe(true)
    expect(canPlayCardOnPile(makeCard(7), makeCard(8))).toBe(false)
    expect(canPlayCardOnPile(makeCard(3), makeCard(12))).toBe(false)
  })
})

// ---- getTopCard ----

describe('getTopCard', () => {
  it('returns null for empty pile', () => {
    expect(getTopCard([])).toBeNull()
  })
  it('returns last card', () => {
    const pile = [makeCard(5), makeCard(9)]
    expect(getTopCard(pile)).toEqual(makeCard(9))
  })
})

// ---- getPlayerSource ----

describe('getPlayerSource', () => {
  const emptyPalace = [
    { faceDown: null, faceUp: null },
    { faceDown: null, faceUp: null },
    { faceDown: null, faceUp: null },
  ]

  it('hand when player has cards in hand', () => {
    const p: Player = {
      id: 'p', name: 'P', hand: [makeCard(5)], palace: emptyPalace,
      setupPhase: 'done', setupCards: [],
    }
    expect(getPlayerSource(p, true)).toBe('hand')
  })
  it('palace-faceup when hand empty, draw pile empty, faceUp present', () => {
    const p: Player = {
      id: 'p', name: 'P', hand: [],
      palace: [
        { faceDown: null, faceUp: makeCard(5) },
        { faceDown: null, faceUp: null },
        { faceDown: null, faceUp: null },
      ],
      setupPhase: 'done', setupCards: [],
    }
    expect(getPlayerSource(p, true)).toBe('palace-faceup')
  })
  it('palace-facedown when hand and faceUp both empty, draw pile empty', () => {
    const p: Player = {
      id: 'p', name: 'P', hand: [],
      palace: [
        { faceDown: makeCard(5), faceUp: null },
        { faceDown: null, faceUp: null },
        { faceDown: null, faceUp: null },
      ],
      setupPhase: 'done', setupCards: [],
    }
    expect(getPlayerSource(p, true)).toBe('palace-facedown')
  })
  it('none when completely empty', () => {
    const p: Player = {
      id: 'p', name: 'P', hand: [], palace: emptyPalace,
      setupPhase: 'done', setupCards: [],
    }
    expect(getPlayerSource(p, true)).toBe('none')
  })
})

// ---- Setup phase ----

describe('selectFaceDownCards', () => {
  it('places 3 cards face-down in palace', () => {
    const s = initGame(['Alice', 'Bob'])
    const player = s.players[0]
    const ids = player.setupCards.slice(0, 3).map(c => c.id)
    const next = selectFaceDownCards(s, 'player-0', ids)
    const slots = next.players[0].palace
    expect(slots[0].faceDown).not.toBeNull()
    expect(slots[1].faceDown).not.toBeNull()
    expect(slots[2].faceDown).not.toBeNull()
  })
  it('advances setupPhase to select-faceup', () => {
    const s = initGame(['Alice', 'Bob'])
    const ids = s.players[0].setupCards.slice(0, 3).map(c => c.id)
    const next = selectFaceDownCards(s, 'player-0', ids)
    expect(next.players[0].setupPhase).toBe('select-faceup')
  })
  it('throws if not exactly 3 cards', () => {
    const s = initGame(['Alice', 'Bob'])
    const ids = s.players[0].setupCards.slice(0, 2).map(c => c.id)
    expect(() => selectFaceDownCards(s, 'player-0', ids)).toThrow('Must select exactly 3 cards')
  })
  it('throws if called in wrong phase', () => {
    const s = initGame(['Alice', 'Bob'])
    const ids = s.players[0].setupCards.slice(0, 3).map(c => c.id)
    const s2 = selectFaceDownCards(s, 'player-0', ids)
    // player-0 is now in select-faceup phase, calling facedown again should throw
    const moreIds = s2.players[0].setupCards.slice(0, 3).map(c => c.id)
    expect(() => selectFaceDownCards(s2, 'player-0', moreIds)).toThrow('Wrong setup phase')
  })
  it('increments version', () => {
    const s = initGame(['Alice', 'Bob'])
    const ids = s.players[0].setupCards.slice(0, 3).map(c => c.id)
    const next = selectFaceDownCards(s, 'player-0', ids)
    expect(next.version).toBe(s.version + 1)
  })
})

describe('selectFaceUpCards', () => {
  function afterFaceDown(playerId: string): GameState {
    const s = initGame(['Alice', 'Bob'])
    const player = s.players.find(p => p.id === playerId)!
    const ids = player.setupCards.slice(0, 3).map(c => c.id)
    return selectFaceDownCards(s, playerId, ids)
  }

  it('puts 3 cards face-up and remaining 3 in hand', () => {
    const s = afterFaceDown('player-0')
    const player = s.players[0]
    const faceUpIds = player.setupCards.slice(0, 3).map(c => c.id)
    const next = selectFaceUpCards(s, 'player-0', faceUpIds)
    const p = next.players[0]
    expect(p.palace.filter(sl => sl.faceUp !== null)).toHaveLength(3)
    expect(p.hand).toHaveLength(3)
    expect(p.setupCards).toHaveLength(0)
    expect(p.setupPhase).toBe('done')
  })
  it('transitions game to playing phase when all players done', () => {
    let s = initGame(['Alice', 'Bob'])
    // Setup player-0
    const p0ids = s.players[0].setupCards.slice(0, 3).map(c => c.id)
    s = selectFaceDownCards(s, 'player-0', p0ids)
    const p0faceup = s.players[0].setupCards.slice(0, 3).map(c => c.id)
    s = selectFaceUpCards(s, 'player-0', p0faceup)
    // Setup player-1
    const p1fd = s.players[1].setupCards.slice(0, 3).map(c => c.id)
    s = selectFaceDownCards(s, 'player-1', p1fd)
    const p1fu = s.players[1].setupCards.slice(0, 3).map(c => c.id)
    s = selectFaceUpCards(s, 'player-1', p1fu)
    expect(s.phase).toBe('playing')
  })
})

// ---- playCards ----

describe('playCards - basic validation', () => {
  it('throws when not in playing phase', () => {
    const s = initGame(['Alice', 'Bob'])
    expect(() => playCards(s, 'player-0', ['x'])).toThrow('Game not in play phase')
  })
  it('throws when not your turn', () => {
    const s = stateWithHand('player-0', [makeCard(5)], [], 0)
    expect(() => playCards(s, 'player-1', ['5-spades'])).toThrow('Not your turn')
  })
  it('throws when no card ids provided', () => {
    const s = stateWithHand('player-0', [makeCard(5)], [makeCard(4)], 0)
    expect(() => playCards(s, 'player-0', [])).toThrow('Must play at least one card')
  })
  it('throws when cards are different ranks', () => {
    const hand = [makeCard(5, 'spades', 'c1'), makeCard(6, 'hearts', 'c2')]
    const s = stateWithHand('player-0', hand, [makeCard(3)], 0)
    expect(() => playCards(s, 'player-0', ['c1', 'c2'])).toThrow('All cards must be same rank')
  })
  it('throws when card cannot be played on pile', () => {
    const hand = [makeCard(5, 'spades', 'c1')]
    const s = stateWithHand('player-0', hand, [makeCard(9)], 0)
    expect(() => playCards(s, 'player-0', ['c1'])).toThrow('Cannot play this card')
  })
})

describe('playCards - normal play', () => {
  it('adds played card to pickup pile', () => {
    const hand = [makeCard(8, 'spades', 'c1')]
    const s = stateWithHand('player-0', hand, [makeCard(5)], 0)
    const next = playCards(s, 'player-0', ['c1'])
    expect(next.pickupPile.at(-1)?.rank).toBe(8)
  })
  it('removes played card from hand', () => {
    const hand = [makeCard(8, 'spades', 'c1'), makeCard(9, 'spades', 'c2')]
    const s = stateWithHand('player-0', hand, [makeCard(5)], 0)
    const next = playCards(s, 'player-0', ['c1'])
    expect(next.players[0].hand.find(c => c.id === 'c1')).toBeUndefined()
  })
  it('advances turn to next player', () => {
    // Give player-0 two cards so they are not eliminated after playing one
    const hand = [makeCard(8, 'spades', 'c1'), makeCard(9, 'hearts', 'c2')]
    const s = stateWithHand('player-0', hand, [makeCard(5)], 0)
    const next = playCards(s, 'player-0', ['c1'])
    expect(next.currentPlayerIndex).toBe(1)
  })
  it('increments version', () => {
    const hand = [makeCard(8, 'spades', 'c1')]
    const s = stateWithHand('player-0', hand, [makeCard(5)], 0)
    const next = playCards(s, 'player-0', ['c1'])
    expect(next.version).toBe(s.version + 1)
  })
  it('can play multiple cards of the same rank', () => {
    const hand = [makeCard(8, 'spades', 'c1'), makeCard(8, 'hearts', 'c2')]
    const s = stateWithHand('player-0', hand, [makeCard(5)], 0)
    const next = playCards(s, 'player-0', ['c1', 'c2'])
    expect(next.pickupPile).toHaveLength(3) // original pile card + 2 played
  })
})

describe('playCards - 10 wipeout', () => {
  it('clears pickup pile on 10', () => {
    const hand = [makeCard(10, 'spades', 'ten')]
    const pile = [makeCard(5), makeCard(7), makeCard(9)]
    const s = stateWithHand('player-0', hand, pile, 0)
    const next = playCards(s, 'player-0', ['ten'])
    expect(next.pickupPile).toHaveLength(0)
  })
  it('moves cards to discard pile on 10', () => {
    const hand = [makeCard(10, 'spades', 'ten')]
    const pile = [makeCard(5)]
    const s = stateWithHand('player-0', hand, pile, 0)
    const next = playCards(s, 'player-0', ['ten'])
    expect(next.discardPile.length).toBeGreaterThan(0)
  })
  it('sets waitingForBonus to 10 after wipeout', () => {
    const hand = [makeCard(10, 'spades', 'ten'), makeCard(5, 'hearts', 'c2')]
    const pile = [makeCard(5)]
    const s = stateWithHand('player-0', hand, pile, 0)
    const next = playCards(s, 'player-0', ['ten'])
    expect(next.waitingForBonus?.type).toBe('10')
  })
  it('lastAction type is slam', () => {
    const hand = [makeCard(10, 'spades', 'ten')]
    const s = stateWithHand('player-0', hand, [makeCard(3)], 0)
    const next = playCards(s, 'player-0', ['ten'])
    expect(next.lastAction?.type).toBe('slam')
  })
})

describe('playCards - four of a kind wipeout', () => {
  it('clears pile when four of same rank appear', () => {
    const fourCards = [
      makeCard(8, 'spades', 'a'),
      makeCard(8, 'hearts', 'b'),
      makeCard(8, 'clubs', 'c'),
    ]
    // pile already has one 8
    const pile = [makeCard(8, 'diamonds', 'd')]
    const s = stateWithHand('player-0', fourCards, pile, 0)
    const next = playCards(s, 'player-0', ['a', 'b', 'c'])
    expect(next.pickupPile).toHaveLength(0)
    expect(next.lastAction?.type).toBe('wipeout')
  })
})

describe('playCards - 2 bonus', () => {
  it('sets waitingForBonus to "2" after playing 2', () => {
    const hand = [makeCard(2, 'spades', 'two'), makeCard(5, 'hearts', 'five')]
    const pile = [makeCard(9)]
    const s = stateWithHand('player-0', hand, pile, 0)
    const next = playCards(s, 'player-0', ['two'])
    expect(next.waitingForBonus?.type).toBe('2')
  })
})

describe('playCards - face-down palace', () => {
  it('picks up pile when face-down card cannot be played', () => {
    const s = makePlayingState()
    // Arrange: player-0 has empty hand, empty draw pile, one face-down card that cannot beat pile
    const player = s.players[0]
    player.hand = []
    player.palace = [
      { faceDown: makeCard(3, 'spades', 'fd'), faceUp: null },
      { faceDown: null, faceUp: null },
      { faceDown: null, faceUp: null },
    ]
    s.drawPile = []
    s.pickupPile = [makeCard(9, 'hearts', 'p1'), makeCard(12, 'spades', 'p2')]
    s.waitingForBonus = null
    s.pendingCounter = null
    s.drawBonus = null
    s.currentPlayerIndex = 0

    const next = playCards(s, 'player-0', ['fd'])
    // Picked up the pile (card was invalid)
    expect(next.players[0].hand.length).toBeGreaterThan(0)
    expect(next.pickupPile).toHaveLength(0)
    expect(next.lastAction?.type).toBe('palace-invalid')
  })
})

// ---- pickupPile ----

describe('pickupPile', () => {
  it('moves pickup pile to player hand', () => {
    const pile = [makeCard(5, 'spades', 'p1'), makeCard(9, 'hearts', 'p2')]
    const s = stateWithHand('player-0', [], pile, 0)
    const next = pickupPile(s, 'player-0')
    expect(next.players[0].hand).toHaveLength(2)
    expect(next.pickupPile).toHaveLength(0)
  })
  it('advances turn', () => {
    const s = stateWithHand('player-0', [], [makeCard(5)], 0)
    const next = pickupPile(s, 'player-0')
    expect(next.currentPlayerIndex).toBe(1)
  })
  it('throws when not your turn', () => {
    const s = stateWithHand('player-0', [], [makeCard(5)], 0)
    expect(() => pickupPile(s, 'player-1')).toThrow('Not your turn')
  })
  it('clears drawBonus and pendingCounter', () => {
    const s = stateWithHand('player-0', [], [makeCard(5)], 0)
    s.drawBonus = { playerId: 'player-0' }
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    const next = pickupPile(s, 'player-0')
    expect(next.drawBonus).toBeNull()
    expect(next.pendingCounter).toBeNull()
  })
})

// ---- skipDrawBonus ----

describe('skipDrawBonus', () => {
  it('clears drawBonus and advances turn when no counter pending', () => {
    const s = stateWithHand('player-0', [makeCard(8, 'spades', 'c1')], [makeCard(8, 'hearts', 'p1')], 0)
    s.drawBonus = { playerId: 'player-0' }
    const next = skipDrawBonus(s, 'player-0')
    expect(next.drawBonus).toBeNull()
    expect(next.currentPlayerIndex).toBe(1)
  })
  it('clears pendingCounter when counter window was open', () => {
    const s = stateWithHand('player-0', [makeCard(8, 'spades', 'c1')], [makeCard(8, 'hearts', 'p1')], 1)
    s.drawBonus = { playerId: 'player-0' }
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    const next = skipDrawBonus(s, 'player-0')
    expect(next.pendingCounter).toBeNull()
    expect(next.drawBonus).toBeNull()
  })
  it('throws when no drawBonus pending', () => {
    const s = stateWithHand('player-0', [], [], 0)
    expect(() => skipDrawBonus(s, 'player-0')).toThrow('No draw bonus pending')
  })
})

// ---- playDrawBonus ----

describe('playDrawBonus', () => {
  it('plays matching card and clears drawBonus', () => {
    const hand = [makeCard(8, 'spades', 'c1'), makeCard(8, 'hearts', 'c2')]
    const pile = [makeCard(8, 'diamonds', 'p1')]
    const s = stateWithHand('player-0', hand, pile, 0)
    s.drawBonus = { playerId: 'player-0' }
    const next = playDrawBonus(s, 'player-0', ['c1'])
    expect(next.drawBonus).toBeNull()
    expect(next.pickupPile.length).toBe(2)
  })
  it('throws when card rank does not match pile top', () => {
    const hand = [makeCard(9, 'spades', 'c1')]
    const pile = [makeCard(8, 'diamonds', 'p1')]
    const s = stateWithHand('player-0', hand, pile, 0)
    s.drawBonus = { playerId: 'player-0' }
    expect(() => playDrawBonus(s, 'player-0', ['c1'])).toThrow()
  })
  it('throws when no drawBonus pending', () => {
    const s = stateWithHand('player-0', [makeCard(8, 'spades', 'c1')], [makeCard(8, 'hearts', 'p1')], 0)
    expect(() => playDrawBonus(s, 'player-0', ['c1'])).toThrow('No draw bonus pending')
  })
})

// ---- passCounter / playCounter ----

describe('passCounter', () => {
  it('clears pendingCounter and gives turn back to bonus player', () => {
    const s = stateWithHand('player-0', [makeCard(5)], [makeCard(8)], 1)
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    s.drawBonus = { playerId: 'player-0' }
    const next = passCounter(s, 'player-1')
    expect(next.pendingCounter).toBeNull()
    expect(next.currentPlayerIndex).toBe(0) // bonus player
  })
  it('throws when no counter pending', () => {
    const s = stateWithHand('player-0', [], [], 1)
    expect(() => passCounter(s, 'player-1')).toThrow('No counter opportunity pending')
  })
  it('throws when not the counter player', () => {
    const s = stateWithHand('player-0', [], [], 1)
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    expect(() => passCounter(s, 'player-0')).toThrow('Not your turn to counter')
  })
})

describe('playCounter', () => {
  it('cancels drawBonus when counter player plays a valid card', () => {
    const hand1 = [makeCard(9, 'hearts', 'c1')]
    const pile = [makeCard(8, 'spades', 'p1')]
    const s = stateWithHand('player-0', [makeCard(8, 'diamonds', 'bonus')], pile, 1)
    s.players[1].hand = hand1
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    s.drawBonus = { playerId: 'player-0' }
    const next = playCounter(s, 'player-1', ['c1'])
    expect(next.pendingCounter).toBeNull()
    expect(next.drawBonus).toBeNull()
  })
  it('throws when not the counter player', () => {
    const s = stateWithHand('player-0', [], [makeCard(8)], 1)
    s.pendingCounter = { type: 'drawBonus', bonusPlayerId: 'player-0' }
    expect(() => playCounter(s, 'player-0', ['x'])).toThrow('Not your turn to counter')
  })
})

// ---- canStealTurn ----

describe('canStealTurn', () => {
  it('returns null on empty pile', () => {
    const s = stateWithHand('player-1', [makeCard(8, 'spades', 'c1')], [], 0)
    expect(canStealTurn(s, 'player-1')).toBeNull()
  })
  it('returns null when pile already has four of a kind', () => {
    const pile = [
      makeCard(8, 'spades', 'a'),
      makeCard(8, 'hearts', 'b'),
      makeCard(8, 'clubs', 'c'),
      makeCard(8, 'diamonds', 'd'),
    ]
    const s = stateWithHand('player-1', [makeCard(8, 'spades', 'e')], pile, 0)
    expect(canStealTurn(s, 'player-1')).toBeNull()
  })
  it('returns steal cards when player can complete four of a kind', () => {
    const pile = [makeCard(8, 'spades', 'a'), makeCard(8, 'hearts', 'b'), makeCard(8, 'clubs', 'c')]
    const hand = [makeCard(8, 'diamonds', 'e')]
    const s = stateWithHand('player-1', hand, pile, 0)
    const result = canStealTurn(s, 'player-1')
    expect(result).not.toBeNull()
    expect(result![0].rank).toBe(8)
  })
  it('returns null when player does not have enough matching cards', () => {
    const pile = [makeCard(8, 'spades', 'a'), makeCard(8, 'hearts', 'b')]
    // need 2 more 8s but only have 1
    const s = stateWithHand('player-1', [makeCard(8, 'diamonds', 'c')], pile, 0)
    expect(canStealTurn(s, 'player-1')).toBeNull()
  })
})

// ---- stealTurn ----

describe('stealTurn', () => {
  it('wipes pile and gives bonus turn to stealer', () => {
    const pile = [makeCard(8, 'spades', 'a'), makeCard(8, 'hearts', 'b'), makeCard(8, 'clubs', 'c')]
    const s = stateWithHand('player-1', [makeCard(8, 'diamonds', 'd')], pile, 0)
    // Give player-1 a face-down palace card so they are not immediately eliminated after the steal
    s.players[1].palace[0].faceDown = makeCard(5, 'clubs', 'fd-extra')
    const next = stealTurn(s, 'player-1', ['d'])
    expect(next.pickupPile).toHaveLength(0)
    expect(next.waitingForBonus?.type).toBe('four-of-a-kind')
    expect(next.lastAction?.type).toBe('wipeout')
  })
  it('throws when steal is not possible', () => {
    const s = stateWithHand('player-1', [makeCard(5)], [makeCard(8)], 0)
    expect(() => stealTurn(s, 'player-1', ['5-spades'])).toThrow('Cannot steal')
  })
})

// ---- Player elimination ----

describe('player elimination', () => {
  it('player-1 becomes loser when player-0 clears all cards in a 2-player game', () => {
    // Player-0 plays their last card with empty draw pile and empty palace.
    // Player-1 still has cards → becomes the loser.
    const s = makePlayingState()
    const p0 = s.players[0]
    p0.hand = [makeCard(6, 'spades', 'last')]
    p0.palace = [{ faceDown: null, faceUp: null }, { faceDown: null, faceUp: null }, { faceDown: null, faceUp: null }]
    // Ensure player-1 still has at least one card so they can be the loser
    s.players[1].hand = [makeCard(9, 'hearts', 'p1card')]
    s.players[1].palace = [{ faceDown: null, faceUp: null }, { faceDown: null, faceUp: null }, { faceDown: null, faceUp: null }]
    s.eliminated = []
    s.drawPile = []
    s.pickupPile = [makeCard(3)]
    s.currentPlayerIndex = 0
    s.waitingForBonus = null
    s.pendingCounter = null
    s.drawBonus = null

    const next = playCards(s, 'player-0', ['last'])
    expect(next.phase).toBe('finished')
    expect(next.loser).toBe('player-1')
  })
})

// ---- computeGameRankings ----

describe('computeGameRankings', () => {
  it('returns eliminated players in order, loser last', () => {
    const s = makePlayingState()
    s.eliminated = ['player-0']
    s.loser = 'player-1'
    expect(computeGameRankings(s)).toEqual(['player-0', 'player-1'])
  })
  it('returns empty array when no one eliminated yet', () => {
    const s = makePlayingState()
    expect(computeGameRankings(s)).toEqual([])
  })
})

// ---- resetGame ----

describe('resetGame', () => {
  it('resets phase to setup', () => {
    const s = makePlayingState()
    s.phase = 'finished'
    s.loser = 'player-0'
    const next = resetGame(s)
    expect(next.phase).toBe('setup')
  })
  it('carries version forward', () => {
    const s = makePlayingState()
    s.version = 5
    const next = resetGame(s)
    expect(next.version).toBe(6)
  })
  it('loser becomes dealer (currentPlayerIndex skips dealer)', () => {
    const s = makePlayingState()
    s.loser = 'player-0'
    const next = resetGame(s)
    // dealerIndex should be 0 (the loser), so currentPlayerIndex = 1
    expect(next.dealerIndex).toBe(0)
  })
  it('preserves player stats', () => {
    const s = makePlayingState()
    s.players[0].stats = { gold: 1, silver: 0, bronze: 0, losses: 0, gamesPlayed: 1 }
    const next = resetGame(s)
    expect(next.players[0].stats?.gold).toBe(1)
  })
})

// ---- requestNewGame ----

describe('requestNewGame', () => {
  it('adds player id to newGameRequested', () => {
    const s = makePlayingState()
    const next = requestNewGame(s, 'player-0')
    expect(next.newGameRequested).toContain('player-0')
  })
  it('does not duplicate if called twice', () => {
    const s = makePlayingState()
    const s2 = requestNewGame(s, 'player-0')
    const s3 = requestNewGame(s2, 'player-0')
    expect(s3.newGameRequested?.filter(id => id === 'player-0')).toHaveLength(1)
  })
  it('increments version', () => {
    const s = makePlayingState()
    const next = requestNewGame(s, 'player-0')
    expect(next.version).toBe(s.version + 1)
  })
})

// ---- nudgeCurrentPlayer ----

describe('nudgeCurrentPlayer', () => {
  it('increments nudgeCount', () => {
    const s = makePlayingState()
    const next = nudgeCurrentPlayer(s)
    expect(next.nudgeCount).toBe((s.nudgeCount ?? 0) + 1)
  })
  it('sets lastAction to nudge', () => {
    const s = makePlayingState()
    const next = nudgeCurrentPlayer(s)
    expect(next.lastAction?.type).toBe('nudge')
  })
})

// ---- playBonusAction ----

describe('playBonusAction', () => {
  it('throws when no bonus pending', () => {
    const s = stateWithHand('player-0', [makeCard(5, 'spades', 'c1')], [makeCard(3)], 0)
    expect(() => playBonusAction(s, 'player-0', ['c1'])).toThrow('No bonus action pending')
  })
  it('plays card and clears waitingForBonus for 10 bonus', () => {
    const hand = [makeCard(7, 'spades', 'c1')]
    const s = stateWithHand('player-0', hand, [], 0)
    s.waitingForBonus = { type: '10' }
    const next = playBonusAction(s, 'player-0', ['c1'])
    expect(next.waitingForBonus).toBeNull()
    expect(next.pickupPile.length).toBeGreaterThan(0)
  })
  it('throws on empty cardIds', () => {
    const s = stateWithHand('player-0', [makeCard(5)], [], 0)
    s.waitingForBonus = { type: '10' }
    expect(() => playBonusAction(s, 'player-0', [])).toThrow('Must play at least one card')
  })
})

// ---- AI ----

describe('aiSetup', () => {
  it('completes setup phase for a player', () => {
    const s = initGame(['Alice', 'Bob'])
    const next = aiSetup(s, 'player-0')
    expect(next.players[0].setupPhase).toBe('done')
  })
  it('places 3 face-down and 3 face-up cards', () => {
    const s = initGame(['Alice', 'Bob'])
    const next = aiSetup(s, 'player-0')
    const palace = next.players[0].palace
    expect(palace.filter(sl => sl.faceDown !== null)).toHaveLength(3)
    expect(palace.filter(sl => sl.faceUp !== null)).toHaveLength(3)
  })
  it('leaves 3 cards in hand', () => {
    const s = initGame(['Alice', 'Bob'])
    const next = aiSetup(s, 'player-0')
    expect(next.players[0].hand).toHaveLength(3)
  })
})
