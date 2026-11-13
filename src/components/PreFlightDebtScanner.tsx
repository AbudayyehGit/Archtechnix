import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  FileWarning,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
} from 'lucide-react';
import type {
  IntakeSpecData,
  PreFlightDebtCategory,
  PreFlightDebtFinding,
  PreFlightScanReport,
} from '../types';

interface PreFlightDebtScannerProps {
  intakeData: IntakeSpecData;
  onShowToast: (msg: string) => void;
  onFlagToScopeLog?: (finding: PreFlightDebtFinding) => void;
}

const CATEGORY_LABEL: Record<PreFlightDebtCategory, string> = {
  undocumented_api: 'Undocumented API',
  missing_rpo_metrics: 'Missing Backup / RPO Metric',
  brittle_db_dependency: 'Brittle DB Dependency',
};

export const PreFlightDebtScanner: React.FC<PreFlightDebtScannerProps> = ({
  intakeData,
  onShowToast,
  onFlagToScopeLog,
}) => {
  const [apiSpecRegistry, setApiSpecRegistry] = useState<'none' | 'partial' | 'openapi_v3'>(
    'none'
  );
  const [dbTopologyMode, setDbTopologyMode] = useState<
    'coupled_oltp_olap' | 'shared_static_creds' | 'isolated_domain_mesh'
  >('coupled_oltp_olap');
  const [walDrillVerified, setWalDrillVerified] = useState<boolean>(false);
  const [resolvedIds, setResolvedIds] = useState<Record<string, boolean>>({});
  const [scanTimestamp, setScanTimestamp] = useState<string>(() =>
    new Date().toISOString()
  );

  const report: PreFlightScanReport = useMemo(() => {
    const findings: PreFlightDebtFinding[] = [];
    const lowerNotes = intakeData.notes.toLowerCase();
    const isSub15Rpo = intakeData.rpo.toLowerCase().includes('sub-15');

    // 1. Undocumented APIs
    const hasApiSpecSignal =
      apiSpecRegistry === 'openapi_v3' ||
      lowerNotes.includes('openapi') ||
      lowerNotes.includes('asyncapi') ||
      lowerNotes.includes('protobuf');

    if (!hasApiSpecSignal) {
      findings.push({
        id: 'pf-undocumented-api',
        category: 'undocumented_api',
        severity: apiSpecRegistry === 'none' ? 'critical' : 'high',
        title: 'Undocumented Internal Service & Event Mesh APIs',
        detectedSignal:
          apiSpecRegistry === 'partial'
            ? `Repository ${intakeData.repo} has partial schemas without OpenAPI v3 / AsyncAPI contract enforcement.`
            : `No OpenAPI v3, AsyncAPI, or Schema Registry contract detected for ${intakeData.repo || 'target repo'}.`,
        remediationAction:
          'Generate canonical OpenAPI 3.1 + AsyncAPI specs in CI pre-merge checks and block breaking payload mutations.',
        resolved: Boolean(resolvedIds['pf-undocumented-api']),
      });
    }

    // 2. Missing Backup / RPO Metrics
    if (!walDrillVerified || !isSub15Rpo) {
      findings.push({
        id: 'pf-missing-rpo',
        category: 'missing_rpo_metrics',
        severity: !isSub15Rpo ? 'critical' : 'high',
        title: 'Missing Timed Backup / Sub-15m RPO Failover Telemetry',
        detectedSignal: !isSub15Rpo
          ? `Schedule A declares "${intakeData.rpo}" without Sub-15m continuous WAL shipping.`
          : `Sub-15m RPO requested on ${intakeData.cloud}, but automated chaos failover drill telemetry is unverified.`,
        remediationAction:
          'Instrument continuous cross-region WAL telemetry, automated restore latency probes, and quarterly 15-minute RTO drills.',
        resolved: Boolean(resolvedIds['pf-missing-rpo']),
      });
    }

    // 3. Brittle Database Dependencies
    if (dbTopologyMode !== 'isolated_domain_mesh') {
      findings.push({
        id: 'pf-brittle-db',
        category: 'brittle_db_dependency',
        severity: dbTopologyMode === 'shared_static_creds' ? 'critical' : 'high',
        title:
          dbTopologyMode === 'shared_static_creds'
            ? 'Brittle DB Coupling & Static Connection Credentials'
            : 'Brittle Direct OLTP/OLAP Cross-Service Database Joins',
        detectedSignal:
          dbTopologyMode === 'shared_static_creds'
            ? 'Multiple services share static database credentials without OIDC/IAM short-lived token rotation.'
            : 'Analytical/downstream pipelines read directly from primary OLTP tables without CDC event contracts.',
        remediationAction:
          'Decouple analytics via CDC Outbox events, enforce per-service schemas, and migrate to ephemeral OIDC DB authentication.',
        resolved: Boolean(resolvedIds['pf-brittle-db']),
      });
    }

    return {
      scannedAt: scanTimestamp,
      repoUrl: intakeData.repo,
      cloudProvider: intakeData.cloud,
      rpoTarget: intakeData.rpo,
      findings,
    };
  }, [
    intakeData,
    apiSpecRegistry,
    dbTopologyMode,
    walDrillVerified,
    resolvedIds,
    scanTimestamp,
  ]);

  const activeIssuesCount = report.findings.filter((f) => !f.resolved).length;

  const handleRerunScan = () => {
    setScanTimestamp(new Date().toISOString());
    onShowToast(
      `Pre-Flight Debt Scan completed for ${intakeData.org || 'target system'}: ${activeIssuesCount} active debt signals.`
    );
  };

  const handleCopyMarkdownReport = () => {
    const lines = [
      `# Pre-Flight Architectural Debt Scan`,
      `- **Organization**: ${intakeData.org}`,
      `- **Repository**: ${report.repoUrl}`,
      `- **Cloud Target**: ${report.cloudProvider}`,
      `- **RPO Target**: ${report.rpoTarget}`,
      `- **Scanned At**: ${report.scannedAt}`,
      '',
      '## Detected Findings',
      ...report.findings.map(
        (f) =>
          `- [${f.resolved ? 'x' : ' '}] **${f.title}** (${CATEGORY_LABEL[f.category]} · ${f.severity.toUpperCase()})\n  - Signal: ${f.detectedSignal}\n  - Fix: ${f.remediationAction}`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      onShowToast('Pre-Flight Debt Scan report copied as Markdown.');
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ScanSearch className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              &lt;PreFlightDebtScanner /&gt; · Automated Onboarding Check
            </h3>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded border tabular-nums ${
                activeIssuesCount === 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {activeIssuesCount} Active Debt Flags
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Inspects Schedule A coordinates for undocumented APIs, missing backup/RPO metrics, and brittle database dependencies before engineering sprint kickoff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyMarkdownReport}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy .MD Report</span>
          </button>
          <button
            type="button"
            onClick={handleRerunScan}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Run Pre-Flight Scan</span>
          </button>
        </div>
      </div>

      {/* Onboarding Probe Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 border border-slate-800 rounded-xl p-4">
        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
            API Contract Registry Status
          </label>
          <select
            value={apiSpecRegistry}
            onChange={(e) =>
              setApiSpecRegistry(e.target.value as 'none' | 'partial' | 'openapi_v3')
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="none">No OpenAPI / AsyncAPI Specs Found</option>
            <option value="partial">Partial Swagger (Unenforced in CI)</option>
            <option value="openapi_v3">Full OpenAPI 3.1 + Schema Registry</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
            Database Dependency Coupling
          </label>
          <select
            value={dbTopologyMode}
            onChange={(e) =>
              setDbTopologyMode(
                e.target.value as
                  | 'coupled_oltp_olap'
                  | 'shared_static_creds'
                  | 'isolated_domain_mesh'
              )
            }
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="coupled_oltp_olap">Direct Cross-Service OLTP Joins</option>
            <option value="shared_static_creds">Shared Static DB Credentials</option>
            <option value="isolated_domain_mesh">Isolated Domain DBs + CDC Events</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
            Timed WAL Backup / DR Drill Metrics
          </label>
          <button
            type="button"
            onClick={() => setWalDrillVerified((prev) => !prev)}
            className={`w-full px-3 py-2 rounded-lg border text-xs font-mono text-left flex items-center justify-between transition-colors ${
              walDrillVerified
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-amber-500/40 text-amber-300'
            }`}
          >
            <span>
              {walDrillVerified
                ? 'RPO/RTO Telemetry Verified (<15m)'
                : 'Unverified / Missing RPO Metrics'}
            </span>
            <Database className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Findings List */}
      {report.findings.length === 0 ? (
        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-xs text-emerald-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            Pre-Flight Baseline Clear: API contracts, Sub-15m RPO telemetry, and isolated database boundaries verified for {intakeData.repo}.
          </span>
        </div>
      ) : (
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
          {report.findings.map((finding) => (
            <div key={finding.id} className="p-4 sm:p-5 space-y-2.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                    <span
                      className={`px-2 py-0.5 rounded border uppercase ${
                        finding.severity === 'critical'
                          ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 font-bold'
                          : 'bg-amber-500/15 border-amber-500/30 text-amber-400 font-bold'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-cyan-400">{CATEGORY_LABEL[finding.category]}</span>
                    {finding.resolved && (
                      <span className="text-emerald-400 font-bold">· MITIGATED</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    {finding.resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : finding.category === 'undocumented_api' ? (
                      <FileWarning className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{finding.title}</span>
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onFlagToScopeLog && (
                    <button
                      type="button"
                      onClick={() => onFlagToScopeLog(finding)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-orange-400 transition-colors"
                    >
                      Log to Scope Ledger
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setResolvedIds((prev) => ({
                        ...prev,
                        [finding.id]: !prev[finding.id],
                      }))
                    }
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition-colors ${
                      finding.resolved
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {finding.resolved ? 'Re-open' : 'Mark Verified'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 flex items-start space-x-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{finding.detectedSignal}</span>
              </p>
              <div className="text-xs text-slate-400 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
                <span className="font-mono text-teal-400">Remediation:</span>{' '}
                {finding.remediationAction}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
