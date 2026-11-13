import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  Download,
  Lock,
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

const SELF_SERVICE_CHECKLIST = [
  {
    id: 'ssc-1',
    title: 'Codify core VPC, KMS & RDS modules in Terraform / OpenTofu with remote state locking',
  },
  {
    id: 'ssc-2',
    title: 'Replace static CI/CD cloud access keys with ephemeral OIDC workload identity federation',
  },
  {
    id: 'ssc-3',
    title: 'Enable continuous cross-region WAL shipping and measure baseline failover RTO',
  },
  {
    id: 'ssc-4',
    title: 'Publish OpenAPI / AsyncAPI specs and decouple direct OLTP analytical queries via CDC',
  },
  {
    id: 'ssc-5',
    title: 'Confirm $3,500 executive budget sign-off and target a <= 60-day delivery window',
  },
];

interface BottleneckAssessmentProps {
  organizationName: string;
  capacity: CapacitySummary;
  onLaunchPilotCheckout: () => void;
  onBookCalSync?: () => void;
  onSyncFindingsToIntake: (summaryNotes: string, recommendedTier: 'diagnostic' | 'retainer') => void;
  onShowToast: (msg: string) => void;
  isCheckingOut?: boolean;
}

export const BottleneckAssessment: React.FC<BottleneckAssessmentProps> = ({
  organizationName,
  capacity,
  onLaunchPilotCheckout,
  onBookCalSync,
  onSyncFindingsToIntake,
  onShowToast,
  isCheckingOut = false,
}) => {
  const { idToken } = useAuth();
  const [answers, setAnswers] = useState<Record<string, string>>({
    infra_topology: 'iac_multi_region',
    rpo_rto: 'sub_15m_tested',
    compliance_automation: 'manual_audits',
    cicd_identity: 'ephemeral_oidc',
    legacy_migration: 'coupled_reads',
  });
  const [hasBudgetAuthority, setHasBudgetAuthority] = useState<boolean>(true);
  const [timelineDays, setTimelineDays] = useState<30 | 60 | 90>(30);
  const [checklistProgress, setChecklistProgress] = useState<Record<string, boolean>>({});
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

    const disqualificationReasons: string[] = [];
    if (totalScore < 70) {
      disqualificationReasons.push(
        `Readiness score (${totalScore}/100) is below the 70-point asynchronous baseline threshold.`
      );
    }
    if (!hasBudgetAuthority) {
      disqualificationReasons.push(
        'Confirmed $3,500 Pilot Audit budget authority is required before scheduling.'
      );
    }
    if (timelineDays > 60) {
      disqualificationReasons.push(
        `Requested delivery timeline (${timelineDays} days) exceeds the 60-day execution window.`
      );
    }

    const isQualified = disqualificationReasons.length === 0;
    const recommendedTier: 'diagnostic' | 'retainer' =
      totalScore >= 85 ? 'retainer' : 'diagnostic';

    return {
      score: totalScore,
      gaps,
      disqualificationReasons,
      isQualified,
      recommendedTier,
      answeredCount: Object.keys(answers).length,
      postureLabel: isQualified
        ? 'GTM Qualified · Stripe Checkout & Cal.com Scheduling Unlocked'
        : 'Disqualified for Direct Advisory · Self-Service Readiness Path Active',
    };
  }, [answers, hasBudgetAuthority, timelineDays]);

  const handleSaveAndApply = async () => {
    setSaving(true);
    const sessionKey = `assess-${Date.now().toString(36)}`;
    const org = organizationName.trim() || 'Prospective Enterprise';

    try {
      await offlineDb.assessments.put({
        id: sessionKey,
        organizationName: org,
        answers: {
          ...answers,
          budgetAuthority: hasBudgetAuthority ? 'confirmed_3500' : 'unfunded',
          timelineDays: String(timelineDays),
        },
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
          answers: {
            ...answers,
            budgetAuthority: hasBudgetAuthority ? 'confirmed_3500' : 'unfunded',
            timelineDays: String(timelineDays),
          },
          readinessScore: evaluation.score,
          recommendedTier: evaluation.recommendedTier,
          criticalGaps: evaluation.gaps,
        }),
      });

      const gapSummary =
        evaluation.gaps.length > 0
          ? `GTM Score: ${evaluation.score}/100 (${evaluation.isQualified ? 'QUALIFIED' : 'SELF-SERVICE'}). Priority Gaps: ${evaluation.gaps.join('; ')}.`
          : `GTM Score: ${evaluation.score}/100 (QUALIFIED). Ready for Sub-15m DR & Continuous Governance.`;

      onSyncFindingsToIntake(gapSummary, evaluation.recommendedTier);
      setSavedNotice(
        resp.ok
          ? 'GTM assessment recorded & synced to Schedule A.'
          : 'Saved locally in IndexedDB & synced to Schedule A.'
      );
      onShowToast('GTM intake qualification saved and loaded into Schedule A.');
    } catch {
      onShowToast('Assessment saved offline in IndexedDB.');
    } finally {
      setSaving(false);
    }
  };

  const buildChecklistMarkdown = () => {
    return `# Archtechnix {∞} Self-Service Architectural Readiness Checklist
Generated: ${new Date().toISOString()}
Organization: ${organizationName || 'Prospective Engineering Org'}
Current GTM Score: ${evaluation.score}/100 (Required >= 70)
Budget Authority ($3,500): ${hasBudgetAuthority ? 'Confirmed' : 'Unconfirmed'}
Target Timeline: ${timelineDays} days (Required <= 60 days)

## Required Pre-Qualification Steps
${SELF_SERVICE_CHECKLIST.map(
  (item) => `- [${checklistProgress[item.id] ? 'x' : ' '}] ${item.title}`
).join('\n')}
`;
  };

  const handleCopyChecklist = () => {
    navigator.clipboard.writeText(buildChecklistMarkdown()).then(() => {
      onShowToast('Self-service architectural readiness checklist copied!');
    });
  };

  const handleDownloadChecklist = () => {
    const blob = new Blob([buildChecklistMarkdown()], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'archtechnix-self-service-readiness-checklist.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Downloaded self-service checklist (.md).');
  };

  const handleTriggerCalSync = () => {
    if (onBookCalSync) {
      onBookCalSync();
    } else {
      const el = document.getElementById('advisory-availability-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    onShowToast('Cal.com / Weekly Advisory Strategy Sync unlocked and opened.');
  };

  return (
    <div className="space-y-8">
      {/* Header Row with Scarcity Counter */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-3xl">
          <span className="inline-block text-xs font-mono uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-md border border-orange-500/20">
            GTM Intake Qualification Engine (5-Question Gate)
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
            Automated Pre-Flight Qualification & Capacity Routing
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            Leads must achieve score &ge; 70, confirm $3,500 budget authority, and target delivery within 60 days to unlock Stripe Checkout &amp; Cal.com strategy scheduling.
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

      {/* Commercial Gate Controls: Budget Authority & Delivery Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
            Commercial Gate A · $3,500 Pilot Audit Budget Authority
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHasBudgetAuthority(true)}
              className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                hasBudgetAuthority
                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Confirmed ($3,500 Approved)
            </button>
            <button
              type="button"
              onClick={() => setHasBudgetAuthority(false)}
              className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                !hasBudgetAuthority
                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Unfunded / Exploratory Only
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
            Commercial Gate B · Target Remediation Timeline (&le; 60 Days)
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { val: 30, label: 'Immediate (<= 30d)' },
                { val: 60, label: 'Quarter (31–60d)' },
                { val: 90, label: 'Deferred (> 60d)' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => setTimelineDays(opt.val)}
                className={`min-h-[44px] px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                  timelineDays === opt.val
                    ? opt.val > 60
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold'
                      : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split Assessment Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 5 Technical Questions Column */}
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

        {/* Live Qualification Decision & Routing Column */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-slate-300">
                Qualification Score
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
                className={`text-xs font-mono px-2.5 py-1 rounded border font-bold ${
                  evaluation.isQualified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                {evaluation.isQualified ? 'QUALIFIED' : 'DISQUALIFIED'}
              </span>
            </div>

            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mt-3">
              <div
                className={`h-full transition-all duration-300 ${
                  evaluation.isQualified ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                style={{ width: `${evaluation.score}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>Threshold: &ge; 70 pts</span>
              <span>Budget: {hasBudgetAuthority ? '$3,500 OK' : 'Missing'}</span>
              <span>Window: {timelineDays}d</span>
            </div>

            <p className="text-xs text-slate-300 mt-2.5 font-medium">{evaluation.postureLabel}</p>
          </div>

          {/* Qualification vs Self-Service Checklist Routing */}
          {evaluation.isQualified ? (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Stripe Checkout and Cal.com Strategy Sync are unlocked for {organizationName || 'your organization'}.
                </span>
              </div>

              <button
                type="button"
                onClick={onLaunchPilotCheckout}
                disabled={isCheckingOut}
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-60"
              >
                <CreditCard className="w-4 h-4" />
                <span>
                  {isCheckingOut
                    ? 'Creating Stripe Session...'
                    : 'Initiate $3,500 Pilot Audit (Stripe)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleTriggerCalSync}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold font-mono text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule Strategy Sync (Cal.com)</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 space-y-1.5">
                <div className="font-mono font-bold flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Direct Advisory Booking Locked</span>
                </div>
                <ul className="space-y-1 text-[11px] list-disc pl-4">
                  {evaluation.disqualificationReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>

              {/* Self-Service Architectural Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-cyan-400 flex items-center space-x-1.5">
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>Self-Service Architectural Checklist</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {SELF_SERVICE_CHECKLIST.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start space-x-2 text-[11px] text-slate-300 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checklistProgress[item.id])}
                        onChange={() =>
                          setChecklistProgress((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span
                        className={
                          checklistProgress[item.id] ? 'line-through text-slate-500' : ''
                        }
                      >
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyChecklist}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 flex items-center justify-center space-x-1"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Copy List</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadChecklist}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-200 flex items-center justify-center space-x-1"
                  >
                    <Download className="w-3 h-3 text-orange-400" />
                    <span>Export .MD</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detected Bottlenecks */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-mono text-slate-400 flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
              <span>Detected Technical Gaps ({evaluation.gaps.length})</span>
            </div>
            {evaluation.gaps.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                Zero blocking architectural gaps flagged across the 5 core vectors.
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

          <button
            type="button"
            onClick={handleSaveAndApply}
            disabled={saving}
            className="w-full min-h-[40px] py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-800 font-mono text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <span>{saving ? 'Saving Diagnostic...' : 'Save & Sync Findings to Schedule A'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {savedNotice && (
            <p className="text-[11px] font-mono text-emerald-400 text-center">{savedNotice}</p>
          )}
        </div>
      </div>
    </div>
  );
};
