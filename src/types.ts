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

// ============================================================================
// PRODUCTION v2.0: SCOPE BOUNDARIES & PRE-FLIGHT DEBT SCANNER
// ============================================================================

export type ScopeClassification = 'in_scope' | 'out_of_scope_retainer_candidate';

export type ScopeTaskStatus = 'open' | 'in_review' | 'completed' | 'escalated_to_retainer';

export interface ScopeBoundaryItem {
  id: string;
  title: string;
  requester: string;
  requestedHours: number;
  classification: ScopeClassification;
  status: ScopeTaskStatus;
  rationale: string;
  createdAt: string;
}

export type PreFlightDebtCategory = 'undocumented_api' | 'missing_rpo_metrics' | 'brittle_db_dependency';

export interface PreFlightDebtFinding {
  id: string;
  category: PreFlightDebtCategory;
  severity: 'critical' | 'high' | 'medium';
  title: string;
  detectedSignal: string;
  remediationAction: string;
  resolved: boolean;
}

export interface PreFlightScanReport {
  scannedAt: string;
  repoUrl: string;
  cloudProvider: string;
  rpoTarget: string;
  findings: PreFlightDebtFinding[];
}

// ============================================================================
// PRODUCTION v2.2: THREE-TIER AUTOMATED PIPELINE & SYNTHESIS ENGINE
// ============================================================================

export interface Tier1IntakeParams {
  iamRoleArn: string;
  externalId: string;
  repoUrl: string;
  gitTokenRef: string;
  targetDomain: string;
  apiBaseUrl: string;
  ownershipAuthorized: boolean;
  targetRpoMinutes: number;
  targetRtoMinutes: number;
  frameworks: Array<'ISO/IEC 27001' | 'SOC 2 Type II' | 'NIST SP 800-207'>;
}

export interface AssetInventoryPayload {
  vpcs: string[];
  loadBalancers: string[];
  services: string[];
  databases: string[];
  replicas: string[];
}

export interface Tier2TelemetryPayload {
  prowler: Array<Record<string, unknown>>;
  checkov: Array<Record<string, unknown>>;
  gitleaks: Array<Record<string, unknown>>;
  nuclei: Array<Record<string, unknown>>;
  cloudCliDb: Array<{
    dbIdentifier: string;
    replicationLagSeconds: number;
    pitrEnabled: boolean;
    multiRegionReplica: boolean;
    estimatedFailoverRtoMinutes: number;
  }>;
}

export interface NormalizedFinding {
  canonicalKey: string;
  ruleId: string;
  title: string;
  resource: string;
  severity: 'critical' | 'high' | 'medium';
  detectedBy: string[];
  frameworks: string[];
  remediationCli: string;
  rpoRtoImpact: string;
}

export interface DbSlaEvaluation {
  dbIdentifier: string;
  replicationLagSeconds: number;
  replicationLagMinutes: number;
  pitrEnabled: boolean;
  multiRegionReplica: boolean;
  estimatedRtoMinutes: number;
  rpoSlaMet: boolean;
  rtoSlaMet: boolean;
}

export interface PipelineGateStage {
  stage: string;
  status: 'SKIPPED - PREVIOUSLY FULFILLED' | 'EXECUTING' | 'BLOCKED';
  detail: string;
}

export interface NormalizedPipelineResult {
  status: 'STEADY_STATE_REACHED' | 'NORMALIZED' | 'VALIDATION_ERROR';
  gateStages: PipelineStageEvaluation[];
  validationErrors: string[];
  credentialHygiene: {
    ephemeralCredentialsPurged: boolean;
    rawSecretsRetained: boolean;
    maskedIamArn: string;
    maskedExternalId: string;
    maskedGitToken: string;
    purgedAt: string;
  };
  normalizedFindings: NormalizedFinding[];
  duplicatesMerged: number;
  noiseStrippedCount: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
  };
  dbSlaSummary: DbSlaEvaluation[];
  complianceGapMatrix: Array<{
    framework: string;
    totalGaps: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
  }>;
  mermaidTopology: string;
  inventorySnapshot: AssetInventoryPayload;
}

export interface PipelineStageEvaluation {
  stage: string;
  status: 'SKIPPED - PREVIOUSLY FULFILLED' | 'EXECUTING' | 'BLOCKED';
  detail: string;
}

export interface AuditSynthesisResult {
  success: boolean;
  modelUsed: string;
  fallbackTriggered: boolean;
  diagnosticNotice?: string;
  pass1ExecutiveRiskMd: string;
  pass2RemediationRoadmapMd: string;
  fullMarkdownReport: string;
  statusBanner: string;
}

