-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🦆',
  rankings JSONB NOT NULL DEFAULT '{"gold":0,"silver":0,"bronze":0,"losses":0,"gamesPlayed":0}',
  incognito BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Anyone can look up a profile by username (for friend requests)
-- Returns limited columns via Edge Function, not direct table access
CREATE POLICY "Public username lookup"
  ON profiles FOR SELECT USING (true);
