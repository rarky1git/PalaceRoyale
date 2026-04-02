import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { UserPlus, LogIn, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { loadLocalStats } from '../lib/stats';
import { PLAYER_EMOJIS, extractFirstEmoji } from '../lib/emoji';
import { PLAYER_NAME_KEY, PLAYER_EMOJI_KEY } from '../lib/storage-keys';
import type { PlayerStats } from '../game-engine';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, signUp, signIn } = useAuth();
  const [tab, setTab] = useState<'signup' | 'signin'>('signup');

  // Sign Up fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; } catch { return ''; }
  });
  const [emoji, setEmoji] = useState(() => {
    try { return localStorage.getItem(PLAYER_EMOJI_KEY) || '🦆'; } catch { return '🦆'; }
  });
  const [importStats, setImportStats] = useState(false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (showCustomEmojiInput && customEmojiInputRef.current) {
      customEmojiInputRef.current.focus();
    }
  }, [showCustomEmojiInput]);

  const selectEmoji = (e: string) => {
    setEmoji(e);
    setShowCustomEmojiInput(false);
  };

  const handleCustomEmojiInput = (value: string) => {
    const first = extractFirstEmoji(value);
    if (first) selectEmoji(first);
  };

  const isCustomEmoji = !PLAYER_EMOJIS.includes(emoji);

  const handleSignUp = async () => {
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!nickname.trim()) {
      setError('Please enter a nickname.');
      return;
    }

    setSubmitting(true);
    let stats: PlayerStats | undefined;
    if (importStats) {
      stats = loadLocalStats();
      if (stats.gamesPlayed === 0) stats = undefined;
    }

    const result = await signUp(email.trim().toLowerCase(), username.trim().toLowerCase(), password, nickname.trim(), emoji, stats);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const handleSignIn = async () => {
    setError('');
    if (!signInEmail.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (!signInPassword) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(signInEmail.trim().toLowerCase(), signInPassword);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  const localStats = loadLocalStats();
  const hasLocalStats = localStats.gamesPlayed > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex flex-col items-center justify-start p-6 text-white">
      {/* Header */}
      <div className="w-full max-w-xs flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="text-green-300 hover:text-white text-sm"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
            {tab === 'signup' ? (
              <UserPlus className="w-5 h-5 text-yellow-900" />
            ) : (
              <LogIn className="w-5 h-5 text-yellow-900" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {tab === 'signup' ? 'Sign Up' : 'Sign In'}
          </h1>
        </div>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 w-full max-w-xs mb-6">
        <button
          onClick={() => { setTab('signup'); setError(''); }}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${
            tab === 'signup' ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          Sign Up
        </button>
        <button
          onClick={() => { setTab('signin'); setError(''); }}
          className={`flex-1 py-2 rounded-lg font-bold transition-all ${
            tab === 'signin' ? 'bg-yellow-500 text-black' : 'bg-white/10 hover:bg-white/20'
          }`}
        >
          Sign In
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="w-full max-w-xs mb-4 px-4 py-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {tab === 'signup' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div>
            <label className="text-sm text-green-300 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
            />
          </div>

          <div>
            <label className="text-sm text-green-300 mb-1 block">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Choose a username"
              maxLength={20}
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400 font-mono"
            />
            <p className="text-xs text-green-500 mt-1">Letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="text-sm text-green-300 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min 6 characters"
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
            />
          </div>

          <div>
            <label className="text-sm text-green-300 mb-1 block">Nickname</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="Display name"
              maxLength={20}
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
            />
          </div>

          {/* Emoji picker */}
          <div>
            <label className="text-sm text-green-300 mb-1 block">Your emoji</label>
            <div className="flex flex-wrap gap-1.5">
              {PLAYER_EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => selectEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-all active:scale-90 ${
                    emoji === e ? 'bg-yellow-500 ring-2 ring-yellow-300' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {e}
                </button>
              ))}
              {showCustomEmojiInput ? (
                <input
                  ref={customEmojiInputRef}
                  type="text"
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
                  {isCustomEmoji ? emoji : '✏️'}
                </button>
              )}
            </div>
          </div>

          {/* Import rankings from this device */}
          {hasLocalStats && (
            <button
              onClick={() => setImportStats(!importStats)}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${
                importStats
                  ? 'bg-yellow-500/20 border border-yellow-400/30'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              <Upload className="w-5 h-5 text-yellow-400" />
              <div className="text-left flex-1">
                <div className="font-semibold text-sm text-yellow-300">Import Rankings</div>
                <div className="text-xs text-green-400">
                  🥇 {localStats.gold} · 🥈 {localStats.silver} · 🥉 {localStats.bronze}
                  {localStats.losses > 0 && ` · 💀 ${localStats.losses}`}
                </div>
              </div>
              <div
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  importStats ? 'bg-yellow-500' : 'bg-green-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    importStats ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          )}

          <button
            onClick={handleSignUp}
            disabled={submitting}
            className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </div>
      )}

      {tab === 'signin' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <div>
            <label className="text-sm text-green-300 mb-1 block">Email</label>
            <input
              type="email"
              value={signInEmail}
              onChange={e => setSignInEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
            />
          </div>

          <div>
            <label className="text-sm text-green-300 mb-1 block">Password</label>
            <input
              type="password"
              value={signInPassword}
              onChange={e => setSignInPassword(e.target.value)}
              placeholder="Your password"
              className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
            />
          </div>

          <button
            onClick={handleSignIn}
            disabled={submitting}
            className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </div>
      )}
    </div>
  );
}
