import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Lock,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  DEFAULT_OFFLINE_METRICS,
  offlineDb,
  type OfflineComplianceMetric,
} from '../lib/offlineDb';
import { MarkdownViewer } from './MarkdownViewer';

const DEFAULT_ROADMAP_MD = `# 14-Day Pilot Audit: Critical RPO/RTO Remediation Roadmap

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

interface PilotAuditDashboardProps {
  onLaunchPilotCheckout: () => void;
  onShowToast: (msg: string) => void;
  isCheckingOut?: boolean;
}

export const PilotAuditDashboard: React.FC<PilotAuditDashboardProps> = ({
  onLaunchPilotCheckout,
  onShowToast,
  isCheckingOut = false,
}) => {
  const {
    user,
    idToken,
    loadingAuth,
    workspace,
    signInWithGoogle,
    signOutUser,
    refreshWorkspace,
  } = useAuth();

  const [offlineMetrics, setOfflineMetrics] = useState<OfflineComplianceMetric[]>(DEFAULT_OFFLINE_METRICS);
  const [frameworkFilter, setFrameworkFilter] = useState<'ALL' | 'SOC2' | 'ISO27001' | 'NIST'>('ALL');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'roadmap' | 'loom'>('roadmap');

  // Custom Remediation Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFramework, setNewFramework] = useState<'SOC2' | 'ISO27001' | 'NIST'>('SOC2');
  const [newCode, setNewCode] = useState('CC9.2');
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<'critical' | 'high' | 'medium'>('high');
  const [newImpact, setNewImpact] = useState('');
  const [newNote, setNewNote] = useState('');
  const [creatingMetric, setCreatingMetric] = useState(false);

  // Hydrate offline Dexie cache when signed out or before remote finishes
  useEffect(() => {
    offlineDb.complianceMetrics
      .toArray()
      .then((rows) => {
        if (rows.length > 0) {
          setOfflineMetrics(rows);
        } else {
          offlineDb.complianceMetrics.bulkPut(DEFAULT_OFFLINE_METRICS).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Sync authenticated workspace controls into Dexie for offline resilience
  useEffect(() => {
    if (workspace?.complianceMetrics && workspace.complianceMetrics.length > 0) {
      offlineDb.complianceMetrics.bulkPut(workspace.complianceMetrics).catch(() => {});
    }
  }, [workspace?.complianceMetrics]);

  const metrics = useMemo(() => {
    if (user && workspace?.complianceMetrics && workspace.complianceMetrics.length > 0) {
      return workspace.complianceMetrics;
    }
    return offlineMetrics;
  }, [user, workspace?.complianceMetrics, offlineMetrics]);

  const frameworkScores = useMemo(() => {
    const calc = (fw?: 'SOC2' | 'ISO27001' | 'NIST') => {
      const subset = fw ? metrics.filter((m) => m.framework === fw) : metrics;
      if (subset.length === 0) return 0;
      const done = subset.filter((m) => m.isCompliant).length;
      return Math.round((done / subset.length) * 100);
    };
    return {
      overall: calc(),
      SOC2: calc('SOC2'),
      ISO27001: calc('ISO27001'),
      NIST: calc('NIST'),
    };
  }, [metrics]);

  const filteredMetrics = useMemo(() => {
    if (frameworkFilter === 'ALL') return metrics;
    return metrics.filter((m) => m.framework === frameworkFilter);
  }, [metrics, frameworkFilter]);

  const handleToggleMetric = async (metric: OfflineComplianceMetric) => {
    const nextState = !metric.isCompliant;
    setUpdatingId(metric.id);

    const updatedRow = {
      ...metric,
      isCompliant: nextState,
      updatedAt: new Date().toISOString(),
    };
    setOfflineMetrics((prev) => prev.map((m) => (m.id === metric.id ? updatedRow : m)));
    await offlineDb.complianceMetrics.put(updatedRow).catch(() => {});

    if (user && idToken) {
      try {
        const resp = await fetch(`/api/compliance-metrics/${metric.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ isCompliant: nextState }),
        });
        if (resp.ok) {
          await refreshWorkspace();
          onShowToast(`${metric.controlCode} marked ${nextState ? 'Compliant' : 'Requires Remediation'}.`);
        } else {
          onShowToast('Saved locally; remote sync queued.');
        }
      } catch {
        onShowToast('Offline mode: control status saved in IndexedDB.');
      }
    } else {
      onShowToast(`${metric.controlCode} updated locally. Sign in with Google to save to Cloud SQL.`);
    }

    setUpdatingId(null);
  };

  const handleCreateCustomRemediation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newTitle.trim()) {
      onShowToast('Control code and title are required.');
      return;
    }

    setCreatingMetric(true);
    try {
      let token = idToken;
      if (!user || !token) {
        await signInWithGoogle();
        const { auth } = await import('../lib/firebase');
        if (auth.currentUser) {
          token = await auth.currentUser.getIdToken();
        }
      }

      if (!token) {
        onShowToast('Google Sign-In is required to persist new remediation items to Cloud SQL.');
        setCreatingMetric(false);
        return;
      }

      const resp = await fetch('/api/compliance-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          framework: newFramework,
          controlCode: newCode.trim().toUpperCase(),
          controlTitle: newTitle.trim(),
          category: 'Custom RPO/RTO Remediation',
          severity: newSeverity,
          rpoRtoImpact: newImpact.trim() || 'Addresses critical recovery or policy gap',
          remediationNote: newNote.trim() || 'Pending engineering sprint implementation',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add remediation control');
      }

      const data = await resp.json();
      if (data.metric) {
        await offlineDb.complianceMetrics.put(data.metric).catch(() => {});
      }
      await refreshWorkspace(token);
      setShowAddModal(false);
      setNewTitle('');
      setNewImpact('');
      setNewNote('');
      onShowToast(`Custom remediation ${newCode.trim().toUpperCase()} saved to Cloud SQL!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to save custom remediation control.');
    } finally {
      setCreatingMetric(false);
    }
  };

  const roadmapMarkdown = workspace?.audit?.roadmapMarkdown || DEFAULT_ROADMAP_MD;
  const loomUrl = workspace?.audit?.loomUrl || 'https://www.loom.com/share/archtechnix-pilot-briefing';

  const handleExportCsv = () => {
    const escapeCsv = (val: string | boolean) =>
      `"${String(val).replace(/"/g, '""')}"`;

    const headers = [
      'Framework',
      'Control Code',
      'Title',
      'Category',
      'Severity',
      'Compliant',
      'RPO/RTO Impact',
      'Remediation Note',
      'Updated At',
    ];
    const rows = metrics.map((m) =>
      [
        escapeCsv(m.framework),
        escapeCsv(m.controlCode),
        escapeCsv(m.controlTitle),
        escapeCsv(m.category),
        escapeCsv(m.severity),
        escapeCsv(m.isCompliant ? 'COMPLIANT' : 'REMEDIATION_REQUIRED'),
        escapeCsv(m.rpoRtoImpact),
        escapeCsv(m.remediationNote),
        escapeCsv(m.updatedAt),
      ].join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archtechnix-compliance-audit-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('DevSecOps Compliance Audit exported as CSV!');
  };

  const handleExportMarkdown = () => {
    const tableLines = [
      '| Framework | Control | Severity | Status | RPO/RTO Impact | Remediation Note |',
      '| :--- | :--- | :--- | :--- | :--- | :--- |',
      ...metrics.map(
        (m) =>
          `| ${m.framework} | ${m.controlCode}: ${m.controlTitle} | ${m.severity.toUpperCase()} | ${
            m.isCompliant ? 'Compliant' : 'Needs Remediation'
          } | ${m.rpoRtoImpact} | ${m.remediationNote} |`
      ),
    ];

    const fullReport = `# Archtechnix {∞} Pilot Audit & Compliance Readiness Report
Generated: ${new Date().toISOString()}
Organization: ${workspace?.client?.organizationName || 'Enterprise Assessment'}
Overall Readiness Score: ${frameworkScores.overall}% (SOC 2: ${frameworkScores.SOC2}% | ISO 27001: ${frameworkScores.ISO27001}% | NIST ZTA: ${frameworkScores.NIST}%)

## DevSecOps Compliance Readiness Matrix
${tableLines.join('\n')}

---

${roadmapMarkdown}
`;
    const blob = new Blob([fullReport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archtechnix-pilot-audit-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Pilot Audit Report exported as Markdown (.md)!');
  };

  return (
    <div className="space-y-8">
      {/* Portal Header & Authenticated Client Session Control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20">
              Module 2 · Pilot Audit Diagnostic Dashboard
            </span>
            <span className="text-xs font-mono text-slate-400">
              {workspace?.audit?.title || '$3,500 14-Day Async Sprint'}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            DevSecOps Compliance Readiness & RPO/RTO Remediation
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Track real-time SOC 2, ISO/IEC 27001, and NIST SP 800-207 audit controls, author custom RPO/RTO remediations, and export auditor-ready reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={() =>
                signInWithGoogle().catch(() =>
                  onShowToast('Sign-in popup closed. Local sandbox remains active.')
                )
              }
              disabled={loadingAuth}
              className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-white font-mono text-xs flex items-center space-x-2 transition-colors"
            >
              <LogIn className="w-4 h-4 text-cyan-400" />
              <span>Sign In to Save Portal Data</span>
            </button>
          ) : (
            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2">
              <div className="text-xs font-mono">
                <div className="text-emerald-400 font-semibold flex items-center space-x-1.5">
                  <Lock className="w-3 h-3" />
                  <span>{user.email}</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Tenant Isolated Workspace #{workspace?.client?.id || 1}
                </div>
              </div>
              <button
                type="button"
                onClick={signOutUser}
                title="Sign out"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export .MD</span>
          </button>

          <button
            type="button"
            onClick={onLaunchPilotCheckout}
            disabled={isCheckingOut}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs flex items-center space-x-2 shadow transition-all disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isCheckingOut ? 'Launching Stripe...' : 'Book $3,500 Pilot Audit'}</span>
          </button>
        </div>
      </div>

      {/* 4 Compliance Readiness KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-slate-400">Overall Audit Readiness</div>
          <div className="text-3xl font-black text-white mt-2 tabular-nums">
            {frameworkScores.overall}%
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-orange-500 transition-all duration-300"
              style={{ width: `${frameworkScores.overall}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-cyan-400">SOC 2 Type II Alignment</div>
          <div className="text-3xl font-black text-white mt-2 tabular-nums">
            {frameworkScores.SOC2}%
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${frameworkScores.SOC2}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-teal-400">ISO/IEC 27001 Alignment</div>
          <div className="text-3xl font-black text-white mt-2 tabular-nums">
            {frameworkScores.ISO27001}%
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-teal-400 transition-all duration-300"
              style={{ width: `${frameworkScores.ISO27001}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-xs font-mono text-violet-400">NIST SP 800-207 Zero Trust</div>
          <div className="text-3xl font-black text-white mt-2 tabular-nums">
            {frameworkScores.NIST}%
          </div>
          <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-violet-400 transition-all duration-300"
              style={{ width: `${frameworkScores.NIST}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Split: Compliance Readiness Matrix + RPO/RTO Roadmap & Loom Deliverable */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Compliance Controls Matrix */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <h3 className="text-base font-bold text-white">DevSecOps Compliance Matrix</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
                {(['ALL', 'SOC2', 'ISO27001', 'NIST'] as const).map((fw) => (
                  <button
                    key={fw}
                    type="button"
                    onClick={() => setFrameworkFilter(fw)}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      frameworkFilter === fw
                        ? 'bg-orange-500 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Remediation</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredMetrics.map((control) => (
              <div
                key={control.id}
                className={`p-4 rounded-xl border transition-colors ${
                  control.isCompliant
                    ? 'bg-slate-950/80 border-emerald-500/30'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start space-x-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={control.isCompliant}
                      disabled={updatingId === control.id}
                      onChange={() => handleToggleMetric(control)}
                      className="mt-1 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-0"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                          {control.framework} · {control.controlCode}
                        </span>
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                            control.severity === 'critical'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : control.severity === 'high'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {control.severity}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-white">
                        {control.controlTitle}
                      </div>
                      <div className="text-xs text-slate-400">
                        <span className="text-slate-500 font-mono">RPO/RTO Impact:</span>{' '}
                        {control.rpoRtoImpact}
                      </div>
                      {control.remediationNote && (
                        <div className="text-xs text-slate-300 bg-slate-900/70 px-2.5 py-1.5 rounded border border-slate-800/80 mt-1.5">
                          {control.remediationNote}
                        </div>
                      )}
                    </div>
                  </label>

                  <span className="shrink-0">
                    {control.isCompliant ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RPO/RTO Remediation Roadmap & Loom Walkthrough */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-bold text-white">Audit Deliverables</h3>
            </div>
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveDocTab('roadmap')}
                className={`px-2.5 py-1 rounded ${
                  activeDocTab === 'roadmap'
                    ? 'bg-orange-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Markdown Roadmap
              </button>
              <button
                type="button"
                onClick={() => setActiveDocTab('loom')}
                className={`px-2.5 py-1 rounded ${
                  activeDocTab === 'loom'
                    ? 'bg-orange-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Loom Walkthrough
              </button>
            </div>
          </div>

          {activeDocTab === 'roadmap' ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[620px] overflow-y-auto">
              <MarkdownViewer markdown={roadmapMarkdown} />
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="aspect-video rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    15-Minute Executive Async Walkthrough
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Principal Architect Tariq Abudayyeh walks through P0 RPO/RTO failover vulnerabilities, OPA policy PR diffs, and KMS DEK shredding steps.
                  </p>
                </div>
                <a
                  href={loomUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold transition-colors"
                >
                  <span>Open Loom Async Briefing</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <div className="text-xs font-mono text-slate-400 space-y-1">
                <div>00:00 – 04:15 · Multi-Region Continuous WAL Replication Audit</div>
                <div>04:15 – 09:40 · OIDC Runner Federation & Pre-Commit OPA Rules</div>
                <div>09:40 – 15:00 · Phased 14-Day Remediation Sequence</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Custom Remediation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Add Custom Remediation Control</h3>
                <p className="text-xs text-slate-400">
                  Saved directly to your isolated Cloud SQL compliance matrix
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRemediation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Framework</label>
                  <select
                    value={newFramework}
                    onChange={(e) => setNewFramework(e.target.value as 'SOC2' | 'ISO27001' | 'NIST')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  >
                    <option value="SOC2">SOC2</option>
                    <option value="ISO27001">ISO27001</option>
                    <option value="NIST">NIST</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Control Code</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. CC9.2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as 'critical' | 'high' | 'medium')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Control / Finding Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Enforce KMS Customer-Managed Keys on Kafka Streams"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">RPO / RTO Impact</label>
                <input
                  type="text"
                  value={newImpact}
                  onChange={(e) => setNewImpact(e.target.value)}
                  placeholder="e.g. Eliminates unencrypted replay lag on failover"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Actionable Remediation Plan</label>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Specify Terraform module PR or OPA policy rule change..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMetric}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold disabled:opacity-60"
                >
                  {creatingMetric
                    ? 'Saving...'
                    : user
                    ? 'Save Remediation to Cloud SQL'
                    : 'Sign In & Save Remediation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
