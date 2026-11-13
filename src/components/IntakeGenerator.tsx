import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Database,
  Download,
  FileText,
  LogIn,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { IntakeSpecData, IntakeValidationThresholds } from '../types';
import { DEFAULT_INTAKE_THRESHOLDS } from '../lib/governanceEngine';
import { offlineDb } from '../lib/offlineDb';
import { useAuth } from '../contexts/AuthContext';

interface IntakeGeneratorProps {
  intakeData: IntakeSpecData;
  onUpdate: (data: IntakeSpecData) => void;
  onShowToast: (message: string) => void;
  thresholds?: IntakeValidationThresholds;
}

interface FieldValidation {
  valid: boolean;
  message: string;
}

function validateRepoUrl(raw: string): FieldValidation {
  const val = raw.trim();
  if (!val) {
    return { valid: false, message: 'Repository or Git mirror coordinate is required.' };
  }
  const gitPattern =
    /^(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s]+|git@[a-zA-Z0-9.-]+:[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s]+)$/;
  if (!gitPattern.test(val)) {
    return {
      valid: false,
      message: 'Enter a valid Git HTTPS/SSH URL (e.g. https://github.com/org/repo).',
    };
  }
  return { valid: true, message: 'Valid Git topology coordinate' };
}

export const IntakeGenerator: React.FC<IntakeGeneratorProps> = ({
  intakeData,
  onUpdate,
  onShowToast,
  thresholds = DEFAULT_INTAKE_THRESHOLDS,
}) => {
  const { user, idToken, signInWithGoogle, refreshWorkspace } = useAuth();
  const [copied, setCopied] = useState<boolean>(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [lastSavedIso, setLastSavedIso] = useState<string>('');
  const [cloudSaving, setCloudSaving] = useState<boolean>(false);
  const [cloudSavedAt, setCloudSavedAt] = useState<string | null>(null);

  // Persist intake specification offline-first via Dexie IndexedDB
  useEffect(() => {
    const timer = setTimeout(() => {
      const now = new Date().toISOString();
      offlineDb.intakeDrafts
        .put({
          id: 'active-schedule-a',
          data: intakeData,
          updatedAt: now,
        })
        .then(() => setLastSavedIso(now))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [intakeData]);

  const validation = useMemo(() => {
    const orgTrimmed = intakeData.org.trim();
    const orgCheck: FieldValidation =
      orgTrimmed.length >= 2
        ? { valid: true, message: 'Organization verified' }
        : { valid: false, message: 'Enter at least 2 characters for authorizing entity.' };

    const cloudCheck: FieldValidation = intakeData.cloud
      ? { valid: true, message: 'Cloud plane selected' }
      : { valid: false, message: 'Select a primary cloud topology.' };

    const rpoCheck: FieldValidation = intakeData.rpo
      ? { valid: true, message: 'RTO/RPO constraint locked' }
      : { valid: false, message: 'Select an RTO/RPO target.' };

    const repoCheck = validateRepoUrl(intakeData.repo);

    const activeComplianceCount = [
      intakeData.compliance.gdpr,
      intakeData.compliance.soc2,
      intakeData.compliance.nist,
    ].filter(Boolean).length;

    const minCompliance = thresholds.minComplianceMandates;
    const complianceCheck: FieldValidation =
      activeComplianceCount >= minCompliance
        ? {
            valid: true,
            message: `${activeComplianceCount} regulatory mandate${activeComplianceCount > 1 ? 's' : ''} active (min ${minCompliance})`,
          }
        : {
            valid: false,
            message: `Select at least ${minCompliance} compliance mandate${minCompliance > 1 ? 's' : ''} (SOC2, ISO/GDPR, or NIST).`,
          };

    const minNotes = thresholds.minNotesChars;
    const notesLen = intakeData.notes.trim().length;
    const notesCheck: FieldValidation =
      notesLen >= minNotes
        ? { valid: true, message: `Detailed context ready (${notesLen} / ${minNotes} min chars)` }
        : {
            valid: false,
            message: `Add ${Math.max(1, minNotes - notesLen)} more characters describing architectural bottlenecks (${minNotes} min).`,
          };

    const steps = [
      { key: 'org', label: 'Entity Name', valid: orgCheck.valid },
      { key: 'topology', label: 'Cloud & RPO Target', valid: cloudCheck.valid && rpoCheck.valid },
      { key: 'repo', label: 'Git Coordinate', valid: repoCheck.valid },
      { key: 'compliance', label: 'Compliance Scope', valid: complianceCheck.valid },
      { key: 'notes', label: 'Bottleneck Spec', valid: notesCheck.valid },
    ];

    const completedCount = steps.filter((s) => s.valid).length;
    const progressPercent = Math.round((completedCount / steps.length) * 100);

    return {
      org: orgCheck,
      cloud: cloudCheck,
      rpo: rpoCheck,
      repo: repoCheck,
      compliance: complianceCheck,
      notes: notesCheck,
      steps,
      completedCount,
      totalCount: steps.length,
      progressPercent,
      isSpecReady: completedCount === steps.length,
    };
  }, [intakeData, thresholds]);

  const compiledMarkdown = `# ARCHTECHNIX SCHEDULE A: ASYNC-BY-DEFAULT INTAKE SPEC
Compiled Timestamp: ${new Date().toISOString()}
Authorizing Entity: ${intakeData.org || 'Pending Organization'}
Spec Readiness: ${validation.progressPercent}% (${validation.completedCount}/${validation.totalCount} Verified)
Adaptive Intake Gate: >= ${thresholds.minNotesChars} chars · >= ${thresholds.minComplianceMandates} mandate(s) · Window ${thresholds.diagnosticWindowDays}d${thresholds.retainerEscalationActive ? ' [TIER-2 RETAINER ESCALATION GUARD ACTIVE]' : ''}
Status: ${validation.isSpecReady ? 'SPEC_LOCKED_READY_FOR_PROVISIONING' : 'DRAFT_IN_PROGRESS'}

## 1. Enterprise Infrastructure Profile
* Target Cloud Topology: ${intakeData.cloud}
* Target Resilience / Disaster Recovery: ${intakeData.rpo}
* Regulatory Frameworks Mandated: ${
    [
      intakeData.compliance.gdpr ? 'GDPR/CCPA Cryptographic Shredding' : null,
      intakeData.compliance.soc2 ? 'SOC2 Type II Immutable Audit Logs' : null,
      intakeData.compliance.nist ? 'NIST SP 800-207 Zero Trust' : null,
    ]
      .filter(Boolean)
      .join(', ') || 'Pending Framework Selection'
  }

## 2. Ingestion & Security Coordinates
* Monitored Topology / Git Spec: ${intakeData.repo || 'Pending Git Coordinate'}
* Primary Security Focus: Decoupled Data Mesh, KMS Envelope Encryption, OPA Rego CI/CD
* Context Notes:
> ${intakeData.notes || 'Pending bottleneck specification.'}

## 3. Operating Execution & Communication Windows
* Delivery Model: Async-by-Default + 1 Weekly Strategic Sync (60 minutes max).
* Core Deliverables: Pull Requests, Architectural Decision Records (ADRs), Markdown roadmaps, and Loom walkthroughs.
* All architectural reviews retain immutable audit history in Git PR threads.`;

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleCopy = () => {
    setTouched({ org: true, repo: true, compliance: true, notes: true });
    if (!validation.isSpecReady) {
      onShowToast(
        `Complete all ${validation.totalCount} spec coordinates before locking Schedule A (${validation.completedCount}/${validation.totalCount} ready).`
      );
      return;
    }
    navigator.clipboard.writeText(compiledMarkdown).then(() => {
      setCopied(true);
      onShowToast('Validated Schedule A Markdown copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadMarkdown = () => {
    const slug = (intakeData.org || 'archtechnix').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const blob = new Blob([compiledMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slug}-schedule-a-intake.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Schedule A Markdown exported!');
  };

  const handlePersistToCloudSql = async () => {
    setTouched({ org: true, repo: true, compliance: true, notes: true });
    if (!validation.isSpecReady) {
      onShowToast(
        `Please resolve all ${validation.totalCount} validation checks before saving to Cloud SQL.`
      );
      return;
    }

    setCloudSaving(true);
    try {
      let token = idToken;
      if (!user || !token) {
        await signInWithGoogle();
        // Wait for auth context state/token via fresh auth instance read if needed
        const { auth } = await import('../lib/firebase');
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      if (!token) {
        onShowToast('Google Sign-In is required to save Schedule A to your Cloud SQL client portal.');
        setCloudSaving(false);
        return;
      }

      const resp = await fetch('/api/intake-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationName: intakeData.org.trim(),
          primaryCloud: intakeData.cloud,
          rpoTarget: intakeData.rpo,
          repoUrl: intakeData.repo.trim(),
          complianceFlags: intakeData.compliance,
          notes: intakeData.notes.trim(),
          readinessPercent: validation.progressPercent,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save Schedule A');
      }

      setCloudSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      await refreshWorkspace(token);
      onShowToast('Schedule A specification persisted to your isolated Cloud SQL workspace!');
    } catch (err: any) {
      onShowToast(err?.message || 'Cloud SQL save cancelled or failed. Draft remains safe offline.');
    } finally {
      setCloudSaving(false);
    }
  };

  const renderFieldStatus = (field: string, check: FieldValidation) => {
    const showError = !check.valid && touched[field];
    if (check.valid) {
      return (
        <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{check.message}</span>
        </span>
      );
    }
    if (showError) {
      return (
        <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-rose-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{check.message}</span>
        </span>
      );
    }
    return <span className="text-[11px] font-mono text-slate-500">{check.message}</span>;
  };

  return (
    <div className="space-y-6">
      {thresholds.retainerEscalationActive && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start space-x-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-bold text-amber-300 uppercase tracking-wider">
                Evolutionary Skill Guard Active · Tier 2 Retainer Escalation Triggered
              </span>
              <p className="text-slate-300 mt-0.5 leading-relaxed">{thresholds.adaptedRuleReason}</p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-amber-300 bg-slate-950/80 border border-amber-500/30 px-2.5 py-1 rounded-md shrink-0 tabular-nums">
            {thresholds.minNotesChars} chars · {thresholds.minComplianceMandates} mandates
          </span>
        </div>
      )}

      {/* Specification Readiness Progress Bar & Verification Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck
              className={`w-5 h-5 ${
                validation.isSpecReady ? 'text-emerald-400' : 'text-orange-400'
              }`}
            />
            <div>
              <h3 className="text-sm font-bold text-white">
                Specification Readiness & Inline Validation
              </h3>
              <p className="text-xs text-slate-400">
                Real-time telemetry validating Schedule A completeness prior to repo provisioning
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-1 rounded-md border tabular-nums ${
                validation.isSpecReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
              }`}
            >
              {validation.completedCount} / {validation.totalCount} Verified ({validation.progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-300 ${
              validation.isSpecReady
                ? 'bg-gradient-to-r from-teal-500 to-emerald-400'
                : 'bg-gradient-to-r from-orange-500 to-amber-400'
            }`}
            style={{ width: `${validation.progressPercent}%` }}
          />
        </div>

        {/* Stepper Checklist */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {validation.steps.map((step, idx) => (
            <div
              key={step.key}
              className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center space-x-2 transition-colors ${
                step.valid
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  step.valid
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step.valid ? '✓' : idx + 1}
              </span>
              <span className="truncate">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Interactive Form with Inline Validation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-300">
                Target Organization / Enterprise Name
              </label>
              {validation.org.valid && (
                <span className="text-[10px] font-mono text-emerald-400">VALID</span>
              )}
            </div>
            <input
              type="text"
              value={intakeData.org}
              onBlur={() => markTouched('org')}
              onChange={(e) => {
                markTouched('org');
                onUpdate({ ...intakeData, org: e.target.value });
              }}
              placeholder="e.g. Apex FinTech Systems"
              aria-invalid={!validation.org.valid}
              className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono transition-colors ${
                validation.org.valid
                  ? 'border-emerald-500/50 focus:border-emerald-400'
                  : touched.org
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-orange-500'
              }`}
            />
            <div className="mt-1.5">{renderFieldStatus('org', validation.org)}</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Primary Cloud Provider
              </label>
              <select
                value={intakeData.cloud}
                onChange={(e) => onUpdate({ ...intakeData, cloud: e.target.value })}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
              >
                <option value="AWS (EKS, Aurora, KMS)">AWS (EKS, Aurora, KMS)</option>
                <option value="GCP (GKE, Spanner, Cloud KMS)">GCP (GKE, Spanner, Cloud KMS)</option>
                <option value="Azure (AKS, CosmosDB, KeyVault)">Azure (AKS, CosmosDB, KeyVault)</option>
                <option value="Multi-Cloud / Hybrid On-Prem">Multi-Cloud / Hybrid On-Prem</option>
              </select>
              <div className="mt-1.5">{renderFieldStatus('cloud', validation.cloud)}</div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Target RTO / RPO Constraint
              </label>
              <select
                value={intakeData.rpo}
                onChange={(e) => onUpdate({ ...intakeData, rpo: e.target.value })}
                className="w-full bg-slate-950 border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
              >
                <option value="Sub-15 Minute (Zero Data Loss)">Sub-15 Minute (Zero Loss Target)</option>
                <option value="Sub-1 Hour (Tier-1 Enterprise)">Sub-1 Hour (Tier-1 Enterprise)</option>
                <option value="Sub-4 Hour Standard">Sub-4 Hour Standard</option>
              </select>
              <div className="mt-1.5">{renderFieldStatus('rpo', validation.rpo)}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-300">
                Architecture Repo / Topology URL
              </label>
              {validation.repo.valid && (
                <span className="text-[10px] font-mono text-emerald-400">VERIFIED URI</span>
              )}
            </div>
            <input
              type="text"
              value={intakeData.repo}
              onBlur={() => markTouched('repo')}
              onChange={(e) => {
                markTouched('repo');
                onUpdate({ ...intakeData, repo: e.target.value });
              }}
              placeholder="https://github.com/org/repo-spec"
              aria-invalid={!validation.repo.valid}
              className={`w-full bg-slate-950 border rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none font-mono transition-colors ${
                validation.repo.valid
                  ? 'border-emerald-500/50 focus:border-emerald-400'
                  : touched.repo
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-orange-500'
              }`}
            />
            <div className="mt-1.5">{renderFieldStatus('repo', validation.repo)}</div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-2">
              Core Regulatory & Compliance Mandate
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  intakeData.compliance.gdpr ? 'border-teal-500/60' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={intakeData.compliance.gdpr}
                  onChange={(e) => {
                    markTouched('compliance');
                    onUpdate({
                      ...intakeData,
                      compliance: { ...intakeData.compliance, gdpr: e.target.checked },
                    });
                  }}
                  className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>GDPR/CCPA Key Shred</span>
              </label>
              <label
                className={`flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  intakeData.compliance.soc2 ? 'border-teal-500/60' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={intakeData.compliance.soc2}
                  onChange={(e) => {
                    markTouched('compliance');
                    onUpdate({
                      ...intakeData,
                      compliance: { ...intakeData.compliance, soc2: e.target.checked },
                    });
                  }}
                  className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>SOC2 Type II</span>
              </label>
              <label
                className={`flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  intakeData.compliance.nist ? 'border-teal-500/60' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={intakeData.compliance.nist}
                  onChange={(e) => {
                    markTouched('compliance');
                    onUpdate({
                      ...intakeData,
                      compliance: { ...intakeData.compliance, nist: e.target.checked },
                    });
                  }}
                  className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
                />
                <span>NIST SP 800-207</span>
              </label>
            </div>
            <div className="mt-1.5">{renderFieldStatus('compliance', validation.compliance)}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-300">
                Critical Architecture Bottleneck Description
              </label>
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  intakeData.notes.trim().length >= thresholds.minNotesChars
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {intakeData.notes.trim().length} / {thresholds.minNotesChars} min chars
              </span>
            </div>
            <textarea
              value={intakeData.notes}
              onBlur={() => markTouched('notes')}
              onChange={(e) => {
                markTouched('notes');
                onUpdate({ ...intakeData, notes: e.target.value });
              }}
              rows={4}
              placeholder="Detail cross-account IAM friction, data mesh ingestion bottlenecks, or encryption key lifecycle issues..."
              aria-invalid={!validation.notes.valid}
              className={`w-full bg-slate-950 border rounded-lg p-3 text-sm text-white focus:outline-none font-mono leading-relaxed resize-none transition-colors ${
                validation.notes.valid
                  ? 'border-emerald-500/50 focus:border-emerald-400'
                  : touched.notes
                  ? 'border-rose-500 focus:border-rose-400'
                  : 'border-slate-800 focus:border-orange-500'
              }`}
            />
            <div className="mt-1.5">{renderFieldStatus('notes', validation.notes)}</div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-col space-y-0.5 text-[11px] font-mono">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                <span>
                  IndexedDB Synced
                  {lastSavedIso
                    ? ` (${new Date(lastSavedIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    : ''}
                </span>
              </span>
              {cloudSavedAt && (
                <span className="text-cyan-400">Cloud SQL saved at {cloudSavedAt}</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePersistToCloudSql}
                disabled={cloudSaving}
                className="px-3.5 py-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-bold font-mono flex items-center space-x-1.5 transition-colors disabled:opacity-60"
              >
                {user ? <CloudUpload className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                <span>
                  {cloudSaving
                    ? 'Saving...'
                    : user
                    ? 'Save Spec to Cloud SQL'
                    : 'Sign In & Save Spec'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`px-4 py-2.5 rounded-lg text-xs font-bold font-mono flex items-center space-x-2 transition-all shadow ${
                  validation.isSpecReady
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {validation.isSpecReady ? 'Copy Validated Schedule A' : 'Validate & Copy Spec'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Compiled Markdown Preview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
              <FileText className="w-4 h-4 text-orange-500" />
              <span>Compiled Markdown Specification</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition-colors font-mono"
              >
                <Download className="w-3.5 h-3.5" />
                <span>.md</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-mono"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <pre className="mt-4 p-4 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto flex-1 select-all whitespace-pre-wrap leading-relaxed">
            {compiledMarkdown}
          </pre>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
            <span>Target Delivery SLA: 72 Hours on Receipt</span>
            <span>Async-by-Default + 1 Weekly Sync</span>
          </div>
        </div>
      </div>
    </div>
  );
};
