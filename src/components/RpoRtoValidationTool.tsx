import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Download,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { DrDrillRecord, RpoRtoStatus, RpoRtoValidationSnapshot } from '../types';

interface NistProfile {
  id: 'nist-ha' | 'nist-moderate' | 'nist-cp10';
  label: string;
  standardRef: string;
  rpoMaxMinutes: number;
  rtoMaxMinutes: number;
  defaultRpoWarnMinutes: number;
  defaultRtoWarnMinutes: number;
  description: string;
}

const NIST_PROFILES: NistProfile[] = [
  {
    id: 'nist-ha',
    label: 'NIST SP 800-34 High-Availability',
    standardRef: 'NIST SP 800-34 Rev.1 · Tier 1 Mission-Critical',
    rpoMaxMinutes: 15,
    rtoMaxMinutes: 15,
    defaultRpoWarnMinutes: 11,
    defaultRtoWarnMinutes: 11,
    description: 'Sub-15m replication lag and automated multi-region DNS/DB promotion.',
  },
  {
    id: 'nist-cp10',
    label: 'NIST SP 800-53 CP-10 Zero-Loss',
    standardRef: 'NIST SP 800-53 CP-9 / CP-10 · Financial Ledger',
    rpoMaxMinutes: 5,
    rtoMaxMinutes: 10,
    defaultRpoWarnMinutes: 3.5,
    defaultRtoWarnMinutes: 7.5,
    description: 'Synchronous WAL quorum with automated failover orchestration.',
  },
  {
    id: 'nist-moderate',
    label: 'NIST SP 800-34 Moderate Baseline',
    standardRef: 'NIST SP 800-34 · Operational Workloads',
    rpoMaxMinutes: 30,
    rtoMaxMinutes: 60,
    defaultRpoWarnMinutes: 22,
    defaultRtoWarnMinutes: 45,
    description: 'Asynchronous cross-region snapshot shipping with scripted recovery.',
  },
];

interface DrillScenario {
  id: string;
  name: string;
  description: string;
  downtimeMultiplier: number;
  dataLossMultiplier: number;
  overheadMinutes: number;
}

const DRILL_SCENARIOS: DrillScenario[] = [
  {
    id: 'az-outage',
    name: 'Primary Region AZ Outage (Automated Failover)',
    description: 'Simulates an entire availability zone drop with automated DNS & Aurora replica promotion.',
    downtimeMultiplier: 0.92,
    dataLossMultiplier: 0.85,
    overheadMinutes: 1.2,
  },
  {
    id: 'primary-panic',
    name: 'Database Primary Node Panic (WAL Replay Cutover)',
    description: 'Tests standby WAL tail flush, lock lease eviction, and connection pool drain.',
    downtimeMultiplier: 1.08,
    dataLossMultiplier: 1.0,
    overheadMinutes: 2.0,
  },
  {
    id: 'dns-ttl-lag',
    name: 'Cross-Region DNS Propagation & Split-Brain Guard',
    description: 'Injects Route 53 TTL expiry delay and quorum fencing verification before traffic shift.',
    downtimeMultiplier: 1.28,
    dataLossMultiplier: 1.15,
    overheadMinutes: 4.5,
  },
  {
    id: 'kms-rekey',
    name: 'KMS Envelope Key Failover & Cold Replica Rehydration',
    description: 'Simulates multi-region KMS replica key unwrap during regional control-plane degradation.',
    downtimeMultiplier: 1.15,
    dataLossMultiplier: 0.95,
    overheadMinutes: 3.1,
  },
];

const DRILL_PHASES = [
  'Injecting virtual fault & isolating primary endpoint...',
  'Sampling WAL stream offset & measuring replication lag...',
  'Promoting standby replica & shifting Route 53 health checks...',
  'Verifying post-failover quorum & recording downtime against RTO/RPO...',
];

const DRILL_HISTORY_STORAGE_KEY = 'archtechnix_dr_drill_history_v1';

interface RpoRtoValidationToolProps {
  onShowToast?: (msg: string) => void;
  onValidationChange?: (snapshot: RpoRtoValidationSnapshot) => void;
}

interface ChartMetricRow {
  metric: string;
  shortName: string;
  actualMinutes: number;
  warningThresholdMinutes: number;
  nistBenchmarkMinutes: number;
  status: RpoRtoStatus;
  passed: boolean;
  deltaMinutes: number;
}

interface LagTrendPoint {
  dayIndex: number;
  dateLabel: string;
  isoDate: string;
  lagMinutes: number;
  rollingAvgMinutes: number;
  status: RpoRtoStatus;
}

function classifyMetricStatus(actual: number, warningThreshold: number, maxLimit: number): RpoRtoStatus {
  if (actual > maxLimit) return 'FAIL';
  if (actual >= warningThreshold) return 'WARNING';
  return 'PASS';
}

