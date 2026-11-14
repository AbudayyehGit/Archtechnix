import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  Copy,
  Database,
  Download,
  FileCode2,
  GitBranch,
  Layers,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type {
  AuditSynthesisResult,
  NormalizedPipelineResult,
  SystemSteadyState,
  Tier1IntakeParams,
} from '../types';
import {
  TELEMETRY_PRESETS,
  type TelemetryPreset,
  runUnifiedPipelineNormalization,
} from '../lib/pipelineEngine';
import { MarkdownViewer } from './MarkdownViewer';

interface AuditSynthesisPipelineProps {
  defaultRepo: string;
  onShowToast: (msg: string) => void;
  onCommitSteadyState?: (state: SystemSteadyState) => void;
}

type PipelineSubTab = 'intake' | 'topology' | 'report' | 'python';

export const AuditSynthesisPipeline: React.FC<AuditSynthesisPipelineProps> = ({
  defaultRepo,
  onShowToast,
  onCommitSteadyState,
}) => {
  const [activeTab, setActiveTab] = useState<PipelineSubTab>('intake');
  const [selectedPresetId, setSelectedPresetId] = useState<TelemetryPreset['id']>('fintech_spof');

  const activePreset =
    TELEMETRY_PRESETS.find((p) => p.id === selectedPresetId) || TELEMETRY_PRESETS[0];

  const [tier1, setTier1] = useState<Tier1IntakeParams>({
    iamRoleArn: 'arn:aws:iam::123456789012:role/ArchitechnixReadOnlyAudit',
    externalId: 'ext-apex-2026-ro',
    repoUrl: defaultRepo || 'https://github.com/apex-fintech/core-mesh',
    gitTokenRef: 'ghp_ephemeral_scoped_token_v22',
    targetDomain: 'api.apexfintech.io',
    apiBaseUrl: 'https://api.apexfintech.io/v2',
    ownershipAuthorized: true,
    targetRpoMinutes: 15,
    targetRtoMinutes: 60,
    frameworks: ['ISO/IEC 27001', 'SOC 2 Type II', 'NIST SP 800-207'],
  });

  const [pipelineState, setPipelineState] = useState<{
    telemetryComplete: boolean;
    normalized: boolean;
  }>({
    telemetryComplete: false,
    normalized: false,
  });

  const [normalizedResult, setNormalizedResult] = useState<NormalizedPipelineResult | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<AuditSynthesisResult | null>(null);
  const [runningAction, setRunningAction] = useState<'none' | 'normalize' | 'synthesize'>('none');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const [qaChecks, setQaChecks] = useState({
    rpoVerified: false,
    credentialsPurged: false,
    loomReady: false,
  });

  const [pythonEngineSource, setPythonEngineSource] = useState<string>('');
  const [loadingPython, setLoadingPython] = useState<boolean>(false);

  // Run initial deterministic preview cleanly on mount or preset change
  useEffect(() => {
    const initial = runUnifiedPipelineNormalization({
      tier1,
      inventory: activePreset.inventory,
      telemetry: activePreset.telemetry,
      pipelineState: { telemetryComplete: false, normalized: false },
    });
    setNormalizedResult(initial);
  }, [selectedPresetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadPythonEngine = async () => {
    setActiveTab('python');
    if (pythonEngineSource) return;
    setLoadingPython(true);
    try {
      const res = await fetch('/api/pipeline/python-engine');
      const data = await res.json();
      if (res.ok && data.source) {
        setPythonEngineSource(data.source);
      } else {
        onShowToast(data.error || 'Unable to load architechnix_engine.py');
      }
    } catch {
      onShowToast('Network error loading Python reference engine.');
    } finally {
      setLoadingPython(false);
    }
  };

  const handlePurgeCredentials = () => {
    const res = runUnifiedPipelineNormalization({
      tier1,
      inventory: activePreset.inventory,
      telemetry: activePreset.telemetry,
      pipelineState: { ...pipelineState, forceRerun: true },
    });
    setTier1((prev) => ({
      ...prev,
      iamRoleArn: res.credentialHygiene.maskedIamArn,
      externalId: res.credentialHygiene.maskedExternalId,
      gitTokenRef: res.credentialHygiene.maskedGitToken,
    }));
    setQaChecks((prev) => ({ ...prev, credentialsPurged: true }));
    onShowToast('Ephemeral IAM Role External ID & Git PAT purged into SHA-256 digests.');
  };

  const handleRunNormalization = async (forceRerun = false) => {
    setRunningAction('normalize');
    setErrorBanner(null);
    try {
      const response = await fetch('/api/pipeline/normalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier1,
          inventory: activePreset.inventory,
          telemetry: activePreset.telemetry,
          pipelineState: { ...pipelineState, forceRerun },
        }),
      });
      const data = (await response.json()) as NormalizedPipelineResult;
      if (!response.ok) {
        setErrorBanner(
          data.validationErrors?.join(' ') || 'Tier 1 validation blocked normalization.'
        );
        setNormalizedResult(data);
        return;
      }
      setNormalizedResult(data);
      setPipelineState({ telemetryComplete: true, normalized: true });
      setActiveTab('topology');
      onShowToast(
        pipelineState.normalized && !forceRerun
          ? 'Idempotent Gate: [SKIPPED - PREVIOUSLY FULFILLED] verified.'
          : `Normalized ${data.normalizedFindings.length} findings (${data.duplicatesMerged} duplicates merged).`
      );
    } catch {
      onShowToast('Pipeline normalization request failed.');
    } finally {
      setRunningAction('none');
    }
  };

  const handleRunSynthesis = async (forceRerun = false) => {
    setRunningAction('synthesize');
    setErrorBanner(null);
    try {
      const response = await fetch('/api/pipeline/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier1,
          inventory: activePreset.inventory,
          telemetry: activePreset.telemetry,
          pipelineState: { ...pipelineState, forceRerun },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setErrorBanner(data.error || 'Synthesis blocked by Tier 1 validation.');
        if (data.normalized) setNormalizedResult(data.normalized);
        return;
      }
      setNormalizedResult(data.normalized);
      setSynthesisResult(data.synthesis);
      setPipelineState({ telemetryComplete: true, normalized: true });
      setQaChecks((prev) => ({ ...prev, credentialsPurged: true }));
      setActiveTab('report');
      onShowToast(`Audit synthesized via ${data.synthesis.modelUsed}.`);
    } catch {
      onShowToast('Failed to invoke synthesis pipeline.');
    } finally {
      setRunningAction('none');
    }
  };

  const handleToggleFramework = (
    fw: 'ISO/IEC 27001' | 'SOC 2 Type II' | 'NIST SP 800-207'
  ) => {
    setTier1((prev) => {
      const exists = prev.frameworks.includes(fw);
      const next = exists ? prev.frameworks.filter((f) => f !== fw) : [...prev.frameworks, fw];
      return { ...prev, frameworks: next };
    });
    setPipelineState({ telemetryComplete: false, normalized: false });
  };

  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      onShowToast(`${label} copied to clipboard.`);
    });
  };

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast(`Downloaded ${filename}`);
  };

  const allQaSigned = qaChecks.rpoVerified && qaChecks.credentialsPurged && qaChecks.loomReady;

  const handleLockSteadyState = () => {
    if (!allQaSigned) {
      onShowToast('Complete all 3 Human-in-the-Loop QA checks before locking steady state.');
      return;
    }
    const checkpoint: SystemSteadyState = {
      id: `ss-${Date.now().toString(36)}`,
      checkpoint_label: `pilot-audit-${tier1.targetDomain}-v2.2`,
      git_commit_hash: Math.random().toString(16).slice(2, 10),
      snapshot_metadata: {
        status: 'STEADY_STATE_REACHED',
        targetDomain: tier1.targetDomain,
        modelUsed: synthesisResult?.modelUsed || 'deterministic',
        ephemeralCredentialsPurged: true,
        criticalFindings: normalizedResult?.severityCounts.critical ?? 0,
      },
      established_at: new Date().toISOString(),
    };
    onCommitSteadyState?.(checkpoint);
    onShowToast('STATUS: STEADY_STATE_REACHED committed to system_steady_states.');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header & Conditional Pre-Check Gate Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="uppercase tracking-wider font-bold text-orange-400">
              v2.2 Three-Tier Automated Synthesis Pipeline
            </span>
            <span className="text-slate-600">·</span>
            <span
              className={`font-semibold ${
                pipelineState.normalized ? 'text-emerald-400' : 'text-cyan-400'
              }`}
            >
              {pipelineState.normalized
                ? '[IDEMPOTENT GATE: TELEMETRY VERIFIED]'
                : '[GATE READY: AWAITING RUN]'}
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white">
            CSPM / IaC Ingestion, Mermaid Topology &amp; Two-Pass Audit Synthesizer
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Enforces idempotent pre-check guards, scrubs ephemeral IAM/PAT secrets, deduplicates Prowler, Checkov, Gitleaks, Nuclei &amp; Cloud CLI DB telemetry, and builds auditor-ready `.md` deliverables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => handleRunNormalization(false)}
            disabled={runningAction !== 'none'}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-cyan-300 font-mono text-xs font-bold flex items-center space-x-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              {runningAction === 'normalize'
                ? 'Normalizing...'
                : pipelineState.normalized
                ? 'Check Idempotent Gate'
                : 'Normalize & Build Topology'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleRunSynthesis(true)}
            disabled={runningAction !== 'none'}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center space-x-2 shadow-lg transition-colors disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>
              {runningAction === 'synthesize'
                ? 'Synthesizing Passes 1 & 2...'
                : 'Synthesize .MD Report'}
            </span>
          </button>
        </div>
      </div>

      {/* Validation / API Diagnostic Banner */}
      {errorBanner && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-mono font-bold">Tier 1 Scope / Credential Gate Rejection</div>
            <p className="mt-0.5">{errorBanner}</p>
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
        {(
          [
            { id: 'intake', label: '1. Tier 1 Intake & Tier 2 Scanners', icon: Layers },
            { id: 'topology', label: '2. Deduplication & Mermaid graph TD', icon: GitBranch },
            { id: 'report', label: '3. Two-Pass .MD Report & QA Gate', icon: ClipboardCheck },
            { id: 'python', label: '4. Python Engine (architechnix_engine.py)', icon: Code2 },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                tab.id === 'python' ? handleLoadPythonEngine() : setActiveTab(tab.id)
              }
              className={`min-h-[38px] px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors ${
                active
                  ? 'bg-orange-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TIER 1 INTAKE + TIER 2 SCANNER PAYLOADS */}
      {activeTab === 'intake' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Tier 1 Form */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Tier 1 · Ephemeral Access &amp; DR SLA Schema</span>
              </div>
              <button
                type="button"
                onClick={handlePurgeCredentials}
                className="text-[11px] font-mono text-rose-400 hover:text-rose-300 flex items-center space-x-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Purge Ephemeral Tokens</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Read-Only Cloud CSPM IAM Role ARN (Zero Root Keys)
                </label>
                <input
                  type="text"
                  value={tier1.iamRoleArn}
                  onChange={(e) => {
                    setTier1((prev) => ({ ...prev, iamRoleArn: e.target.value }));
                    setPipelineState({ telemetryComplete: false, normalized: false });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Cross-Account External ID
                  </label>
                  <input
                    type="text"
                    value={tier1.externalId}
                    onChange={(e) => {
                      setTier1((prev) => ({ ...prev, externalId: e.target.value }));
                      setPipelineState({ telemetryComplete: false, normalized: false });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Scoped GitHub App / PAT Ref
                  </label>
                  <input
                    type="text"
                    value={tier1.gitTokenRef}
                    onChange={(e) => {
                      setTier1((prev) => ({ ...prev, gitTokenRef: e.target.value }));
                      setPipelineState({ telemetryComplete: false, normalized: false });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Source &amp; IaC Repository URL
                  </label>
                  <input
                    type="url"
                    value={tier1.repoUrl}
                    onChange={(e) =>
                      setTier1((prev) => ({ ...prev, repoUrl: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    External Perimeter Domain
                  </label>
                  <input
                    type="text"
                    value={tier1.targetDomain}
                    onChange={(e) =>
                      setTier1((prev) => ({ ...prev, targetDomain: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-start space-x-2.5 p-3 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={tier1.ownershipAuthorized}
                  onChange={(e) =>
                    setTier1((prev) => ({
                      ...prev,
                      ownershipAuthorized: e.target.checked,
                    }))
                  }
                  className="mt-0.5 rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-0"
                />
                <span>
                  I attest client legal ownership and written authorization to run read-only Nuclei &amp; CSPM probes against{' '}
                  <strong className="text-white">{tier1.targetDomain}</strong>.
                </span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Target RPO SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={tier1.targetRpoMinutes}
                    onChange={(e) =>
                      setTier1((prev) => ({
                        ...prev,
                        targetRpoMinutes: Math.max(1, Number(e.target.value) || 15),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Target RTO SLA (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={tier1.targetRtoMinutes}
                    onChange={(e) =>
                      setTier1((prev) => ({
                        ...prev,
                        targetRtoMinutes: Math.max(1, Number(e.target.value) || 60),
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums"
                  />
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-slate-400 mb-1.5">
                  Target Compliance Baselines
                </div>
                <div className="flex flex-wrap gap-2">
                  {(['ISO/IEC 27001', 'SOC 2 Type II', 'NIST SP 800-207'] as const).map((fw) => {
                    const active = tier1.frameworks.includes(fw);
                    return (
                      <button
                        key={fw}
                        type="button"
                        onClick={() => handleToggleFramework(fw)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                          active
                            ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {fw}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tier 2 Ephemeral CLI Worker Telemetry */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-orange-400 flex items-center space-x-2">
                <Database className="w-3.5 h-3.5" />
                <span>Tier 2 · Ephemeral CLI Worker Telemetry</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">5 CLI Sources</span>
            </div>

            <div className="space-y-2">
              {TELEMETRY_PRESETS.map((preset) => {
                const selected = preset.id === selectedPresetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setSelectedPresetId(preset.id);
                      setPipelineState({ telemetryComplete: false, normalized: false });
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                      selected
                        ? 'bg-slate-900 border-orange-500 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{preset.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{preset.description}</div>
                  </button>
                );
              })}
            </div>

            <div className="border border-slate-800 rounded-xl bg-slate-900 p-3.5 space-y-2 text-[11px] font-mono">
              <div className="text-slate-400 uppercase font-bold">
                Containerized Scanner Commands Executed
              </div>
              <div className="text-cyan-300">
                1. prowler aws --role {normalizedResult?.credentialHygiene.maskedIamArn || '<ARN>'} -M json-ocsf ({activePreset.telemetry.prowler.length} events)
              </div>
              <div className="text-cyan-300">
                2. checkov -d /tmp/repo -o json ({activePreset.telemetry.checkov.length} events)
              </div>
              <div className="text-cyan-300">
                3. gitleaks detect --source /tmp/repo -f json ({activePreset.telemetry.gitleaks.length} events)
              </div>
              <div className="text-cyan-300">
                4. nuclei -u {tier1.apiBaseUrl} -jsonl ({activePreset.telemetry.nuclei.length} events)
              </div>
              <div className="text-cyan-300">
                5. cloud-cli rds/sql replication-lag &amp; pitr dump ({activePreset.telemetry.cloudCliDb.length} cluster)
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 max-h-48 overflow-y-auto">
              <pre className="text-[11px] font-mono text-slate-300 whitespace-pre-wrap">
                {JSON.stringify(activePreset.telemetry, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEDUPLICATION, COMPLIANCE MATRIX & MERMAID GRAPH TD */}
      {activeTab === 'topology' && normalizedResult && (
        <div className="space-y-6">
          {/* Gate Log */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {normalizedResult.gateStages.map((stage) => (
              <div
                key={stage.stage}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="text-slate-300 font-bold truncate">{stage.stage}</span>
                  <span
                    className={`px-2 py-0.5 rounded border shrink-0 ${
                      stage.status === 'SKIPPED - PREVIOUSLY FULFILLED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : stage.status === 'BLOCKED'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{stage.detail}</p>
              </div>
            ))}
          </div>

          {/* Deduplicated Findings & Mermaid Graph */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  Normalized &amp; Deduplicated Findings ({normalizedResult.normalizedFindings.length})
                </h4>
                <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                  {normalizedResult.duplicatesMerged} merged · {normalizedResult.noiseStrippedCount} INFO stripped
                </span>
              </div>

              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
                {normalizedResult.normalizedFindings.map((f) => (
                  <div key={f.canonicalKey} className="p-4 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                      <span
                        className={`px-2 py-0.5 rounded border uppercase font-bold ${
                          f.severity === 'critical'
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                            : f.severity === 'high'
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span className="text-slate-400">
                        Tools: {f.detectedBy.join(' + ')}
                      </span>
                      <span className="text-teal-400">{f.frameworks.join(' · ')}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{f.title}</div>
                    <div className="text-[11px] font-mono text-slate-400">{f.resource}</div>
                    <div className="text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                      {f.remediationCli}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mermaid graph TD Visual + Code */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  Asset Topology (Mermaid.js graph TD)
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(normalizedResult.mermaidTopology, 'Mermaid graph TD')
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Mermaid</span>
                </button>
              </div>

              {/* Clean SVG Architecture Topology Map */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <svg
                  viewBox="0 0 560 220"
                  role="img"
                  aria-label="Normalized Cloud Asset Topology"
                  className="w-full h-auto"
                >
                  <rect x="12" y="18" width="130" height="44" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="77" y="37" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                    External Clients
                  </text>
                  <text x="77" y="51" textAnchor="middle" fill="#38bdf8" fontSize="9" fontFamily="monospace">
                    {tier1.targetDomain}
                  </text>

                  <line x1="142" y1="40" x2="188" y2="40" stroke="#94a3b8" strokeWidth="1.5" />

                  <rect x="188" y="18" width="150" height="44" rx="8" fill="#0f172a" stroke="#f97316" strokeWidth="1.5" />
                  <text x="263" y="37" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                    ALB / Edge WAF
                  </text>
                  <text x="263" y="51" textAnchor="middle" fill="#fb923c" fontSize="9" fontFamily="monospace">
                    {normalizedResult.inventorySnapshot.loadBalancers[0] || 'alb-edge'}
                  </text>

                  <line x1="263" y1="62" x2="263" y2="96" stroke="#94a3b8" strokeWidth="1.5" />

                  <rect x="168" y="96" width="190" height="44" rx="8" fill="#0f172a" stroke="#14b8a6" strokeWidth="1.5" />
                  <text x="263" y="115" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                    VPC Mesh ({normalizedResult.inventorySnapshot.vpcs[0]})
                  </text>
                  <text x="263" y="129" textAnchor="middle" fill="#2dd4bf" fontSize="9" fontFamily="monospace">
                    {normalizedResult.inventorySnapshot.services[0] || 'eks-core-mesh'}
                  </text>

                  <line x1="263" y1="140" x2="263" y2="164" stroke="#94a3b8" strokeWidth="1.5" />

                  <rect x="168" y="164" width="190" height="42" rx="8" fill="#0f172a" stroke="#8b5cf6" strokeWidth="1.5" />
                  <text x="263" y="183" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                    Primary DB
                  </text>
                  <text x="263" y="197" textAnchor="middle" fill="#a78bfa" fontSize="9" fontFamily="monospace">
                    {normalizedResult.inventorySnapshot.databases[0] || 'aurora-primary'}
                  </text>

                  <line x1="358" y1="185" x2="395" y2="185" stroke={normalizedResult.inventorySnapshot.replicas.length > 0 ? '#10b981' : '#f43f5e'} strokeWidth="1.5" strokeDasharray="4 3" />

                  <rect
                    x="395"
                    y="164"
                    width="152"
                    height="42"
                    rx="8"
                    fill="#0f172a"
                    stroke={normalizedResult.inventorySnapshot.replicas.length > 0 ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.5"
                  />
                  <text x="471" y="183" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                    {normalizedResult.inventorySnapshot.replicas.length > 0 ? 'DR Replica' : 'SPOF Alert'}
                  </text>
                  <text
                    x="471"
                    y="197"
                    textAnchor="middle"
                    fill={normalizedResult.inventorySnapshot.replicas.length > 0 ? '#34d399' : '#fb7185'}
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {normalizedResult.inventorySnapshot.replicas[0] || 'No DR Replica'}
                  </text>
                </svg>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                {normalizedResult.mermaidTopology}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TWO-PASS .MD AUDIT REPORT & HUMAN-IN-THE-LOOP QA GATE */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {!synthesisResult ? (
            <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <FileCode2 className="w-8 h-8 text-orange-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">
                Two-Pass Synthesis Ready to Execute
              </h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                Click "Synthesize .MD Report" above to run Pass 1 (Executive Risk &amp; DR Analysis) and Pass 2 (Prioritized Terraform/CLI Roadmap) with automatic Gemini 2.5 Pro to Flash fallback.
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="text-emerald-400 font-bold">
                      {synthesisResult.statusBanner}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-cyan-400">
                      Model: {synthesisResult.modelUsed}
                    </span>
                  </div>
                  {synthesisResult.diagnosticNotice && (
                    <p className="text-[11px] text-amber-300">
                      {synthesisResult.diagnosticNotice}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyText(
                        synthesisResult.fullMarkdownReport,
                        'Pilot Audit Markdown Report'
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center space-x-1.5"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy .MD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile(
                        synthesisResult.fullMarkdownReport,
                        `architechnix-pilot-audit-${tier1.targetDomain}.md`,
                        'text/markdown;charset=utf-8'
                      )
                    }
                    className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-mono font-bold text-white flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .MD Report</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl p-5 max-h-[620px] overflow-y-auto">
                  <MarkdownViewer markdown={synthesisResult.fullMarkdownReport} />
                </div>

                {/* Human-in-the-Loop QA Gate */}
                <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      Human-in-the-Loop QA Gate
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Sign off internal verification before recording the 15-minute Loom briefing and locking steady-state in PostgreSQL.
                  </p>

                  <div className="space-y-2.5 text-xs text-slate-200">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qaChecks.rpoVerified}
                        onChange={(e) =>
                          setQaChecks((prev) => ({
                            ...prev,
                            rpoVerified: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span>
                        RPO/RTO SLA timings cross-checked against Cloud CLI dump (&lt;{' '}
                        {tier1.targetRpoMinutes}m RPO).
                      </span>
                    </label>
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qaChecks.credentialsPurged}
                        onChange={(e) =>
                          setQaChecks((prev) => ({
                            ...prev,
                            credentialsPurged: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span>
                        Ephemeral IAM External ID &amp; Git PAT scrubbed (SHA-256 digest only).
                      </span>
                    </label>
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={qaChecks.loomReady}
                        onChange={(e) =>
                          setQaChecks((prev) => ({
                            ...prev,
                            loomReady: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span>
                        15-minute Loom executive walkthrough script verified.
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleLockSteadyState}
                    disabled={!allQaSigned}
                    className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                      allQaSigned
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit STEADY_STATE_REACHED</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 4: PYTHON REFERENCE ENGINE */}
      {activeTab === 'python' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">
                architechnix_engine.py · Production Python Execution Engine
              </h4>
              <p className="text-xs text-slate-400">
                Implements `ArchitechnixResilientEngine`, `evaluate_pre_check_gate`, deterministic CLI deduplication, `graph TD` topology builder, and `gemini-2.5-pro` &rarr; `gemini-2.5-flash` 401/403/429 fallback.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyText(pythonEngineSource, 'architechnix_engine.py')
                }
                disabled={!pythonEngineSource}
                className="px-3 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300 flex items-center space-x-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Python</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDownloadFile(
                    pythonEngineSource,
                    'architechnix_engine.py',
                    'text/x-python;charset=utf-8'
                  )
                }
                disabled={!pythonEngineSource}
                className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-mono font-bold text-white flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .PY</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[540px] overflow-y-auto">
            {loadingPython ? (
              <p className="text-xs font-mono text-slate-400">Loading architechnix_engine.py...</p>
            ) : (
              <pre className="text-[11px] font-mono text-slate-200 whitespace-pre leading-relaxed">
                {pythonEngineSource || 'Click tab to load Python reference engine.'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
