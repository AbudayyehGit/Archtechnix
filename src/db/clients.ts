import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  adrs,
  advisoryBookings,
  audits,
  bottleneckAssessments,
  clients,
  complianceMetrics,
  intakeSpecs,
  retainers,
  syncAgendas,
  type ComplianceFlags,
  type PreReadItem,
} from './schema.ts';

const MAX_RETAINER_SLOTS = 4;
const BASELINE_RESERVED_SLOTS = 2;

const DEFAULT_ROADMAP_MARKDOWN = `# 14-Day Pilot Audit: Critical RPO/RTO Remediation Roadmap

## Executive Diagnostic Summary
- **Engagement Model**: Async-by-Default + 1 Weekly Strategic Sync (60m Executive Review)
- **Target Resilience SLA**: Sub-15m RPO / Sub-15m RTO across multi-region stateful clusters
- **Compliance Scope**: SOC 2 Type II, ISO/IEC 27001, NIST SP 800-207 Zero Trust

## Priority P0 Findings (Immediate Action Required)
1. **Cross-Region WAL Shipping Gap (Current RPO: 45m -> Target: <= 15m)**
   - Primary transactional cluster relies on 4-hour snapshot intervals without continuous WAL streaming.
   - *Fix*: Deploy Aurora / Cloud SQL continuous PITR archive + Terraform cross-region read-replica promotion runbook.
2. **Long-Lived Static CI/CD IAM Keys (SOC2 CC6.1 / NIST ZTA)**
   - GitHub Actions workflows currently authenticate with static IAM keys older than 90 days.
   - *Fix*: Replace with short-lived OIDC federation tokens (15m TTL) + OPA Rego pre-merge checks.
3. **Envelope Key Shredding Readiness (GDPR Art. 17 / ISO A.8.24)**
   - Immutable object-lock cold backups retain raw tenant PII under a shared KEK without per-tenant DEKs.
   - *Fix*: Partition tenant storage envelopes with KMS per-tenant DEK wrapping for deterministic key shredding.`;

const DEFAULT_COMPLIANCE_CONTROLS = [
  {
    framework: 'SOC2',
    controlCode: 'CC6.1',
    controlTitle: 'Zero Standing Privilege & Ephemeral OIDC CI/CD Identity',
    category: 'Logical Access Controls',
    severity: 'critical',
    rpoRtoImpact: 'Prevents unauthorized failover credential compromise',
    isCompliant: false,
    remediationNote: 'Migrate static IAM deployment keys to 15-minute ephemeral OIDC federation.',
  },
  {
    framework: 'SOC2',
    controlCode: 'CC7.2',
    controlTitle: 'Automated OPA Rego Pre-Commit & PR Gate Enforcement',
    category: 'System Operations',
    severity: 'high',
    rpoRtoImpact: 'Blocks unencrypted DR volume deployments before merge',
    isCompliant: true,
    remediationNote: 'OPA bundle active on main branch protection rule.',
  },
  {
    framework: 'SOC2',
    controlCode: 'A1.2',
    controlTitle: 'Continuous WAL Archival & Sub-15 Minute Failover Verification',
    category: 'Availability & Resilience',
    severity: 'critical',
    rpoRtoImpact: 'Reduces RPO from 45m to <= 5m and RTO to 12m',
    isCompliant: false,
    remediationNote: 'Cross-region standby terraform module awaiting client VPC CIDR confirmation.',
  },
  {
    framework: 'ISO27001',
    controlCode: 'A.8.24',
    controlTitle: 'Cryptographic Key Shredding Lifecycle (DEK/KEK Envelope)',
    category: 'Cryptography',
    severity: 'critical',
    rpoRtoImpact: 'Enables immutable backup erasure without re-indexing',
    isCompliant: false,
    remediationNote: 'Implement per-tenant DEK rotation schedule in KMS module.',
  },
  {
    framework: 'ISO27001',
    controlCode: 'A.8.13',
    controlTitle: 'Immutable WORM Object-Lock Backup Vaults',
    category: 'Information Backup',
    severity: 'high',
    rpoRtoImpact: 'Protects recovery snapshots from ransomware tampering',
    isCompliant: true,
    remediationNote: 'Verified compliance-mode S3/GCS retention lock.',
  },
  {
    framework: 'ISO27001',
    controlCode: 'A.5.23',
    controlTitle: 'Multi-Cloud Sovereign Control Plane Isolation',
    category: 'Cloud Services Security',
    severity: 'medium',
    rpoRtoImpact: 'Ensures regional failover respects EU/US data residency',
    isCompliant: true,
    remediationNote: 'Region constraints validated in Terraform Sentinel/OPA rules.',
  },
  {
    framework: 'NIST',
    controlCode: 'ZTA-3.1',
    controlTitle: 'Strict mTLS Service Mesh Microsegmentation (NIST SP 800-207)',
    category: 'Zero Trust Network',
    severity: 'high',
    rpoRtoImpact: 'Isolates lateral failover traffic across availability zones',
    isCompliant: true,
    remediationNote: 'SPIFFE/SPIRE workload identity enforced across mesh pods.',
  },
  {
    framework: 'NIST',
    controlCode: 'ZTA-4.2',
    controlTitle: 'Ephemeral Non-Root Build Runners (<= 15m TTL)',
    category: 'Supply Chain & Runners',
    severity: 'critical',
    rpoRtoImpact: 'Eliminates persistent compromise of DR promotion pipelines',
    isCompliant: false,
    remediationNote: 'Provision single-use Kubernetes runner deployment on dedicated node pool.',
  },
  {
    framework: 'NIST',
    controlCode: 'ZTA-5.4',
    controlTitle: 'Automated Chaos Drill & Point-in-Time Recovery Telemetry',
    category: 'Continuous Diagnostics',
    severity: 'high',
    rpoRtoImpact: 'Validates <= 15m RTO quarterly via deterministic smoke tests',
    isCompliant: false,
    remediationNote: 'Schedule Q2 automated failover drill in staging shadow cluster.',
  },
];

