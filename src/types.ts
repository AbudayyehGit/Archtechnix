export interface PhaseQuiz {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface CurriculumPhase {
  phase: number;
  title: string;
  tagline: string;
  reading: string[];
  keyInvariants: string[];
  codeSample: string;
  codeLanguage: string;
  quiz: PhaseQuiz;
  associatedDocKey: 'masa' | 'checklist' | 'glossary';
}

export interface PricingTier {
  id: 'diagnostic' | 'audit' | 'retainer';
  name: string;
  badge: string;
  price: number;
  period?: string;
  turnaround: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface ScopeAddon {
  id: 'expedite' | 'terraform' | 'drDrill';
  label: string;
  price: number;
  description: string;
}

export interface IntakeSpecData {
  org: string;
  cloud: string;
  rpo: string;
  repo: string;
  compliance: {
    gdpr: boolean;
    soc2: boolean;
    nist: boolean;
  };
  notes: string;
}

export interface PrototypeItem {
  id: string;
  title: string;
  badge: string;
  iconType: 'scale' | 'checkSquare' | 'book' | 'creditCard' | 'webhook' | 'laptop' | 'cpu' | 'network' | 'sparkles' | 'activity' | 'shield' | 'barChart';
  description: string;
  techStack: string[];
  statusMetric: string;
  endpointUrl?: string;
  content: string;
}

export interface ModalPayload {
  isOpen: boolean;
  title: string;
  iconType: 'scale' | 'checkSquare' | 'book' | 'creditCard' | 'webhook' | 'laptop' | 'cpu' | 'network' | 'sparkles' | 'activity' | 'shield' | 'barChart';
  content: string;
  checkoutUrl?: string;
}

// ============================================================================
// CONSOLIDATED EXECUTION ADDENDUM: IDEMPOTENT GUARDS, STEADY-STATE & EVOLUTION
// ============================================================================

export interface RequirementSpec {
  id: string;
  description: string;
  targetMetric: string;
  currentValue: number | string | boolean;
  requiredValue: number | string | boolean;
}

export interface VerificationResult {
  requirementId: string;
  isMet: boolean;
  reason: string;
}

export interface SystemSteadyState {
  id: string;
  checkpoint_label: string;
  git_commit_hash: string;
  snapshot_metadata: Record<string, unknown>;
  established_at: string;
}

export type EvolutionStatus = 'pending_review' | 'auto_adapted' | 'archived';

export interface SkillPerformanceMetric {
  sprintType: 'pilot_audit_14d' | 'retainer_monthly';
  deliveryDays: number;
  targetWindowDays: number;
  outOfScopeFlags: number;
  architectVelocityScore: number;
  rpoVerifiedMinutes: number;
}

export interface SkillEvolutionLog {
  id: string;
  skill_name: string;
  performance_metric: SkillPerformanceMetric;
  client_requirement_delta: string;
  evolution_status: EvolutionStatus;
  created_at: string;
}

export interface IntakeValidationThresholds {
  minNotesChars: number;
  minComplianceMandates: number;
  maxOutOfScopeFlagsTolerance: number;
  diagnosticWindowDays: number;
  retainerEscalationActive: boolean;
  adaptedRuleReason: string;
}

export interface AdaptedSkillBlueprint {
  version: string;
  lastAdaptedAt: string;
  metaPromptTemplate: string;
  componentBlueprint: string;
}

export interface CleanupAuditItem {
  id: string;
  category: 'imports' | 'css' | 'flags' | 'typescript' | 'sql';
  label: string;
  passed: boolean;
  detail: string;
}

export interface CleanupAuditReport {
  executedAt: string;
  overallClean: boolean;
  items: CleanupAuditItem[];
}
