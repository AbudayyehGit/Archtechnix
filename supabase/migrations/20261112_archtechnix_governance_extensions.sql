-- ============================================================================
-- Archtechnix {∞} — Supabase PostgreSQL Schema Extensions
-- Steady-State Checkpointing & Evolutionary Skill Builder Telemetry
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. System Steady-State Checkpoints Table
CREATE TABLE IF NOT EXISTS public.system_steady_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_label text NOT NULL,
  git_commit_hash text NOT NULL,
  snapshot_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  established_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_steady_states_established_at
  ON public.system_steady_states (established_at DESC);

-- 2. Evolutionary Skill Builder Telemetry & Adaptation Logs Table
CREATE TABLE IF NOT EXISTS public.skill_evolution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  performance_metric jsonb NOT NULL,
  client_requirement_delta text,
  evolution_status text NOT NULL CHECK (
    evolution_status IN ('pending_review', 'auto_adapted', 'archived')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_evolution_logs_status_created
  ON public.skill_evolution_logs (evolution_status, created_at DESC);

-- 3. Strict Row Level Security (RLS) Enforcement
ALTER TABLE public.system_steady_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_evolution_logs ENABLE ROW LEVEL SECURITY;

-- Read Policies: Authenticated operators may inspect steady-state and evolution telemetry
DROP POLICY IF EXISTS "system_steady_states_read_authenticated" ON public.system_steady_states;
CREATE POLICY "system_steady_states_read_authenticated"
  ON public.system_steady_states
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "skill_evolution_logs_read_authenticated" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_read_authenticated"
  ON public.skill_evolution_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Write Policies: Strictly restricted exclusively to the admin_architect role
DROP POLICY IF EXISTS "system_steady_states_admin_write_insert" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_insert"
  ON public.system_steady_states
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "system_steady_states_admin_write_update" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_update"
  ON public.system_steady_states
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "system_steady_states_admin_write_delete" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_delete"
  ON public.system_steady_states
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_insert" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_insert"
  ON public.skill_evolution_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_update" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_update"
  ON public.skill_evolution_logs
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_delete" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_delete"
  ON public.skill_evolution_logs
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect');
