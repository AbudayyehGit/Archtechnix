import Dexie, { type Table } from 'dexie';
import type { IntakeSpecData } from '../types';

export interface OfflineIntakeRecord {
  id: string;
  data: IntakeSpecData;
  updatedAt: string;
}

export interface OfflineAssessmentRecord {
  id: string;
  organizationName: string;
  answers: Record<string, string>;
  readinessScore: number;
  recommendedTier: string;
  criticalGaps: string[];
  createdAt: string;
}

export interface OfflineComplianceMetric {
  id: number;
  framework: 'SOC2' | 'ISO27001' | 'NIST';
  controlCode: string;
  controlTitle: string;
  category: string;
  severity: string;
  rpoRtoImpact: string;
  isCompliant: boolean;
  remediationNote: string;
  updatedAt: string;
}

export interface OfflineAdrDoc {
  id: number;
  docType: 'SSD' | 'ADR' | 'DATA_FLOW' | 'RISK_REGISTER';
  docNumber: string;
  title: string;
  status: string;
  markdownContent: string;
  updatedAt: string;
}

export interface OfflinePreReadItem {
  id: string;
  label: string;
  owner: string;
  completed: boolean;
}

export interface OfflineSyncAgenda {
  id: number;
  syncDate: string;
  timeWindow: string;
  architectName: string;
  agendaTitle: string;
  preReadChecklist: OfflinePreReadItem[];
  decisionLogMarkdown: string;
  loomSummaryUrl: string;
  updatedAt: string;
}

class ArchtechnixOfflineDatabase extends Dexie {
  intakeDrafts!: Table<OfflineIntakeRecord, string>;
  assessments!: Table<OfflineAssessmentRecord, string>;
  complianceMetrics!: Table<OfflineComplianceMetric, number>;
  adrs!: Table<OfflineAdrDoc, number>;
  syncAgendas!: Table<OfflineSyncAgenda, number>;

  constructor() {
    super('ArchtechnixOfflineDB');
    this.version(1).stores({
      intakeDrafts: 'id, updatedAt',
      assessments: 'id, createdAt',
      complianceMetrics: 'id, framework, isCompliant',
      adrs: 'id, docType, docNumber',
      syncAgendas: 'id, syncDate',
    });
  }
}

export const offlineDb = new ArchtechnixOfflineDatabase();

