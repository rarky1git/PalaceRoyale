import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { GameState } from '../game-engine';
import { GameBoard } from '../components/GameBoard';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { HelpCircle } from 'lucide-react';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-990c827f`;
const SAVE_KEY_PREFIX = 'palace-save-';

export default function MultiplayerGamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { code, playerId, playerEmoji, gameState: initialState } = location.state || {};

  const [gameState, setGameState] = useState<GameState>(initialState);
  const [syncError, setSyncError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const pollRef = useRef<number>();
  const versionRef = useRef(initialState?.version || 0);
  // Track whether local player has finished setup (face-down + face-up selected)
  const setupDoneRef = useRef(false);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };

  // Cache save key to device on init so player can reconnect
  useEffect(() => {
    if (code && playerId) {
      try {
        localStorage.setItem(`${SAVE_KEY_PREFIX}${code}`, JSON.stringify({ code, playerId, savedAt: Date.now() }));
      } catch { /* ignore */ }
    }
  }, [code, playerId]);

  // Check if local player has finished setup
  const isLocalSetupDone = (() => {
    if (!gameState || gameState.phase !== 'setup') return true; // Not in setup = done
    const me = gameState.players.find(p => p.id === playerId);
    return me?.setupPhase === 'done';
  })();

  // Mark setup as done once both phases complete, or reset when a new game starts
  useEffect(() => {
    if (isLocalSetupDone && !setupDoneRef.current) {
      setupDoneRef.current = true;
    }
    // Reset when game returns to setup (e.g., rematch via resetGame)
    if (!isLocalSetupDone && setupDoneRef.current) {
      setupDoneRef.current = false;
    }
  }, [isLocalSetupDone]);

  useEffect(() => {
    if (!code || !playerId || !initialState) {
      navigate('/');
      return;
    }

    // Poll for state updates
    pollRef.current = window.setInterval(async () => {
      // During local setup, don't pull from server to avoid overwriting selections
      if (!setupDoneRef.current) return;

      try {
        const res = await fetch(`${API}/games/${code}`, { headers });
        const data = await res.json();
        if (!res.ok) return;
        if (data.state && data.state.version > versionRef.current) {
          versionRef.current = data.state.version;
          setGameState(data.state);
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleStateChange = async (newState: GameState) => {
    setGameState(newState);
    versionRef.current = newState.version;

    // During local setup (before both phases done), buffer locally — don't push to server
    if (!setupDoneRef.current) {
      // Check if this change just completed setup
      const me = newState.players.find(p => p.id === playerId);
      if (me?.setupPhase !== 'done') return; // Still setting up, defer sync
      // Setup just completed — fall through to push the final state
      setupDoneRef.current = true;
    }

    try {
      const res = await fetch(`${API}/games/${code}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ state: newState, playerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) {
          const freshRes = await fetch(`${API}/games/${code}`, { headers });
          const freshData = await freshRes.json();
          if (freshData.state) {
            versionRef.current = freshData.state.version;
            setGameState(freshData.state);
          }
        } else {
          setSyncError(data.error);
        }
      }
    } catch (e: any) {
      console.log('Sync error:', e);
      setSyncError('Failed to sync. Retrying...');
      setTimeout(() => setSyncError(''), 3000);
    }
  };

  if (!gameState) return null;

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-green-950 text-white shrink-0">
        <button onClick={() => navigate('/')} className="text-sm text-green-300 hover:text-white">← Home</button>
        <span className="text-sm font-bold">
          Game: <span className="font-mono text-yellow-400">{code}</span>
        </span>
        <button onClick={() => setShowHelp(true)} className="text-green-300 hover:text-white">
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>
      {syncError && (
        <div className="bg-red-600/80 text-white text-xs text-center py-1">{syncError}</div>
      )}
      {showHelp && <HowToPlayModal onClose={() => setShowHelp(false)} />}
      <div className="flex-1 min-h-0 overflow-visible">
        <GameBoard
          gameState={gameState}
          myPlayerId={playerId}
          onStateChange={handleStateChange}
          playerEmoji={playerEmoji}
          isMultiplayer
        />
      </div>
    </div>
  );
}
