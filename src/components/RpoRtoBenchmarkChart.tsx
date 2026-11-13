import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
} from 'recharts';
import {
  Activity,
  ShieldCheck,
  Clock,
  Database,
  Zap,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

interface BenchmarkDatum {
  tier: string;
  shortLabel: string;
  rpoMinutes: number;
  rtoMinutes: number;
  mechanism: string;
  slaCompliance: 'Compliant (<15m)' | 'At Risk' | 'Non-Compliant';
  isTarget?: boolean;
}

interface RecoveryCurveDatum {
  minute: number;
  minuteLabel: string;
  archtechnixPct: number;
  standardWarmPct: number;
  legacyColdPct: number;
}

type WorkloadProfile = 'fintech' | 'healthcare' | 'saas';

const WORKLOAD_BENCHMARKS: Record<
  WorkloadProfile,
  {
    label: string;
    subtitle: string;
    targetRpo: number;
    targetRto: number;
    mechanismSummary: string;
    data: BenchmarkDatum[];
  }
> = {
  fintech: {
    label: 'FinTech Payment Ledger',
    subtitle: 'Aurora Global DB + Continuous WAL Replication + Automated DNS Cutover',
    targetRpo: 2,
    targetRto: 9,
    mechanismSummary: 'Continuous WAL streaming + pre-warmed Terraform cold-standby',
    data: [
      {
        tier: 'Legacy Cold Backup',
        shortLabel: 'Legacy Backup',
        rpoMinutes: 360,
        rtoMinutes: 240,
        mechanism: 'Nightly S3 snapshot restore + manual DNS',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Standard Warm Standby',
        shortLabel: 'Warm Standby',
        rpoMinutes: 60,
        rtoMinutes: 90,
        mechanism: 'Hourly snapshot shipping + manual promotion',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Typical Consultancy SLA',
        shortLabel: 'Consultancy Avg',
        rpoMinutes: 30,
        rtoMinutes: 45,
        mechanism: 'Semi-automated script + runbook triage',
        slaCompliance: 'At Risk'
      },
      {
        tier: 'Archtechnix Sub-15m Target',
        shortLabel: 'Archtechnix (<15m)',
        rpoMinutes: 2,
        rtoMinutes: 9,
        mechanism: 'Continuous WAL replication + Terraform auto-failover',
        slaCompliance: 'Compliant (<15m)',
        isTarget: true
      }
    ]
  },
  healthcare: {
    label: 'HIPAA Clinical Data Mesh',
    subtitle: 'Multi-Region Kafka Event Replay + KMS Envelope Key Failover',
    targetRpo: 4,
    targetRto: 11,
    mechanismSummary: 'Deterministic event log replay + multi-region KMS replica keys',
    data: [
      {
        tier: 'Legacy Cold Backup',
        shortLabel: 'Legacy Backup',
        rpoMinutes: 480,
        rtoMinutes: 300,
        mechanism: 'Cross-region tape/vault restore + manual compliance audit',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Standard Warm Standby',
        shortLabel: 'Warm Standby',
        rpoMinutes: 90,
        rtoMinutes: 120,
        mechanism: 'Async block replication + manual IAM re-binding',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Typical Consultancy SLA',
        shortLabel: 'Consultancy Avg',
        rpoMinutes: 25,
        rtoMinutes: 40,
        mechanism: 'Scheduled CDC sync + manual smoke checks',
        slaCompliance: 'At Risk'
      },
      {
        tier: 'Archtechnix Sub-15m Target',
        shortLabel: 'Archtechnix (<15m)',
        rpoMinutes: 4,
        rtoMinutes: 11,
        mechanism: 'Kafka MirrorMaker2 + pre-authorized KMS key failover',
        slaCompliance: 'Compliant (<15m)',
        isTarget: true
      }
    ]
  },
  saas: {
    label: 'Multi-Tenant Enterprise SaaS',
    subtitle: 'EKS Multi-Cluster State Sync + OpenTofu Ephemeral Failover',
    targetRpo: 3,
    targetRto: 12,
    mechanismSummary: 'Read-replica promotion + automated ArgoCD cluster hydration',
    data: [
      {
        tier: 'Legacy Cold Backup',
        shortLabel: 'Legacy Backup',
        rpoMinutes: 300,
        rtoMinutes: 210,
        mechanism: 'AMI rebuild + manual helm chart deployment',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Standard Warm Standby',
        shortLabel: 'Warm Standby',
        rpoMinutes: 60,
        rtoMinutes: 75,
        mechanism: 'Periodic DB dump + manual ingress routing',
        slaCompliance: 'Non-Compliant'
      },
      {
        tier: 'Typical Consultancy SLA',
        shortLabel: 'Consultancy Avg',
        rpoMinutes: 20,
        rtoMinutes: 35,
        mechanism: 'Partial IaC pipelines + manual DNS verification',
        slaCompliance: 'At Risk'
      },
      {
        tier: 'Archtechnix Sub-15m Target',
        shortLabel: 'Archtechnix (<15m)',
        rpoMinutes: 3,
        rtoMinutes: 12,
        mechanism: 'WAL continuous sync + OpenTofu automated Route53 failover',
        slaCompliance: 'Compliant (<15m)',
        isTarget: true
      }
    ]
  }
};

const RECOVERY_CURVE_DATA: RecoveryCurveDatum[] = [
  { minute: 0, minuteLabel: '0m', archtechnixPct: 0, standardWarmPct: 0, legacyColdPct: 0 },
  { minute: 3, minuteLabel: '3m', archtechnixPct: 35, standardWarmPct: 5, legacyColdPct: 0 },
  { minute: 6, minuteLabel: '6m', archtechnixPct: 72, standardWarmPct: 10, legacyColdPct: 2 },
  { minute: 9, minuteLabel: '9m', archtechnixPct: 94, standardWarmPct: 15, legacyColdPct: 4 },
  { minute: 11, minuteLabel: '11m', archtechnixPct: 100, standardWarmPct: 18, legacyColdPct: 5 },
  { minute: 15, minuteLabel: '15m (SLA)', archtechnixPct: 100, standardWarmPct: 24, legacyColdPct: 8 },
  { minute: 30, minuteLabel: '30m', archtechnixPct: 100, standardWarmPct: 42, legacyColdPct: 14 },
  { minute: 45, minuteLabel: '45m', archtechnixPct: 100, standardWarmPct: 68, legacyColdPct: 22 },
  { minute: 60, minuteLabel: '60m', archtechnixPct: 100, standardWarmPct: 88, legacyColdPct: 31 },
  { minute: 90, minuteLabel: '90m', archtechnixPct: 100, standardWarmPct: 100, legacyColdPct: 48 },
  { minute: 120, minuteLabel: '120m', archtechnixPct: 100, standardWarmPct: 100, legacyColdPct: 64 }
];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: BenchmarkDatum;
  }>;
}

