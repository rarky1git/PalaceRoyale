import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, Bot, Wifi, BookOpen, Settings, RefreshCw, Sparkles, GraduationCap, X } from 'lucide-react';
import { MAX_DECKS, MAX_PLAYERS_PER_DECK, PlayerStats, BOT_PROFILES } from '../game-engine';
import { WHATS_NEW_SEEN_KEY, APP_VERSION } from './WhatsNewPage';
import { TUTORIAL_SEEN_KEY } from '../components/TutorialOverlay';

const PLAYER_EMOJIS = ['🦆', '🐻', '🦁', '🐸', '🦊', '🐺', '🦝', '🐼', '🦋', '🐠', '🦄', '🐯'];
const STATS_KEY = 'palace-stats';

/** Swipeable tutorial banner shown to first-time players */
function TutorialBanner({ onStart, onDismiss }: { onStart: () => void; onDismiss: () => void }) {
  // Track horizontal drag offset for swipe-to-reveal-dismiss
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);

  const SWIPE_THRESHOLD = 60; // px to reveal the dismiss button
  const revealed = Math.abs(dragX) >= SWIPE_THRESHOLD;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientX - startXRef.current;
    // Allow drag in both directions, clamped to ±110px
    setDragX(Math.max(-110, Math.min(110, delta)));
  };

  const onPointerUp = () => {
    setIsDragging(false);
    if (!revealed) {
      // Snap back if not dragged far enough
      setDragX(0);
    }
    // If revealed, keep offset so dismiss button stays visible
  };

  return (
    <div className="relative overflow-hidden rounded-xl w-full">
      {/* Dismiss button revealed by swiping */}
      <div
        className={`absolute inset-y-0 flex items-center justify-center transition-opacity ${
          dragX > 0 ? 'right-0 pr-3' : 'left-0 pl-3'
        } ${revealed ? 'opacity-100' : 'opacity-0'}`}
        style={{ width: 64 }}
      >
        <button
          onClick={onDismiss}
          className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center text-white hover:bg-red-400 active:scale-90 transition-all"
          aria-label="Dismiss tutorial"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main banner — slides with drag */}
      <div
        className="touch-pan-y select-none flex items-center gap-3 w-full px-5 py-4 bg-yellow-500/20 border border-yellow-400/40 backdrop-blur rounded-xl hover:bg-yellow-500/30 active:scale-[0.98] cursor-pointer"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (Math.abs(dragX) < 10) onStart();
        }}
      >
        <GraduationCap className="w-6 h-6 text-yellow-300 shrink-0" />
        <div className="text-left flex-1">
          <div className="font-bold text-yellow-100">Learn to Play</div>
          <div className="text-xs text-yellow-300">Guided tutorial — swipe to dismiss</div>
        </div>
        <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded-full shrink-0">START</span>
      </div>
    </div>
  );
}