function statusColors(status: RpoRtoStatus): {
  barFill: string;
  badgeClass: string;
  cardClass: string;
  bannerClass: string;
} {
  if (status === 'FAIL') {
    return {
      barFill: '#f43f5e',
      badgeClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
      cardClass: 'bg-rose-500/5 border-rose-500/30',
      bannerClass: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    };
  }
  if (status === 'WARNING') {
    return {
      barFill: '#f59e0b',
      badgeClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      cardClass: 'bg-amber-500/10 border-amber-500/40',
      bannerClass: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    };
  }
  return {
    barFill: '#10b981',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    cardClass: 'bg-emerald-500/5 border-emerald-500/30',
    bannerClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
  };
}

export const RpoRtoValidationTool: React.FC<RpoRtoValidationToolProps> = ({
  onShowToast,
  onValidationChange,
}) => {
  const [profileId, setProfileId] = useState<NistProfile['id']>('nist-ha');
  const [replicationLagMin, setReplicationLagMin] = useState<number>(8);
  const [failoverTimeMin, setFailoverTimeMin] = useState<number>(12);
  const [rpoWarningMin, setRpoWarningMin] = useState<number>(11);
  const [rtoWarningMin, setRtoWarningMin] = useState<number>(11);
  const [trendMode, setTrendMode] = useState<'baseline' | 'degradation'>('baseline');

  // Disaster Recovery Drill Simulator state
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(DRILL_SCENARIOS[0].id);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [drillPhaseIdx, setDrillPhaseIdx] = useState<number>(0);
  const [simulatedStopwatchMin, setSimulatedStopwatchMin] = useState<number>(0);
  const [drillHistory, setDrillHistory] = useState<DrDrillRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(DRILL_HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {
        // Ignore invalid storage
      }
    }
    return [];
  });

  const simTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (simTimerRef.current !== null) {
        window.clearInterval(simTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DRILL_HISTORY_STORAGE_KEY, JSON.stringify(drillHistory));
    } catch {
      // Ignore storage quota errors
    }
  }, [drillHistory]);

  const activeProfile = useMemo(
    () => NIST_PROFILES.find((p) => p.id === profileId) || NIST_PROFILES[0],
    [profileId]
  );

  const selectedScenario = useMemo(
    () => DRILL_SCENARIOS.find((s) => s.id === selectedScenarioId) || DRILL_SCENARIOS[0],
    [selectedScenarioId]
  );

  const handleProfileChange = (nextId: NistProfile['id']) => {
    setProfileId(nextId);
    const nextProfile = NIST_PROFILES.find((p) => p.id === nextId) || NIST_PROFILES[0];
    setRpoWarningMin(nextProfile.defaultRpoWarnMinutes);
    setRtoWarningMin(nextProfile.defaultRtoWarnMinutes);
  };

  const evaluation = useMemo(() => {
    const safeLag = Number.isFinite(replicationLagMin) ? Math.max(0, replicationLagMin) : 0;
    const safeFailover = Number.isFinite(failoverTimeMin) ? Math.max(0, failoverTimeMin) : 0;
    const safeRpoWarn = Number.isFinite(rpoWarningMin)
      ? Math.min(activeProfile.rpoMaxMinutes, Math.max(0, rpoWarningMin))
      : activeProfile.defaultRpoWarnMinutes;
    const safeRtoWarn = Number.isFinite(rtoWarningMin)
      ? Math.min(activeProfile.rtoMaxMinutes, Math.max(0, rtoWarningMin))
      : activeProfile.defaultRtoWarnMinutes;

    const rpoStatus = classifyMetricStatus(safeLag, safeRpoWarn, activeProfile.rpoMaxMinutes);
    const rtoStatus = classifyMetricStatus(safeFailover, safeRtoWarn, activeProfile.rtoMaxMinutes);

    const overallStatus: RpoRtoStatus =
      rpoStatus === 'FAIL' || rtoStatus === 'FAIL'
        ? 'FAIL'
        : rpoStatus === 'WARNING' || rtoStatus === 'WARNING'
        ? 'WARNING'
        : 'PASS';

    const rpoPassed = rpoStatus !== 'FAIL';
    const rtoPassed = rtoStatus !== 'FAIL';
    const overallPassed = overallStatus !== 'FAIL';

    const rpoDelta = Number((safeLag - activeProfile.rpoMaxMinutes).toFixed(1));
    const rtoDelta = Number((safeFailover - activeProfile.rtoMaxMinutes).toFixed(1));

    const chartData: ChartMetricRow[] = [
      {
        metric: 'Database Replication Lag (RPO)',
        shortName: 'Replication Lag (RPO)',
        actualMinutes: safeLag,
        warningThresholdMinutes: safeRpoWarn,
        nistBenchmarkMinutes: activeProfile.rpoMaxMinutes,
        status: rpoStatus,
        passed: rpoPassed,
        deltaMinutes: rpoDelta,
      },
      {
        metric: 'Failover Recovery Time (RTO)',
        shortName: 'Failover Time (RTO)',
        actualMinutes: safeFailover,
        warningThresholdMinutes: safeRtoWarn,
        nistBenchmarkMinutes: activeProfile.rtoMaxMinutes,
        status: rtoStatus,
        passed: rtoPassed,
        deltaMinutes: rtoDelta,
      },
    ];

    const recommendations: string[] = [];
    if (rpoStatus === 'FAIL') {
      recommendations.push(
        `Replication lag (${safeLag}m) exceeds ${activeProfile.label} ceiling (${activeProfile.rpoMaxMinutes}m). Enable continuous WAL streaming or Aurora Global Database synchronous replica read-routing.`
      );
    } else if (rpoStatus === 'WARNING') {
      recommendations.push(
        `Replication lag (${safeLag}m) crossed your ${safeRpoWarn}m warning threshold and is approaching the ${activeProfile.rpoMaxMinutes}m NIST ceiling. Inspect WAL network throughput and vacuum IOPS pressure.`
      );
    }

    if (rtoStatus === 'FAIL') {
      recommendations.push(
        `Failover time (${safeFailover}m) exceeds ${activeProfile.label} ceiling (${activeProfile.rtoMaxMinutes}m). Replace manual DNS/runbook promotion with Route 53 health-checked failover and pre-warmed Terraform standby.`
      );
    } else if (rtoStatus === 'WARNING') {
      recommendations.push(
        `Failover time (${safeFailover}m) crossed your ${safeRtoWarn}m warning threshold and is approaching the ${activeProfile.rtoMaxMinutes}m NIST ceiling. Pre-warm connection pools and tighten DNS TTL.`
      );
    }

    return {
      safeLag,
      safeFailover,
      safeRpoWarn,
      safeRtoWarn,
      rpoStatus,
      rtoStatus,
      overallStatus,
      rpoPassed,
      rtoPassed,
      overallPassed,
      rpoDelta,
      rtoDelta,
      chartData,
      recommendations,
    };
  }, [replicationLagMin, failoverTimeMin, rpoWarningMin, rtoWarningMin, activeProfile]);

  // Generate 30-day historical replication lag series ending at today's measured replicationLagMin
  const historicalLagTrend = useMemo(() => {
    const days = 30;
    const now = Date.now();
    const rawValues: number[] = [];

    for (let i = 0; i < days; i += 1) {
      const progress = i / (days - 1);
      const seasonalWave = Math.sin(i * 0.65) * 0.8 + Math.cos(i * 0.35) * 0.45;
      const batchSpike = i % 7 === 4 ? 1.6 : 0;

      let lagValue: number;
      if (i === days - 1) {
        lagValue = evaluation.safeLag;
      } else if (trendMode === 'degradation') {
        const startLag = Math.max(1.5, evaluation.safeLag * 0.48);
        const targetEnd = Math.max(evaluation.safeLag, evaluation.safeRpoWarn + 2.2);
        lagValue = startLag + (targetEnd - startLag) * Math.pow(progress, 1.15) + seasonalWave + batchSpike;
      } else {
        const baselineStart = Math.max(1.5, evaluation.safeLag * 0.78);
        lagValue = baselineStart + (evaluation.safeLag - baselineStart) * progress + seasonalWave * 0.7 + (i === 18 ? 1.4 : 0);
      }
      rawValues.push(Number(Math.max(0.5, lagValue).toFixed(1)));
    }

    const points: LagTrendPoint[] = rawValues.map((val, idx) => {
      const dateObj = new Date(now - (days - 1 - idx) * 24 * 60 * 60 * 1000);
      const windowStart = Math.max(0, idx - 6);
      const slice = rawValues.slice(windowStart, idx + 1);
      const rollingAvg = Number(
        (slice.reduce((sum, n) => sum + n, 0) / slice.length).toFixed(1)
      );
      return {
        dayIndex: idx + 1,
        dateLabel: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isoDate: dateObj.toISOString().split('T')[0],
        lagMinutes: val,
        rollingAvgMinutes: rollingAvg,
        status: classifyMetricStatus(val, evaluation.safeRpoWarn, activeProfile.rpoMaxMinutes),
      };
    });

    const peakLag = Math.max(...points.map((p) => p.lagMinutes));
    const avgLag = Number(
      (points.reduce((sum, p) => sum + p.lagMinutes, 0) / points.length).toFixed(1)
    );
    const warningDays = points.filter((p) => p.status === 'WARNING').length;
    const breachDays = points.filter((p) => p.status === 'FAIL').length;
    const firstWeekAvg = points.slice(0, 7).reduce((s, p) => s + p.lagMinutes, 0) / 7;
    const lastWeekAvg = points.slice(-7).reduce((s, p) => s + p.lagMinutes, 0) / 7;
    const driftDelta30d = Number((lastWeekAvg - firstWeekAvg).toFixed(1));

    return {
      points,
      peakLag,
      avgLag,
      warningDays,
      breachDays,
      driftDelta30d,
    };
  }, [evaluation.safeLag, evaluation.safeRpoWarn, activeProfile.rpoMaxMinutes, trendMode]);

  useEffect(() => {
    onValidationChange?.({
      profileId: activeProfile.id,
      profileLabel: activeProfile.label,
      standardRef: activeProfile.standardRef,
      replicationLagMin: evaluation.safeLag,
      failoverTimeMin: evaluation.safeFailover,
      rpoWarningMinutes: evaluation.safeRpoWarn,
      rtoWarningMinutes: evaluation.safeRtoWarn,
      rpoMaxMinutes: activeProfile.rpoMaxMinutes,
      rtoMaxMinutes: activeProfile.rtoMaxMinutes,
      rpoPassed: evaluation.rpoPassed,
      rtoPassed: evaluation.rtoPassed,
      overallPassed: evaluation.overallPassed,
      rpoStatus: evaluation.rpoStatus,
      rtoStatus: evaluation.rtoStatus,
      overallStatus: evaluation.overallStatus,
      updatedAt: new Date().toISOString(),
      drillHistory,
    });
  }, [activeProfile, evaluation, drillHistory, onValidationChange]);

  const handleTriggerFailoverDrill = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setDrillPhaseIdx(0);
    setSimulatedStopwatchMin(0);

    const targetSimulatedDowntime = Number(
      Math.max(
        1,
        evaluation.safeFailover * selectedScenario.downtimeMultiplier +
          selectedScenario.overheadMinutes
      ).toFixed(1)
    );
    const targetSimulatedDataLoss = Number(
      Math.max(0.5, evaluation.safeLag * selectedScenario.dataLossMultiplier).toFixed(1)
    );

    const totalTicks = 20;
    let tick = 0;

    if (simTimerRef.current !== null) {
      window.clearInterval(simTimerRef.current);
    }

    simTimerRef.current = window.setInterval(() => {
      tick += 1;
      const progress = tick / totalTicks;
      setDrillPhaseIdx(Math.min(DRILL_PHASES.length - 1, Math.floor(progress * DRILL_PHASES.length)));
      setSimulatedStopwatchMin(Number((targetSimulatedDowntime * progress).toFixed(1)));

      if (tick >= totalTicks) {
        if (simTimerRef.current !== null) {
          window.clearInterval(simTimerRef.current);
          simTimerRef.current = null;
        }
        const passedRto = targetSimulatedDowntime <= activeProfile.rtoMaxMinutes;
        const passedRpo = targetSimulatedDataLoss <= activeProfile.rpoMaxMinutes;
        const outcome: 'PASS' | 'FAIL' = passedRto && passedRpo ? 'PASS' : 'FAIL';

        const record: DrDrillRecord = {
          id: `drill-${Date.now().toString(36)}`,
          scenarioName: selectedScenario.name,
          triggeredAt: new Date().toISOString(),
          simulatedDowntimeMin: targetSimulatedDowntime,
          simulatedDataLossMin: targetSimulatedDataLoss,
          targetRtoMin: activeProfile.rtoMaxMinutes,
          targetRpoMin: activeProfile.rpoMaxMinutes,
          nistProfileLabel: activeProfile.label,
          outcome,
          recoveryNotes:
            outcome === 'PASS'
              ? `Failover completed within ${activeProfile.rtoMaxMinutes}m RTO and ${activeProfile.rpoMaxMinutes}m RPO envelopes.`
              : `Exceeded stated objective (${!passedRto ? `RTO ${targetSimulatedDowntime}m > ${activeProfile.rtoMaxMinutes}m` : ''}${!passedRto && !passedRpo ? '; ' : ''}${!passedRpo ? `RPO ${targetSimulatedDataLoss}m > ${activeProfile.rpoMaxMinutes}m` : ''}).`,
        };

        setDrillHistory((prev) => [record, ...prev].slice(0, 10));
        setIsSimulating(false);
        onShowToast?.(
          `DR Failover Drill [${outcome}]: Simulated downtime ${targetSimulatedDowntime}m vs ${activeProfile.rtoMaxMinutes}m RTO limit.`
        );
      }
    }, 90);
  };

  const handleDownloadCsv = () => {
    const esc = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const exportedAt = new Date().toISOString();

    const lines: string[] = [
      'Section,Timestamp,Metric / Scenario,Measured / Simulated Value (min),Custom Warning Threshold (min),NIST Max Benchmark (min),Delta to Limit (min),Status / Outcome,Notes',
      [
        esc('Benchmark Metric'),
        esc(exportedAt),
        esc('Database Replication Lag (RPO)'),
        esc(evaluation.safeLag),
        esc(evaluation.safeRpoWarn),
        esc(activeProfile.rpoMaxMinutes),
        esc(evaluation.rpoDelta),
        esc(evaluation.rpoStatus),
        esc(`${activeProfile.label} (${activeProfile.standardRef})`),
      ].join(','),
      [
        esc('Benchmark Metric'),
        esc(exportedAt),
        esc('Failover Recovery Time (RTO)'),
        esc(evaluation.safeFailover),
        esc(evaluation.safeRtoWarn),
        esc(activeProfile.rtoMaxMinutes),
        esc(evaluation.rtoDelta),
        esc(evaluation.rtoStatus),
        esc(`${activeProfile.label} (${activeProfile.standardRef})`),
      ].join(','),
      [
        esc('Overall Verdict'),
        esc(exportedAt),
        esc('Combined NIST Contingency Evaluation'),
        esc(`${evaluation.safeLag}m RPO / ${evaluation.safeFailover}m RTO`),
        esc(`${evaluation.safeRpoWarn}m RPO / ${evaluation.safeRtoWarn}m RTO`),
        esc(`${activeProfile.rpoMaxMinutes}m RPO / ${activeProfile.rtoMaxMinutes}m RTO`),
        esc('N/A'),
        esc(evaluation.overallStatus),
        esc(`30d Lag Drift: ${historicalLagTrend.driftDelta30d >= 0 ? '+' : ''}${historicalLagTrend.driftDelta30d}m`),
      ].join(','),
    ];

    for (const drill of drillHistory) {
      lines.push(
        [
          esc('Failover Drill History'),
          esc(drill.triggeredAt),
          esc(drill.scenarioName),
          esc(`Downtime: ${drill.simulatedDowntimeMin}m | Data Loss: ${drill.simulatedDataLossMin}m`),
          esc(`${evaluation.safeRpoWarn}m RPO / ${evaluation.safeRtoWarn}m RTO`),
          esc(`${drill.targetRpoMin}m RPO / ${drill.targetRtoMin}m RTO`),
          esc((drill.simulatedDowntimeMin - drill.targetRtoMin).toFixed(1)),
          esc(drill.outcome),
          esc(drill.recoveryNotes),
        ].join(',')
      );
    }

    for (const point of historicalLagTrend.points) {
      lines.push(
        [
          esc('30-Day Replication Lag History'),
          esc(point.isoDate),
          esc(`Day ${point.dayIndex} (${point.dateLabel}) Replication Lag`),
          esc(point.lagMinutes),
          esc(evaluation.safeRpoWarn),
          esc(activeProfile.rpoMaxMinutes),
          esc((point.lagMinutes - activeProfile.rpoMaxMinutes).toFixed(1)),
          esc(point.status),
          esc(`7-Day Moving Avg: ${point.rollingAvgMinutes}m (${trendMode})`),
        ].join(',')
      );
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archtechnix-rpo-rto-validation-${exportedAt.slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast?.('RPO/RTO benchmark metrics and pass/fail history exported as CSV!');
  };

  const handleCopyReport = () => {
    const summary = [
      `ARCHTECHNIX RPO/RTO NIST VALIDATION REPORT`,
      `Profile: ${activeProfile.label} (${activeProfile.standardRef})`,
      `Overall Status: ${evaluation.overallStatus}`,
      `Database Replication Lag (RPO): ${evaluation.safeLag}m (Warn >= ${evaluation.safeRpoWarn}m, Max <= ${activeProfile.rpoMaxMinutes}m) [${evaluation.rpoStatus}]`,
      `Failover Time (RTO): ${evaluation.safeFailover}m (Warn >= ${evaluation.safeRtoWarn}m, Max <= ${activeProfile.rtoMaxMinutes}m) [${evaluation.rtoStatus}]`,
      `30-Day Lag Trend: Avg ${historicalLagTrend.avgLag}m, Peak ${historicalLagTrend.peakLag}m, Drift ${historicalLagTrend.driftDelta30d >= 0 ? '+' : ''}${historicalLagTrend.driftDelta30d}m`,
      `Recorded Failover Drills: ${drillHistory.length}`,
      evaluation.recommendations.length > 0
        ? `Advisory:\n- ${evaluation.recommendations.join('\n- ')}`
        : 'Advisory: None required. Target SLA satisfied with healthy headroom.',
    ].join('\n');

    navigator.clipboard.writeText(summary);
    onShowToast?.('RPO/RTO NIST validation summary copied to clipboard.');
  };

  const overallBannerStyle = statusColors(evaluation.overallStatus).bannerClass;

  return (
    <div
      id="rpo-rto-validation-tool"
      className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6"
    >
      {/* Header & Overall Pass/Warning/Fail Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Interactive RPO/RTO Validation Tool</span>
            </span>
            <span className="text-xs font-mono text-slate-400">
              {activeProfile.standardRef}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-white">
            Live Replication Lag, Warning Thresholds &amp; Failover NIST Validator
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Configure replication lag, failover duration, and custom warning thresholds to detect degradation before breaching NIST contingency ceilings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            className={`px-4 py-2.5 rounded-xl border font-mono text-xs font-bold flex items-center space-x-2 ${overallBannerStyle}`}
          >
            {evaluation.overallStatus === 'PASS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : evaluation.overallStatus === 'WARNING' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>OVERALL NIST STATUS: {evaluation.overallStatus}</span>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download CSV</span>
          </button>

          <button
            type="button"
            onClick={handleCopyReport}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copy Result</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid: Inputs + Warning Thresholds on Left, Recharts Pass/Warning/Fail Chart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Input Controls */}
        <div className="lg:col-span-5 space-y-5 bg-slate-950 border border-slate-800 rounded-xl p-5">
          {/* Benchmark Profile Selector */}
          <div className="space-y-2">
            <label
              htmlFor="nist-profile-select"
              className="block text-xs font-mono uppercase tracking-wider text-slate-400"
            >
              NIST Contingency Benchmark Profile
            </label>
            <select
              id="nist-profile-select"
              value={profileId}
              onChange={(e) => handleProfileChange(e.target.value as NistProfile['id'])}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              {NIST_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label} (≤{profile.rpoMaxMinutes}m RPO / ≤{profile.rtoMaxMinutes}m RTO)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {activeProfile.description}
            </p>
          </div>

          {/* Replication Lag Input & Custom Warning Threshold */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="replication-lag-input"
                className="text-xs font-mono text-slate-200 flex items-center space-x-1.5"
              >
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                <span>Database Replication Lag (RPO)</span>
              </label>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border tabular-nums ${
                  statusColors(evaluation.rpoStatus).badgeClass
                }`}
              >
                {evaluation.rpoStatus} ({evaluation.rpoDelta > 0 ? `+${evaluation.rpoDelta}m` : `${evaluation.rpoDelta}m`})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={90}
                step={0.5}
                aria-label="Database replication lag slider"
                value={Math.min(90, evaluation.safeLag)}
                onChange={(e) => setReplicationLagMin(Number(e.target.value))}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 w-24">
                <input
                  id="replication-lag-input"
                  type="number"
                  min={0}
                  max={1440}
                  step={0.5}
                  value={replicationLagMin}
                  onChange={(e) => setReplicationLagMin(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-transparent text-xs font-mono text-white tabular-nums focus:outline-none"
                />
                <span className="text-[11px] font-mono text-slate-500 ml-1">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
              <label htmlFor="rpo-warning-input" className="text-amber-300">
                Custom Warning Threshold (≥):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 w-24">
                  <input
                    id="rpo-warning-input"
                    type="number"
                    min={0}
                    max={activeProfile.rpoMaxMinutes}
                    step={0.5}
                    value={rpoWarningMin}
                    onChange={(e) =>
                      setRpoWarningMin(
                        Math.min(activeProfile.rpoMaxMinutes, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    className="w-full bg-transparent text-xs font-mono text-amber-300 tabular-nums focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">min</span>
                </div>
                <span className="text-slate-500 tabular-nums">
                  / Max ≤ {activeProfile.rpoMaxMinutes}m
                </span>
              </div>
            </div>
          </div>

          {/* Failover Time Input & Custom Warning Threshold */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="failover-time-input"
                className="text-xs font-mono text-slate-200 flex items-center space-x-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Failover Time (RTO)</span>
              </label>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border tabular-nums ${
                  statusColors(evaluation.rtoStatus).badgeClass
                }`}
              >
                {evaluation.rtoStatus} ({evaluation.rtoDelta > 0 ? `+${evaluation.rtoDelta}m` : `${evaluation.rtoDelta}m`})
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={120}
                step={0.5}
                aria-label="Failover time slider"
                value={Math.min(120, evaluation.safeFailover)}
                onChange={(e) => setFailoverTimeMin(Number(e.target.value))}
                className="flex-1 accent-orange-500 cursor-pointer"
              />
              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 w-24">
                <input
                  id="failover-time-input"
                  type="number"
                  min={0}
                  max={1440}
                  step={0.5}
                  value={failoverTimeMin}
                  onChange={(e) => setFailoverTimeMin(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-transparent text-xs font-mono text-white tabular-nums focus:outline-none"
                />
                <span className="text-[11px] font-mono text-slate-500 ml-1">min</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 text-[11px] font-mono">
              <label htmlFor="rto-warning-input" className="text-amber-300">
                Custom Warning Threshold (≥):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 w-24">
                  <input
                    id="rto-warning-input"
                    type="number"
                    min={0}
                    max={activeProfile.rtoMaxMinutes}
                    step={0.5}
                    value={rtoWarningMin}
                    onChange={(e) =>
                      setRtoWarningMin(
                        Math.min(activeProfile.rtoMaxMinutes, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    className="w-full bg-transparent text-xs font-mono text-amber-300 tabular-nums focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 ml-1">min</span>
                </div>
                <span className="text-slate-500 tabular-nums">
                  / Max ≤ {activeProfile.rtoMaxMinutes}m
                </span>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">
              Quick Calibration Scenarios
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setReplicationLagMin(4);
                  setFailoverTimeMin(9);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] transition-colors"
              >
                Healthy Pass (4m / 9m)
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplicationLagMin(Math.max(1, evaluation.safeRpoWarn + 1));
                  setFailoverTimeMin(Math.max(1, evaluation.safeRtoWarn + 2));
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[11px] transition-colors"
              >
                Approaching Limit (Warning)
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplicationLagMin(28);
                  setFailoverTimeMin(12);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-[11px] transition-colors"
              >
                Lag Overrun (28m / 12m)
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplicationLagMin(10);
                  setFailoverTimeMin(45);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-[11px] transition-colors"
              >
                Manual Failover (10m / 45m)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recharts Pass/Warning/Fail Chart & Verdict Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Actual Telemetry vs. NIST Benchmark (Minutes · Lower is Better)
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                  <span>Pass</span>
                </span>
                <span className="flex items-center space-x-1 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                  <span>Warning</span>
                </span>
                <span className="flex items-center space-x-1 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                  <span>Fail</span>
                </span>
                <span className="flex items-center space-x-1 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500/60 inline-block" />
                  <span>NIST Max</span>
                </span>
              </div>
            </div>

            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={evaluation.chartData}
                  margin={{ top: 16, right: 20, left: 0, bottom: 8 }}
                  barGap={10}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    stroke="#94a3b8"
                    tick={{ fill: '#cbd5e1', fontSize: 12, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                    axisLine={{ stroke: '#334155' }}
                    unit="m"
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#1e293b',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => [`${value} min`, String(name)]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                  />
                  <ReferenceLine
                    y={evaluation.safeRpoWarn}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: `RPO Warn (${evaluation.safeRpoWarn}m)`,
                      position: 'insideTopLeft',
                      fill: '#fbbf24',
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                  />
                  <ReferenceLine
                    y={activeProfile.rpoMaxMinutes}
                    stroke="#22d3ee"
                    strokeDasharray="4 4"
                    label={{
                      value: `RPO Limit (${activeProfile.rpoMaxMinutes}m)`,
                      position: 'insideTopRight',
                      fill: '#22d3ee',
                      fontSize: 11,
                      fontFamily: 'monospace',
                    }}
                  />
                  <Bar
                    dataKey="actualMinutes"
                    name="Your Measured Telemetry"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                  >
                    {evaluation.chartData.map((entry) => (
                      <Cell
                        key={entry.shortName}
                        fill={statusColors(entry.status).barFill}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="nistBenchmarkMinutes"
                    name="NIST Benchmark Limit"
                    fill="#0ea5e9"
                    fillOpacity={0.55}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {evaluation.chartData.map((row) => (
              <div
                key={row.metric}
                className={`p-4 rounded-xl border ${statusColors(row.status).cardClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-300 font-semibold">
                    {row.shortName}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                      statusColors(row.status).badgeClass
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-2xl font-extrabold text-white">
                    {row.actualMinutes}m
                  </span>
                  <span className="text-xs text-slate-400">
                    Warn: {row.warningThresholdMinutes}m · Max: {row.nistBenchmarkMinutes}m
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Remediation / Warning Feedback */}
          {evaluation.overallStatus === 'FAIL' ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-rose-300">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>NIST Contingency Non-Compliance Detected</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-5">
                {evaluation.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          ) : evaluation.overallStatus === 'WARNING' ? (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Warning: Approaching Custom Contingency Thresholds</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-100/90 list-disc pl-5">
                {evaluation.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-3 text-xs text-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Verified compliant with <strong>{activeProfile.label}</strong> and below custom warning thresholds ({evaluation.safeRpoWarn}m RPO / {evaluation.safeRtoWarn}m RTO).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Line Chart: 30-Day Historical Replication Lag Trends */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
              <TrendingUp className="w-4 h-4" />
              <span>30-Day Historical Replication Lag Trend</span>
            </div>
            <h4 className="text-lg font-bold text-white">
              Infrastructure Degradation &amp; WAL Lag Telemetry (Last 30 Days)
            </h4>
            <p className="text-xs text-slate-400 max-w-2xl">
              Tracks daily replication lag alongside its 7-day moving average against your yellow warning threshold ({evaluation.safeRpoWarn}m) and NIST RPO limit ({activeProfile.rpoMaxMinutes}m).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setTrendMode('baseline')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  trendMode === 'baseline'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Nominal Baseline
              </button>
              <button
                type="button"
                onClick={() => setTrendMode('degradation')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  trendMode === 'degradation'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simulate Lag Drift
              </button>
            </div>
          </div>
        </div>

        {/* 30-Day Trend KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">30-Day Average Lag</div>
            <div className="text-lg font-extrabold text-white mt-1">
              {historicalLagTrend.avgLag}m
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">30-Day Peak Lag</div>
            <div
              className={`text-lg font-extrabold mt-1 ${
                historicalLagTrend.peakLag > activeProfile.rpoMaxMinutes
                  ? 'text-rose-400'
                  : historicalLagTrend.peakLag >= evaluation.safeRpoWarn
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {historicalLagTrend.peakLag}m
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">30-Day Degradation Slope</div>
            <div
              className={`text-lg font-extrabold mt-1 ${
                historicalLagTrend.driftDelta30d > 2
                  ? 'text-amber-400'
                  : 'text-cyan-400'
              }`}
            >
              {historicalLagTrend.driftDelta30d >= 0
                ? `+${historicalLagTrend.driftDelta30d}m`
                : `${historicalLagTrend.driftDelta30d}m`}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-[11px] text-slate-400">Days in Warning / Breach</div>
            <div className="text-lg font-extrabold text-white mt-1">
              <span className="text-amber-400">{historicalLagTrend.warningDays}w</span>
              {' / '}
              <span className="text-rose-400">{historicalLagTrend.breachDays}b</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalLagTrend.points}
                margin={{ top: 14, right: 20, left: 0, bottom: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  interval={4}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                  axisLine={{ stroke: '#334155' }}
                  unit="m"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#1e293b',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: '#f8fafc',
                  }}
                  formatter={(value, name) => [`${value} min`, String(name)]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }}
                />
                <ReferenceLine
                  y={evaluation.safeRpoWarn}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  label={{
                    value: `Warning (${evaluation.safeRpoWarn}m)`,
                    position: 'insideTopLeft',
                    fill: '#fbbf24',
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                <ReferenceLine
                  y={activeProfile.rpoMaxMinutes}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  label={{
                    value: `NIST Max (${activeProfile.rpoMaxMinutes}m)`,
                    position: 'insideTopRight',
                    fill: '#fb7185',
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="lagMinutes"
                  name="Daily Replication Lag (min)"
                  stroke="#22d3ee"
                  strokeWidth={2.2}
                  dot={{ r: 2.5, fill: '#22d3ee' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="rollingAvgMinutes"
                  name="7-Day Moving Average (min)"
                  stroke="#a78bfa"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Disaster Recovery Drill Simulator */}
      <div className="pt-6 border-t border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">
              Disaster Recovery Drill Simulator
            </div>
            <h4 className="text-lg font-bold text-white">
              Virtual Failover Chaos Test &amp; Downtime Recorder
            </h4>
            <p className="text-xs text-slate-400 max-w-2xl">
              Trigger a controlled virtual failover event using your current replication lag and failover time baseline to record simulated downtime against your stated {activeProfile.rtoMaxMinutes}m RTO and {activeProfile.rpoMaxMinutes}m RPO objectives.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <select
              aria-label="Failover drill scenario"
              value={selectedScenarioId}
              disabled={isSimulating}
              onChange={(e) => setSelectedScenarioId(e.target.value)}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
            >
              {DRILL_SCENARIOS.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleTriggerFailoverDrill}
              disabled={isSimulating}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center space-x-2 transition-colors shadow-sm disabled:opacity-60"
            >
              {isSimulating ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin" />
                  <span>Running Failover Drill...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Trigger Virtual Failover</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Simulation Execution Progress Bar */}
        <AnimatePresence>
          {isSimulating && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="p-4 rounded-xl bg-slate-950 border border-orange-500/40 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-orange-300 font-semibold">
                  {DRILL_PHASES[drillPhaseIdx]}
                </span>
                <span className="text-white font-bold tabular-nums">
                  Simulated Outage Clock: {simulatedStopwatchMin}m / {activeProfile.rtoMaxMinutes}m Target RTO
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 origin-left"
                  initial={{ scaleX: 0.05 }}
                  animate={{ scaleX: (drillPhaseIdx + 1) / DRILL_PHASES.length }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recorded Drill History */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-slate-300">
              Recorded Virtual Failover Drills ({drillHistory.length})
            </span>
            {drillHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setDrillHistory([]);
                  onShowToast?.('Cleared Disaster Recovery drill history.');
                }}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 flex items-center space-x-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Log</span>
              </button>
            )}
          </div>

          {drillHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 font-mono">
              No virtual failover events recorded yet. Select a scenario above and click &ldquo;Trigger Virtual Failover&rdquo; to benchmark downtime against your RTO/RPO goals.
            </div>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {drillHistory.map((drill) => (
                  <motion.div
                    key={drill.id}
                    layout
                    initial={{ opacity: 0, y: -14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={`p-3 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      drill.outcome === 'PASS'
                        ? 'bg-slate-900 border-emerald-500/30'
                        : 'bg-slate-900 border-rose-500/30'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            drill.outcome === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {drill.outcome}
                        </span>
                        <span className="font-bold text-white truncate">{drill.scenarioName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans">
                        {drill.recoveryNotes}
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end shrink-0 tabular-nums text-[11px] text-slate-300">
                      <div>
                        Downtime:{' '}
                        <span
                          className={
                            drill.simulatedDowntimeMin <= drill.targetRtoMin
                              ? 'text-emerald-400 font-bold'
                              : 'text-rose-400 font-bold'
                          }
                        >
                          {drill.simulatedDowntimeMin}m
                        </span>{' '}
                        / {drill.targetRtoMin}m RTO
                      </div>
                      <div className="text-slate-400">
                        Data Loss: {drill.simulatedDataLossMin}m / {drill.targetRpoMin}m RPO ·{' '}
                        {new Date(drill.triggeredAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
