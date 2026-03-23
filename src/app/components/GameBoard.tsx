import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GameState, Card, Player,
  getPlayableCards, getBonusPlayableCards, getPlayerSource,
  canStealTurn, getRankDisplay, getSuitSymbol, getSuitColor,
  playCards, playBonusAction, pickupPile, stealTurn,
  playDrawBonus,
  playCounter, passCounter, getCounterPlayableCards, aiHandleCounter,
  selectFaceDownCards, selectFaceUpCards,
  aiSetup, aiPlayTurn, checkAISteal,
  deepClone,
} from '../game-engine';
import { PlayingCard, CardStack } from './PlayingCard';
import { PalaceDisplay } from './PalaceDisplay';
import { HowToPlayModal } from './HowToPlayModal';

// Seeded random per card ID for consistent rotations
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return ((hash & 0x7fffffff) % 1000) / 1000;
}

function getCardRotation(cardId: string, range: number = 5): number {
  const r = seededRandom(cardId);
  return (r * range * 2) - range;
}

interface GameBoardProps {
  gameState: GameState;
  myPlayerId: string;
  onStateChange: (state: GameState) => void;
  isMultiplayer?: boolean;
}

export function GameBoard({ gameState, myPlayerId, onStateChange, isMultiplayer }: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [showLog, setShowLog] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [animEffect, setAnimEffect] = useState<'slam' | 'sparkle' | 'wipeout' | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const prevVersionRef = useRef(gameState.version);
  const [miniOpponents, setMiniOpponents] = useState(false);

  const me = gameState.players.find(p => p.id === myPlayerId)!;
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const source = me ? getPlayerSource(me, gameState.drawPile.length === 0) : 'hand';
  const isSetup = gameState.phase === 'setup';
  const isPlaying = gameState.phase === 'playing';
  const isFinished = gameState.phase === 'finished';
  const isEliminated = (gameState.eliminated || []).includes(myPlayerId);

  // Palace visibility logic
  const palaceHasCards = me.palace.some(s => s.faceUp !== null || s.faceDown !== null);
  const palaceIsActive = isSetup || (isPlaying && me.hand.length === 0 && gameState.drawPile.length === 0 && palaceHasCards);
  const showPalace = isSetup || palaceHasCards;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [gameState.log.length]);

  // Handle animations based on lastAction
  useEffect(() => {
    if (gameState.version !== prevVersionRef.current) {
      const action = gameState.lastAction;
      if (action?.type === 'slam') {
        setAnimEffect('wipeout');
        setTimeout(() => setAnimEffect(null), 3500);
      } else if (action?.type === 'sparkle') {
        setAnimEffect('sparkle');
        setTimeout(() => setAnimEffect(null), 1500);
      } else if (action?.type === 'wipeout') {
        setAnimEffect('wipeout');
        setTimeout(() => setAnimEffect(null), 4500);
      }
      prevVersionRef.current = gameState.version;
    }
  }, [gameState.version]);

  // Only clear selections when it's not setup phase in multiplayer, or when the turn changes
  useEffect(() => {
    if (isMultiplayer && isSetup) return; // Don't clear during multiplayer setup
    setSelectedCards([]);
    setError('');
  }, [gameState.version]);

  // AI turns for robot mode
  useEffect(() => {
    if (isMultiplayer || !isPlaying) return;
    if (isMyTurn) return;

    const timer = setTimeout(() => {
      try {
        // Handle pending counter for AI
        if (gameState.pendingCounter) {
          const newState = aiHandleCounter(gameState);
          onStateChange(newState);
          return;
        }
        const stealState = checkAISteal(gameState);
        if (stealState) { onStateChange(stealState); return; }
        const newState = aiPlayTurn(gameState);
        onStateChange(newState);
      } catch (e) { console.log('AI error:', e); }
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState.version, isMyTurn, isPlaying, isMultiplayer]);

  // AI setup for robot mode
  useEffect(() => {
    if (isMultiplayer || !isSetup) return;
    const timer = setTimeout(() => {
      let s = deepClone(gameState);
      for (const p of s.players) {
        if (p.id === myPlayerId) continue;
        if (p.setupPhase !== 'done') s = aiSetup(s, p.id);
      }
      if (s.version !== gameState.version) onStateChange(s);
    }, 800);
    return () => clearTimeout(timer);
  }, [gameState.version, isSetup, isMultiplayer]);

  const toggleCard = (cardId: string) => {
    setError('');
    if (isSetup) {
      const maxSelect = me.setupPhase === 'select-facedown' ? 3 : me.setupPhase === 'select-faceup' ? 3 : 0;
      setSelectedCards(prev => {
        if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
        if (prev.length >= maxSelect) return prev;
        return [...prev, cardId];
      });
      return;
    }
    setSelectedCards(prev => {
      if (prev.includes(cardId)) return prev.filter(id => id !== cardId);
      const allCards = source === 'hand' ? me.hand : me.palace.filter(s => s.faceUp).map(s => s.faceUp!);
      const newCard = allCards.find(c => c.id === cardId);
      if (prev.length > 0 && newCard) {
        const existingCard = allCards.find(c => c.id === prev[0]);
        if (existingCard && existingCard.rank !== newCard.rank) return [cardId];
      }
      return [...prev, cardId];
    });
  };

  const handleConfirmSetup = () => {
    try {
      if (me.setupPhase === 'select-facedown') {
        if (selectedCards.length !== 3) { setError('Select exactly 3 cards'); return; }
        const newState = selectFaceDownCards(gameState, myPlayerId, selectedCards);
        setSelectedCards([]);
        onStateChange(newState);
      } else if (me.setupPhase === 'select-faceup') {
        if (selectedCards.length !== 3) { setError('Select exactly 3 cards'); return; }
        const newState = selectFaceUpCards(gameState, myPlayerId, selectedCards);
        setSelectedCards([]);
        onStateChange(newState);
      }
    } catch (e: any) { setError(e.message); }
  };

  const handlePlay = () => {
    try {
      if (selectedCards.length === 0) { setError('Select cards to play'); return; }
      let newState: GameState;
      if (hasPendingCounter) {
        newState = playCounter(gameState, myPlayerId, selectedCards);
      } else if (hasDrawBonus) {
        newState = playDrawBonus(gameState, myPlayerId, selectedCards);
      } else if (gameState.waitingForBonus) {
        newState = playBonusAction(gameState, myPlayerId, selectedCards);
      } else {
        newState = playCards(gameState, myPlayerId, selectedCards);
      }
      setSelectedCards([]);
      onStateChange(newState);
    } catch (e: any) { setError(e.message); }
  };

  const handlePickup = () => {
    try {
      const newState = pickupPile(gameState, myPlayerId);
      setSelectedCards([]);
      onStateChange(newState);
    } catch (e: any) { setError(e.message); }
  };

  const handleFaceDownPlay = (slotIndex: number) => {
    try {
      const card = me.palace[slotIndex].faceDown;
      if (!card) return;
      let newState: GameState;
      if (hasPendingCounter) {
        newState = playCounter(gameState, myPlayerId, [card.id]);
      } else if (gameState.waitingForBonus) {
        newState = playBonusAction(gameState, myPlayerId, [card.id]);
      } else {
        newState = playCards(gameState, myPlayerId, [card.id]);
      }
      onStateChange(newState);
    } catch (e: any) { setError(e.message); }
  };

  const handleSteal = () => {
    try {
      const stealCards = canStealTurn(gameState, myPlayerId);
      if (!stealCards) { setError("Can't steal"); return; }
      const newState = stealTurn(gameState, myPlayerId, stealCards.map(c => c.id));
      onStateChange(newState);
    } catch (e: any) { setError(e.message); }
  };

  const myStealCards = isPlaying && !isMyTurn ? canStealTurn(gameState, myPlayerId) : null;
  const hasDrawBonus = !!(gameState.drawBonus && gameState.drawBonus.playerId === myPlayerId);
  // Allow play when it's our turn OR when we have an active draw bonus (simultaneous action window)
  const canPlay = (isMyTurn || hasDrawBonus) && isPlaying && !isEliminated;
  const hasPendingCounter = !!(gameState.pendingCounter && isMyTurn);
  const counterPlayableCardIds = hasPendingCounter
    ? getCounterPlayableCards(gameState, myPlayerId).map(c => c.id)
    : [];
  const drawBonusRank = hasDrawBonus && gameState.pickupPile.length > 0
    ? gameState.pickupPile[gameState.pickupPile.length - 1].rank
    : null;
  const playableCardIds = canPlay
    ? (hasPendingCounter
      ? counterPlayableCardIds
      : hasDrawBonus && drawBonusRank !== null
        ? me.hand.filter(c => c.rank === drawBonusRank).map(c => c.id)
        : (gameState.waitingForBonus
          ? getBonusPlayableCards(gameState, myPlayerId)
          : getPlayableCards(gameState, myPlayerId)
        ).map(c => c.id)
    )
    : [];

  const opponents = gameState.players.filter(p => p.id !== myPlayerId);
  const sortedHand = [...me.hand].sort((a, b) => a.rank - b.rank);

  // When hand > 12, separate active (playable) cards from inactive for compact display
  const shouldMinimize = isPlaying && source === 'hand' && sortedHand.length > 12 && canPlay;
  const activeCards = shouldMinimize ? sortedHand.filter(c => playableCardIds.includes(c.id)) : sortedHand;
  const inactiveCards = shouldMinimize ? sortedHand.filter(c => !playableCardIds.includes(c.id)) : [];

  // Pile cards for display (show up to 5 beneath top card)
  const pileCards = gameState.pickupPile.slice(-6);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-900 to-green-800 text-white overflow-hidden relative">
      {/* Animation overlays */}
      <AnimatePresence>
        {animEffect === 'slam' && (
          <motion.div
            key="slam"
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Dust cloud */}
            <motion.div
              className="absolute w-48 h-48 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(139,90,43,0.6) 0%, rgba(139,90,43,0) 70%)' }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 2.5, 3], opacity: [0, 0.8, 0] }}
              transition={{ duration: 3.5, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute w-32 h-32 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(200,150,50,0.5) 0%, transparent 70%)' }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 2, 2.5], opacity: [0, 0.6, 0] }}
              transition={{ duration: 2.5, ease: 'easeOut', delay: 0.2 }}
            />
            {/* Slam text */}
            <motion.div
              className="text-4xl font-black text-red-500 z-10"
              style={{ textShadow: '0 0 20px rgba(255,0,0,0.5)' }}
              initial={{ scale: 3, opacity: 0, rotate: -10 }}
              animate={{ scale: [3, 1, 1.1, 1], opacity: [0, 1, 1, 0], rotate: [-10, 0, 2, 0] }}
              transition={{ duration: 3.5, times: [0, 0.15, 0.5, 1] }}
            >
              SLAM!
            </motion.div>
          </motion.div>
        )}
        {animEffect === 'sparkle' && (
          <motion.div
            key="sparkle"
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: ['#FFD700', '#FF69B4', '#00BFFF', '#FF6347', '#7CFC00', '#FF00FF'][i % 6],
                  left: '50%', top: '45%',
                }}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: Math.cos((i / 12) * Math.PI * 2) * (60 + Math.random() * 40),
                  y: Math.sin((i / 12) * Math.PI * 2) * (60 + Math.random() * 40),
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            ))}
            <motion.div
              className="text-2xl font-black text-yellow-300"
              style={{ textShadow: '0 0 15px rgba(255,215,0,0.6)' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5 }}
            >
              ✨
            </motion.div>
          </motion.div>
        )}
        {animEffect === 'wipeout' && (
          <motion.div
            key="wipeout"
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-3xl font-black text-orange-400"
              style={{ textShadow: '0 0 20px rgba(255,165,0,0.5)' }}
              initial={{ scale: 0, opacity: 0, rotate: -15 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0], rotate: [-15, 5, 0] }}
              transition={{ duration: 4.5, times: [0, 0.2, 1] }}
            >
              WIPEOUT!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help modal */}
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}

      {/* Opponents area */}
      <div
        className="flex p-2 gap-2 shrink-0 overflow-x-auto cursor-pointer select-none"
        onClick={() => setMiniOpponents(v => !v)}
      >
        {opponents.map(opp => (
          <OpponentView
            key={opp.id}
            player={opp}
            isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === opp.id}
            isSetup={isSetup}
            isEliminated={(gameState.eliminated || []).includes(opp.id)}
            mini={miniOpponents}
          />
        ))}
        {opponents.length > 0 && (
          <div className="flex items-start pt-1 pl-1 shrink-0">
            <span className="text-[9px] text-green-500/60">{miniOpponents ? '＋' : '－'}</span>
          </div>
        )}
      </div>

      {/* Middle area: piles + log */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3 min-h-0">
        {/* Piles - larger */}
        <div className="flex items-center gap-6">
          <CardStack count={gameState.drawPile.length} label="Draw" />
          {/* Pile with visible cards underneath */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-16 h-24">
              {pileCards.map((card, i) => {
                const isTop = i === pileCards.length - 1;
                const rot = isTop ? 0 : getCardRotation(card.id, 12);
                const offsetY = isTop ? 0 : (pileCards.length - 1 - i) * 1;
                return (
                  <motion.div
                    key={card.id}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      zIndex: i,
                      transform: `rotate(${rot}deg) translateY(${offsetY}px)`,
                    }}
                    initial={isTop ? { y: 80, opacity: 0, scale: 0.8 } : false}
                    animate={isTop ? { y: 0, opacity: 1, scale: 1 } : undefined}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  >
                    <PileCard card={card} />
                  </motion.div>
                );
              })}
              {pileCards.length === 0 && (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600 flex items-center justify-center">
                  <span className="text-green-500 text-xs">Empty</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-green-300">
              Pile ({gameState.pickupPile.length})
            </span>
          </div>
          <CardStack count={gameState.discardPile.length} label="Discard" />
        </div>

        {/* Status */}
        <div className="text-center">
          {isFinished && (
            <div className="space-y-2">
              {gameState.loser ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                  <div className="text-red-400 font-black text-2xl">
                    💀 LOSER! 💀
                  </div>
                  <div className="text-yellow-300 font-bold text-lg">
                    {gameState.players.find(p => p.id === gameState.loser)?.name} is the Palace Player!
                  </div>
                  <div className="text-green-300 text-sm mt-1">
                    They deal next game!
                  </div>
                </motion.div>
              ) : gameState.winner ? (
                <div className="text-yellow-300 font-bold text-lg animate-bounce">
                  🏆 {gameState.players.find(p => p.id === gameState.winner)?.name} wins!
                </div>
              ) : null}
            </div>
          )}
          {isPlaying && !isFinished && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${(isMyTurn || hasDrawBonus) ? 'bg-yellow-500/30 text-yellow-200' : 'bg-white/10 text-green-200'}`}>
              {isEliminated
                ? "You're safe! Watching..."
                : hasPendingCounter
                  ? `Counter! ${gameState.pendingCounter!.type === 'four-of-a-kind' ? 'Play a card or pass' : 'Play to counter or pick up pile'}`
                  : hasDrawBonus
                    ? `Bonus! Play your ${getRankDisplay(drawBonusRank!)}s`
                    : isMyTurn
                      ? (gameState.waitingForBonus
                        ? `Bonus action (${gameState.waitingForBonus.type === '2' ? 'play a card' : 'start new pile'})`
                        : 'Your turn!')
                      : gameState.pendingCounter && !isMyTurn
                        ? `${currentPlayer?.name} may counter ${gameState.players.find(p => p.id === gameState.pendingCounter!.bonusPlayerId)?.name}'s bonus`
                        : `${currentPlayer?.name}'s turn`}
            </div>
          )}
          {isSetup && (
            <div className="text-sm text-green-200">
              {me.setupPhase === 'select-facedown'
                ? 'Select 3 cards for face-down palace (blind pick)'
                : me.setupPhase === 'select-faceup'
                ? 'Select 3 cards for face-up palace'
                : 'Waiting for others to set up...'}
            </div>
          )}
        </div>

        {/* Action Log (toggleable) */}
        <div className="w-full max-w-sm">
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-[9px] text-green-400 hover:text-green-300 mb-0.5"
          >
            {showLog ? 'Hide Log ▲' : 'Show Log ▼'}
          </button>
          {showLog && (
            <div
              ref={logRef}
              className="w-full max-h-20 overflow-y-auto bg-black/30 rounded-lg p-2 text-[10px] leading-tight space-y-0.5"
            >
              {gameState.log.slice(-10).map((msg, i) => (
                <div key={i} className="text-green-200">{msg}</div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-xs bg-red-900/40 px-3 py-1 rounded">{error}</div>
        )}
      </div>

      {/* My area - highlighted when my turn or draw bonus available */}
      <div className={`shrink-0 p-2 pb-4 space-y-2 transition-all duration-300 ${
        (isMyTurn || hasDrawBonus) && isPlaying ? 'bg-yellow-500/15 ring-1 ring-yellow-400/50 ring-inset' : 'bg-black/20'
      }`}>
        {/* My Palace - centered during setup/active, hidden when empty during play */}
        {showPalace && (
          <div className={`transition-all duration-300 ${palaceIsActive ? 'flex justify-center' : ''}`}>
            <PalaceDisplay
              palace={me.palace}
              isCurrentPlayer={canPlay}
              canPlayFaceUp={source === 'palace-faceup'}
              canPlayFaceDown={source === 'palace-facedown'}
              selectedCards={selectedCards}
              onCardClick={(card) => toggleCard(card.id)}
              onFaceDownClick={handleFaceDownPlay}
              playerName={(isMyTurn || hasDrawBonus) && isPlaying ? `⭐ ${me.name}'s Palace` : `${me.name}'s Palace`}
              centered={palaceIsActive}
              showRotation
            />
          </div>
        )}

        {/* My Hand / Setup Cards - overflow visible */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-green-300 font-medium">
            {isSetup
              ? me.setupPhase === 'select-facedown'
                ? 'Your 9 cards (pick 3 blindly)'
                : me.setupPhase === 'select-faceup'
                ? 'Pick 3 for palace face-up'
                : 'Setup complete'
              : `Hand (${me.hand.length})`}
          </span>
          <div className="flex flex-wrap justify-center gap-1 max-w-full overflow-visible pt-3 pb-1">
            {isSetup && me.setupPhase === 'select-facedown' && me.setupCards.map(card => (
              <PlayingCard
                key={card.id}
                faceDown
                small
                selected={selectedCards.includes(card.id)}
                onClick={() => toggleCard(card.id)}
              />
            ))}
            {isSetup && me.setupPhase === 'select-faceup' && me.setupCards.map(card => (
              <PlayingCard
                key={card.id}
                card={card}
                small
                selected={selectedCards.includes(card.id)}
                onClick={() => toggleCard(card.id)}
              />
            ))}
            {isPlaying && source === 'hand' && activeCards.map(card => {
              const isPlayable = playableCardIds.includes(card.id);
              const isSelected = selectedCards.includes(card.id);
              const selRotation = isSelected ? getCardRotation(card.id + '-sel', 5) : 0;
              return (
                <motion.div
                  key={card.id}
                  animate={{ rotate: selRotation, y: isSelected ? -8 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <PlayingCard
                    card={card}
                    small
                    selected={isSelected}
                    onClick={canPlay && isPlayable ? () => toggleCard(card.id) : undefined}
                    highlight={canPlay && isPlayable}
                    disabled={canPlay ? !isPlayable : !canPlay}
                  />
                </motion.div>
              );
            })}
            {isPlaying && source !== 'hand' && me.hand.length === 0 && (
              <span className="text-green-400 text-xs italic">
                {source === 'palace-faceup' ? 'Play from palace face-up cards' : source === 'palace-facedown' ? 'Play from palace face-down (blind)' : 'No cards!'}
              </span>
            )}
            {/* Minimized inactive cards row */}
            {shouldMinimize && inactiveCards.length > 0 && (
              <div className="flex flex-wrap justify-center gap-0.5 max-w-full px-1">
                <span className="text-[8px] text-green-500/60 w-full text-center mb-0.5">
                  Inactive ({inactiveCards.length})
                </span>
                {inactiveCards.map(card => (
                  <PlayingCard
                    key={card.id}
                    card={card}
                    mini
                    disabled
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons - below hand */}
        {isPlaying && !isFinished && !isEliminated && (
          <div className="flex gap-2 justify-center pt-1">
            {canPlay && (
              <>
                <button
                  onClick={handlePlay}
                  disabled={selectedCards.length === 0}
                  className="px-4 py-1.5 bg-yellow-500 text-black rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-yellow-400 active:scale-95 transition-all"
                >
                  Play
                </button>
                {hasPendingCounter && gameState.pendingCounter?.type === 'drawBonus' && (
                  <button
                    onClick={handlePickup}
                    className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-500 active:scale-95 transition-all"
                  >
                    Pick Up
                  </button>
                )}
                {hasPendingCounter && gameState.pendingCounter?.type === 'four-of-a-kind' && (
                  <button
                    onClick={() => {
                      try {
                        const newState = passCounter(gameState, myPlayerId);
                        setSelectedCards([]);
                        onStateChange(newState);
                      } catch (e: any) { setError(e.message); }
                    }}
                    className="px-4 py-1.5 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-500 active:scale-95 transition-all"
                  >
                    Pass
                  </button>
                )}
                {!gameState.waitingForBonus && !hasDrawBonus && !hasPendingCounter && (
                  <button
                    onClick={handlePickup}
                    disabled={playableCardIds.length > 0}
                    className="px-4 py-1.5 bg-red-600 text-white rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-red-500 active:scale-95 transition-all"
                  >
                    Pick Up
                  </button>
                )}
              </>
            )}
            {myStealCards && (
              <button
                onClick={handleSteal}
                className="px-4 py-1.5 bg-purple-600 text-white rounded-lg font-bold text-sm animate-pulse hover:bg-purple-500 active:scale-95 transition-all"
              >
                Steal! (4 of a kind)
              </button>
            )}
          </div>
        )}

        {isSetup && me.setupPhase !== 'done' && (
          <div className="flex justify-center pt-1">
            <button
              onClick={handleConfirmSetup}
              disabled={selectedCards.length !== 3}
              className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-yellow-400 active:scale-95 transition-all"
            >
              Confirm Selection ({selectedCards.length}/3)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Pile card - larger display
function PileCard({ card }: { card: Card }) {
  const color = getSuitColor(card.suit);
  const isRed = color === 'red';
  return (
    <div className={`w-16 h-24 rounded-lg border-2 bg-white flex flex-col items-start justify-between p-1 shadow-md border-gray-300`}>
      <div className={`text-sm font-bold leading-none ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getRankDisplay(card.rank)}
      </div>
      <div className={`self-center text-xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getSuitSymbol(card.suit)}
      </div>
      <div className={`text-sm font-bold leading-none self-end rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {getRankDisplay(card.rank)}
      </div>
    </div>
  );
}

function OpponentView({ player, isCurrentTurn, isSetup, isEliminated, mini }: {
  player: Player; isCurrentTurn: boolean; isSetup: boolean; isEliminated: boolean; mini?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 p-1.5 min-w-34 max-w-102 rounded-lg transition-all ${
      isEliminated ? 'bg-green-500/10 opacity-50' :
      isCurrentTurn ? 'bg-yellow-500/20 ring-1 ring-yellow-400' : 'bg-black/10'
    }`}>
      <span className="text-[10px] font-bold truncate max-w-26">
        {player.name} {isEliminated ? '✅' : isCurrentTurn ? '⭐' : ''}
      </span>
      {isSetup ? (
        <span className="text-[10px] text-green-300">
          {player.setupPhase === 'done' ? '✅ Ready' : '⏳ Setting up'}
        </span>
      ) : (
        <>
          <PalaceDisplay palace={player.palace} small={!mini} mini={mini} />
          <span className="text-[10px] text-green-300">
            {isEliminated ? 'Safe!' : `Hand: ${player.hand.length}`}
          </span>
        </>
      )}
    </div>
  );
}