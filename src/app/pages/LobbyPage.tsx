import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { initGame } from '../game-engine';
import { Copy, Check, Users, Loader2 } from 'lucide-react';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-990c827f`;

// Default emoji palette assigned by player join order
const DEFAULT_PLAYER_EMOJIS = ['🦆', '🐻', '🦁', '🐸', '🦊', '🐺', '🦝', '🐼', '🦋', '🐠', '🦄', '🐯', '🐹', '🦜', '🐙'];

export default function LobbyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { action, playerName, playerEmoji, playerCount, deckCount, code: joinCode } = location.state || {};

  const [gameCode, setGameCode] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [playerEmojiMap, setPlayerEmojiMap] = useState<Record<string, string>>({});
  const [expectedCount, setExpectedCount] = useState(playerCount || 2);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<number>();

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };

  useEffect(() => {
    if (action === 'create') {
      createGame();
    } else if (action === 'join') {
      joinGame();
    } else {
      navigate('/');
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const createGame = async () => {
    try {
      const res = await fetch(`${API}/games`, {
        method: 'POST', headers,
        body: JSON.stringify({ playerName, playerCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const myEmoji = playerEmoji || '🦆';
      setGameCode(data.code);
      setPlayerId(data.playerId);
      setPlayers([{ id: data.playerId, name: playerName }]);
      setPlayerEmojiMap({ [data.playerId]: myEmoji });
      setExpectedCount(playerCount);
      setLoading(false);
      startPolling(data.code, data.playerId, myEmoji);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const joinGame = async () => {
    try {
      const res = await fetch(`${API}/games/${joinCode}/join`, {
        method: 'POST', headers,
        body: JSON.stringify({ playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const myEmoji = playerEmoji || '🦆';
      setGameCode(joinCode);
      setPlayerId(data.playerId);
      setPlayers(data.players);
      setPlayerEmojiMap({ [data.playerId]: myEmoji });
      setLoading(false);

      // Get expected count
      const gameRes = await fetch(`${API}/games/${joinCode}`, { headers });
      const gameData = await gameRes.json();
      setExpectedCount(gameData.playerCount);

      startPolling(joinCode, data.playerId, myEmoji);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const startPolling = (code: string, myId: string, myEmoji: string) => {
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`${API}/games/${code}`, { headers });
        const data = await res.json();
        if (!res.ok) return;
        setPlayers(data.players);
        setExpectedCount(data.playerCount);
        // Assign default emojis to any new players (by their position in the list)
        setPlayerEmojiMap(prev => {
          const updated = { ...prev };
          (data.players as { id: string; name: string }[]).forEach((p, i) => {
            if (!updated[p.id]) {
              updated[p.id] = p.id === myId ? myEmoji : DEFAULT_PLAYER_EMOJIS[i % DEFAULT_PLAYER_EMOJIS.length];
            }
          });
          return updated;
        });

        // Check if game started
        if (data.state) {
          clearInterval(pollRef.current);
          navigate('/multiplayer', { state: { code, playerId: myId, playerEmoji: myEmoji, gameState: data.state } });
        }
      } catch { /* ignore */ }
    }, 2000);
  };

  const startGame = async () => {
    // Host starts the game
    const playerNames = players.map(p => p.name);
    // Assign emojis: use known emoji for local player, default for remote players
    // (remote player emojis are synced individually when each player opens the game)
    const emojis = players.map(p => playerEmojiMap[p.id] || '🦆');
    const state = initGame(playerNames, 0, deckCount ?? 1, emojis);
    try {
      const res = await fetch(`${API}/games/${gameCode}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ state, playerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      clearInterval(pollRef.current);
      navigate('/multiplayer', { state: { code: gameCode, playerId, playerEmoji: playerEmojiMap[playerId] || '🦆', gameState: state } });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 flex flex-col items-center justify-center text-white gap-4 p-6">
        <p className="text-red-400">{error}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 rounded-lg hover:bg-white/20">Back to Home</button>
      </div>
    );
  }

  const isHost = playerId === 'player-0';
  const allJoined = players.length >= expectedCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-center p-6 text-white gap-6">
      <button onClick={() => navigate('/')} className="text-green-300 text-sm self-start hover:text-white">← Back</button>

      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Game Lobby</h2>
        <div className="flex items-center gap-2 justify-center">
          <span className="font-mono text-3xl tracking-[0.3em] bg-white/10 px-4 py-2 rounded-xl">{gameCode}</span>
          <button onClick={copyCode} className="p-2 bg-white/10 rounded-lg hover:bg-white/20">
            {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-green-300 text-sm">Share this code with friends</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <div className="flex items-center gap-2 text-sm text-green-300">
          <Users className="w-4 h-4" />
          <span>Players ({players.length}/{expectedCount})</span>
        </div>
        {players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-lg">
              {playerEmojiMap[p.id] || p.name[0]}
            </div>
            <span className="font-medium">{p.name}</span>
            {i === 0 && <span className="text-[10px] bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full ml-auto">Host</span>}
            {p.id === playerId && <span className="text-[10px] bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full ml-auto">You</span>}
          </div>
        ))}
        {Array.from({ length: expectedCount - players.length }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-dashed border-white/10">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-green-400" />
            </div>
            <span className="text-green-400 text-sm">Waiting...</span>
          </div>
        ))}
      </div>

      {isHost && (
        <button
          onClick={startGame}
          disabled={!allJoined}
          className="w-full max-w-xs py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-yellow-400 active:scale-[0.98] transition-all"
        >
          {allJoined ? 'Start Game' : `Waiting for players...`}
        </button>
      )}
      {!isHost && (
        <div className="text-green-300 text-sm flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for host to start...
        </div>
      )}
    </div>
  );
}