const CustomBarTooltip: React.FC<CustomBarTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs font-mono max-w-xs">
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-800 mb-2">
        <span className="font-bold text-white">{datum.tier}</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded border ${
            datum.slaCompliance === 'Compliant (<15m)'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : datum.slaCompliance === 'At Risk'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}
        >
          {datum.slaCompliance}
        </span>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-slate-300">
          <span className="text-cyan-400">RPO (Data Loss Window):</span>
          <span className="font-bold text-white">{formatDuration(datum.rpoMinutes)}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-orange-400">RTO (Recovery Duration):</span>
          <span className="font-bold text-white">{formatDuration(datum.rtoMinutes)}</span>
        </div>
      </div>
      <div className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-sans leading-snug">
        {datum.mechanism}
      </div>
    </div>
  );
};

interface CustomAreaTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
}

const CustomAreaTooltip: React.FC<CustomAreaTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3.5 shadow-2xl text-xs font-mono">
      <div className="font-bold text-white pb-1.5 mb-2 border-b border-slate-800">
        Elapsed Time: {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-bold text-white">{entry.value}% Restored</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface RpoRtoBenchmarkChartProps {
  compact?: boolean;
}

export const RpoRtoBenchmarkChart: React.FC<RpoRtoBenchmarkChartProps> = ({ compact = false }) => {
  const [workload, setWorkload] = useState<WorkloadProfile>('fintech');
  const [chartView, setChartView] = useState<'benchmarks' | 'curve'>('benchmarks');

  const profile = WORKLOAD_BENCHMARKS[workload];
  const legacyRto = profile.data[0].rtoMinutes;
  const improvementPct = Math.round(((legacyRto - profile.targetRto) / legacyRto) * 1000) / 10;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Disaster Recovery Telemetry · Sub-15m Target Verification</span>
          </div>
          <h3 className={compact ? 'text-xl sm:text-2xl font-extrabold text-white tracking-tight' : 'text-2xl sm:text-3xl font-extrabold text-white tracking-tight'}>
            Sub-15m RPO/RTO vs. Industry RTO Benchmarks
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {profile.subtitle}. Automated continuous WAL replication and Terraform cold-standby orchestration keep recovery strictly beneath the 15-minute enterprise threshold.
          </p>
        </div>

        {/* View Toggle & Workload Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 self-start lg:self-auto">
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono">
            <button
              type="button"
              onClick={() => setChartView('benchmarks')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg transition-colors ${
                chartView === 'benchmarks'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              RPO / RTO Bars
            </button>
            <button
              type="button"
              onClick={() => setChartView('curve')}
              className={`min-h-[38px] px-3 py-1.5 rounded-lg transition-colors ${
                chartView === 'curve'
                  ? 'bg-orange-500 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Failover Velocity Curve
            </button>
          </div>
        </div>
      </div>

      {/* Workload Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wider mr-1">
          Workload Profile:
        </span>
        {(Object.keys(WORKLOAD_BENCHMARKS) as WorkloadProfile[]).map((key) => {
          const item = WORKLOAD_BENCHMARKS[key];
          const isActive = workload === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setWorkload(key)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all border ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Target RPO</span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            &le; {profile.targetRpo} min
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Continuous WAL streaming</div>
        </div>

        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Target RTO</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            &le; {profile.targetRto} min
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sub-15m automated failover</div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Hard SLA Ceiling</span>
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-orange-400 font-mono">
            15.0 min
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Enforced via OPA & DR drills</div>
        </div>

        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>Downtime Reduction</span>
            <TrendingDown className="w-3.5 h-3.5 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 font-mono">
            {improvementPct}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">vs. {formatDuration(legacyRto)} legacy RTO</div>
        </div>
      </div>

      {/* Main Recharts Visualization Container */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <span className="text-xs font-mono text-slate-300 font-bold flex items-center space-x-2">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {chartView === 'benchmarks'
                ? 'RPO & RTO Duration Comparison (Minutes — Lower is Better)'
                : 'Cumulative Service Restoration Velocity After Regional Outage (% Restored)'}
            </span>
          </span>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>15-Minute Target Line Enforced</span>
          </span>
        </div>

        <div className="w-full h-[300px] sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'benchmarks' ? (
              <BarChart
                data={profile.data}
                margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#334155' }}
                  unit="m"
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono', paddingTop: '10px' }}
                />
                <ReferenceLine
                  y={15}
                  stroke="#10b981"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                  label={{
                    value: 'Sub-15m Target Ceiling (15m)',
                    position: 'insideTopRight',
                    fill: '#34d399',
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono'
                  }}
                />
                <Bar
                  dataKey="rpoMinutes"
                  name="RPO (Max Data Loss)"
                  fill="#06b6d4"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="rtoMinutes"
                  name="RTO (Recovery Time)"
                  fill="#f97316"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            ) : (
              <AreaChart
                data={RECOVERY_CURVE_DATA}
                margin={{ top: 20, right: 20, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="archGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="warmGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="legacyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="minuteLabel"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#334155' }}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomAreaTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '12px', fontFamily: 'JetBrains Mono', paddingTop: '10px' }}
                />
                <ReferenceLine
                  x="15m (SLA)"
                  stroke="#10b981"
                  strokeDasharray="6 4"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="archtechnixPct"
                  name="Archtechnix Sub-15m Blueprint"
                  stroke="#10b981"
                  strokeWidth={3}
                  fill="url(#archGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="standardWarmPct"
                  name="Standard Warm Standby"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#warmGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="legacyColdPct"
                  name="Legacy Cold Backup"
                  stroke="#64748b"
                  strokeWidth={2}
                  fill="url(#legacyGrad)"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Benchmark Mechanism Table Footer */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {profile.data.map((d) => (
            <div
              key={d.tier}
              className={`p-3 rounded-xl border ${
                d.isTarget
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold text-[11px] truncate ${d.isTarget ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {d.shortLabel}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDuration(d.rpoMinutes)} / {formatDuration(d.rtoMinutes)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-snug line-clamp-2">
                {d.mechanism}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
