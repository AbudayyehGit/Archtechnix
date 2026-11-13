import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  GitCommit,
  Lock,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import {
  AdaptedSkillBlueprint,
  CleanupAuditReport,
  IntakeValidationThresholds,
  RequirementSpec,
  SystemSteadyState,
  VerificationResult,
} from '../types';
import {
  buildSteadyStateCheckpoint,
  buildSteadyStateInsertSql,
  runCodeCleanupAndSyntaxAudit,
  runIdempotentGate,
  SUPABASE_MIGRATION_SQL,
} from '../lib/governanceEngine';

interface GovernanceSteadyStateConsoleProps {
  requirementSpecs: RequirementSpec[];
  onUpdateSpecs: (specs: RequirementSpec[]) => void;
  steadyStates: SystemSteadyState[];
  onCommitSteadyState: (state: SystemSteadyState) => void;
  intakeThresholds: IntakeValidationThresholds;
  adaptedBlueprint: AdaptedSkillBlueprint;
  onShowToast: (message: string) => void;
}

export const GovernanceSteadyStateConsole: React.FC<GovernanceSteadyStateConsoleProps> = ({
  requirementSpecs,
  onUpdateSpecs,
  steadyStates,
  onCommitSteadyState,
  intakeThresholds,
  adaptedBlueprint,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'guard' | 'checkpoint' | 'sql'>('guard');
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [gateSummary, setGateSummary] = useState<{ executed: number; skipped: number; at: string } | null>(null);

  const [cleanupReport, setCleanupReport] = useState<CleanupAuditReport | null>(() =>
    runCodeCleanupAndSyntaxAudit(intakeThresholds, adaptedBlueprint.version)
  );
  const [checkpointLabel, setCheckpointLabel] = useState<string>(
    `steady-state-${adaptedBlueprint.version}`
  );
  const [gitCommitHash, setGitCommitHash] = useState<string>('9e41b7c2');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleToggleSpecDrift = (id: string) => {
    const updated = requirementSpecs.map((spec) => {
      if (spec.id !== id) return spec;
      if (typeof spec.requiredValue === 'boolean') {
        return { ...spec, currentValue: !spec.currentValue };
      }
      if (typeof spec.requiredValue === 'number') {
        const drifted = spec.currentValue === spec.requiredValue ? spec.requiredValue + 4 : spec.requiredValue;
        return { ...spec, currentValue: drifted };
      }
      return spec;
    });
    onUpdateSpecs(updated);
  };

  const handleExecuteIdempotentGate = () => {
    const workingSpecs = requirementSpecs.map((s) => ({ ...s }));
    const mutatedIds = new Set<string>();

    const outcome = runIdempotentGate(workingSpecs, (unmetSpec) => {
      mutatedIds.add(unmetSpec.id);
    });

    const reconciledSpecs = workingSpecs.map((s) =>
      mutatedIds.has(s.id) ? { ...s, currentValue: s.requiredValue } : s
    );

    onUpdateSpecs(reconciledSpecs);
    setVerificationResults(outcome.results);
    setGateSummary({
      executed: outcome.executedCount,
      skipped: outcome.skippedCount,
      at: outcome.executedAt,
    });

    onShowToast(
      `Idempotent Gate Complete: ${outcome.executedCount} remediated, ${outcome.skippedCount} skipped.`
    );
  };

  const handleRunCleanupAudit = () => {
    const report = runCodeCleanupAndSyntaxAudit(intakeThresholds, adaptedBlueprint.version);
    setCleanupReport(report);
    onShowToast(
      report.overallClean
        ? 'Cleanup & strict syntax audit passed (0 dead imports, 0 orphaned CSS, valid SQL).'
        : 'Cleanup audit flagged items requiring review.'
    );
  };

  const handleCommitCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const report = cleanupReport || runCodeCleanupAndSyntaxAudit(intakeThresholds, adaptedBlueprint.version);
    setCleanupReport(report);

    const newCheckpoint = buildSteadyStateCheckpoint(
      checkpointLabel,
      gitCommitHash,
      report,
      intakeThresholds,
      adaptedBlueprint
    );

    onCommitSteadyState(newCheckpoint);
    setGitCommitHash(Math.random().toString(16).substring(2, 10));
    onShowToast(`Steady-state marker [${newCheckpoint.checkpoint_label}] committed to system_steady_states.`);
  };

  const handleCopy = (content: string, key: string, message: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedKey(key);
      onShowToast(message);
      setTimeout(() => setCopiedKey(null), 1800);
    });
  };

  const handleDownloadSql = () => {
    const latestInsert = steadyStates[0] ? `\n\n-- Latest Steady-State Marker\n${buildSteadyStateInsertSql(steadyStates[0])}` : '';
    const blob = new Blob([`${SUPABASE_MIGRATION_SQL}${latestInsert}\n`], {
      type: 'application/sql;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '20261112_archtechnix_governance_extensions.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Supabase PostgreSQL migration (.sql) downloaded!');
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-orange-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Idempotent Pre-Change Gate · Steady-State & RLS Console</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1.5">
            Governance Verification & Supabase Extensions
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Validate requirement invariants before executing mutations, run post-sprint cleanup checks, commit steady-state checkpoints, and export admin-architect RLS migrations.
          </p>
        </div>

        {/* Segmented Control Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono self-start lg:self-auto overflow-x-auto whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('guard')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'guard'
                ? 'bg-orange-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Idempotent Guard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('checkpoint')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'checkpoint'
                ? 'bg-orange-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Cleanup & Checkpoint
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'sql'
                ? 'bg-orange-500 text-white font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Supabase SQL & RLS
          </button>
        </div>
      </div>

      {/* TAB 1: IDEMPOTENT REQUIREMENT VERIFICATION GUARD */}
      {activeTab === 'guard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-300 font-bold">
                Pre-Change RequirementSpecs ({requirementSpecs.length})
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Toggle drift on any spec to test idempotent skip vs. execution
              </span>
            </div>

            <div className="space-y-2.5">
              {requirementSpecs.map((spec) => {
                const isMet = spec.currentValue === spec.requiredValue;
                return (
                  <div
                    key={spec.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-white">{spec.id}</span>
                        <span className="text-slate-600">·</span>
                        <span className={isMet ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {isMet ? 'TARGET MET' : 'DRIFT DETECTED'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{spec.description}</p>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        Current: <span className="text-white">{String(spec.currentValue)}</span> · Target:{' '}
                        <span className="text-cyan-400">{String(spec.requiredValue)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSpecDrift(spec.id)}
                      className="min-h-[40px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 shrink-0 transition-colors"
                    >
                      {isMet ? 'Simulate Drift' : 'Reset Target'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
                  <Terminal className="w-4 h-4 shrink-0" />
                  <span>executeIdempotentChange() Output</span>
                </div>
                {gateSummary && (
                  <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {gateSummary.executed} applied · {gateSummary.skipped} skipped
                  </span>
                )}
              </div>

              {verificationResults.length === 0 ? (
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 leading-relaxed">
                  Click "Run Pre-Change Verification Gate" below to evaluate all RequirementSpec invariants via{' '}
                  <code className="text-cyan-400">verifyRequirementMet()</code> before committing modifications.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 font-mono text-[11px]">
                  {verificationResults.map((res) => (
                    <div
                      key={res.requirementId}
                      className={`p-3 rounded-xl border leading-relaxed flex items-start space-x-2 ${
                        res.isMet
                          ? 'bg-slate-900 border-slate-800 text-slate-300'
                          : 'bg-orange-500/10 border-orange-500/40 text-orange-200'
                      }`}
                    >
                      {res.isMet ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Play className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      )}
                      <span>{res.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExecuteIdempotentGate}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <Play className="w-4 h-4 shrink-0" />
              <span>Run Pre-Change Verification Gate</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: CODE CLEANUP & STEADY-STATE CHECKPOINTING */}
      {activeTab === 'checkpoint' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cleanup Audit Summary */}
          <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Post-Execution Cleanup & Syntax Audit</span>
              </div>
              <button
                type="button"
                onClick={handleRunCleanupAudit}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Run Audit</span>
              </button>
            </div>

            {cleanupReport && (
              <div className="space-y-2.5">
                {cleanupReport.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-start space-x-2.5 text-xs"
                  >
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-white">{item.label}</div>
                      <p className="text-slate-400 text-[11px] mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Establish Steady-State Checkpoint Form & Ledger */}
          <div className="lg:col-span-6 space-y-4">
            <form
              onSubmit={handleCommitCheckpoint}
              className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold pb-2 border-b border-slate-800">
                <GitCommit className="w-4 h-4 shrink-0" />
                <span>Write Steady-State Marker (system_steady_states)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    checkpoint_label
                  </label>
                  <input
                    type="text"
                    required
                    value={checkpointLabel}
                    onChange={(e) => setCheckpointLabel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    git_commit_hash
                  </label>
                  <input
                    type="text"
                    required
                    value={gitCommitHash}
                    onChange={(e) => setGitCommitHash(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
              >
                <Database className="w-4 h-4 shrink-0" />
                <span>Commit Steady-State Checkpoint</span>
              </button>
            </form>

            {/* Checkpoint History */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="text-xs font-mono text-slate-300 font-bold">
                Established Steady States ({steadyStates.length})
              </div>
              <div className="space-y-2 max-h-[210px] overflow-y-auto pr-1">
                {steadyStates.map((ss) => (
                  <div
                    key={ss.id}
                    className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">{ss.checkpoint_label}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums mt-0.5">
                        sha:{ss.git_commit_hash} · {new Date(ss.established_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          buildSteadyStateInsertSql(ss),
                          ss.id,
                          'Steady-state SQL INSERT copied.'
                        )
                      }
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-[11px] flex items-center space-x-1 shrink-0"
                    >
                      {copiedKey === ss.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>SQL</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPABASE POSTGRESQL MIGRATION & RLS POLICIES */}
      {activeTab === 'sql' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 font-bold">
              <Lock className="w-4 h-4 shrink-0 text-orange-400" />
              <span>Supabase PostgreSQL Migration & admin_architect RLS Policies</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    SUPABASE_MIGRATION_SQL,
                    'full-sql',
                    'Full Supabase PostgreSQL migration copied!'
                  )
                }
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 flex items-center space-x-1.5"
              >
                {copiedKey === 'full-sql' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy Migration SQL</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadSql}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .sql</span>
              </button>
            </div>
          </div>

          <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-[380px] leading-relaxed select-all">
            {SUPABASE_MIGRATION_SQL}
          </pre>
        </div>
      )}
    </div>
  );
};
