import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  GameState, Card, Player, PlayerStats,
  getPlayableCards, getBonusPlayableCards, getPlayerSource,
  canStealTurn, getRankDisplay, getSuitSymbol, getSuitColor,
  playCards, playBonusAction, pickupPile, stealTurn,
  playDrawBonus,
  playCounter, getCounterPlayableCards, aiHandleCounter,
  selectFaceDownCards, selectFaceUpCards,
  aiSetup, aiPlayTurn, checkAISteal,
  deepClone,
  setPlayerEmoji, nudgeCurrentPlayer,
  setPlayerStats, computeGameRankings,
  revealFaceDownCards,
} from '../game-engine';
import { PlayingCard, CardStack } from './PlayingCard';
import { PalaceDisplay } from './PalaceDisplay';
import { HowToPlayModal } from './HowToPlayModal';
import { useSettings } from '../contexts/SettingsContext';

// Seeded random per card ID for consistent rotations
const DEFAULT_EMOJI = '🦆';
const STATS_KEY = 'palace-stats';

function loadLocalStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };
  }
}

function saveLocalStats(stats: PlayerStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

function getRankLabel(playerId: string, eliminated: string[]): string {
  const idx = eliminated.indexOf(playerId);
  if (idx === 0) return '🥇 Gold!';
  if (idx === 1) return '🥈 Silver!';
  if (idx === 2) return '🥉 Bronze!';
  if (idx >= 3) return '✅ Safe!';
  return 'Safe!';
}

// Returns a compact medal string like "🥇2 🥈1" or undefined if no medals
function formatStatsText(stats: PlayerStats | undefined): string | undefined {
  if (!stats) return undefined;
  const parts = [
    stats.gold > 0 ? `🥇${stats.gold}` : '',
    stats.silver > 0 ? `🥈${stats.silver}` : '',
    stats.bronze > 0 ? `🥉${stats.bronze}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

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
  playerEmoji?: string; // Local player's chosen emoji (for multiplayer emoji sync)
}

export function GameBoard({ gameState, myPlayerId, onStateChange, isMultiplayer, playerEmoji }: GameBoardProps) {
  const navigate = useNavigate();
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [showLog, setShowLog] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [animEffect, setAnimEffect] = useState<'slam' | 'sparkle' | 'wipeout' | 'palace-invalid' | 'pickup' | null>(null);
  const [animEmoji, setAnimEmoji] = useState<string | null>(null);
  const [palaceInvalidCard, setPalaceInvalidCard] = useState<Card | null>(null);
  const [palaceInvalidPlayerName, setPalaceInvalidPlayerName] = useState<string>('');
  const logRef = useRef<HTMLDivElement>(null);
  const prevVersionRef = useRef(gameState.version);
  const palaceInvalidTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevNudgeCountRef = useRef(gameState.nudgeCount ?? 0);
  const [miniOpponents, setMiniOpponents] = useState(false);
  const [leaderboardPhase, setLeaderboardPhase] = useState<'game' | 'alltime'>('game');
  const [palaceValidFlash, setPalaceValidFlash] = useState<string | null>(null);
  const { settings } = useSettings();

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
      if (settings.particleEffects) {
        if (action?.type === 'slam') {
          const emoji = gameState.players.find(p => p.id === action.playerId)?.emoji || DEFAULT_EMOJI;
          setAnimEmoji(emoji);
          setAnimEffect('wipeout');
          setTimeout(() => { setAnimEffect(null); setAnimEmoji(null); }, 3500);
        } else if (action?.type === 'sparkle') {
          const emoji = gameState.players.find(p => p.id === action.playerId)?.emoji || DEFAULT_EMOJI;
          setAnimEmoji(emoji);
          setAnimEffect('sparkle');
          setTimeout(() => { setAnimEffect(null); setAnimEmoji(null); }, 1500);
        } else if (action?.type === 'wipeout') {
          const emoji = gameState.players.find(p => p.id === action.playerId)?.emoji || DEFAULT_EMOJI;
          setAnimEmoji(emoji);
          setAnimEffect('wipeout');
          setTimeout(() => { setAnimEffect(null); setAnimEmoji(null); }, 4500);
        } else if (action?.type === 'pickup') {
          const emoji = gameState.players.find(p => p.id === action.playerId)?.emoji || DEFAULT_EMOJI;
          setAnimEmoji(emoji);
          setAnimEffect('pickup');
          setTimeout(() => { setAnimEffect(null); setAnimEmoji(null); }, 3000);
        }
      }
      if (action?.type === 'palace-invalid' && action.cards?.[0]) {
        const playerName = gameState.players.find(p => p.id === action.playerId)?.name ?? '';
        setPalaceInvalidCard(action.cards[0]);
        setPalaceInvalidPlayerName(playerName);
        setAnimEffect('palace-invalid');
        if (palaceInvalidTimerRef.current) clearTimeout(palaceInvalidTimerRef.current);
        palaceInvalidTimerRef.current = setTimeout(() => {
          setAnimEffect(null);
          setPalaceInvalidCard(null);
          setPalaceInvalidPlayerName('');
          palaceInvalidTimerRef.current = null;
        }, 3200);
      }
      prevVersionRef.current = gameState.version;
    }
  }, [gameState.version, settings.particleEffects]);

  // Cleanup palace-invalid timer on unmount
  useEffect(() => () => {
    if (palaceInvalidTimerRef.current) clearTimeout(palaceInvalidTimerRef.current);
  }, []);

  // Detect valid palace face-down reveal and trigger green flash
  useEffect(() => {
    if (gameState.lastAction?.type !== 'play') return;
    const actingPlayer = gameState.players.find(p => p.id === gameState.lastAction?.playerId);
    if (!actingPlayer) return;
    // Heuristic: player has no hand cards and draw pile is empty => palace phase
    const isPalacePhase = actingPlayer.hand.length === 0 && gameState.drawPile.length === 0;
    if (isPalacePhase) {
      setPalaceValidFlash(actingPlayer.id);
      setTimeout(() => setPalaceValidFlash(null), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.lastAction, gameState.version]);

  // Only clear selections when it's not setup phase in multiplayer, or when the turn changes
  useEffect(() => {
    if (isMultiplayer && isSetup) return; // Don't clear during multiplayer setup
    if (gameState.lastAction?.type === 'nudge') return; // Don't clear on nudge
    setSelectedCards([]);
    setError('');
  }, [gameState.version]);

  // Sync local player emoji to game state when game starts playing or emoji preference changes.
  // me.emoji in deps allows retry if a multiplayer conflict reset the emoji.
  useEffect(() => {
    if (!isPlaying || !me) return;
    const emoji = playerEmoji || DEFAULT_EMOJI;
    if (me.emoji !== emoji) {
      onStateChange(setPlayerEmoji(gameState, myPlayerId, emoji));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, playerEmoji, me?.emoji]);

  // Play quack when current player receives a nudge
  useEffect(() => {
    const newNudgeCount = gameState.nudgeCount ?? 0;
    if (newNudgeCount > prevNudgeCountRef.current && isMyTurn && isPlaying) {
      playQuack();
    }
    prevNudgeCountRef.current = newNudgeCount;
  }, [gameState.nudgeCount, gameState.version, isMyTurn, isPlaying]);

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

  // Inject local player's stats into game state so opponents can see them (once on start)
  const statsInjectedRef = useRef(false);
  useEffect(() => {
    if (statsInjectedRef.current || !me) return;
    if (me.stats) { statsInjectedRef.current = true; return; } // already set
    const localStats = loadLocalStats();
    statsInjectedRef.current = true;
    onStateChange(setPlayerStats(gameState, myPlayerId, localStats));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.version]);

  // Save updated rankings to localStorage when game ends
  const ranksSavedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || ranksSavedRef.current || !gameState.loser) return;
    ranksSavedRef.current = true;
    const ranked = computeGameRankings(gameState);
    const myRankIndex = ranked.indexOf(myPlayerId);
    if (myRankIndex === -1) return;
    const myRank = myRankIndex + 1; // 1-based
    const totalPlayers = gameState.players.length;
    const prevStats = loadLocalStats();
    const newStats: PlayerStats = { ...prevStats, gamesPlayed: prevStats.gamesPlayed + 1 };
    if (myRank === 1) newStats.gold++;
    else if (myRank === 2) newStats.silver++;
    else if (myRank === 3 && totalPlayers >= 4) newStats.bronze++;
    else if (myRank === totalPlayers) newStats.losses++;
    saveLocalStats(newStats);
    // Push updated stats back into game state so opponents see updated counts
    onStateChange(setPlayerStats(gameState, myPlayerId, newStats));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinished, gameState.loser]);

  const playQuack = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx() as AudioContext;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      const t = ctx.currentTime;
      // Quack: pitch drops sharply then a second shorter quack
      osc.frequency.setValueAtTime(480, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.08);
      osc.frequency.setValueAtTime(420, t + 0.11);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.22);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.01);
      gain.gain.setValueAtTime(0.28, t + 0.07);
      gain.gain.linearRampToValueAtTime(0, t + 0.09);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.start(t);
      osc.stop(t + 0.3);
      osc.onended = () => ctx.close();
    } catch { /* ignore */ }
  };

  const handleNudge = () => {
    playQuack();
    const newState = nudgeCurrentPlayer(gameState);
    onStateChange(newState);
  };

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

  const myPlayerIndex = gameState.players.findIndex(p => p.id === myPlayerId);
  const totalPlayers = gameState.players.length;
  const prevOpponent = totalPlayers > 1
    ? gameState.players[(myPlayerIndex - 1 + totalPlayers) % totalPlayers]
    : null;
  const nextOpponent = totalPlayers > 2
    ? gameState.players[(myPlayerIndex + 1) % totalPlayers]
    : null;
  const otherOpponents = gameState.players.filter(
    p => p.id !== myPlayerId && p.id !== prevOpponent?.id && p.id !== nextOpponent?.id
  );
  const opponents = [
    ...(prevOpponent ? [prevOpponent] : []),
    ...(nextOpponent ? [nextOpponent] : []),
    ...otherOpponents,
  ];
  const sortedHand = [...me.hand].sort((a, b) => a.rank - b.rank);

  // Hand grid: fill rows first; 1 row for ≤6 cards, 2 rows for more (scroll horizontally)
  const displayCardCount = isSetup ? me.setupCards.length : sortedHand.length;
  const useDoubleRow = displayCardCount > 6;
  const handGridCols = useDoubleRow ? Math.ceil(displayCardCount / 2) : Math.max(1, displayCardCount);

  // Pile cards for display (show up to 5 beneath top card)
  const pileCards = gameState.pickupPile.slice(-6);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-900 to-green-800 text-white overflow-visible relative">
      {/* Emoji waterfall — background layer, behind all game components */}
      <AnimatePresence>
        {(animEffect === 'wipeout' || animEffect === 'slam' || animEffect === 'sparkle') && animEmoji && (
          <motion.div
            key="emoji-waterfall"
            className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[...Array(18)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl select-none"
                style={{ left: `${(i * 5.5 + 2) % 100}%` }}
                initial={{ y: -48, opacity: 0.85 }}
                animate={{ y: '110vh', opacity: [0.85, 0.85, 0] }}
                transition={{
                  duration: 2.2 + (i % 5) * 0.4,
                  delay: i * 0.12,
                  ease: 'linear',
                  opacity: { times: [0, 0.7, 1], duration: 2.2 + (i % 5) * 0.4 },
                }}
              >
                {animEmoji}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation overlays — on top of all game components */}
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
        {animEffect === 'pickup' && animEmoji && (
          <motion.div
            key="pickup"
            className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-3xl font-black text-blue-400 z-10"
              style={{ textShadow: '0 0 20px rgba(96,165,250,0.6)' }}
              initial={{ scale: 0, opacity: 0, rotate: 10 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0], rotate: [10, -5, 0] }}
              transition={{ duration: 3.0, times: [0, 0.2, 1] }}
            >
              Pick Up!
            </motion.div>
            {/* Emoji orbiting around the banner */}
            {[...Array(6)].map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const rx = 80;
              const ry = 50;
              return (
                <motion.div
                  key={i}
                  className="absolute text-2xl select-none"
                  style={{ left: '50%', top: '50%' }}
                  initial={{ x: -12, y: -12, opacity: 0 }}
                  animate={{
                    x: [
                      Math.cos(angle) * rx - 12,
                      Math.cos(angle + Math.PI * 2 / 3) * rx - 12,
                      Math.cos(angle + Math.PI * 4 / 3) * rx - 12,
                      Math.cos(angle + Math.PI * 2) * rx - 12,
                    ],
                    y: [
                      Math.sin(angle) * ry - 12,
                      Math.sin(angle + Math.PI * 2 / 3) * ry - 12,
                      Math.sin(angle + Math.PI * 4 / 3) * ry - 12,
                      Math.sin(angle + Math.PI * 2) * ry - 12,
                    ],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 3.0, ease: 'linear', delay: i * 0.05 }}
                >
                  {animEmoji}
                </motion.div>
              );
            })}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Debug overlay */}
      {settings.debugMode && (
        <div className="absolute top-0 right-0 z-50 bg-black/80 text-green-300 text-[9px] font-mono p-2 max-w-48 pointer-events-none">
          <div className="font-bold text-yellow-400 mb-1">DEBUG</div>
          <div>v{gameState.version}</div>
          <div>phase: {gameState.phase}</div>
          <div>turn: {gameState.players[gameState.currentPlayerIndex]?.name}</div>
          <div>pile: {gameState.pickupPile.length}</div>
          <div>draw: {gameState.drawPile.length}</div>
          <div>discard: {gameState.discardPile.length}</div>
          {gameState.waitingForBonus && <div>bonus: {gameState.waitingForBonus.type}</div>}
          {gameState.pendingCounter && <div>counter: {gameState.pendingCounter.type}</div>}
          {gameState.drawBonus && <div>drawBonus: {gameState.drawBonus.playerId}</div>}
          {(gameState.eliminated || []).length > 0 && (
            <div>elim: {(gameState.eliminated || []).length}</div>
          )}
        </div>
      )}

      {/* Help modal */}
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}

      {/* Opponents area */}
      <div
        className={`relative z-[1] flex p-2 ${miniOpponents ? 'gap-2' : 'gap-4'} shrink-0 overflow-x-auto cursor-pointer select-none`}
        onClick={() => setMiniOpponents(v => !v)}
      >
        {prevOpponent && (
          <>
            <OpponentView
              key={prevOpponent.id}
              player={prevOpponent}
              isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === prevOpponent.id}
              isSetup={isSetup}
              isEliminated={(gameState.eliminated || []).includes(prevOpponent.id)}
              mini={miniOpponents}
              isBeforePlayer
            />
            <div className="shrink-0 w-px self-stretch bg-white/20 mx-1" />
          </>
        )}
        {nextOpponent && (
          <OpponentView
            key={nextOpponent.id}
            player={nextOpponent}
            isCurrentTurn={gameState.players[gameState.currentPlayerIndex]?.id === nextOpponent.id}
            isSetup={isSetup}
            isEliminated={(gameState.eliminated || []).includes(nextOpponent.id)}
            mini={miniOpponents}
            isAfterPlayer
          />
        )}
        {otherOpponents.map(opp => (
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
      <div className="relative z-[1] flex-1 flex flex-col items-center justify-center gap-2 px-3 min-h-0 overflow-visible">
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
              {pileCards.length === 0 && !palaceInvalidCard && (
                <div className="w-16 h-24 rounded-lg border-2 border-dashed border-green-600 flex items-center justify-center">
                  <span className="text-green-500 text-xs">Empty</span>
                </div>
              )}
              {/* Palace-invalid: animate the revealed card at the pile position */}
              {animEffect === 'palace-invalid' && palaceInvalidCard && (
                <motion.div
                  key="palace-invalid-pile"
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ zIndex: 10 }}
                  animate={{
                    scale: [0.5, 1.08, 1],
                    opacity: [0, 1, 1, 0],
                    x: [0, 0, 0, -14, 14, -14, 14, -7, 0],
                  }}
                  transition={{
                    scale: { duration: 0.4, times: [0, 0.4, 1] },
                    opacity: { duration: 3.2, times: [0, 0.05, 0.85, 1] },
                    x: { duration: 1.3, times: [0, 0.12, 0.22, 0.38, 0.52, 0.64, 0.76, 0.88, 1] },
                  }}
                >
                  <div className="relative">
                    <PileCard card={palaceInvalidCard} />
                    {/* Red tint overlay */}
                    <motion.div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      animate={{ opacity: [0, 0, 0.65, 0.65, 0] }}
                      transition={{ duration: 3.2, times: [0, 0.05, 0.12, 0.85, 1] }}
                      style={{
                        background: 'rgba(220, 38, 38, 0.65)',
                        boxShadow: '0 0 20px 6px rgba(220, 38, 38, 0.7)',
                      }}
                    />
                  </div>
                </motion.div>
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
            <GameEndLeaderboard
              gameState={gameState}
              myPlayerId={myPlayerId}
              phase={leaderboardPhase}
              onNext={() => setLeaderboardPhase('alltime')}
              onHome={() => navigate('/')}
            />
          )}
          {isPlaying && !isFinished && (
            <div className={`text-sm font-medium px-3 py-1 rounded-full ${animEffect === 'palace-invalid' ? 'bg-red-900/40 text-red-300' : (isMyTurn || hasDrawBonus) ? 'bg-yellow-500/30 text-yellow-200' : 'bg-white/10 text-green-200'}`}>
              {animEffect === 'palace-invalid'
                ? `❌ ${palaceInvalidPlayerName} picks up the pile!`
                : isEliminated
                  ? "You're safe! Watching..."
                  : hasPendingCounter
                    ? 'Counter! Play to counter or pick up pile'
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

        {/* Action Log (debug mode only) */}
        {settings.debugMode && (
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
        )}

        {error && (
          <div className="text-red-400 text-xs bg-red-900/40 px-3 py-1 rounded">{error}</div>
        )}
      </div>

      {/* My area - highlighted when my turn or draw bonus available */}
      <div className={`relative z-[1] shrink-0 p-2 pb-4 space-y-2 transition-all duration-300 overflow-visible ${
        (isMyTurn || hasDrawBonus) && isPlaying ? 'bg-yellow-500/15 ring-1 ring-yellow-400/50 ring-inset' : 'bg-black/20'
      }`}>
        {/* My Palace - centered during setup/active, hidden when empty during play */}
        {showPalace && (
          <div className={`transition-all duration-300 overflow-visible ${palaceIsActive ? 'flex justify-center' : ''}`}>
            <PalaceDisplay
              palace={me.palace}
              isCurrentPlayer={canPlay}
              canPlayFaceUp={source === 'palace-faceup'}
              canPlayFaceDown={source === 'palace-facedown'}
              selectedCards={selectedCards}
              onCardClick={(card) => toggleCard(card.id)}
              onFaceDownClick={handleFaceDownPlay}
              playerName={(isMyTurn || hasDrawBonus) && isPlaying ? `⭐ ${me.name}'s Palace` : `${me.name}'s Palace`}
              statsText={formatStatsText(me.stats)}
              centered={palaceIsActive}
              showRotation
              playableCardIds={source === 'palace-faceup' ? playableCardIds : undefined}
            />
          </div>
        )}
        {/* Reveal remaining face-down palace cards when game ends */}
        {isFinished && me.palace.some(s => s.faceDown !== null) && (
          <div className="flex justify-center">
            <button
              onClick={() => onStateChange(revealFaceDownCards(gameState, myPlayerId))}
              className="px-4 py-1.5 bg-indigo-600/80 text-white rounded-lg font-bold text-sm hover:bg-indigo-500 active:scale-95 transition-all"
            >
              Reveal Remaining Cards
            </button>
          </div>
        )}

        {/* My Hand / Setup Cards - 2-row grid */}
        <div className="flex flex-col items-center gap-1 overflow-visible">
          {isPlaying && source === 'hand' ? (
            <span className="bg-white/15 text-green-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
              Hand ({me.hand.length})
            </span>
          ) : (
            <span className="text-[10px] text-green-300 font-medium">
              {isSetup
                ? me.setupPhase === 'select-facedown'
                  ? 'Your 9 cards (pick 3 blindly)'
                  : me.setupPhase === 'select-faceup'
                  ? 'Pick 3 for palace face-up'
                  : 'Setup complete'
                : `Hand (${me.hand.length})`}
            </span>
          )}
          {isPlaying && source !== 'hand' && me.hand.length === 0 && (
            <span className="text-green-400 text-xs italic py-1">
              {source === 'palace-faceup' ? 'Play from palace face-up cards' : source === 'palace-facedown' ? 'Play from palace face-down (blind)' : 'No cards!'}
            </span>
          )}
          <div className="overflow-visible w-full">
            <div
              className="grid gap-1 pt-4 pb-2 mx-auto"
              style={{
                gridAutoFlow: 'row',
                gridTemplateRows: useDoubleRow ? 'repeat(2, auto)' : 'auto',
                gridTemplateColumns: `repeat(${handGridCols}, min-content)`,
                width: 'max-content',
              }}
            >
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
            {isPlaying && source === 'hand' && sortedHand.map(card => {
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
            </div>
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
            {/* Nudge button: visible to all non-current players */}
            {isPlaying && !isMyTurn && !isEliminated && currentPlayer && (
              <button
                onClick={handleNudge}
                className="px-3 py-1.5 bg-white/10 text-xl rounded-lg hover:bg-white/20 active:scale-90 transition-all"
                title={`Nudge ${currentPlayer.name}`}
              >
                {currentPlayer.emoji || DEFAULT_EMOJI}
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

function OpponentView({ player, isCurrentTurn, isSetup, isEliminated, mini, isBeforePlayer, isAfterPlayer }: {
  player: Player; isCurrentTurn: boolean; isSetup: boolean; isEliminated: boolean; mini?: boolean;
  isBeforePlayer?: boolean; isAfterPlayer?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 p-1.5 min-w-34 max-w-102 rounded-lg transition-all shrink-0 overflow-hidden ${
      isEliminated ? 'bg-green-500/10 opacity-50' :
      isCurrentTurn ? 'bg-yellow-500/20 ring-1 ring-yellow-400' :
      isBeforePlayer ? 'bg-purple-500/20' :
      isAfterPlayer ? 'bg-green-500/20' :
      'bg-black/10'
    }`}>
      <span className="text-[10px] font-bold truncate max-w-26">
        {player.emoji || DEFAULT_EMOJI} {player.name} {isEliminated ? '✅' : isCurrentTurn ? '⭐' : ''}
      </span>
      {isSetup ? (
        <span className="text-[10px] text-green-300">
          {player.setupPhase === 'done' ? '✅ Ready' : '⏳ Setting up'}
        </span>
      ) : (
        <>
          <PalaceDisplay palace={player.palace} small={!mini} mini={mini} />
          <div className="flex items-center gap-1 flex-wrap justify-center">
            {isEliminated ? (
              <span className="text-[10px] text-green-300">Safe!</span>
            ) : (
              <>
                {formatStatsText(player.stats) && (
                  <span className="text-[9px] text-yellow-300">{formatStatsText(player.stats)}</span>
                )}
                <span className="bg-white/20 text-green-100 px-1.5 py-0.5 rounded-full text-[9px] font-medium">
                  Hand: {player.hand.length}
                </span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GameEndLeaderboard({ gameState, myPlayerId, phase, onNext, onHome }: {
  gameState: GameState;
  myPlayerId: string;
  phase: 'game' | 'alltime';
  onNext: () => void;
  onHome: () => void;
}) {
  const ranked = computeGameRankings(gameState);
  const medals = ['🥇', '🥈', '🥉'];
  const totalPlayers = gameState.players.length;

  if (phase === 'game') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-black/40 rounded-2xl p-4 w-full max-w-xs mx-auto space-y-3 text-center"
      >
        <div className="text-lg font-black text-yellow-300">🏆 Final Rankings</div>
        <div className="space-y-1.5">
          {ranked.map((pid, i) => {
            const player = gameState.players.find(p => p.id === pid);
            const isMe = pid === myPlayerId;
            const isLoser = i === ranked.length - 1 && totalPlayers > 1;
            const medal = isLoser ? '💀' : (medals[i] || `#${i + 1}`);
            return (
              <div
                key={pid}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
                  isMe ? 'bg-yellow-500/30 ring-1 ring-yellow-400 font-bold' : 'bg-white/10'
                }`}
              >
                <span className="text-base w-6">{medal}</span>
                <span className="text-base">{player?.emoji || DEFAULT_EMOJI}</span>
                <span className="flex-1 text-left truncate">{player?.name}</span>
                {isMe && <span className="text-[10px] text-yellow-300">You</span>}
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 justify-center pt-1">
          <button
            onClick={onNext}
            className="px-5 py-2 bg-yellow-500 text-black rounded-xl font-bold text-sm hover:bg-yellow-400 active:scale-95 transition-all"
          >
            Next →
          </button>
        </div>
      </motion.div>
    );
  }

  // All-time rankings phase
  const myRankIndex = ranked.indexOf(myPlayerId);
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-black/40 rounded-2xl p-4 w-full max-w-xs mx-auto space-y-3 text-center"
    >
      <div className="text-lg font-black text-yellow-300">📊 All-Time Rankings</div>
      {myPlayer?.stats && (
        <div className="bg-yellow-500/20 rounded-xl px-3 py-2 text-sm">
          <div className="font-bold text-yellow-200 mb-1">
            {myPlayer.emoji || DEFAULT_EMOJI} {myPlayer.name} ({myRankIndex >= 0 ? (medals[myRankIndex] || '💀') : '—'} this game)
          </div>
          <div className="flex justify-center gap-3 text-xs">
            <span>🥇 {myPlayer.stats.gold}</span>
            <span>🥈 {myPlayer.stats.silver}</span>
            <span>🥉 {myPlayer.stats.bronze}</span>
            {myPlayer.stats.losses > 0 && <span className="text-red-400">💀 {myPlayer.stats.losses}</span>}
            <span className="text-green-300">{myPlayer.stats.gamesPlayed} played</span>
          </div>
        </div>
      )}
      {gameState.players.filter(p => p.id !== myPlayerId && p.stats).length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-green-400 font-semibold">Other Players</div>
          {gameState.players.filter(p => p.id !== myPlayerId && p.stats).map(p => (
            <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 bg-white/10 rounded-lg text-xs">
              <span>{p.emoji || DEFAULT_EMOJI}</span>
              <span className="flex-1 text-left truncate">{p.name}</span>
              {p.stats && (
                <span className="text-yellow-300 text-[9px]">{formatStatsText(p.stats)}</span>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onHome}
        className="w-full py-2 bg-green-700 text-white rounded-xl font-bold text-sm hover:bg-green-600 active:scale-95 transition-all"
      >
        🏠 Home
      </button>
    </motion.div>
  );
}