import { jsPDF } from 'jspdf';
import type { IntakeSpecData, SystemSteadyState } from '../types';
import type { OfflineAdrDoc } from './offlineDb';

export interface ArchitectureDossierInput {
  intakeData: IntakeSpecData;
  steadyStates: SystemSteadyState[];
  docs: OfflineAdrDoc[];
  capacityLabel?: string;
}

function stripMarkdownForPdf(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, (block) => {
      const cleaned = block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '').trim();
      return `\n[Code / Spec Block]\n${cleaned}\n`;
    })
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function slugifyFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'enterprise-client'
  );
}

export function downloadArchitectureDossierPdf({
  intakeData,
  steadyStates,
  docs,
  capacityLabel,
}: ArchitectureDossierInput): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 20;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - bottomMargin) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSectionHeading = (indexLabel: string, title: string) => {
    ensureSpace(16);
    y += 3;
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, y, contentWidth, 8.5, 'F');
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(indexLabel.toUpperCase(), marginX + 3, y + 5.6);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(title, marginX + 24, y + 5.6);
    y += 12.5;
    doc.setTextColor(15, 23, 42);
  };

  const writeWrappedText = (
    text: string,
    opts?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold';
      fontFamily?: 'helvetica' | 'courier';
      color?: [number, number, number];
      indent?: number;
      lineHeight?: number;
      gapAfter?: number;
    }
  ) => {
    const fontSize = opts?.fontSize ?? 9.5;
    const fontStyle = opts?.fontStyle ?? 'normal';
    const fontFamily = opts?.fontFamily ?? 'helvetica';
    const color = opts?.color ?? [30, 41, 59];
    const indent = opts?.indent ?? 0;
    const lineHeight = opts?.lineHeight ?? 4.6;
    const gapAfter = opts?.gapAfter ?? 2;

    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const lines = doc.splitTextToSize(text, contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight + 2);
      doc.text(line, marginX + indent, y);
      y += lineHeight;
    }
    y += gapAfter;
  };

  const generatedIso = new Date().toISOString();
  const dossierRef = `ARCH-DOSSIER-${generatedIso.slice(0, 10).replace(/-/g, '')}`;

  // Top Header Banner
  doc.setFillColor(2, 6, 23);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 34, pageWidth, 1.4, 'F');

  doc.setTextColor(249, 115, 22);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('ARCHTECHNIX {∞} · OMNIOPS SYSTEMS', marginX, 11.5);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Architecture Governance & Sign-Off Dossier', marginX, 20.5);

  doc.setTextColor(148, 163, 184);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Ref: ${dossierRef}   |   Org: ${intakeData.org || 'Enterprise Client'}   |   Generated: ${generatedIso}`,
    marginX,
    28.5
  );

  y = 43;

  // Executive Metadata Grid
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(marginX, y, contentWidth, 20, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('ACTIVE ENGAGEMENT', marginX + 4, y + 5.5);
  doc.text('RPO / RTO SLA TARGET', marginX + 66, y + 5.5);
  doc.text('COMPILED ARTIFACTS', marginX + 126, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text((intakeData.org || 'Unassigned').slice(0, 28), marginX + 4, y + 11.5);
  doc.text((intakeData.rpo || 'Sub-15m Target').slice(0, 26), marginX + 66, y + 11.5);
  doc.text(`${steadyStates.length} Steady-States · ${docs.length} Docs`, marginX + 126, y + 11.5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Capacity Status: ${capacityLabel || 'Max 4 Concurrent Retainers'}   ·   Cadence: Async-by-Default + 1 Weekly 60m Sync`,
    marginX + 4,
    y + 17
  );
  y += 26;

  // SECTION 1: Schedule A Intake Specification
  drawSectionHeading('Section 01', 'Schedule A: Infrastructure Intake Specification');

  const mandates: string[] = [];
  if (intakeData.compliance?.gdpr) mandates.push('GDPR (Cryptographic Key Shredding)');
  if (intakeData.compliance?.soc2) mandates.push('SOC 2 Type II');
  if (intakeData.compliance?.nist) mandates.push('NIST SP 800-207 (Zero-Trust)');

  const intakeRows: Array<[string, string]> = [
    ['Organization', intakeData.org || 'Not specified'],
    ['Target Cloud', intakeData.cloud || 'Not specified'],
    ['RPO / RTO SLA', intakeData.rpo || 'Not specified'],
    ['Repository URL', intakeData.repo || 'Pending provisioning'],
    ['Compliance Mandates', mandates.length > 0 ? mandates.join(' · ') : 'None selected'],
  ];

  for (const [label, value] of intakeRows) {
    ensureSpace(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`${label}:`, marginX, y);
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    const valLines = doc.splitTextToSize(value, contentWidth - 44) as string[];
    doc.text(valLines, marginX + 42, y);
    y += Math.max(5.5, valLines.length * 4.5 + 1.2);
  }

  y += 2;
  writeWrappedText('Architectural Notes & Critical Bottlenecks:', {
    fontSize: 9,
    fontStyle: 'bold',
    color: [51, 65, 85],
    gapAfter: 1,
  });
  writeWrappedText(intakeData.notes || 'No architectural notes recorded in Schedule A intake.', {
    fontSize: 9.2,
    color: [30, 41, 59],
    indent: 2,
    gapAfter: 4,
  });

  // SECTION 2: System Steady-State Checkpoints
  drawSectionHeading('Section 02', `System Steady-State Checkpoints (${steadyStates.length})`);

  if (steadyStates.length === 0) {
    writeWrappedText(
      'No steady-state checkpoints committed yet. Commit a verified checkpoint inside the Retainer Governance Hub before final sign-off.',
      { fontSize: 9, color: [100, 116, 139], gapAfter: 4 }
    );
  } else {
    for (const ss of steadyStates) {
      ensureSpace(18);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(marginX, y, contentWidth, 14, 'FD');

      doc.setFont('courier', 'bold');
      doc.setFontSize(9.2);
      doc.setTextColor(15, 23, 42);
      doc.text(`${ss.checkpoint_label}`, marginX + 3, y + 5.2);

      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(13, 148, 136);
      doc.text(`commit ${ss.git_commit_hash}`, pageWidth - marginX - 32, y + 5.2);

      const metaSummary = Object.entries(ss.snapshot_metadata || {})
        .slice(0, 4)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(' · ');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Established: ${new Date(ss.established_at).toLocaleString()}   |   ${metaSummary || 'Verified invariant state'}`.slice(
          0,
          105
        ),
        marginX + 3,
        y + 10.6
      );
      y += 16.5;
    }
  }

  // SECTION 3: Governance Artifacts & ADRs
  drawSectionHeading('Section 03', `Governance Artifacts & Decision Records (${docs.length})`);

  for (const artifact of docs) {
    ensureSpace(22);
    doc.setDrawColor(203, 213, 225);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 5;

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(234, 88, 12);
    doc.text(`${artifact.docNumber} · ${artifact.docType} · [${artifact.status}]`, marginX, y);

    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Updated ${new Date(artifact.updatedAt).toLocaleDateString()}`,
      pageWidth - marginX - 32,
      y
    );
    y += 5.5;

    writeWrappedText(artifact.title, {
      fontSize: 10.5,
      fontStyle: 'bold',
      color: [15, 23, 42],
      gapAfter: 2,
    });

    const plainBody = stripMarkdownForPdf(artifact.markdownContent);
    const paragraphs = plainBody.split('\n\n');
    for (const para of paragraphs) {
      writeWrappedText(para, {
        fontSize: 8.8,
        color: [51, 65, 85],
        lineHeight: 4.3,
        gapAfter: 2.2,
      });
    }
    y += 3;
  }

  // SECTION 4: Internal Stakeholder Sign-Off
  drawSectionHeading('Section 04', 'Internal Stakeholder Sign-Off & Authorization');
  ensureSpace(44);

  writeWrappedText(
    'By signing below, stakeholders ratify the Schedule A specification, steady-state checkpoints, and Architecture Decision Records documented in this dossier for production rollout.',
    { fontSize: 8.8, color: [71, 85, 105], gapAfter: 5 }
  );

  const signers = [
    'Client CTO / VP Engineering',
    'Client CISO / Compliance Officer',
    'Principal Systems Architect (Archtechnix)',
  ];

  for (const role of signers) {
    ensureSpace(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(role, marginX, y);

    doc.setDrawColor(148, 163, 184);
    doc.line(marginX + 68, y + 0.5, marginX + 132, y + 0.5);
    doc.line(marginX + 140, y + 0.5, pageWidth - marginX, y + 0.5);

    doc.setFont('courier', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Signature', marginX + 68, y + 4);
    doc.text('Date (YYYY-MM-DD)', marginX + 140, y + 4);
    y += 11;
  }

  // Add page numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Archtechnix {∞} · Confidential Architecture Governance Dossier (${dossierRef})`,
      marginX,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX - 18, pageHeight - 8.5);
  }

  const filename = `archtechnix-architecture-dossier-${slugifyFilename(intakeData.org)}-${generatedIso.slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

export interface ComplianceControlEntry {
  framework: string;
  controlCode: string;
  controlTitle: string;
  severity: string;
  isCompliant: boolean;
  rpoRtoImpact: string;
  remediationNote: string;
}

export interface ComplianceReportExportInput {
  organizationName: string;
  intakeData: import('../types').IntakeSpecData;
  frameworkScores: {
    overall: number;
    SOC2: number;
    ISO27001: number;
    NIST: number;
  };
  sprintCountdown: {
    elapsedDays: number;
    deadlineDate: string;
    expired: boolean;
  };
  opaResult: import('../types').OpaPolicySummary;
  rpoRtoStatus: import('../types').RpoRtoValidationSnapshot;
  scopeBoundaries: import('../types').ScopeBoundaryItem[];
  controls: ComplianceControlEntry[];
}

export function buildComplianceAuditReportPayload(input: ComplianceReportExportInput) {
  const inScopeItems = input.scopeBoundaries.filter((s) => s.classification === 'in_scope');
  const outOfScopeItems = input.scopeBoundaries.filter(
    (s) => s.classification === 'out_of_scope_retainer_candidate'
  );
  const escalatedCount = input.scopeBoundaries.filter(
    (s) => s.status === 'escalated_to_retainer'
  ).length;
  const totalRequestedHours = input.scopeBoundaries.reduce(
    (acc, item) => acc + (Number(item.requestedHours) || 0),
    0
  );

  return {
    reportMetadata: {
      schemaVersion: 'archtechnix-compliance-report-v2.5',
      generatedAt: new Date().toISOString(),
      organization: input.organizationName || input.intakeData.org,
      cloudProvider: input.intakeData.cloud,
      repositoryUrl: input.intakeData.repo,
      sprintWindow: {
        day: input.sprintCountdown.elapsedDays,
        windowDays: 14,
        targetCloseDate: input.sprintCountdown.deadlineDate,
        expired: input.sprintCountdown.expired,
      },
    },
    executiveReadinessScores: input.frameworkScores,
    opaPolicyEvaluation: input.opaResult,
    rpoRtoValidation: input.rpoRtoStatus,
    scopeBoundaryStatus: {
      totalItems: input.scopeBoundaries.length,
      inScopeCount: inScopeItems.length,
      outOfScopeCandidateCount: outOfScopeItems.length,
      escalatedToRetainerCount: escalatedCount,
      totalRequestedHours,
      items: input.scopeBoundaries,
    },
    complianceMatrixControls: input.controls,
  };
}

export function downloadComplianceAuditReportPdf(input: ComplianceReportExportInput): string {
  const payload = buildComplianceAuditReportPayload(input);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2;
  const bottomMargin = 20;
  let y = 18;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - bottomMargin) {
      doc.addPage();
      y = 18;
    }
  };

  const drawSection = (idx: string, title: string) => {
    ensureSpace(16);
    y += 3;
    doc.setFillColor(15, 23, 42);
    doc.rect(marginX, y, contentWidth, 8.2, 'F');
    doc.setTextColor(249, 115, 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(idx, marginX + 3, y + 5.4);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.2);
    doc.text(title, marginX + 24, y + 5.4);
    y += 12;
    doc.setTextColor(15, 23, 42);
  };

  const writeLine = (
    text: string,
    opts?: {
      fontSize?: number;
      fontStyle?: 'normal' | 'bold';
      fontFamily?: 'helvetica' | 'courier';
      color?: [number, number, number];
      indent?: number;
      gapAfter?: number;
    }
  ) => {
    const fontSize = opts?.fontSize ?? 9;
    const fontStyle = opts?.fontStyle ?? 'normal';
    const fontFamily = opts?.fontFamily ?? 'helvetica';
    const color = opts?.color ?? [30, 41, 59];
    const indent = opts?.indent ?? 0;
    const gapAfter = opts?.gapAfter ?? 1.8;

    doc.setFont(fontFamily, fontStyle);
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, contentWidth - indent) as string[];
    for (const line of lines) {
      ensureSpace(6);
      doc.text(line, marginX + indent, y);
      y += 4.4;
    }
    y += gapAfter;
  };

  const generatedIso = payload.reportMetadata.generatedAt;
  const reportRef = `ARCH-COMP-${generatedIso.slice(0, 10).replace(/-/g, '')}`;

  // Header Banner
  doc.setFillColor(2, 6, 23);
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(20, 184, 166);
  doc.rect(0, 34, pageWidth, 1.4, 'F');

  doc.setTextColor(45, 212, 191);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.text('ARCHTECHNIX {∞} · PILOT AUDIT COMPLIANCE REPORT', marginX, 11.5);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Unified OPA, RPO/RTO & Scope Compliance Report', marginX, 20.5);

  doc.setTextColor(148, 163, 184);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Ref: ${reportRef}   |   Org: ${payload.reportMetadata.organization}   |   Day ${payload.reportMetadata.sprintWindow.day}/14`,
    marginX,
    28.5
  );
  y = 42;

  // Section 1: OPA Policy Results
  drawSection('SECTION 01', 'OPA Policy-as-Code Evaluation Status');
  writeLine(`Evaluation Verdict: ${input.opaResult.badge} (HTTP ${input.opaResult.code})`, {
    fontStyle: 'bold',
    fontFamily: 'courier',
    color: input.opaResult.allowed ? [5, 150, 105] : [225, 29, 72],
  });
  writeLine(
    `Policy Package: ${input.opaResult.policyPackage}   |   Target Resource: ${input.opaResult.resourceType}   |   Evaluated: ${new Date(input.opaResult.evaluatedAt).toLocaleString()}`,
    { fontSize: 8.5, fontFamily: 'courier', color: [71, 85, 105] }
  );
  if (input.opaResult.reasons.length > 0) {
    for (const r of input.opaResult.reasons) {
      writeLine(`• PASS: ${r}`, { indent: 2, color: [5, 150, 105] });
    }
  }
  if (input.opaResult.violations.length > 0) {
    for (const v of input.opaResult.violations) {
      writeLine(`• VIOLATION: ${v}`, { indent: 2, color: [225, 29, 72] });
    }
  }

  // Section 2: RPO/RTO Validation & DR Drill History
  drawSection('SECTION 02', 'RPO/RTO NIST Validation & Failover Drill Status');
  writeLine(
    `Profile: ${input.rpoRtoStatus.profileLabel} (${input.rpoRtoStatus.standardRef})`,
    { fontStyle: 'bold' }
  );
  const rpoSectionColor: [number, number, number] =
    input.rpoRtoStatus.overallStatus === 'FAIL'
      ? [225, 29, 72]
      : input.rpoRtoStatus.overallStatus === 'WARNING'
      ? [217, 119, 6]
      : [5, 150, 105];
  writeLine(
    `Overall NIST Verdict: ${input.rpoRtoStatus.overallStatus}   |   RPO: ${input.rpoRtoStatus.replicationLagMin}m (Warn >= ${input.rpoRtoStatus.rpoWarningMinutes}m, Max <= ${input.rpoRtoStatus.rpoMaxMinutes}m) [${input.rpoRtoStatus.rpoStatus}]   |   RTO: ${input.rpoRtoStatus.failoverTimeMin}m (Warn >= ${input.rpoRtoStatus.rtoWarningMinutes}m, Max <= ${input.rpoRtoStatus.rtoMaxMinutes}m) [${input.rpoRtoStatus.rtoStatus}]`,
    {
      fontFamily: 'courier',
      fontSize: 8.3,
      color: rpoSectionColor,
    }
  );
  if (input.rpoRtoStatus.drillHistory.length === 0) {
    writeLine('DR Failover Drill Simulator: No virtual failover drills recorded yet.', {
      indent: 2,
      color: [100, 116, 139],
    });
  } else {
    writeLine(`Recorded Disaster Recovery Drills (${input.rpoRtoStatus.drillHistory.length}):`, {
      fontStyle: 'bold',
      gapAfter: 1,
    });
    for (const drill of input.rpoRtoStatus.drillHistory.slice(0, 6)) {
      writeLine(
        `• [${drill.outcome}] ${drill.scenarioName} — Simulated Downtime: ${drill.simulatedDowntimeMin}m (RTO <= ${drill.targetRtoMin}m), Data Loss: ${drill.simulatedDataLossMin}m (RPO <= ${drill.targetRpoMin}m) @ ${new Date(drill.triggeredAt).toLocaleString()}`,
        {
          indent: 2,
          fontSize: 8.4,
          color: drill.outcome === 'PASS' ? [5, 150, 105] : [225, 29, 72],
        }
      );
    }
  }

  // Section 3: Scope Boundary Status
  drawSection('SECTION 03', 'Scope Boundary & Retainer Escalation Ledger');
  writeLine(
    `Total Items: ${payload.scopeBoundaryStatus.totalItems}   |   In-Scope: ${payload.scopeBoundaryStatus.inScopeCount}   |   Out-of-Scope Candidates: ${payload.scopeBoundaryStatus.outOfScopeCandidateCount}   |   Escalated to Retainer: ${payload.scopeBoundaryStatus.escalatedToRetainerCount}   |   Total Hours: ${payload.scopeBoundaryStatus.totalRequestedHours}h`,
    { fontFamily: 'courier', fontSize: 8.5, color: [51, 65, 85] }
  );
  if (input.scopeBoundaries.length === 0) {
    writeLine('No scope boundary items logged for this diagnostic sprint.', {
      indent: 2,
      color: [100, 116, 139],
    });
  } else {
    for (const sb of input.scopeBoundaries) {
      writeLine(
        `• [${sb.status.toUpperCase()}] ${sb.title} (${sb.classification}, ${sb.requestedHours}h) — ${sb.rationale}`,
        {
          indent: 2,
          fontSize: 8.4,
          color: sb.classification === 'out_of_scope_retainer_candidate' ? [180, 83, 9] : [30, 41, 59],
        }
      );
    }
  }

  // Section 4: DevSecOps Control Matrix Summary
  drawSection('SECTION 04', `DevSecOps Control Matrix (Overall Readiness: ${input.frameworkScores.overall}%)`);
  writeLine(
    `SOC 2 Type II: ${input.frameworkScores.SOC2}%   |   ISO/IEC 27001: ${input.frameworkScores.ISO27001}%   |   NIST SP 800-207 Zero Trust: ${input.frameworkScores.NIST}%`,
    { fontFamily: 'courier', fontSize: 8.6, fontStyle: 'bold' }
  );
  for (const ctrl of input.controls) {
    writeLine(
      `• [${ctrl.isCompliant ? 'COMPLIANT' : 'REMEDIATE'}] ${ctrl.framework} ${ctrl.controlCode} (${ctrl.severity.toUpperCase()}): ${ctrl.controlTitle} — ${ctrl.rpoRtoImpact}`,
      {
        indent: 2,
        fontSize: 8.3,
        color: ctrl.isCompliant ? [5, 150, 105] : [30, 41, 59],
      }
    );
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
    doc.setFont('courier', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Archtechnix {∞} · Unified Compliance Audit Report (${reportRef})`,
      marginX,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - marginX - 18, pageHeight - 8.5);
  }

  const filename = `archtechnix-compliance-report-${slugifyFilename(payload.reportMetadata.organization)}-${generatedIso.slice(0, 10)}.pdf`;
  doc.save(filename);
  return filename;
}

