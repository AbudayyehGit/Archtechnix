import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { CapacitySummary } from '../contexts/AuthContext';
import type {
  ScopeBoundaryItem,
  ScopeClassification,
  ScopeTaskStatus,
} from '../types';

interface ScopeBoundaryLogProps {
  items: ScopeBoundaryItem[];
  capacity: CapacitySummary;
  onAddItem: (item: ScopeBoundaryItem) => void;
  onUpdateStatus: (id: string, status: ScopeTaskStatus) => void;
  onActivateRetainerCheckout: () => void;
  onEscalateOutOfScopeToSkillBuilder?: (item: ScopeBoundaryItem) => void;
  onShowToast: (msg: string) => void;
  isCheckingOut?: boolean;
}

const STATUS_LABELS: Record<ScopeTaskStatus, string> = {
  open: 'Open',
  in_review: 'In Review',
  completed: 'Completed',
  escalated_to_retainer: 'Escalated to Retainer',
};

export const ScopeBoundaryLog: React.FC<ScopeBoundaryLogProps> = ({
  items,
  capacity,
  onAddItem,
  onUpdateStatus,
  onActivateRetainerCheckout,
  onEscalateOutOfScopeToSkillBuilder,
  onShowToast,
  isCheckingOut = false,
}) => {
  const [filter, setFilter] = useState<'all' | ScopeClassification>('all');
  const [title, setTitle] = useState('');
  const [requester, setRequester] = useState('VP Infrastructure');
  const [requestedHours, setRequestedHours] = useState<number>(8);
  const [classification, setClassification] = useState<ScopeClassification>(
    'out_of_scope_retainer_candidate'
  );
  const [rationale, setRationale] = useState('');
  const [latestRetainerCandidate, setLatestRetainerCandidate] =
    useState<ScopeBoundaryItem | null>(null);

  const outOfScopeItems = useMemo(
    () => items.filter((item) => item.classification === 'out_of_scope_retainer_candidate'),
    [items]
  );

  const inScopeCount = useMemo(
    () => items.filter((item) => item.classification === 'in_scope').length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.classification === filter);
  }, [items, filter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      onShowToast('Please specify a diagnostic request or engineering task.');
      return;
    }

    const newItem: ScopeBoundaryItem = {
      id: `sb-${Date.now().toString(36)}`,
      title: cleanTitle,
      requester: requester.trim() || 'Client Engineering',
      requestedHours: Math.max(1, Number(requestedHours) || 4),
      classification,
      status: classification === 'out_of_scope_retainer_candidate' ? 'escalated_to_retainer' : 'open',
      rationale:
        rationale.trim() ||
        (classification === 'out_of_scope_retainer_candidate'
          ? 'Exceeds fixed 14-day diagnostic boundary; flagged as retainer execution candidate.'
          : 'Covered under $3,500 Pilot Audit Schedule A diagnostic scope.'),
      createdAt: new Date().toISOString(),
    };

    onAddItem(newItem);
    setTitle('');
    setRationale('');

    if (newItem.classification === 'out_of_scope_retainer_candidate') {
      setLatestRetainerCandidate(newItem);
      onEscalateOutOfScopeToSkillBuilder?.(newItem);
      onShowToast(
        'Out-of-scope request flagged! Convert to $7,500/mo Retainer Slot prompt activated.'
      );
    } else {
      onShowToast('In-scope diagnostic task logged to Scope Boundary Ledger.');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header & Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ClipboardList className="w-4 h-4 text-orange-400" />
            <h3 className="text-base font-bold text-white">
              &lt;ScopeBoundaryLog /&gt; · 14-Day Diagnostic Ledger
            </h3>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {inScopeCount} In-Scope · {outOfScopeItems.length} Retainer Candidates
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Enforce fixed-fee Pilot Audit boundaries. Any out-of-scope implementation request automatically triggers a Tier 2 Retainer conversion path.
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono shrink-0">
          {(
            [
              { id: 'all', label: `All (${items.length})` },
              { id: 'in_scope', label: `In-Scope (${inScopeCount})` },
              {
                id: 'out_of_scope_retainer_candidate',
                label: `Retainer Flag (${outOfScopeItems.length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[36px] px-3 py-1 rounded-lg transition-colors ${
                filter === tab.id
                  ? 'bg-orange-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Instant Out-of-Scope Retainer Conversion Banner */}
      {outOfScopeItems.length > 0 && (
        <div className="rounded-xl border border-orange-500/40 bg-slate-950 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Out-of-Scope Request Detected ({outOfScopeItems.length}{' '}
                {outOfScopeItems.length === 1 ? 'Candidate' : 'Candidates'})
              </span>
            </div>
            <p className="text-sm font-semibold text-white">
              {latestRetainerCandidate
                ? `"${latestRetainerCandidate.title}" exceeds the 14-day fixed Pilot Audit boundary.`
                : 'Active implementation requests require continuous weekly PR execution and IaC delivery.'}
            </p>
            <p className="text-xs text-slate-400">
              Preserve sprint velocity by rolling out-of-scope implementation work into a dedicated retainer slot ({capacity.availableSlots} of {capacity.maxSlots} capacity slots open).
            </p>
          </div>

          <button
            type="button"
            onClick={onActivateRetainerCheckout}
            disabled={isCheckingOut}
            className="min-h-[44px] px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 shadow-lg transition-colors shrink-0 disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {isCheckingOut
                ? 'Launching Stripe...'
                : 'Convert to $7,500/mo Retainer Slot'}
            </span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split: Ledger Table + Log New Request Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Ledger Rows */}
        <div className="lg:col-span-7 divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-950 overflow-hidden">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500">
              No scope items match this filter.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isOutOfScope =
                item.classification === 'out_of_scope_retainer_candidate';
              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            isOutOfScope
                              ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 font-bold'
                              : 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                          }`}
                        >
                          {isOutOfScope ? 'out_of_scope_retainer_candidate' : 'in_scope'}
                        </span>
                        <span className="text-slate-400 tabular-nums">
                          {item.requestedHours}h est.
                        </span>
                        <span className="text-slate-500">· {item.requester}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                    </div>

                    <select
                      aria-label={`Status for ${item.title}`}
                      value={item.status}
                      onChange={(e) =>
                        onUpdateStatus(item.id, e.target.value as ScopeTaskStatus)
                      }
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-orange-500"
                    >
                      {(Object.keys(STATUS_LABELS) as ScopeTaskStatus[]).map((st) => (
                        <option key={st} value={st}>
                          {STATUS_LABELS[st]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">{item.rationale}</p>

                  {isOutOfScope && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-mono text-orange-400 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Telemetry synced to Evolutionary Skill Builder</span>
                      </span>
                      <button
                        type="button"
                        onClick={onActivateRetainerCheckout}
                        className="text-[11px] font-mono font-bold text-orange-400 hover:text-orange-300 underline underline-offset-2 flex items-center space-x-1"
                      >
                        <span>Convert to $7,500/mo Retainer Slot</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Log New Task / Scope Request Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Log Diagnostic / Feature Request
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Task or Deliverable Request
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Zero-downtime Kafka cluster cutover & CDC pipeline"
              className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Requester Role
              </label>
              <input
                type="text"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Effort Estimate (Hours)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={requestedHours}
                onChange={(e) => setRequestedHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg px-3 py-2 text-xs font-mono text-white tabular-nums focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Scope Classification
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setClassification('in_scope')}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                  classification === 'in_scope'
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                in_scope · 14-Day Pilot Audit Blueprint
              </button>
              <button
                type="button"
                onClick={() => setClassification('out_of_scope_retainer_candidate')}
                className={`text-left px-3 py-2 rounded-lg border text-xs font-mono transition-colors ${
                  classification === 'out_of_scope_retainer_candidate'
                    ? 'bg-orange-500/15 border-orange-500/50 text-orange-300 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                out_of_scope_retainer_candidate · Trigger Retainer Prompt
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Architectural Rationale
            </label>
            <textarea
              rows={2}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Document why this item belongs in the 14-day audit or requires ongoing Tier 2 retainer execution..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-lg p-2.5 text-xs text-white resize-none focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold flex items-center justify-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Append to Scope Boundary Log</span>
          </button>
        </form>
      </div>
    </div>
  );
};
