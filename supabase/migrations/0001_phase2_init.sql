-- ============================================================
-- LinguaAI Phase 2 Migration
-- Note: tables users/vocabulary/user_vocabulary/conversations/audio_cache
--       already existed from Phase 1 with base schema.
--       This migration adds SM-2 columns, missing fields, indexes,
--       triggers, and additional RLS policies.
-- Applied: 2026-06-22
-- ============================================================

-- ==========================
-- 1. users（使用者個資 / profiles equivalent）
--    references auth.users, RLS enabled
-- ==========================
-- Base columns already existed: id, email, display_name, avatar_url,
--   line_user_id, preferred_locale, created_at, updated_at

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS native_language text NOT NULL DEFAULT 'zh-TW',
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS daily_goal_words int DEFAULT 10,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Asia/Taipei';

-- Policies (SELECT + UPDATE existed; INSERT added here)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users can insert own profile'
  ) THEN
    CREATE POLICY "users can insert own profile"
      ON public.users FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END$$;

-- ==========================
-- 2. vocabulary（單字主表）
--    已登入者可讀，RLS enabled
-- ==========================
-- Base columns: id, word, level, definition_zh, example_en, example_zh, phonetic, created_at

ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS definition_en text,
  ADD COLUMN IF NOT EXISTS example_sentence text,
  ADD COLUMN IF NOT EXISTS example_sentence_zh text,
  ADD COLUMN IF NOT EXISTS difficulty int DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS part_of_speech text,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ==========================
-- 3. user_vocabulary（每人每字 SM-2 狀態）
--    user_id + vocabulary_id 唯一，RLS enabled
-- ==========================
-- Base columns: id, user_id, vocabulary_id, interval, repetitions,
--               ease_factor, next_review, last_reviewed_at

ALTER TABLE public.user_vocabulary
  ADD COLUMN IF NOT EXISTS ease_factor_real real DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS interval_days int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS last_reviewed timestamptz,
  ADD COLUMN IF NOT EXISTS total_reviews int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS correct_reviews int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_learned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS added_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_vocabulary_user_id_vocabulary_id_key'
  ) THEN
    ALTER TABLE public.user_vocabulary ADD CONSTRAINT user_vocabulary_user_id_vocabulary_id_key UNIQUE (user_id, vocabulary_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_due
  ON public.user_vocabulary(user_id, due_date);

-- ==========================
-- 4. conversations（AI 對話練習）
--    RLS enabled
-- ==========================
-- Base columns: id, user_id, scenario, messages, feedback, started_at, ended_at

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS topic_category text,
  ADD COLUMN IF NOT EXISTS message_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_seconds int,
  ADD COLUMN IF NOT EXISTS score int CHECK (score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'users can insert own conversations'
  ) THEN
    CREATE POLICY "users can insert own conversations"
      ON public.conversations FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_conversations_user_created
  ON public.conversations(user_id, started_at DESC);

-- ==========================
-- 5. audio_cache（TTS 快取）
--    已登入者可讀，service_role 可寫
-- ==========================
-- Base columns: id, word, audio_url, created_at

ALTER TABLE public.audio_cache
  ADD COLUMN IF NOT EXISTS text_hash text,
  ADD COLUMN IF NOT EXISTS text text,
  ADD COLUMN IF NOT EXISTS voice text NOT NULL DEFAULT 'en-US-Standard-A',
  ADD COLUMN IF NOT EXISTS file_size_bytes int,
  ADD COLUMN IF NOT EXISTS last_accessed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS access_count int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audio_cache_text_hash_key'
  ) THEN
    ALTER TABLE public.audio_cache ADD CONSTRAINT audio_cache_text_hash_key UNIQUE (text_hash);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audio_cache' AND policyname = 'authenticated users can read audio_cache'
  ) THEN
    CREATE POLICY "authenticated users can read audio_cache"
      ON public.audio_cache FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audio_cache' AND policyname = 'service role can manage audio_cache'
  ) THEN
    CREATE POLICY "service role can manage audio_cache"
      ON public.audio_cache FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END$$;

-- ==========================
-- 觸發器：updated_at 自動更新
-- ==========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'users_updated_at') THEN
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON public.users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vocabulary_updated_at') THEN
    CREATE TRIGGER vocabulary_updated_at
      BEFORE UPDATE ON public.vocabulary
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'conversations_updated_at') THEN
    CREATE TRIGGER conversations_updated_at
      BEFORE UPDATE ON public.conversations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END$$;
