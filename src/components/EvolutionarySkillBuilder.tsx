import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  GitBranch,
  Layers,
  ShieldAlert,
  Sliders,
  Terminal,
  Zap,
} from 'lucide-react';
import {
  AdaptedSkillBlueprint,
  EvolutionStatus,
  IntakeValidationThresholds,
  RequirementSpec,
  SkillEvolutionLog,
} from '../types';
import {
  buildSkillEvolutionInsertSql,
  evaluateAndAdaptSkill,
  executeIdempotentChange,
} from '../lib/governanceEngine';

interface EvolutionarySkillBuilderProps {
  evolutionLogs: SkillEvolutionLog[];
  intakeThresholds: IntakeValidationThresholds;
  adaptedBlueprint: AdaptedSkillBlueprint;
  onRecordEvaluation: (
    logEntry: SkillEvolutionLog,
    nextThresholds: IntakeValidationThresholds,
    nextBlueprint: AdaptedSkillBlueprint,
    didAutoAdapt: boolean
  ) => void;
  onUpdateLogStatus: (id: string, status: EvolutionStatus) => void;
  onShowToast: (message: string) => void;
}

export const EvolutionarySkillBuilder: React.FC<EvolutionarySkillBuilderProps> = ({
  evolutionLogs,
  intakeThresholds,
  adaptedBlueprint,
  onRecordEvaluation,
  onUpdateLogStatus,
  onShowToast,
}) => {
  const [skillName, setSkillName] = useState<string>('14-Day Pilot Audit & Data Mesh Topology');
  const [sprintType, setSprintType] = useState<'pilot_audit_14d' | 'retainer_monthly'>('pilot_audit_14d');
  const [deliveryDays, setDeliveryDays] = useState<number>(15);
  const [outOfScopeFlags, setOutOfScopeFlags] = useState<number>(3);
  const [architectVelocityScore, setArchitectVelocityScore] = useState<number>(91);
  const [rpoVerifiedMinutes, setRpoVerifiedMinutes] = useState<number>(9);
  const [clientRequirementDelta, setClientRequirementDelta] = useState<string>(
    'Client requested unscheduled multi-region KMS cross-account migration mid-sprint (flagged out_of_scope_retainer_candidate x3).'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | EvolutionStatus>('all');
  const [activeArtifactTab, setActiveArtifactTab] = useState<'prompt' | 'thresholds' | 'blueprint'>('prompt');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const willTriggerAutoAdapt =
    outOfScopeFlags > intakeThresholds.maxOutOfScopeFlagsTolerance ||
    deliveryDays > (sprintType === 'pilot_audit_14d' ? 14 : 30);

  const handleEvaluateSprint = (e: React.FormEvent) => {
    e.preventDefault();

    const { logEntry, nextThresholds, nextBlueprint, didAutoAdapt } = evaluateAndAdaptSkill(
      {
        skillName,
        sprintType,
        deliveryDays,
        outOfScopeFlags,
        architectVelocityScore,
        rpoVerifiedMinutes,
        clientRequirementDelta,
      },
      intakeThresholds,
      adaptedBlueprint
    );

    // Enforce idempotent pre-change guard before applying blueprint/threshold mutation
    const guardSpecs: RequirementSpec[] = [
      {
        id: 'EVO_ADAPTATION_TOLERANCE_GATE',
        description: 'Adapt prompt template and intake validation thresholds on breach',
        targetMetric: 'blueprintVersion',
        currentValue: adaptedBlueprint.version,
        requiredValue: didAutoAdapt ? nextBlueprint.version : adaptedBlueprint.version,
      },
    ];

    executeIdempotentChange(guardSpecs, () => {
      onRecordEvaluation(logEntry, nextThresholds, nextBlueprint, didAutoAdapt);
    });

    if (!didAutoAdapt) {
      onRecordEvaluation(logEntry, nextThresholds, nextBlueprint, false);
      onShowToast('Sprint logged within SLA tolerances (status: pending_review).');
    } else {
      onShowToast(
        `Evolution Hook Fired (${nextBlueprint.version}): Meta-prompt, Intake Thresholds & Blueprint auto-adapted!`
      );
    }
  };

  const handleCopyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      onShowToast(`${label} copied to clipboard.`);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const filteredLogs =
    statusFilter === 'all'
      ? evolutionLogs
      : evolutionLogs.filter((l) => l.evolution_status === statusFilter);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
            <Activity className="w-4 h-4 shrink-0" />
            <span>Evolutionary Skill Builder Engine · Meta-Prompt Adaptation</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5">
            Sprint Telemetry & Automated Prompt Adaptation
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Evaluates completed 14-day pilot audits and retainer sprints. Crossing 2{' '}
            <span className="font-mono text-orange-400">out_of_scope_retainer_candidate</span> flags or the 14-day window automatically adapts prompt templates, Schedule A intake rules, and component blueprints.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono text-slate-300 bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl shrink-0 tabular-nums">
          <span>Active Version:</span>
          <strong className="text-emerald-400">{adaptedBlueprint.version}</strong>
        </div>
      </div>

      {/* Main Two-Column Grid: Telemetry Evaluator Form + Live Adapted Targets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Completed Audit / Retainer Evaluator */}
        <form onSubmit={handleEvaluateSprint} className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Skill / Advisory Module Name
            </label>
            <input
              type="text"
              required
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Engagement Track
              </label>
              <select
                value={sprintType}
                onChange={(e) => setSprintType(e.target.value as 'pilot_audit_14d' | 'retainer_monthly')}
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:outline-none"
              >
                <option value="pilot_audit_14d">14-Day Pilot Audit ($3,500)</option>
                <option value="retainer_monthly">Monthly Retainer ($7,500/mo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Delivery Days (SLA: {sprintType === 'pilot_audit_14d' ? '14d' : '30d'})
              </label>
              <input
                type="number"
                min={1}
                max={45}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(Number(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1.5">
                Scope-Creep Flags
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={outOfScopeFlags}
                onChange={(e) => setOutOfScopeFlags(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono tabular-nums focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1.5">
                Architect Score
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={architectVelocityScore}
                onChange={(e) => setArchitectVelocityScore(Math.min(100, Math.max(1, Number(e.target.value) || 85)))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono tabular-nums focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-300 mb-1.5">
                Verified RPO (min)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={rpoVerifiedMinutes}
                onChange={(e) => setRpoVerifiedMinutes(Math.max(1, Number(e.target.value) || 5))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs text-white font-mono tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Client Requirement Delta
            </label>
            <textarea
              rows={2}
              value={clientRequirementDelta}
              onChange={(e) => setClientRequirementDelta(e.target.value)}
              placeholder="Summarize client scope variances or unbudgeted technical dependencies..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-orange-500 rounded-xl p-3 text-xs text-white font-mono resize-none focus:outline-none"
            />
          </div>

          {/* Tolerance Preview Indicator */}
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-start space-x-2.5 ${
              willTriggerAutoAdapt
                ? 'bg-orange-500/10 border-orange-500/40 text-orange-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {willTriggerAutoAdapt ? (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            )}
            <div className="leading-snug">
              <span className="font-bold block">
                {willTriggerAutoAdapt
                  ? 'Tolerance Exceeded — Auto-Adaptation Armed'
                  : 'Within Tolerance — Logs as pending_review'}
              </span>
              <span className="text-[11px] opacity-90">
                Threshold: &gt; {intakeThresholds.maxOutOfScopeFlagsTolerance} out_of_scope_retainer_candidate flags OR &gt; {sprintType === 'pilot_audit_14d' ? 14 : 30}d delivery.
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>Run Telemetry & Adaptation Hook</span>
          </button>
        </form>

        {/* Right: Adapted Prompt Templates, Intake Thresholds, and Blueprints */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <div>
            {/* Sub-Tab Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveArtifactTab('prompt')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeArtifactTab === 'prompt'
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Prompt Template
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArtifactTab('thresholds')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeArtifactTab === 'thresholds'
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Intake Thresholds
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArtifactTab('blueprint')}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    activeArtifactTab === 'blueprint'
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Component Blueprint
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  handleCopyText(
                    activeArtifactTab === 'prompt'
                      ? adaptedBlueprint.metaPromptTemplate
                      : activeArtifactTab === 'blueprint'
                        ? adaptedBlueprint.componentBlueprint
                        : JSON.stringify(intakeThresholds, null, 2),
                    'active-artifact',
                    'Adapted artifact'
                  )
                }
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center space-x-1.5"
              >
                {copiedId === 'active-artifact' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy</span>
              </button>
            </div>

            {/* Active Tab Body */}
            {activeArtifactTab === 'prompt' && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Adapted Meta-Prompt Template</span>
                  </span>
                  <span className="tabular-nums">Updated {new Date(adaptedBlueprint.lastAdaptedAt).toLocaleTimeString()}</span>
                </div>
                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {adaptedBlueprint.metaPromptTemplate}
                </pre>
              </div>
            )}

            {activeArtifactTab === 'thresholds' && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Min Schedule A Bottleneck Chars</span>
                    <span className="text-xl font-bold text-orange-400 tabular-nums mt-1 block">
                      {intakeThresholds.minNotesChars} chars
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Min Required Compliance Mandates</span>
                    <span className="text-xl font-bold text-cyan-400 tabular-nums mt-1 block">
                      {intakeThresholds.minComplianceMandates} framework(s)
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Scope Flag Auto-Adapt Ceiling</span>
                    <span className="text-xl font-bold text-emerald-400 tabular-nums mt-1 block">
                      &le; {intakeThresholds.maxOutOfScopeFlagsTolerance} flags
                    </span>
                  </div>
                  <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="text-slate-400 block text-[11px]">Retainer Escalation Prompt</span>
                    <span className="text-sm font-bold text-white mt-1.5 block">
                      {intakeThresholds.retainerEscalationActive ? 'ACTIVE IN INTAKE' : 'STANDBY'}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-start space-x-2">
                  <Sliders className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <span>{intakeThresholds.adaptedRuleReason}</span>
                </div>
              </div>
            )}

            {activeArtifactTab === 'blueprint' && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>Adaptive TypeScript Component Blueprint</span>
                  </span>
                  <span>{adaptedBlueprint.version}</span>
                </div>
                <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {adaptedBlueprint.componentBlueprint}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
            <span>Schedule A Intake Validator synced live with active thresholds</span>
            <span className="text-cyan-400">Target Window: {intakeThresholds.diagnosticWindowDays}d SLA</span>
          </div>
        </div>
      </div>

      {/* skill_evolution_logs History Table */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 font-bold">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span>skill_evolution_logs Ledger ({filteredLogs.length})</span>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono self-start sm:self-auto">
            {(['all', 'auto_adapted', 'pending_review', 'archived'] as const).map((statusKey) => (
              <button
                key={statusKey}
                type="button"
                onClick={() => setStatusFilter(statusKey)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  statusFilter === statusKey
                    ? 'bg-orange-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {statusKey}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-6 text-center bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400">
            No evolution logs match filter [{statusFilter}]. Evaluate a completed audit above to record telemetry.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    <span className="font-bold text-white">{log.skill_name}</span>
                    <span className="text-slate-600">·</span>
                    <span
                      className={`font-bold ${
                        log.evolution_status === 'auto_adapted'
                          ? 'text-emerald-400'
                          : log.evolution_status === 'pending_review'
                            ? 'text-amber-400'
                            : 'text-slate-500'
                      }`}
                    >
                      {log.evolution_status}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-400 tabular-nums">
                      {log.performance_metric.deliveryDays}d / {log.performance_metric.targetWindowDays}d SLA
                    </span>
                    <span className="text-slate-600">·</span>
                    <span
                      className={`tabular-nums ${
                        log.performance_metric.outOfScopeFlags > 2 ? 'text-rose-400 font-bold' : 'text-cyan-400'
                      }`}
                    >
                      {log.performance_metric.outOfScopeFlags} scope flags
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs leading-snug">{log.client_requirement_delta}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 font-mono">
                  <button
                    type="button"
                    onClick={() => handleCopyText(buildSkillEvolutionInsertSql(log), log.id, 'SQL INSERT')}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] flex items-center space-x-1"
                    title="Copy PostgreSQL INSERT statement"
                  >
                    {copiedId === log.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>SQL</span>
                  </button>

                  {log.evolution_status !== 'archived' && (
                    <button
                      type="button"
                      onClick={() => onUpdateLogStatus(log.id, 'archived')}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] flex items-center space-x-1"
                      title="Archive evolution record"
                    >
                      <Archive className="w-3 h-3" />
                      <span>Archive</span>
                    </button>
                  )}

                  {log.evolution_status === 'pending_review' && (
                    <button
                      type="button"
                      onClick={() => onUpdateLogStatus(log.id, 'auto_adapted')}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 text-[11px] flex items-center space-x-1"
                      title="Approve & mark auto_adapted"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      <span>Promote</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
