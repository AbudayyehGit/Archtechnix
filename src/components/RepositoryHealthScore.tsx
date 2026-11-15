import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCode2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { OpaPolicySummary } from '../types';

export interface RepositoryHealthScoreProps {
  orgName: string;
  repoName: string;
  isConnected: boolean;
  opaSummary: OpaPolicySummary;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  onSyncMetadata: () => void;
  onPreviewPolicy: () => void;
}

function formatRelativeAge(lastSyncedAt: string | null, nowMs: number): string {
  if (!lastSyncedAt) return 'Not synced yet';
  const syncedMs = new Date(lastSyncedAt).getTime();
  if (Number.isNaN(syncedMs)) return 'Unknown';
  const diffSec = Math.max(0, Math.floor((nowMs - syncedMs) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ${diffMin % 60}m ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

export const RepositoryHealthScore: React.FC<RepositoryHealthScoreProps> = ({
  orgName,
  repoName,
  isConnected,
  opaSummary,
  lastSyncedAt,
  isSyncing,
  onSyncMetadata,
  onPreviewPolicy,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const openFindingsCount = opaSummary.violations.length;
  const findingPenalty = Math.min(65, openFindingsCount * 20);

  const syncAgeMinutes = lastSyncedAt
    ? Math.max(0, (nowMs - new Date(lastSyncedAt).getTime()) / 60000)
    : null;

  let syncAgePenalty = 0;
  let syncAgeLabel = 'Fresh (< 15m)';

  if (syncAgeMinutes === null || Number.isNaN(syncAgeMinutes)) {
    syncAgePenalty = 25;
    syncAgeLabel = 'Unverified (No metadata sync)';
  } else if (syncAgeMinutes <= 15) {
    syncAgePenalty = 0;
    syncAgeLabel = 'Fresh (< 15m)';
  } else if (syncAgeMinutes <= 60) {
    syncAgePenalty = 5;
    syncAgeLabel = 'Aging (15m–60m)';
  } else if (syncAgeMinutes <= 1440) {
    syncAgePenalty = 12;
    syncAgeLabel = 'Stale (1h–24h)';
  } else {
    syncAgePenalty = 25;
    syncAgeLabel = 'Outdated (> 24h)';
  }

  const score = Math.max(0, Math.min(100, 100 - findingPenalty - syncAgePenalty));

  const tier: {
    label: 'Healthy' | 'Needs Attention' | 'Degraded';
    badgeClass: string;
    barClass: string;
    scoreClass: string;
    Icon: typeof ShieldCheck;
  } =
    score >= 85
      ? {
          label: 'Healthy',
          badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          barClass: 'bg-emerald-500',
          scoreClass: 'text-emerald-400',
          Icon: ShieldCheck,
        }
      : score >= 60
      ? {
          label: 'Needs Attention',
          badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          barClass: 'bg-amber-500',
          scoreClass: 'text-amber-400',
          Icon: AlertTriangle,
        }
      : {
          label: 'Degraded',
          badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          barClass: 'bg-rose-500',
          scoreClass: 'text-rose-400',
          Icon: XCircle,
        };

  const StatusIcon = tier.Icon;
  const relativeAge = formatRelativeAge(lastSyncedAt, nowMs);

  return (
    <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-white">Repository Health Score</h4>
              <span
                className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${tier.badgeClass}`}
              >
                <StatusIcon className="w-3 h-3" />
                <span>{tier.label}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time composite posture for{' '}
              <span className="font-mono text-slate-200">
                @{orgName}/{repoName}
              </span>{' '}
              weighted by open OPA scanner violations and metadata sync freshness.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPreviewPolicy}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preview Active OPA Policy</span>
          </button>

          <button
            type="button"
            onClick={onSyncMetadata}
            disabled={isSyncing}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-orange-400'}`} />
            <span>{isSyncing ? 'Refreshing...' : 'Refresh Health'}</span>
          </button>
        </div>
      </div>

      {/* Score Display & Factors Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Numeric Score & Progress Bar */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Composite Index
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {isConnected ? 'OAuth Active' : 'Baseline Preview'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className={`text-4xl font-extrabold font-mono tabular-nums ${tier.scoreClass}`}>
              {score}
            </span>
            <span className="text-sm font-mono text-slate-500 tabular-nums">/ 100</span>
          </div>

          <div className="space-y-1.5">
            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                className={`h-full origin-left ${tier.barClass}`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(0.03, score / 100) }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 tabular-nums">
              <span>100 baseline</span>
              <span>
                -{findingPenalty + syncAgePenalty} pts penalty
              </span>
            </div>
          </div>
        </div>

        {/* Center: OPA Open Findings Factor */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center space-x-1.5">
              <ShieldAlert
                className={`w-3.5 h-3.5 ${
                  openFindingsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              />
              <span>Open OPA Findings</span>
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                findingPenalty > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {findingPenalty > 0 ? `-${findingPenalty} pts` : '0 penalty'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {openFindingsCount}
            </span>
            <span className="text-xs font-mono text-slate-400">
              {openFindingsCount === 1 ? 'open violation' : 'open violations'} ·{' '}
              {opaSummary.badge}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono truncate">
            {openFindingsCount > 0 ? (
              <span className="text-rose-300">{opaSummary.violations[0]}</span>
            ) : (
              <span className="text-emerald-300 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {opaSummary.policyPackage} · {opaSummary.resourceType} passed
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Metadata Sync Age Factor */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-300 font-semibold flex items-center space-x-1.5">
              <Clock
                className={`w-3.5 h-3.5 ${
                  syncAgePenalty === 0
                    ? 'text-emerald-400'
                    : syncAgePenalty <= 12
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              />
              <span>Metadata Sync Age</span>
            </span>
            <span
              className={`text-xs font-mono font-bold tabular-nums ${
                syncAgePenalty === 0
                  ? 'text-emerald-400'
                  : syncAgePenalty <= 12
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {syncAgePenalty > 0 ? `-${syncAgePenalty} pts` : '0 penalty'}
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white tabular-nums">
              {relativeAge}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between gap-2">
            <span className="truncate">{syncAgeLabel}</span>
            {lastSyncedAt && (
              <span className="text-slate-500 tabular-nums shrink-0">
                {new Date(lastSyncedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