const DEFAULT_ADRS = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    docType: 'RISK_REGISTER',
    docNumber: 'RSK-009',
    title: 'Active Risk & Mitigation Register',
    status: 'Mitigated',
    markdownContent: `# Risk & Mitigation Register

## Risk R-01: Regional Control-Plane Outage Exceeding 15m RTO
- **Likelihood**: Low | **Impact**: Critical
- **Mitigation**: Pre-provisioned Terraform state in secondary region with automated Route53/Cloud DNS health failover.

## Risk R-02: Non-Compliant IaC Merge Bypassing Security Controls
- **Likelihood**: Medium | **Impact**: High
- **Mitigation**: Mandatory pre-commit hooks + GitHub branch protection requiring passing OPA Rego status checks.

## Risk R-03: Advisory Bandwidth Dilution
- **Mitigation**: Archtechnix strictly enforces a 4-client concurrent retainer cap with Async-by-Default PR workflows.`,
  },
];

const DEFAULT_PREREAD: PreReadItem[] = [
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
];

export async function getOrCreateClient(
  uid: string,
  email: string,
  orgName?: string
) {
  try {
    const cleanEmail = email || 'client@enterprise.io';
    const result = await db
      .insert(clients)
      .values({
        uid,
        email: cleanEmail,
        organizationName: orgName || 'Apex FinTech Systems',
      })
      .onConflictDoUpdate({
        target: clients.uid,
        set: {
          email: cleanEmail,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Failed to getOrCreateClient:', error);
    throw new Error('Failed to synchronize client workspace profile.', { cause: error });
  }
}

export async function seedClientWorkspaceIfEmpty(clientId: number) {
  try {
    const existingAudits = await db
      .select()
      .from(audits)
      .where(eq(audits.clientId, clientId));

    if (existingAudits.length === 0) {
      await db.insert(audits).values({
        clientId,
        title: '14-Day Asynchronous Pilot Audit',
        tier: 'diagnostic',
        status: 'active',
        overallScore: 44,
        loomUrl: 'https://www.loom.com/share/archtechnix-pilot-briefing',
        roadmapMarkdown: DEFAULT_ROADMAP_MARKDOWN,
      });
    }

    const existingRetainers = await db
      .select()
      .from(retainers)
      .where(eq(retainers.clientId, clientId));

    if (existingRetainers.length === 0) {
      await db.insert(retainers).values({
        clientId,
        status: 'inactive',
        monthlyAmountUsd: 7500,
        cadenceWindow: 'Async-by-Default + Thursdays 14:00 UTC (60m Sync)',
      });
    }

    const existingMetrics = await db
      .select()
      .from(complianceMetrics)
      .where(eq(complianceMetrics.clientId, clientId));

    if (existingMetrics.length === 0) {
      await db.insert(complianceMetrics).values(
        DEFAULT_COMPLIANCE_CONTROLS.map((c) => ({
          ...c,
          clientId,
        }))
      );
    }

    const existingAdrs = await db
      .select()
      .from(adrs)
      .where(eq(adrs.clientId, clientId));

    if (existingAdrs.length === 0) {
      await db.insert(adrs).values(
        DEFAULT_ADRS.map((doc) => ({
          ...doc,
          clientId,
        }))
      );
    }

    const existingAgendas = await db
      .select()
      .from(syncAgendas)
      .where(eq(syncAgendas.clientId, clientId));

    if (existingAgendas.length === 0) {
      const nextThursday = new Date();
      nextThursday.setDate(nextThursday.getDate() + ((4 + 7 - nextThursday.getDay()) % 7 || 7));
      const syncDateStr = nextThursday.toISOString().split('T')[0];

      await db.insert(syncAgendas).values({
        clientId,
        syncDate: syncDateStr,
        timeWindow: '60 Minutes · Thursdays 14:00 UTC',
        architectName: 'Tariq Abudayyeh',
        agendaTitle: 'Weekly Strategic Sync: Cross-Region RPO Hardening & OPA Rollout',
        preReadChecklist: DEFAULT_PREREAD,
        decisionLogMarkdown: `### Pre-Sync Async Decisions\n- Approved OIDC federation migration window.\n- Pending sign-off on secondary region KMS key policy.`,
        loomSummaryUrl: 'https://www.loom.com/share/archtechnix-weekly-preread',
      });
    }
  } catch (error) {
    console.error('Failed to seed client workspace:', error);
    throw new Error('Failed to initialize default advisory workspace.', { cause: error });
  }
}

export async function getClientWorkspace(uid: string, email: string) {
  try {
    const client = await getOrCreateClient(uid, email);
    await seedClientWorkspaceIfEmpty(client.id);

    const [clientAudits, clientRetainers, metrics, docs, agendas, specs] = await Promise.all([
      db.select().from(audits).where(eq(audits.clientId, client.id)).orderBy(desc(audits.id)),
      db.select().from(retainers).where(eq(retainers.clientId, client.id)).orderBy(desc(retainers.id)),
      db.select().from(complianceMetrics).where(eq(complianceMetrics.clientId, client.id)).orderBy(complianceMetrics.id),
      db.select().from(adrs).where(eq(adrs.clientId, client.id)).orderBy(adrs.id),
      db.select().from(syncAgendas).where(eq(syncAgendas.clientId, client.id)).orderBy(desc(syncAgendas.id)),
      db.select().from(intakeSpecs).where(eq(intakeSpecs.clientId, client.id)).orderBy(desc(intakeSpecs.id)),
    ]);

    return {
      client,
      audit: clientAudits[0] || null,
      retainer: clientRetainers[0] || null,
      complianceMetrics: metrics,
      adrs: docs,
      syncAgendas: agendas,
      intakeSpecs: specs,
    };
  } catch (error) {
    console.error('Failed to load client workspace:', error);
    throw new Error('Unable to load client advisory workspace.', { cause: error });
  }
}

export async function updateClientMetric(
  uid: string,
  metricId: number,
  updates: { isCompliant?: boolean; remediationNote?: string }
) {
  try {
    const clientRows = await db.select().from(clients).where(eq(clients.uid, uid));
    const client = clientRows[0];
    if (!client) {
      throw new Error('Client profile not found.');
    }

    const updated = await db
      .update(complianceMetrics)
      .set({
        ...(typeof updates.isCompliant === 'boolean' ? { isCompliant: updates.isCompliant } : {}),
        ...(typeof updates.remediationNote === 'string' ? { remediationNote: updates.remediationNote } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(complianceMetrics.id, metricId), eq(complianceMetrics.clientId, client.id)))
      .returning();

    if (updated.length === 0) {
      throw new Error('Compliance metric not found for this client.');
    }

    const allMetrics = await db
      .select()
      .from(complianceMetrics)
      .where(eq(complianceMetrics.clientId, client.id));

    const compliantCount = allMetrics.filter((m) => m.isCompliant).length;
    const score = allMetrics.length > 0 ? Math.round((compliantCount / allMetrics.length) * 100) : 0;

    await db
      .update(audits)
      .set({ overallScore: score, updatedAt: new Date() })
      .where(eq(audits.clientId, client.id));

    return { metric: updated[0], overallScore: score };
  } catch (error) {
    console.error('Failed to update compliance metric:', error);
    throw new Error('Failed to update compliance control status.', { cause: error });
  }
}

export async function upsertClientAdr(
  uid: string,
  payload: {
    id?: number;
    docType: string;
    docNumber: string;
    title: string;
    status: string;
    markdownContent: string;
  }
) {
  try {
    const clientRows = await db.select().from(clients).where(eq(clients.uid, uid));
    const client = clientRows[0];
    if (!client) throw new Error('Client profile not found.');

    if (payload.id) {
      const updated = await db
        .update(adrs)
        .set({
          docType: payload.docType,
          docNumber: payload.docNumber,
          title: payload.title,
          status: payload.status,
          markdownContent: payload.markdownContent,
          updatedAt: new Date(),
        })
        .where(and(eq(adrs.id, payload.id), eq(adrs.clientId, client.id)))
        .returning();
      if (updated.length === 0) throw new Error('Document not found for client.');
      return updated[0];
    }

    const inserted = await db
      .insert(adrs)
      .values({
        clientId: client.id,
        docType: payload.docType,
        docNumber: payload.docNumber,
        title: payload.title,
        status: payload.status,
        markdownContent: payload.markdownContent,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to save ADR/SSD document:', error);
    throw new Error('Failed to save governance document.', { cause: error });
  }
}

export async function upsertClientSyncAgenda(
  uid: string,
  payload: {
    id?: number;
    syncDate: string;
    timeWindow: string;
    architectName: string;
    agendaTitle: string;
    preReadChecklist: PreReadItem[];
    decisionLogMarkdown: string;
    loomSummaryUrl: string;
  }
) {
  try {
    const clientRows = await db.select().from(clients).where(eq(clients.uid, uid));
    const client = clientRows[0];
    if (!client) throw new Error('Client profile not found.');

    if (payload.id) {
      const updated = await db
        .update(syncAgendas)
        .set({
          syncDate: payload.syncDate,
          timeWindow: payload.timeWindow,
          architectName: payload.architectName,
          agendaTitle: payload.agendaTitle,
          preReadChecklist: payload.preReadChecklist,
          decisionLogMarkdown: payload.decisionLogMarkdown,
          loomSummaryUrl: payload.loomSummaryUrl,
          updatedAt: new Date(),
        })
        .where(and(eq(syncAgendas.id, payload.id), eq(syncAgendas.clientId, client.id)))
        .returning();
      if (updated.length === 0) throw new Error('Sync agenda not found for client.');
      return updated[0];
    }

    const inserted = await db
      .insert(syncAgendas)
      .values({
        clientId: client.id,
        syncDate: payload.syncDate,
        timeWindow: payload.timeWindow,
        architectName: payload.architectName,
        agendaTitle: payload.agendaTitle,
        preReadChecklist: payload.preReadChecklist,
        decisionLogMarkdown: payload.decisionLogMarkdown,
        loomSummaryUrl: payload.loomSummaryUrl,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to save sync agenda:', error);
    throw new Error('Failed to save weekly strategic sync agenda.', { cause: error });
  }
}

export async function getPublicCapacitySummary() {
  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(retainers)
      .where(eq(retainers.status, 'active'));

    const dbActiveCount = countRows[0]?.count ?? 0;
    const filledSlots = Math.min(MAX_RETAINER_SLOTS, BASELINE_RESERVED_SLOTS + dbActiveCount);
    const availableSlots = Math.max(0, MAX_RETAINER_SLOTS - filledSlots);

    return {
      maxSlots: MAX_RETAINER_SLOTS,
      filledSlots,
      availableSlots,
      dbActiveCount,
      weeklyHoursCap: '20-25 hrs/week',
      label: `Active Retainer Slots: ${availableSlots} / ${MAX_RETAINER_SLOTS} Available`,
    };
  } catch (error) {
    console.error('Failed to query retainer capacity:', error);
    return {
      maxSlots: MAX_RETAINER_SLOTS,
      filledSlots: 3,
      availableSlots: 1,
      dbActiveCount: 1,
      weeklyHoursCap: '20-25 hrs/week',
      label: 'Active Retainer Slots: 1 / 4 Available',
    };
  }
}

export async function activateClientRetainer(
  uid: string,
  email: string,
  stripeSessionId?: string,
  stripeSubscriptionId?: string
) {
  try {
    const client = await getOrCreateClient(uid, email);
    await seedClientWorkspaceIfEmpty(client.id);

    const capacity = await getPublicCapacitySummary();
    const existingRows = await db
      .select()
      .from(retainers)
      .where(eq(retainers.clientId, client.id))
      .orderBy(desc(retainers.id));

    const existing = existingRows[0];
    if (existing?.status !== 'active' && capacity.availableSlots <= 0) {
      throw new Error('Capacity Cap Reached: All 4 concurrent retainer slots are currently filled.');
    }

    if (existing) {
      const updated = await db
        .update(retainers)
        .set({
          status: 'active',
          monthlyAmountUsd: 7500,
          stripeSessionId: stripeSessionId || existing.stripeSessionId,
          stripeSubscriptionId: stripeSubscriptionId || existing.stripeSubscriptionId,
          activatedAt: existing.activatedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(retainers.id, existing.id))
        .returning();

      return updated[0];
    }

    const inserted = await db
      .insert(retainers)
      .values({
        clientId: client.id,
        status: 'active',
        monthlyAmountUsd: 7500,
        stripeSessionId,
        stripeSubscriptionId,
        activatedAt: new Date(),
      })
      .returning();

    return inserted[0];
  } catch (error: any) {
    console.error('Failed to activate retainer:', error);
    throw new Error(error?.message || 'Failed to activate monthly retainer.', { cause: error });
  }
}

export async function markPilotAuditPurchased(
  uid: string,
  email: string,
  stripeSessionId: string
) {
  try {
    const client = await getOrCreateClient(uid, email);
    await seedClientWorkspaceIfEmpty(client.id);

    const existingRows = await db
      .select()
      .from(audits)
      .where(eq(audits.clientId, client.id))
      .orderBy(desc(audits.id));

    if (existingRows[0]) {
      const updated = await db
        .update(audits)
        .set({
          status: 'active',
          stripeSessionId,
          purchasedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(audits.id, existingRows[0].id))
        .returning();
      return updated[0];
    }
    return null;
  } catch (error) {
    console.error('Failed to record pilot audit checkout:', error);
    throw new Error('Failed to record pilot audit status.', { cause: error });
  }
}

export async function saveBottleneckAssessment(payload: {
  uid?: string;
  email?: string;
  sessionKey: string;
  organizationName: string;
  answers: Record<string, string>;
  readinessScore: number;
  recommendedTier: string;
  criticalGaps: string[];
}) {
  try {
    let clientId: number | null = null;
    if (payload.uid && payload.email) {
      const client = await getOrCreateClient(payload.uid, payload.email, payload.organizationName);
      clientId = client.id;
    }

    const inserted = await db
      .insert(bottleneckAssessments)
      .values({
        clientId,
        sessionKey: payload.sessionKey,
        organizationName: payload.organizationName,
        answers: payload.answers,
        readinessScore: payload.readinessScore,
        recommendedTier: payload.recommendedTier,
        criticalGaps: payload.criticalGaps,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to save bottleneck assessment:', error);
    throw new Error('Failed to persist bottleneck assessment.', { cause: error });
  }
}

export async function createClientComplianceMetric(
  uid: string,
  email: string,
  payload: {
    framework: string;
    controlCode: string;
    controlTitle: string;
    category: string;
    severity: string;
    rpoRtoImpact: string;
    remediationNote: string;
  }
) {
  try {
    const client = await getOrCreateClient(uid, email);
    await seedClientWorkspaceIfEmpty(client.id);

    const inserted = await db
      .insert(complianceMetrics)
      .values({
        clientId: client.id,
        framework: payload.framework,
        controlCode: payload.controlCode,
        controlTitle: payload.controlTitle,
        category: payload.category,
        severity: payload.severity,
        rpoRtoImpact: payload.rpoRtoImpact,
        isCompliant: false,
        remediationNote: payload.remediationNote,
      })
      .returning();

    const allMetrics = await db
      .select()
      .from(complianceMetrics)
      .where(eq(complianceMetrics.clientId, client.id));

    const compliantCount = allMetrics.filter((m) => m.isCompliant).length;
    const score = allMetrics.length > 0 ? Math.round((compliantCount / allMetrics.length) * 100) : 0;

    await db
      .update(audits)
      .set({ overallScore: score, updatedAt: new Date() })
      .where(eq(audits.clientId, client.id));

    return { metric: inserted[0], overallScore: score };
  } catch (error) {
    console.error('Failed to create custom remediation control:', error);
    throw new Error('Failed to add custom remediation item.', { cause: error });
  }
}

export async function saveClientIntakeSpec(
  uid: string,
  email: string,
  payload: {
    organizationName: string;
    primaryCloud: string;
    rpoTarget: string;
    repoUrl: string;
    complianceFlags: ComplianceFlags;
    notes: string;
    readinessPercent: number;
  }
) {
  try {
    const client = await getOrCreateClient(uid, email, payload.organizationName);

    await db
      .update(clients)
      .set({
        organizationName: payload.organizationName,
        primaryCloud: payload.primaryCloud,
        rpoTarget: payload.rpoTarget,
        repoUrl: payload.repoUrl,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));

    const inserted = await db
      .insert(intakeSpecs)
      .values({
        clientId: client.id,
        organizationName: payload.organizationName,
        primaryCloud: payload.primaryCloud,
        rpoTarget: payload.rpoTarget,
        repoUrl: payload.repoUrl,
        complianceFlags: payload.complianceFlags,
        notes: payload.notes,
        readinessPercent: payload.readinessPercent,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to persist Schedule A intake spec:', error);
    throw new Error('Failed to save Schedule A intake specification.', { cause: error });
  }
}

export async function listAdvisoryBookings() {
  try {
    return await db
      .select()
      .from(advisoryBookings)
      .orderBy(desc(advisoryBookings.bookedAt));
  } catch (error) {
    console.error('Failed to list advisory bookings:', error);
    return [];
  }
}

export async function saveAdvisoryBooking(payload: {
  uid?: string;
  email?: string;
  bookingCode: string;
  architectId: string;
  architectName: string;
  syncDate: string;
  timeSlot: string;
  timezone: string;
  orgName: string;
  attendeeEmail: string;
  topic: string;
  notes: string;
  repoUrl: string;
  meetingUrl: string;
}) {
  try {
    let clientId: number | null = null;
    if (payload.uid && payload.email) {
      const client = await getOrCreateClient(payload.uid, payload.email, payload.orgName);
      clientId = client.id;
    }

    const inserted = await db
      .insert(advisoryBookings)
      .values({
        bookingCode: payload.bookingCode,
        clientId,
        architectId: payload.architectId,
        architectName: payload.architectName,
        syncDate: payload.syncDate,
        timeSlot: payload.timeSlot,
        timezone: payload.timezone,
        orgName: payload.orgName,
        attendeeEmail: payload.attendeeEmail,
        topic: payload.topic,
        notes: payload.notes,
        repoUrl: payload.repoUrl,
        meetingUrl: payload.meetingUrl,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Failed to save advisory booking:', error);
    throw new Error('Failed to persist advisory booking to Cloud SQL.', { cause: error });
  }
}