function formatShortDateTime(ts?: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function HomePage() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [deckCount, setDeckCount] = useState(1);
  const [playerName, setPlayerName] = useState(() => {
    try { return localStorage.getItem('palace-player-name') || ''; } catch { return ''; }
  });
  const [playerEmoji, setPlayerEmoji] = useState(() => {
    try { return localStorage.getItem('palace-player-emoji') || '🦆'; } catch { return '🦆'; }
  });
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'menu' | 'robot-setup' | 'multi-setup'>('menu');
  const [gameCode, setGameCode] = useState('');
  const [multiAction, setMultiAction] = useState<'create' | 'join'>('create');
  const [savedGames, setSavedGames] = useState<{ code: string; playerId: string; savedAt?: number }[]>([]);
  const [myStats, setMyStats] = useState<PlayerStats | null>(null);
  // True when the user hasn't seen the What's New page for the current version yet
  const [showWhatsNew] = useState<boolean>(() => {
    try { return localStorage.getItem(WHATS_NEW_SEEN_KEY) !== APP_VERSION; } catch { return false; }
  });

  // True for first-time players who haven't dismissed or completed the tutorial
  const [showTutorial, setShowTutorial] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem(TUTORIAL_SEEN_KEY);
      return val === null; // show only if key has never been set
    } catch { return false; }
  });

  const handleTutorialStart = () => {
    navigate('/robot', { state: { tutorial: true } });
  };

  const handleTutorialDismiss = () => {
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, 'dismissed'); } catch { /* ignore */ }
    setShowTutorial(false);
  };

  // Auto-focus the custom emoji input when it becomes visible
  useEffect(() => {
    if (showCustomEmojiInput && customEmojiInputRef.current) {
      customEmojiInputRef.current.focus();
    }
  }, [showCustomEmojiInput]);

  // Load stats and saved games on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerStats;
        if (parsed.gamesPlayed > 0) setMyStats(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // Check for saved games on mount
  useState(() => {
    try {
      const saves: { code: string; playerId: string; savedAt?: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('palace-save-')) {
          const data = JSON.parse(localStorage.getItem(key)!);
          saves.push({ code: data.code, playerId: data.playerId, savedAt: data.savedAt });
        }
      }
      // Sort by most recent first
      saves.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
      setSavedGames(saves);
    } catch { /* ignore */ }
  });

  const selectEmoji = (emoji: string) => {
    setPlayerEmoji(emoji);
    try { localStorage.setItem('palace-player-emoji', emoji); } catch { /* ignore */ }
  };

  const handleCustomEmojiInput = (value: string) => {
    if (!value) return;
    // Extract the first grapheme cluster (handles multi-codepoint emoji like flags, skin tones)
    try {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' });
      const segments = [...segmenter.segment(value)] as { segment: string }[];
      const emojiSeg = segments.find(s => /\p{Extended_Pictographic}/u.test(s.segment));
      const first = emojiSeg?.segment ?? segments[0]?.segment;
      if (first) {
        selectEmoji(first);
        setShowCustomEmojiInput(false);
      }
    } catch {
      // Fallback: take the first two code points (covers most composed emoji sequences)
      const first = Array.from(value).slice(0, 2).join('');
      if (first) {
        selectEmoji(first);
        setShowCustomEmojiInput(false);
      }
    }
  };

  const rejoinGame = async (code: string, playerId: string) => {
    try {
      const API = `https://${(await import('/utils/supabase/info')).projectId}.supabase.co/functions/v1/make-server-990c827f`;
      const { publicAnonKey } = await import('/utils/supabase/info');
      const res = await fetch(`${API}/games/${code}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (res.ok && data.state) {
        navigate('/multiplayer', { state: { code, playerId, gameState: data.state } });
      } else {
        // Game no longer exists, remove save
        localStorage.removeItem(`palace-save-${code}`);
        setSavedGames(prev => prev.filter(s => s.code !== code));
      }
    } catch { /* ignore */ }
  };

  const startRobot = () => {
    if (!playerName.trim()) return;
    try { localStorage.setItem('palace-player-name', playerName.trim()); } catch { /* ignore */ }
    const names = [playerName.trim()];
    const emojis = [playerEmoji];

    // Shuffle BOT_PROFILES and pick unique knights for each bot slot
    const shuffled = [...BOT_PROFILES].sort(() => Math.random() - 0.5);
    for (let i = 1; i < playerCount; i++) {
      const profile = shuffled[(i - 1) % shuffled.length];
      names.push(profile.name);
      emojis.push(profile.emoji);
    }
    navigate('/robot', { state: { playerNames: names, playerEmojis: emojis, dealerIndex: 0, deckCount } });
  };

  const goMultiplayer = () => {
    if (!playerName.trim()) return;
    try { localStorage.setItem('palace-player-name', playerName.trim()); } catch { /* ignore */ }
    if (multiAction === 'create') {
      navigate('/lobby', { state: { action: 'create', playerName: playerName.trim(), playerEmoji, playerCount, deckCount } });
    } else {
      if (!gameCode.trim()) return;
      navigate('/lobby', { state: { action: 'join', playerName: playerName.trim(), playerEmoji, code: gameCode.trim().toUpperCase() } });
    }
  }; 

  const isCustomEmoji = !PLAYER_EMOJIS.includes(playerEmoji);

  const EmojiPicker = () => (
    <div>
      <label className="text-sm text-green-300 mb-1 block">Your emoji</label>
      <div className="flex flex-wrap gap-1.5">
        {PLAYER_EMOJIS.map(e => (
          <button
            key={e}
            onClick={() => { selectEmoji(e); setShowCustomEmojiInput(false); }}
            className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${
              playerEmoji === e ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {e}
          </button>
        ))}
        {/* Custom emoji button – shows the user's custom emoji when set, otherwise a "+" */}
        {showCustomEmojiInput ? (
          <input
            ref={customEmojiInputRef}
            type="text"
            // `inputmode` with value "emoji" is non-standard but triggers the emoji keyboard
            // on many Android browsers; iOS falls back to the regular keyboard where the user
            // can tap the globe/emoji key.
            inputMode={"emoji" as any}
            maxLength={8}
            placeholder="😀"
            onChange={e => handleCustomEmojiInput(e.target.value)}
            onBlur={() => setShowCustomEmojiInput(false)}
            onKeyDown={e => { if (e.key === 'Escape') setShowCustomEmojiInput(false); }}
            className="w-9 h-9 rounded-lg text-xl text-center bg-white/20 ring-2 ring-yellow-400 outline-none caret-transparent"
          />
        ) : (
          <button
            onClick={() => setShowCustomEmojiInput(true)}
            className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${
              isCustomEmoji ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Enter a custom emoji"
          >
            {isCustomEmoji ? playerEmoji : '✏️'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center p-6 text-white">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
      <div className="flex flex-row items-center gap-4 mb-8 w-full max-w-xs">
        <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
          <Crown className="w-9 h-9 text-yellow-900" />
        </div>
        <div className="text-left">
          <h1 className="text-3xl font-bold tracking-tight">Palace Royale</h1>
          <p className="text-green-300 text-sm">A knight with no cards fears nothing.</p>
        </div>
      </div>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* Tutorial banner — shown to first-time players */}
          {showTutorial && (
            <TutorialBanner onStart={handleTutorialStart} onDismiss={handleTutorialDismiss} />
          )}
          {/* What's New banner — shown only when user hasn't seen current version's notes */}
          {showWhatsNew && (
            <button
              onClick={() => navigate('/whats-new')}
              className="flex items-center gap-3 w-full px-5 py-4 bg-yellow-500/20 border border-yellow-400/40 backdrop-blur rounded-xl hover:bg-yellow-500/30 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-6 h-6 text-yellow-300 shrink-0" />
              <div className="text-left flex-1">
                <div className="font-bold text-yellow-100">What's New in v{APP_VERSION}</div>
                <div className="text-xs text-yellow-300">Chat View & Version History</div>
              </div>
              <span className="text-[10px] font-bold bg-yellow-500 text-black px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
            </button>
          )}
          {myStats && (
            <div className="flex items-center justify-between px-4 py-3 bg-yellow-500/10 border border-yellow-400/30 rounded-xl mb-1">
              <span className="text-xs text-yellow-300 font-semibold">🏆 Rankings</span>
              <div className="flex items-center gap-3 text-sm">
                <span>🥇 {myStats.gold}</span>
                <span>🥈 {myStats.silver}</span>
                <span>🥉 {myStats.bronze}</span>
                {myStats.losses > 0 && <span className="text-red-400">💀 {myStats.losses}</span>}
              </div>
            </div>
          )}
          {savedGames.length > 0 && (
            <button
              onClick={() => navigate('/rejoin-games')}
              className="flex items-center gap-3 w-full px-5 py-4 bg-purple-500/20 border border-purple-400/30 backdrop-blur rounded-xl hover:bg-purple-500/30 active:scale-[0.98] transition-all"
            >
              <RefreshCw className="w-6 h-6 text-purple-300" />
              <div className="text-left">
                <div className="font-bold text-purple-100">Rejoin Game</div>
                {savedGames[0].savedAt && (
                  <div className="text-xs text-purple-400">{formatShortDateTime(savedGames[0].savedAt)}</div>
                )}
              </div>
            </button>
          )}
          <button
            onClick={() => setMode('robot-setup')}
            className="flex items-center gap-3 w-full px-5 py-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <Bot className="w-6 h-6 text-blue-300" />
            <div className="text-left">
              <div className="font-bold">Robot Mode</div>
              <div className="text-xs text-green-300">Play against NPCs</div>
            </div>
          </button>
          <button
            onClick={() => setMode('multi-setup')}
            className="flex items-center gap-3 w-full px-5 py-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <Wifi className="w-6 h-6 text-purple-300" />
            <div className="text-left">
              <div className="font-bold">Online Multiplayer</div>
              <div className="text-xs text-green-300">Play with friends</div>
            </div>
          </button>
          <button
            onClick={() => navigate('/how-to-play')}
            className="flex items-center gap-3 w-full px-5 py-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <BookOpen className="w-6 h-6 text-green-300" />
            <div className="text-left">
              <div className="font-bold">How to Play</div>
              <div className="text-xs text-green-300">Rules & tips</div>
            </div>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 w-full px-5 py-4 bg-white/10 backdrop-blur rounded-xl hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <Settings className="w-6 h-6 text-green-300" />
            <div className="text-left">
              <div className="font-bold">Settings</div>
              <div className="text-xs text-green-300">Sound, display & more</div>
            </div>
          </button>
        </div>
      )}

      {mode === 'robot-setup' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button onClick={() => setMode('menu')} className="text-green-300 text-sm self-start hover:text-white">← Back</button>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
          />
          <EmojiPicker />
          <div>
            <label className="text-sm text-green-300 mb-1 block">Players (including you)</label>
            <div className="flex gap-2">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${playerCount === n ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-green-300 mb-1 block">Card Decks</label>
            <div className="flex gap-2">
              {Array.from({ length: MAX_DECKS }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  onClick={() => setDeckCount(n)}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all ${deckCount === n ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={startRobot}
            disabled={!playerName.trim()}
            className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            Start Game
          </button>
        </div>
      )}

      {mode === 'multi-setup' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {/* Most recent rejoin game (only if within last hour) */}
          {(() => {
            const recent = savedGames[0];
            const isRecent = recent?.savedAt && Date.now() - recent.savedAt < 60 * 60 * 1000;
            if (!isRecent || !recent) return null;
            return (
              <button
                onClick={() => rejoinGame(recent.code, recent.playerId)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-purple-500/20 border border-purple-400/30 rounded-xl hover:bg-purple-500/30 active:scale-[0.98] transition-all"
              >
                <RefreshCw className="w-5 h-5 text-purple-300 shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-bold text-purple-100">Rejoin <span className="font-mono">{recent.code}</span></div>
                  <div className="text-[11px] text-purple-400">{formatShortDateTime(recent.savedAt)}</div>
                </div>
              </button>
            );
          })()}
          <button onClick={() => setMode('menu')} className="text-green-300 text-sm self-start hover:text-white">← Back</button>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
          />
          <EmojiPicker />
          <div className="flex gap-2">
            <button
              onClick={() => setMultiAction('create')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${multiAction === 'create' ? 'bg-purple-500' : 'bg-white/10'}`}
            >
              Create Game
            </button>
            <button
              onClick={() => setMultiAction('join')}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${multiAction === 'join' ? 'bg-purple-500' : 'bg-white/10'}`}
            >
              Join Game
            </button>
          </div>
          {multiAction === 'create' && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm text-green-300 mb-1 block">Total Players</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: deckCount * MAX_PLAYERS_PER_DECK - 1 }, (_, i) => i + 2).map(n => (
                    <button
                      key={n}
                      onClick={() => setPlayerCount(n)}
                      className={`flex-1 basis-[calc(20%-0.4rem)] py-2 rounded-lg font-bold transition-all ${playerCount === n ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-green-300 mb-1 block">Card Decks</label>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: MAX_DECKS }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => {
                        setDeckCount(n);
                        setPlayerCount(prev => Math.min(prev, n * MAX_PLAYERS_PER_DECK));
                      }}
                      className={`flex-1 basis-[calc(20%-0.4rem)] py-2 rounded-lg font-bold transition-all ${deckCount === n ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {multiAction === 'join' && (
            <input
              value={gameCode}
              onChange={e => setGameCode(e.target.value.toUpperCase())}
              placeholder="Game Code (e.g. ABC123)"
              maxLength={6}
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400 font-mono text-center text-xl tracking-widest"
            />
          )}
          <button
            onClick={goMultiplayer}
            disabled={!playerName.trim() || (multiAction === 'join' && gameCode.length < 6)}
            className="w-full py-3 bg-purple-500 text-white rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-purple-400 active:scale-[0.98] transition-all"
          >
            {multiAction === 'create' ? 'Create Game' : 'Join Game'}
          </button>
        </div>
      )}
      </div>
      <footer className="mt-4 text-green-600 text-[11px] font-mono select-none">
        {`v${APP_VERSION}`}
      </footer>
    </div>
  );
}
