-- Profiles table (public schema)
-- References Supabase Auth's auth.users table.
-- A trigger auto-creates a row here whenever a new user signs up.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '🦆',
  rankings JSONB NOT NULL DEFAULT '{"gold":0,"silver":0,"bronze":0,"losses":0,"gamesPlayed":0}',
  incognito BOOLEAN NOT NULL DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger function: auto-create a profile row when a new auth user is created.
-- Reads username, nickname, emoji, and optional imported rankings from
-- the raw_user_meta_data that was passed via signUp({ options: { data: {...} } }).
-- Uses SECURITY DEFINER so it can write to public.profiles on behalf of the
-- supabase_auth_admin role that performs the insert into auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, emoji, rankings)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'username', ''),
    COALESCE(new.raw_user_meta_data ->> 'nickname', ''),
    COALESCE(new.raw_user_meta_data ->> 'emoji', '🦆'),
    COALESCE(
      (new.raw_user_meta_data -> 'rankings')::jsonb,
      '{"gold":0,"silver":0,"bronze":0,"losses":0,"gamesPlayed":0}'::jsonb
    )
  );
  RETURN new;
END;
$$;

-- Fire the trigger after every new auth user row is inserted.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can look up profiles (for leaderboard, friend search, multiplayer display).
-- Sensitive data (email, etc.) lives in auth.users, not here.
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (fallback if trigger didn't fire)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
