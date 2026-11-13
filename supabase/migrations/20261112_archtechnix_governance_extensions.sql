-- ============================================================================
-- Archtechnix {∞} (Production v2.0) — Supabase PostgreSQL Schema & Strict RLS
-- Tables: clients, audits, retainers, compliance_metrics, adrs, sync_agendas,
--         scope_boundaries, system_steady_states, skill_evolution_logs
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Clients Table (Tenant Root tied to Firebase/Supabase Auth UID)
CREATE TABLE IF NOT EXISTS public.clients (
  id bigserial PRIMARY KEY,
  uid text NOT NULL UNIQUE,
  email text NOT NULL,
  organization_name text NOT NULL DEFAULT 'Apex FinTech Systems',
  primary_cloud text NOT NULL DEFAULT 'AWS (EKS, Aurora, KMS)',
  rpo_target text NOT NULL DEFAULT 'Sub-15 Minute (Zero Data Loss)',
  repo_url text NOT NULL DEFAULT 'https://github.com/apex-fintech/core-mesh',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Pilot Audits Table ($3,500 14-day async diagnostic sprints)
CREATE TABLE IF NOT EXISTS public.audits (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '14-Day Pilot Architecture & DevSecOps Audit',
  tier text NOT NULL DEFAULT 'diagnostic',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending_checkout')),
  overall_score integer NOT NULL DEFAULT 64,
  loom_url text NOT NULL DEFAULT 'https://www.loom.com/share/archtechnix-pilot-briefing',
  roadmap_markdown text NOT NULL,
  stripe_session_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Fractional Advisory Retainers Table ($7,500/mo, capped at 4 concurrent clients)
CREATE TABLE IF NOT EXISTS public.retainers (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive', 'pending', 'active', 'paused')),
  monthly_amount_usd integer NOT NULL DEFAULT 7500,
  cadence_window text NOT NULL DEFAULT 'Async-by-Default + Thursdays 14:00 UTC (60m Sync)',
  stripe_session_id text,
  stripe_subscription_id text,
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. DevSecOps Compliance Readiness Matrix
CREATE TABLE IF NOT EXISTS public.compliance_metrics (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  framework text NOT NULL CHECK (framework IN ('SOC2', 'ISO27001', 'NIST')),
  control_code text NOT NULL,
  control_title text NOT NULL,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'high' CHECK (severity IN ('critical', 'high', 'medium')),
  rpo_rto_impact text NOT NULL DEFAULT 'None',
  is_compliant boolean NOT NULL DEFAULT false,
  remediation_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Architecture Decision Records, SSDs, Data Flow Matrices & Risk Registers
CREATE TABLE IF NOT EXISTS public.adrs (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('SSD', 'ADR', 'DATA_FLOW', 'RISK_REGISTER')),
  doc_number text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Accepted',
  markdown_content text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Weekly Strategic Sync Agenda Builder
CREATE TABLE IF NOT EXISTS public.sync_agendas (
  id bigserial PRIMARY KEY,
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  sync_date text NOT NULL,
  time_window text NOT NULL DEFAULT '60 Minutes · Thursdays 14:00 UTC',
  architect_name text NOT NULL DEFAULT 'Tariq Abudayyeh',
  agenda_title text NOT NULL,
  pre_read_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_log_markdown text NOT NULL DEFAULT '',
  loom_summary_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Scope Boundary Ledger Table (Audit vs Out-of-Scope Retainer Candidate)
CREATE TABLE IF NOT EXISTS public.scope_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id bigint NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  requester text NOT NULL DEFAULT 'Client Engineering',
  requested_hours integer NOT NULL DEFAULT 4,
  classification text NOT NULL DEFAULT 'in_scope' CHECK (
    classification IN ('in_scope', 'out_of_scope_retainer_candidate')
  ),
  status text NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_review', 'completed', 'escalated_to_retainer')
  ),
  rationale text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scope_boundaries_client_class
  ON public.scope_boundaries (client_id, classification, created_at DESC);

-- 8. System Steady-State Checkpoints Table
CREATE TABLE IF NOT EXISTS public.system_steady_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_label text NOT NULL,
  git_commit_hash text NOT NULL,
  snapshot_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  established_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_steady_states_established_at
  ON public.system_steady_states (established_at DESC);

-- 9. Evolutionary Skill Builder Telemetry & Adaptation Logs Table
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

-- ============================================================================
-- STRICT ROW LEVEL SECURITY (RLS) ENFORCEMENT ACROSS ALL 9 TABLES
-- ============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scope_boundaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_steady_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_evolution_logs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies for clients
DROP POLICY IF EXISTS "clients_tenant_read" ON public.clients;
CREATE POLICY "clients_tenant_read"
  ON public.clients FOR SELECT TO authenticated
  USING (uid = auth.uid()::text OR (auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "clients_admin_write" ON public.clients;
CREATE POLICY "clients_admin_write"
  ON public.clients FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

-- Tenant isolation policies for audits, retainers, compliance_metrics, adrs, sync_agendas, scope_boundaries
DROP POLICY IF EXISTS "audits_tenant_select" ON public.audits;
CREATE POLICY "audits_tenant_select"
  ON public.audits FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "audits_admin_write" ON public.audits;
CREATE POLICY "audits_admin_write"
  ON public.audits FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "retainers_tenant_select" ON public.retainers;
CREATE POLICY "retainers_tenant_select"
  ON public.retainers FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "retainers_admin_write" ON public.retainers;
CREATE POLICY "retainers_admin_write"
  ON public.retainers FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "compliance_metrics_tenant_rw" ON public.compliance_metrics;
CREATE POLICY "compliance_metrics_tenant_rw"
  ON public.compliance_metrics FOR ALL TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "adrs_tenant_select" ON public.adrs;
CREATE POLICY "adrs_tenant_select"
  ON public.adrs FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "adrs_admin_write" ON public.adrs;
CREATE POLICY "adrs_admin_write"
  ON public.adrs FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "sync_agendas_tenant_rw" ON public.sync_agendas;
CREATE POLICY "sync_agendas_tenant_rw"
  ON public.sync_agendas FOR ALL TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  )
  WITH CHECK (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "scope_boundaries_tenant_read_insert" ON public.scope_boundaries;
CREATE POLICY "scope_boundaries_tenant_read_insert"
  ON public.scope_boundaries FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE uid = auth.uid()::text)
    OR (auth.jwt() ->> 'role') = 'admin_architect'
  );

DROP POLICY IF EXISTS "scope_boundaries_admin_write" ON public.scope_boundaries;
CREATE POLICY "scope_boundaries_admin_write"
  ON public.scope_boundaries FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

-- Governance & Telemetry Tables: Read by authenticated, write restricted exclusively to admin_architect
DROP POLICY IF EXISTS "system_steady_states_read_authenticated" ON public.system_steady_states;
CREATE POLICY "system_steady_states_read_authenticated"
  ON public.system_steady_states FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "system_steady_states_admin_write_insert" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_insert"
  ON public.system_steady_states FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "system_steady_states_admin_write_update" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_update"
  ON public.system_steady_states FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "system_steady_states_admin_write_delete" ON public.system_steady_states;
CREATE POLICY "system_steady_states_admin_write_delete"
  ON public.system_steady_states FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_read_authenticated" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_read_authenticated"
  ON public.skill_evolution_logs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_insert" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_insert"
  ON public.skill_evolution_logs FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_update" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_update"
  ON public.skill_evolution_logs FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect')
  WITH CHECK ((auth.jwt() ->> 'role') = 'admin_architect');

DROP POLICY IF EXISTS "skill_evolution_logs_admin_write_delete" ON public.skill_evolution_logs;
CREATE POLICY "skill_evolution_logs_admin_write_delete"
  ON public.skill_evolution_logs FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'role') = 'admin_architect');
