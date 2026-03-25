import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-990c827f`;
const SAVE_KEY_PREFIX = 'palace-save-';

interface SavedGame {
  code: string;
  playerId: string;
  savedAt?: number;
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

export default function RejoinGamesPage() {
  const navigate = useNavigate();
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      const saves: SavedGame[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(SAVE_KEY_PREFIX)) {
          const data = JSON.parse(localStorage.getItem(key)!);
          saves.push({ code: data.code, playerId: data.playerId, savedAt: data.savedAt });
        }
      }
      // Sort by most recent first
      saves.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
      setSavedGames(saves);
    } catch { /* ignore */ }
  }, []);

  const rejoinGame = async (code: string, playerId: string) => {
    setJoiningCode(code);
    setError('');
    try {
      const res = await fetch(`${API}/games/${code}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const data = await res.json();
      if (res.ok && data.state) {
        navigate('/multiplayer', { state: { code, playerId, gameState: data.state } });
      } else {
        localStorage.removeItem(`${SAVE_KEY_PREFIX}${code}`);
        setSavedGames(prev => prev.filter(s => s.code !== code));
        setError('Game no longer available');
      }
    } catch {
      setError('Failed to connect. Please try again.');
    } finally {
      setJoiningCode(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center p-6 text-white gap-6">
      <div className="w-full max-w-xs">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-green-300 text-sm hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-xl font-bold mb-4">Rejoin a Game</h2>

        {error && (
          <div className="bg-red-600/20 border border-red-400/30 rounded-xl px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}

        {savedGames.length === 0 ? (
          <div className="text-center text-green-400 text-sm py-8">
            No saved games found.
          </div>
        ) : (
          <div className="space-y-3">
            {savedGames.map(sg => (
              <button
                key={sg.code}
                onClick={() => rejoinGame(sg.code, sg.playerId)}
                disabled={joiningCode === sg.code}
                className="flex items-center justify-between w-full px-4 py-3 bg-purple-500/20 border border-purple-400/30 rounded-xl hover:bg-purple-500/30 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                <div className="text-left">
                  <span className="font-mono font-bold text-purple-200 text-lg">{sg.code}</span>
                  {sg.savedAt && (
                    <div className="text-[11px] text-purple-400 mt-0.5">{formatShortDateTime(sg.savedAt)}</div>
                  )}
                </div>
                {joiningCode === sg.code ? (
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                ) : (
                  <span className="text-xs text-purple-400">Tap to rejoin →</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
