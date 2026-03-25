import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { GameState, cardDisplay } from '../game-engine';
import { GameBoard } from '../components/GameBoard';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { HelpCircle } from 'lucide-react';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-990c827f`;
const SAVE_KEY_PREFIX = 'palace-save-';

/**
 * Merge the local player's completed palace setup into the latest server state.
 * Preserves other players' data from the server while applying local choices.
 * If the merge causes all players to be done, transitions the game to 'playing'.
 */
function mergeSetupWithServer(
  serverState: GameState,
  localState: GameState,
  localPlayerId: string,
): GameState {
  const merged: GameState = JSON.parse(JSON.stringify(serverState));
  const localPlayer = localState.players.find(p => p.id === localPlayerId);
  if (!localPlayer) return localState;

  const idx = merged.players.findIndex(p => p.id === localPlayerId);
  if (idx === -1) return localState;

  // Carry over the local player's completed setup data
  merged.players[idx] = JSON.parse(JSON.stringify(localPlayer));

  // If all players are now done, transition to playing phase
  if (merged.phase === 'setup' && merged.players.every(p => p.setupPhase === 'done')) {
    merged.phase = 'playing';
    if (merged.drawPile.length > 0) {
      const firstCard = merged.drawPile.shift()!;
      merged.pickupPile.push(firstCard);
      merged.log.push(`All players ready! First card drawn: ${cardDisplay(firstCard)}`);
      merged.log.push(`${merged.players[merged.currentPlayerIndex].name}'s turn.`);
    }
  }

  merged.version = serverState.version + 1;
  return merged;
}

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
  // Store latest server state polled in the background during setup
  const deferredServerStateRef = useRef<GameState | null>(null);
  // Hold deferred local setup state for retry until merge succeeds
  const pendingSetupStateRef = useRef<GameState | null>(null);

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
      deferredServerStateRef.current = null;
      pendingSetupStateRef.current = null;
    }
  }, [isLocalSetupDone]);

  /**
   * Attempt to push a state to the server. On 409 conflict (stale version),
   * fetch fresh server state, re-merge the local player's setup, and retry.
   * Keeps pendingSetupStateRef populated until the push succeeds.
   */
  const pushWithMergeRetry = useCallback(async (stateToSend: GameState, localSetupState: GameState) => {
    const MAX_RETRIES = 3;
    let current = stateToSend;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(`${API}/games/${code}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ state: current, playerId }),
        });
        if (res.ok) {
          // Push succeeded — clear pending state
          pendingSetupStateRef.current = null;
          return;
        }
        const data = await res.json();
        if (res.status === 409) {
          // Fetch fresh server state and re-merge
          const freshRes = await fetch(`${API}/games/${code}`, { headers });
          const freshData = await freshRes.json();
          if (freshData.state) {
            const reMerged = mergeSetupWithServer(freshData.state, localSetupState, playerId);
            current = reMerged;
            versionRef.current = reMerged.version;
            setGameState(reMerged);
          } else {
            break;
          }
        } else {
          setSyncError(data.error);
          return;
        }
      } catch (e: any) {
        console.log('Sync error during setup merge:', e);
        // Keep pending state for background retry
        break;
      }
    }
    // Retries exhausted or error — keep deferred data for background retry
    pendingSetupStateRef.current = localSetupState;
  }, [code, playerId]);

  useEffect(() => {
    if (!code || !playerId || !initialState) {
      navigate('/');
      return;
    }

    // Poll for state updates
    pollRef.current = window.setInterval(async () => {
      // During local setup (before player finishes), poll and save server state without overwriting UI
      if (!setupDoneRef.current) {
        try {
          const res = await fetch(`${API}/games/${code}`, { headers });
          const data = await res.json();
          if (res.ok && data.state) {
            deferredServerStateRef.current = data.state;
          }
        } catch (e) { console.log('Background poll error during setup:', e); }

        // If a pending setup state exists (previous merge push failed), retry
        if (pendingSetupStateRef.current && deferredServerStateRef.current) {
          const merged = mergeSetupWithServer(
            deferredServerStateRef.current,
            pendingSetupStateRef.current,
            playerId,
          );
          try {
            const res = await fetch(`${API}/games/${code}`, {
              method: 'PUT', headers,
              body: JSON.stringify({ state: merged, playerId }),
            });
            if (res.ok) {
              pendingSetupStateRef.current = null;
              versionRef.current = merged.version;
              setGameState(merged);
              setupDoneRef.current = true;
            }
          } catch (e) { console.log('Background merge retry error:', e); }
        }
        return;
      }

      // After local setup is done — poll for updates from other players
      try {
        const res = await fetch(`${API}/games/${code}`, { headers });
        const data = await res.json();
        if (!res.ok) return;

        if (data.state && data.state.version > versionRef.current) {
          // If there's still a pending setup push (previous attempts failed), retry
          // using the latest server state before accepting it
          if (pendingSetupStateRef.current) {
            const merged = mergeSetupWithServer(data.state, pendingSetupStateRef.current, playerId);
            try {
              const pushRes = await fetch(`${API}/games/${code}`, {
                method: 'PUT', headers,
                body: JSON.stringify({ state: merged, playerId }),
              });
              if (pushRes.ok) {
                pendingSetupStateRef.current = null;
                versionRef.current = merged.version;
                setGameState(merged);
              }
            } catch (e) { console.log(`Pending setup retry error (game=${code}, player=${playerId}):`, e); }
            return;
          }

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
      // Setup just completed — merge local choices with latest server data
      setupDoneRef.current = true;

      const serverState = deferredServerStateRef.current;
      if (serverState) {
        const merged = mergeSetupWithServer(serverState, newState, playerId);
        deferredServerStateRef.current = null;
        setGameState(merged);
        versionRef.current = merged.version;
        await pushWithMergeRetry(merged, newState);
        return;
      }
      // No deferred server data available — fall through to push local state directly
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
            // If we just finished setup, re-merge before accepting server state
            const me = newState.players.find(p => p.id === playerId);
            if (me?.setupPhase === 'done' && freshData.state.phase === 'setup') {
              const merged = mergeSetupWithServer(freshData.state, newState, playerId);
              versionRef.current = merged.version;
              setGameState(merged);
              await pushWithMergeRetry(merged, newState);
            } else {
              versionRef.current = freshData.state.version;
              setGameState(freshData.state);
            }
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
