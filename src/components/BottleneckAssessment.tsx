import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { useAuth, type CapacitySummary } from '../contexts/AuthContext';
import { offlineDb } from '../lib/offlineDb';

interface BottleneckQuestion {
  id: string;
  title: string;
  dimension: string;
  options: Array<{
    value: string;
    label: string;
    scoreImpact: number;
    gapFlag?: string;
  }>;
}

const QUESTIONS: BottleneckQuestion[] = [
  {
    id: 'infra_topology',
    title: '1. How is your core production infrastructure currently orchestrated?',
    dimension: 'Infrastructure & Multi-Region',
    options: [
      {
        value: 'iac_multi_region',
        label: 'Modular Terraform / OpenTofu across isolated multi-region accounts',
        scoreImpact: 20,
      },
      {
        value: 'partial_iac',
        label: 'Partial Terraform mixed with manual console / ClickOps changes',
        scoreImpact: 10,
        gapFlag: 'Terraform state drift & uncodified manual IAM changes',
      },
      {
        value: 'monolith_manual',
        label: 'Single-region cluster or legacy VMs without full IaC reproducibility',
        scoreImpact: 3,
        gapFlag: 'Single-region SPOF & non-reproducible infrastructure topology',
      },
    ],
  },
  {
    id: 'rpo_rto',
    title: '2. What is your verified database RPO/RTO under a full regional outage?',
    dimension: 'Disaster Recovery (RPO/RTO)',
    options: [
      {
        value: 'sub_15m_tested',
        label: 'Sub-15 minute RPO/RTO verified quarterly with chaos drills',
        scoreImpact: 20,
      },
      {
        value: 'untested_replicas',
        label: 'Cross-region read replicas exist, but failover has never been timed',
        scoreImpact: 9,
        gapFlag: 'Unverified failover RTO latency (>15m recovery risk)',
      },
      {
        value: 'daily_snapshots',
        label: 'Daily or 4-hour snapshots only; no continuous WAL shipping',
        scoreImpact: 2,
        gapFlag: 'Critical RPO exposure (>4h potential data loss during region failure)',
      },
    ],
  },
  {
    id: 'compliance_automation',
    title: '3. How are SOC 2 Type II, ISO 27001, and GDPR erasure controls enforced?',
    dimension: 'Automated Compliance',
    options: [
      {
        value: 'opa_shredding',
        label: 'OPA Rego pre-commit gates + per-tenant DEK cryptographic shredding',
        scoreImpact: 20,
      },
      {
        value: 'manual_audits',
        label: 'Quarterly spreadsheet evidence collection & manual PR checklists',
        scoreImpact: 9,
        gapFlag: 'Manual compliance drift across PRs without Policy-as-Code gates',
      },
      {
        value: 'reactive',
        label: 'Ad-hoc security reviews; immutable backups lack tenant key shredding',
        scoreImpact: 3,
        gapFlag: 'GDPR Art. 17 immutable archive conflict & missing OPA Rego gates',
      },
    ],
  },
  {
    id: 'cicd_identity',
    title: '4. How do CI/CD pipelines authenticate to cloud production environments?',
    dimension: 'Zero Trust & DevSecOps',
    options: [
      {
        value: 'ephemeral_oidc',
        label: '100% ephemeral OIDC tokens (<= 15m TTL) with non-root runners',
        scoreImpact: 20,
      },
      {
        value: 'rotated_secrets',
        label: 'Long-lived service account tokens rotated every 90 days',
        scoreImpact: 10,
        gapFlag: 'Standing CI/CD credentials violate NIST SP 800-207 Zero Trust',
      },
      {
        value: 'static_keys',
        label: 'Static IAM keys / shared secrets stored across repository variables',
        scoreImpact: 2,
        gapFlag: 'Critical static credential lateral-movement exposure',
      },
    ],
  },
  {
    id: 'legacy_migration',
    title: '5. What is your primary data mesh or legacy migration bottleneck?',
    dimension: 'Legacy Migration & Mesh',
    options: [
      {
        value: 'domain_contracts',
        label: 'Domain event contracts active; scaling federated governance',
        scoreImpact: 20,
      },
      {
        value: 'coupled_reads',
        label: 'Analytical jobs query production OLTP replicas directly',
        scoreImpact: 9,
        gapFlag: 'Tightly coupled OLTP/OLAP reads threatening production latency',
      },
      {
        value: 'monolith_etl',
        label: 'Brittle nightly ETL scripts breaking during schema evolution',
        scoreImpact: 3,
        gapFlag: 'Fragile ETL pipelines blocking zero-downtime legacy decomposition',
      },
    ],
  },
];

interface BottleneckAssessmentProps {
  organizationName: string;
  capacity: CapacitySummary;
  onLaunchPilotCheckout: () => void;
  onSyncFindingsToIntake: (summaryNotes: string, recommendedTier: 'diagnostic' | 'retainer') => void;
  onShowToast: (msg: string) => void;
  isCheckingOut?: boolean;
}

