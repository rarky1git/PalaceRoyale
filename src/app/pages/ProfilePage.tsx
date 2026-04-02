import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User, LogOut, Save, Shield, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { STATS_KEY } from '../lib/stats';
import { supabase } from '../lib/supabase';
import { PLAYER_EMOJIS, extractFirstEmoji } from '../lib/emoji';
import type { PlayerStats } from '../game-engine';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, updateProfile, refreshProfile } = useAuth();

  const [nickname, setNickname] = useState('');
  const [emoji, setEmoji] = useState('🦆');
  const [incognito, setIncognito] = useState(false);
  const [showCustomEmojiInput, setShowCustomEmojiInput] = useState(false);
  const customEmojiInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  // Redirect to auth page if not signed in
  useEffect(() => {
    if (!loading && !user) navigate('/auth', { replace: true });
  }, [loading, user, navigate]);

  // Populate form fields from profile
  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setEmoji(profile.emoji);
      setIncognito(profile.incognito);
      setDirty(false);
    }
  }, [profile]);

  useEffect(() => {
    if (showCustomEmojiInput && customEmojiInputRef.current) {
      customEmojiInputRef.current.focus();
    }
  }, [showCustomEmojiInput]);

  const selectEmoji = (e: string) => {
    setEmoji(e);
    setShowCustomEmojiInput(false);
    setDirty(true);
  };

  const handleCustomEmojiInput = (value: string) => {
    const first = extractFirstEmoji(value);
    if (first) selectEmoji(first);
  };

  const isCustomEmoji = !PLAYER_EMOJIS.includes(emoji);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    const result = await updateProfile({ nickname: nickname.trim(), emoji, incognito });
    setSaving(false);
    if (result.error) {
      setSaveMsg({ ok: false, msg: result.error });
    } else {
      setSaveMsg({ ok: true, msg: 'Profile updated!' });
      setDirty(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleSyncStats = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const raw = localStorage.getItem(STATS_KEY);
      const stats: PlayerStats = raw
        ? (JSON.parse(raw) as PlayerStats)
        : { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };

      const { error } = await supabase
        .from('profiles')
        .update({ rankings: stats })
        .eq('id', user.id);

      if (error) {
        setSyncMsg({ ok: false, msg: 'Failed to sync. Please try again.' });
      } else {
        await refreshProfile();
        setSyncMsg({ ok: true, msg: 'Rankings synced to your account!' });
        setTimeout(() => setSyncMsg(null), 3000);
      }
    } catch {
      setSyncMsg({ ok: false, msg: 'Sync failed. Please try again.' });
    }
    setSyncing(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-emerald-900 flex items-center justify-center text-white">
        <p className="text-green-300">Loading…</p>
      </div>
    );
  }

  if (!profile) return null;

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
            <User className="w-5 h-5 text-yellow-900" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        </div>
        <div className="w-10" />
      </div>

      <div className="flex flex-col gap-5 w-full max-w-xs">
        {/* Username (read-only) */}
        <div>
          <label className="text-xs uppercase tracking-widest text-green-400 mb-1 block pl-1">Username</label>
          <div className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-green-300 font-mono text-sm">
            @{profile.username}
          </div>
        </div>

        {/* Nickname */}
        <div>
          <label className="text-xs uppercase tracking-widest text-green-400 mb-1 block pl-1">Nickname</label>
          <input
            value={nickname}
            onChange={e => { setNickname(e.target.value); setDirty(true); }}
            placeholder="Display name"
            maxLength={20}
            className="w-full px-4 py-3 bg-white/10 rounded-xl text-white placeholder:text-green-400 outline-none focus:ring-2 ring-yellow-400"
          />
        </div>

        {/* Emoji picker */}
        <div>
          <label className="text-xs uppercase tracking-widest text-green-400 mb-1 block pl-1">Emoji</label>
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

        {/* Incognito toggle */}
        <button
          onClick={() => { setIncognito(!incognito); setDirty(true); }}
          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${
            incognito
              ? 'bg-white/15 border border-yellow-400/30'
              : 'bg-white/5 border border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${incognito ? 'text-yellow-300' : 'text-green-500'}`} />
            <div className="text-left">
              <div className={`font-semibold text-sm ${incognito ? 'text-white' : 'text-green-300'}`}>
                Incognito Mode
              </div>
              <div className="text-xs text-green-400">Hide your online status from others</div>
            </div>
          </div>
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${
              incognito ? 'bg-yellow-500' : 'bg-green-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                incognito ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </button>

        {/* Save button */}
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving || !nickname.trim()}
            className="w-full py-3 bg-yellow-500 text-black rounded-xl font-bold text-lg disabled:opacity-40 hover:bg-yellow-400 active:scale-[0.98] transition-all"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        )}
        {saveMsg && (
          <p className={`text-xs px-1 ${saveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {saveMsg.msg}
          </p>
        )}

        {/* Rankings */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-green-400 mb-2 pl-1">Rankings</h2>
          <div className="flex items-center justify-between px-4 py-3 bg-yellow-500/10 border border-yellow-400/30 rounded-xl">
            <div className="flex items-center gap-3 text-sm">
              <span>🥇 {profile.rankings.gold}</span>
              <span>🥈 {profile.rankings.silver}</span>
              <span>🥉 {profile.rankings.bronze}</span>
              {profile.rankings.losses > 0 && <span className="text-red-400">💀 {profile.rankings.losses}</span>}
            </div>
            <span className="text-xs text-green-500">{profile.rankings.gamesPlayed} games</span>
          </div>
        </div>

        {/* Sync stats */}
        <button
          onClick={handleSyncStats}
          disabled={syncing}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          <Save className="w-5 h-5 text-yellow-400" />
          <div className="text-left flex-1">
            <div className="font-semibold text-sm text-yellow-300">
              {syncing ? 'Syncing…' : 'Sync Device Rankings'}
            </div>
            <div className="text-xs text-green-400">Push this device's local stats to your account</div>
          </div>
        </button>
        {syncMsg && (
          <p className={`text-xs px-1 ${syncMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
            {syncMsg.msg}
          </p>
        )}

        {/* Friends placeholder */}
        <div>
          <h2 className="text-xs uppercase tracking-widest text-green-400 mb-2 pl-1">Friends</h2>
          <div className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10">
            <Users className="w-5 h-5 text-green-500" />
            <div className="text-left flex-1">
              <div className="font-semibold text-sm text-green-300">Coming Soon</div>
              <div className="text-xs text-green-500">Friend requests, online status & invites</div>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 hover:bg-red-500/20 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-5 h-5 text-red-400" />
          <div className="text-left">
            <div className="font-semibold text-sm text-red-300">Sign Out</div>
          </div>
        </button>
      </div>
    </div>
  );
}
