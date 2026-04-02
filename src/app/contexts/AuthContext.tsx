import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { PlayerStats } from '../game-engine';
import { STATS_KEY } from '../lib/stats';
import { PLAYER_NAME_KEY, PLAYER_EMOJI_KEY } from '../lib/storage-keys';

export interface Profile {
  id: string;
  username: string;
  nickname: string;
  emoji: string;
  rankings: PlayerStats;
  incognito: boolean;
  last_seen: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    username: string,
    password: string,
    nickname: string,
    emoji: string,
    importStats?: PlayerStats,
  ) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<Profile, 'nickname' | 'emoji' | 'incognito'>>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  signUp: async () => ({}),
  signIn: async () => ({}),
  signOut: async () => {},
  updateProfile: async () => ({}),
  refreshProfile: async () => {},
});

/** Sync profile data to localStorage so the rest of the app picks it up. */
function syncProfileToLocalStorage(profile: Profile) {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, profile.nickname || profile.username);
    localStorage.setItem(PLAYER_EMOJI_KEY, profile.emoji);
    localStorage.setItem(STATS_KEY, JSON.stringify(profile.rankings));
  } catch { /* ignore */ }
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load profile and sync to localStorage
  const loadProfile = useCallback(async (userId: string) => {
    const p = await fetchProfile(userId);
    setProfile(p);
    if (p) syncProfileToLocalStorage(p);
  }, []);

  // On mount: check existing session
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      }
      setLoading(false);
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          await loadProfile(u.id);
        } else {
          setProfile(null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (
    email: string,
    username: string,
    password: string,
    nickname: string,
    emoji: string,
    importStats?: PlayerStats,
  ): Promise<{ error?: string }> => {
    const defaultStats: PlayerStats = { gold: 0, silver: 0, bronze: 0, losses: 0, gamesPlayed: 0 };
    const rankings = importStats ?? defaultStats;

    // Sign up with Supabase Auth.
    // Pass profile fields via options.data so they are stored in
    // auth.users.raw_user_meta_data. The database trigger
    // (handle_new_user) reads them to auto-create the profiles row.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.toLowerCase(),
          nickname,
          emoji,
          rankings,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { error: 'An account with this email already exists.' };
      }
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Sign-up failed. Please try again.' };
    }

    setUser(authData.user);
    await loadProfile(authData.user.id);
    return {};
  }, [loadProfile]);

  const signIn = useCallback(async (
    email: string,
    password: string,
  ): Promise<{ error?: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: 'Invalid email or password.' };
    }

    if (data.user) {
      setUser(data.user);
      await loadProfile(data.user.id);
    }
    return {};
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(async (
    updates: Partial<Pick<Profile, 'nickname' | 'emoji' | 'incognito'>>,
  ): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not signed in.' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) return { error: error.message };

    // Refresh local profile state
    await loadProfile(user.id);
    return {};
  }, [user, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