export const DEFAULT_OFFLINE_METRICS: OfflineComplianceMetric[] = [
  {
    id: 1,
    framework: 'SOC2',
    controlCode: 'CC6.1',
    controlTitle: 'Zero Standing Privilege & Ephemeral OIDC CI/CD Identity',
    category: 'Logical Access Controls',
    severity: 'critical',
    rpoRtoImpact: 'Prevents unauthorized failover credential compromise',
    isCompliant: false,
    remediationNote: 'Migrate static IAM deployment keys to 15-minute ephemeral OIDC federation.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    framework: 'SOC2',
    controlCode: 'CC7.2',
    controlTitle: 'Automated OPA Rego Pre-Commit & PR Gate Enforcement',
    category: 'System Operations',
    severity: 'high',
    rpoRtoImpact: 'Blocks unencrypted DR volume deployments before merge',
    isCompliant: true,
    remediationNote: 'OPA bundle active on main branch protection rule.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    framework: 'SOC2',
    controlCode: 'A1.2',
    controlTitle: 'Continuous WAL Archival & Sub-15 Minute Failover Verification',
    category: 'Availability & Resilience',
    severity: 'critical',
    rpoRtoImpact: 'Reduces RPO from 45m to <= 5m and RTO to 12m',
    isCompliant: false,
    remediationNote: 'Cross-region standby Terraform module awaiting client VPC CIDR confirmation.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    framework: 'ISO27001',
    controlCode: 'A.8.24',
    controlTitle: 'Cryptographic Key Shredding Lifecycle (DEK/KEK Envelope)',
    category: 'Cryptography',
    severity: 'critical',
    rpoRtoImpact: 'Enables immutable backup erasure without re-indexing',
    isCompliant: false,
    remediationNote: 'Implement per-tenant DEK rotation schedule in KMS module.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    framework: 'ISO27001',
    controlCode: 'A.8.13',
    controlTitle: 'Immutable WORM Object-Lock Backup Vaults',
    category: 'Information Backup',
    severity: 'high',
    rpoRtoImpact: 'Protects recovery snapshots from ransomware tampering',
    isCompliant: true,
    remediationNote: 'Verified compliance-mode S3/GCS retention lock.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 6,
    framework: 'ISO27001',
    controlCode: 'A.5.23',
    controlTitle: 'Multi-Cloud Sovereign Control Plane Isolation',
    category: 'Cloud Services Security',
    severity: 'medium',
    rpoRtoImpact: 'Ensures regional failover respects EU/US data residency',
    isCompliant: true,
    remediationNote: 'Region constraints validated in Terraform OPA rules.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 7,
    framework: 'NIST',
    controlCode: 'ZTA-3.1',
    controlTitle: 'Strict mTLS Service Mesh Microsegmentation (NIST SP 800-207)',
    category: 'Zero Trust Network',
    severity: 'high',
    rpoRtoImpact: 'Isolates lateral failover traffic across availability zones',
    isCompliant: true,
    remediationNote: 'SPIFFE/SPIRE workload identity enforced across mesh pods.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 8,
    framework: 'NIST',
    controlCode: 'ZTA-4.2',
    controlTitle: 'Ephemeral Non-Root Build Runners (<= 15m TTL)',
    category: 'Supply Chain & Runners',
    severity: 'critical',
    rpoRtoImpact: 'Eliminates persistent compromise of DR promotion pipelines',
    isCompliant: false,
    remediationNote: 'Provision single-use Kubernetes runner deployment on dedicated node pool.',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 9,
    framework: 'NIST',
    controlCode: 'ZTA-5.4',
    controlTitle: 'Automated Chaos Drill & Point-in-Time Recovery Telemetry',
    category: 'Continuous Diagnostics',
    severity: 'high',
    rpoRtoImpact: 'Validates <= 15m RTO quarterly via deterministic smoke tests',
    isCompliant: false,
    remediationNote: 'Schedule Q2 automated failover drill in staging shadow cluster.',
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_OFFLINE_ADRS: OfflineAdrDoc[] = [
  {
    id: 1,
    docType: 'SSD',
    docNumber: 'SSD-001',
    title: 'System Specification Document: Decoupled Data Mesh & Failover Plane',
    status: 'Accepted',
    markdownContent: `# SSD-001: Enterprise Data Mesh & Resilience Architecture

## 1. Architectural Invariants
- **Operating Cadence**: Async-by-Default PR delivery + 1 weekly 60-minute strategic executive sync.
- **Recovery Targets**: RPO <= 15 minutes (continuous WAL log shipping), RTO <= 15 minutes (warm/cold IaC promotion).
- **Zero-Standing Privilege**: No static cloud access keys; OIDC ephemeral tokens only.

## 2. Topology Blueprint
1. **Domain Ingestion Layer**: Event contracts validated via schema registry before Apache Iceberg commit.
2. **Policy Enforcement Layer**: OPA Rego evaluates every Terraform plan & Kubernetes manifest in CI.
3. **Cryptographic Erasure Layer**: Per-tenant Data Encryption Keys (DEKs) wrapped by regional KMS KEKs.`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    docType: 'ADR',
    docNumber: 'ADR-014',
    title: 'Adopt Cryptographic Key Shredding over Mutable Backup Rewrites',
    status: 'Implemented',
    markdownContent: `# ADR-014: Cryptographic Key Shredding for Immutable Backups

## Context
GDPR Article 17 ("Right to be Forgotten") conflicts with immutable WORM backup retention required for SOC 2 and ransomware resilience.

## Decision
Encrypt each tenant's domain partition with an isolated Data Encryption Key (DEK) wrapped by Cloud KMS. Erasure requests destroy the tenant DEK rather than mutating historical object-lock archives.

## Consequences
- **Positive**: Erasure completes in < 200ms with cryptographic proof; immutable DR snapshots remain intact.
- **Trade-off**: Requires key-rotation registry and strict KMS audit logging.`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    docType: 'DATA_FLOW',
    docNumber: 'DFM-002',
    title: 'Data Flow & Multi-Framework Compliance Matrix',
    status: 'Accepted',
    markdownContent: `# Data Flow & Compliance Matrix

| Pipeline Stage | Encryption & Identity | Compliance Mapping | Failover Boundary |
| :--- | :--- | :--- | :--- |
| **Client API Ingress** | TLS 1.3 + JWT Verification | SOC 2 CC6.1 / NIST ZTA-3.1 | Multi-Region Active-Passive |
| **Domain Event Bus** | mTLS + Schema Contract | ISO 27001 A.8.24 | Cross-AZ Synchronous |
| **WAL & Snapshot Vault** | Per-Tenant DEK + Object Lock | ISO A.8.13 / SOC 2 A1.2 | Cross-Region <= 15m RPO |
| **CI/CD Policy Gate** | Ephemeral OIDC (15m TTL) | NIST ZTA-4.2 / OPA Rego | Automated Rollback |`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    docType: 'RISK_REGISTER',
    docNumber: 'RSK-009',
    title: 'Active Risk & Mitigation Register',
    status: 'Mitigated',
    markdownContent: `# Risk & Mitigation Register

## Risk R-01: Regional Control-Plane Outage Exceeding 15m RTO
- **Likelihood**: Low | **Impact**: Critical
- **Mitigation**: Pre-provisioned Terraform state in secondary region with automated DNS health failover.

## Risk R-02: Non-Compliant IaC Merge Bypassing Security Controls
- **Likelihood**: Medium | **Impact**: High
- **Mitigation**: Mandatory pre-commit hooks + GitHub branch protection requiring passing OPA Rego status checks.

## Risk R-03: Advisory Bandwidth Dilution
- **Mitigation**: Archtechnix strictly enforces a 4-client concurrent retainer cap with Async-by-Default PR workflows.`,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_OFFLINE_AGENDA: OfflineSyncAgenda = {
  id: 1,
  syncDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  timeWindow: '60 Minutes · Thursdays 14:00 UTC',
  architectName: 'Tariq Abudayyeh',
  agendaTitle: 'Weekly Strategic Sync: Cross-Region RPO Hardening & OPA Rollout',
  preReadChecklist: [
    {
      id: 'pr-1',
      label: 'Review SSD-001 & ADR-014 Pull Request diffs in private GitHub repo',
      owner: 'Client VP Eng / CTO',
      completed: true,
    },
    {
      id: 'pr-2',
      label: 'Confirm cross-region DR failover CIDR blocks & KMS key policy diff',
      owner: 'Platform Lead',
      completed: false,
    },
    {
      id: 'pr-3',
      label: 'Inspect automated OPA Rego CI failure logs from staging pipeline',
      owner: 'Archtechnix Principal',
      completed: false,
    },
    {
      id: 'pr-4',
      label: 'Flag any high-stakes architectural escalations for 60m executive decision',
      owner: 'Client CTO',
      completed: false,
    },
  ],
  decisionLogMarkdown: `### Pre-Sync Async Decisions
- Approved OIDC federation migration window.
- Pending sign-off on secondary region KMS key policy.`,
  loomSummaryUrl: 'https://www.loom.com/share/archtechnix-weekly-preread',
  updatedAt: new Date().toISOString(),
};
