-- Wildcard: protagonist layer schema
-- Run in Supabase Dashboard -> SQL Editor.

-- ── Tasks ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  persona_id TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_owner_rw" ON public.tasks;
CREATE POLICY "tasks_owner_rw"
  ON public.tasks FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Schedule events ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedule_events_owner_rw" ON public.schedule_events;
CREATE POLICY "schedule_events_owner_rw"
  ON public.schedule_events FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Confidants ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.confidants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  last_contact_at TIMESTAMPTZ,
  follow_ups_owed TEXT[] NOT NULL DEFAULT '{}',
  questions_queued TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.confidants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "confidants_owner_rw" ON public.confidants;
CREATE POLICY "confidants_owner_rw"
  ON public.confidants FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Event log ────────────────────────────────────────────────────────────────
-- Central log both layers read and write: feeds persona sessions with context,
-- and is written back to when a persona session completes something.

CREATE TABLE IF NOT EXISTS public.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  persona_id TEXT,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  confidant_id UUID REFERENCES public.confidants(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_log_owner_rw" ON public.event_log;
CREATE POLICY "event_log_owner_rw"
  ON public.event_log FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Persona progression ──────────────────────────────────────────────────────
-- Rank/XP per user per persona, sourced from event_log completions.

CREATE TABLE IF NOT EXISTS public.persona_progression (
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  evolved_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, persona_id)
);

ALTER TABLE public.persona_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "persona_progression_owner_rw" ON public.persona_progression;
CREATE POLICY "persona_progression_owner_rw"
  ON public.persona_progression FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
