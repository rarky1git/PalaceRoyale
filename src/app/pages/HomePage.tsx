import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Crown, Bot, Wifi, BookOpen, Settings } from 'lucide-react';

const PLAYER_EMOJIS = ['🦆', '🐻', '🦁', '🐸', '🦊', '🐺', '🦝', '🐼', '🦋', '🐠', '🦄', '🐯'];
const BOT_EMOJIS = ['🤖', '👾', '🎮', '🃏'];

export default function HomePage() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(2);
  const [playerName, setPlayerName] = useState('');
  const [playerEmoji, setPlayerEmoji] = useState(() => {
    try { return localStorage.getItem('palace-player-emoji') || '🦆'; } catch { return '🦆'; }
  });
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'menu' | 'robot-setup' | 'multi-setup'>('menu');
  const [gameCode, setGameCode] = useState('');
  const [multiAction, setMultiAction] = useState<'create' | 'join'>('create');
  const [savedGames, setSavedGames] = useState<{ code: string; playerId: string }[]>([]);

  // Auto-focus the custom emoji input when it becomes visible
  useEffect(() => {
    if (showCustomEmojiInput && customEmojiInputRef.current) {
      customEmojiInputRef.current.focus();
    }
  }, [showCustomEmojiInput]);

  // Check for saved games on mount
  useState(() => {
    try {
      const saves: { code: string; playerId: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('palace-save-')) {
          const data = JSON.parse(localStorage.getItem(key)!);
          saves.push({ code: data.code, playerId: data.playerId });
        }
      }
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
    const names = [playerName.trim()];
    const emojis = [playerEmoji];
    for (let i = 1; i < playerCount; i++) {
      names.push(`Bot ${i}`);
      emojis.push(BOT_EMOJIS[(i - 1) % BOT_EMOJIS.length]);
    }
    navigate('/robot', { state: { playerNames: names, playerEmojis: emojis, dealerIndex: 0 } });
  };

  const goMultiplayer = () => {
    if (!playerName.trim()) return;
    if (multiAction === 'create') {
      navigate('/lobby', { state: { action: 'create', playerName: playerName.trim(), playerEmoji, playerCount } });
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
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="flex flex-col items-center gap-2 mb-8">
        <div className="w-16 h-16 bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg">
          <Crown className="w-9 h-9 text-yellow-900" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Palace</h1>
        <p className="text-green-300 text-sm">The Card Game</p>
      </div>

      {mode === 'menu' && (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {savedGames.length > 0 && (
            <div className="space-y-2 mb-2">
              <span className="text-xs text-green-400">Rejoin Game:</span>
              {savedGames.map(sg => (
                <button
                  key={sg.code}
                  onClick={() => rejoinGame(sg.code, sg.playerId)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-purple-500/20 border border-purple-400/30 rounded-xl hover:bg-purple-500/30 active:scale-[0.98] transition-all"
                >
                  <span className="font-mono font-bold text-purple-300">{sg.code}</span>
                  <span className="text-xs text-purple-400">Tap to rejoin →</span>
                </button>
              ))}
            </div>
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
            <div>
              <label className="text-sm text-green-300 mb-1 block">Total Players</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(n => (
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
      <footer className="absolute bottom-4 text-green-600 text-[11px] font-mono select-none">
        v0.4
      </footer>
    </div>
  );
}