export const BottleneckAssessment: React.FC<BottleneckAssessmentProps> = ({
  organizationName,
  capacity,
  onLaunchPilotCheckout,
  onSyncFindingsToIntake,
  onShowToast,
  isCheckingOut = false,
}) => {
  const { idToken } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({
    infra_topology: 'partial_iac',
    rpo_rto: 'untested_replicas',
    compliance_automation: 'manual_audits',
    cicd_identity: 'rotated_secrets',
    legacy_migration: 'coupled_reads',
  });
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const evaluation = useMemo(() => {
    let totalScore = 0;
    const gaps: string[] = [];

    QUESTIONS.forEach((q) => {
      const selectedVal = answers[q.id];
      const opt = q.options.find((o) => o.value === selectedVal);
      if (opt) {
        totalScore += opt.scoreImpact;
        if (opt.gapFlag) {
          gaps.push(opt.gapFlag);
        }
      }
    });

    const recommendedTier: 'diagnostic' | 'retainer' =
      totalScore < 70 ? 'diagnostic' : 'retainer';

    return {
      score: totalScore,
      gaps,
      recommendedTier,
      answeredCount: Object.keys(answers).length,
      postureLabel:
        totalScore >= 80
          ? 'Resilient (Ready for Continuous Retainer Governance)'
          : totalScore >= 50
          ? 'Moderate Exposure (14-Day Pilot Audit Recommended)'
          : 'High RPO/Compliance Risk (Immediate Pilot Audit Sprint Required)',
    };
  }, [answers]);

  const handleSaveAndApply = async () => {
    setSaving(true);
    const sessionKey = `assess-${Date.now().toString(36)}`;
    const org = organizationName.trim() || 'Prospective Enterprise';

    try {
      await offlineDb.assessments.put({
        id: sessionKey,
        organizationName: org,
        answers,
        readinessScore: evaluation.score,
        recommendedTier: evaluation.recommendedTier,
        criticalGaps: evaluation.gaps,
        createdAt: new Date().toISOString(),
      });

      const resp = await fetch('/api/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          sessionKey,
          organizationName: org,
          answers,
          readinessScore: evaluation.score,
          recommendedTier: evaluation.recommendedTier,
          criticalGaps: evaluation.gaps,
        }),
      });

      const gapSummary =
        evaluation.gaps.length > 0
          ? `Diagnostic Readiness Score: ${evaluation.score}/100. Priority Gaps: ${evaluation.gaps.join('; ')}.`
          : `Diagnostic Readiness Score: ${evaluation.score}/100. Ready for continuous governance retainer.`;

      onSyncFindingsToIntake(gapSummary, evaluation.recommendedTier);
      setSavedNotice(
        resp.ok
          ? 'Diagnostic recorded to PostgreSQL & synced to Schedule A.'
          : 'Saved locally in IndexedDB & synced to Schedule A.'
      );
      onShowToast('Bottleneck diagnostic saved and loaded into Schedule A intake.');
    } catch {
      onShowToast('Diagnostic saved offline in IndexedDB.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Row with Scarcity Counter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-3xl">
          <span className="inline-block text-xs font-mono uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-md border border-orange-500/20">
            5-Point Technical Bottleneck Assessment
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            Quantify Infrastructure, Compliance & Migration Risk in 60 Seconds
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Evaluate multi-region RPO/RTO resilience, Policy-as-Code readiness, and zero-trust gates to scope your 14-day Pilot Audit or Retainer.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center space-x-3 shrink-0">
          <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-xs font-mono">
            <div className="text-white font-bold tabular-nums">{capacity.label}</div>
            <div className="text-[11px] text-slate-400">
              Capped at {capacity.maxSlots} concurrent retainers ({capacity.weeklyHoursCap})
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Assessment Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 5 Questions Column */}
        <div className="lg:col-span-8 space-y-4">
          {QUESTIONS.map((q) => {
            const selectedValue = answers[q.id];
            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-white">{q.title}</h3>
                  <span className="text-[11px] font-mono text-cyan-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                    {q.dimension}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((opt) => {
                    const active = selectedValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.value }))}
                        className={`text-left p-3 rounded-lg border text-xs transition-all flex items-start justify-between gap-3 ${
                          active
                            ? 'bg-slate-950 border-orange-500 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start space-x-2.5">
                          <span
                            className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                              active
                                ? 'border-orange-500 bg-orange-500 text-white'
                                : 'border-slate-600'
                            }`}
                          >
                            {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                          <span className="leading-relaxed">{opt.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0 tabular-nums">
                          +{opt.scoreImpact} pts
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Diagnostic Scorecard & Checkout Trigger */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Diagnostic Readiness
              </span>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {evaluation.answeredCount}/5 Assessed
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-4xl font-black text-white tabular-nums">
                {evaluation.score}
                <span className="text-base font-normal text-slate-500">/100</span>
              </span>
              <span
                className={`text-xs font-mono px-2.5 py-1 rounded border ${
                  evaluation.score >= 80
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : evaluation.score >= 50
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {evaluation.score >= 80 ? 'LOW RISK' : evaluation.score >= 50 ? 'ELEVATED' : 'CRITICAL'}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-3">
              <div
                className={`h-full transition-all duration-300 ${
                  evaluation.score >= 80
                    ? 'bg-emerald-400'
                    : evaluation.score >= 50
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${evaluation.score}%` }}
              />
            </div>
            <p className="text-xs text-slate-300 mt-2.5 font-medium">{evaluation.postureLabel}</p>
          </div>

          {/* Detected Bottlenecks */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>Detected Architectural Bottlenecks ({evaluation.gaps.length})</span>
            </div>
            {evaluation.gaps.length === 0 ? (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Core invariants look strong. Recommended for ongoing Retainer Governance.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {evaluation.gaps.map((gap, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onLaunchPilotCheckout}
              disabled={isCheckingOut}
              className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-60"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isCheckingOut
                  ? 'Creating Stripe Session...'
                  : 'Initiate $3,500 Pilot Audit (14-Day Sprint)'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              disabled={saving}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono text-xs flex items-center justify-center space-x-2 transition-colors"
            >
              <span>{saving ? 'Saving Diagnostic...' : 'Save & Apply Gaps to Schedule A'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {savedNotice && (
              <p className="text-[11px] font-mono text-emerald-400 text-center">{savedNotice}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
