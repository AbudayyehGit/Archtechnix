import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CircleDot,
  Copy,
  ExternalLink,
  GitCommit,
  GitBranch,
  RefreshCw,
  Search,
} from 'lucide-react';

export interface GitHubActivityEvent {
  id: string;
  kind: 'commit' | 'issue';
  title: string;
  detail: string;
  actor: string;
  actorHandle: string;
  ref: string;
  sha?: string;
  issueNumber?: number;
  issueState?: 'open' | 'closed' | 'in_review';
  labels?: string[];
  url: string;
  timestamp: string;
  source: 'github_api' | 'engagement_mirror';
}

interface ClientActivityStreamProps {
  repoUrl?: string;
  onShowToast: (msg: string) => void;
}

type EventFilter = 'all' | 'commits' | 'issues';

function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'just now';
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ClientActivityStream: React.FC<ClientActivityStreamProps> = ({
  repoUrl,
  onShowToast,
}) => {
  const [events, setEvents] = useState<GitHubActivityEvent[]>([]);
  const [repoSlug, setRepoSlug] = useState<string>('apex-fintech/core-mesh');
  const [source, setSource] = useState<'github_api' | 'engagement_mirror'>('engagement_mirror');
  const [notice, setNotice] = useState<string | undefined>();
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [counts, setCounts] = useState<{ all: number; commits: number; issues: number }>({
    all: 0,
    commits: 0,
    issues: 0,
  });

  const [filter, setFilter] = useState<EventFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<string | null>(null);

  const fetchEvents = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading((prev) => (events.length === 0 ? true : prev));
      }
      setError(null);

      try {
        const params = new URLSearchParams();
        if (repoUrl && repoUrl.trim()) {
          params.set('repo', repoUrl.trim());
        }
        const resp = await fetch(`/api/github/events?${params.toString()}`);
        if (!resp.ok) {
          throw new Error(`Activity stream returned HTTP ${resp.status}`);
        }
        const data = await resp.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
        if (data.repoSlug) setRepoSlug(data.repoSlug);
        if (data.source) setSource(data.source);
        setNotice(data.notice);
        setFetchedAt(data.fetchedAt || new Date().toISOString());
        if (data.counts) setCounts(data.counts);

        if (isManualRefresh) {
          onShowToast(`Synced ${data.counts?.all ?? 0} repository events for ${data.repoSlug || repoSlug}.`);
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to reach GitHub activity stream endpoint.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [repoUrl, onShowToast]
  );

  useEffect(() => {
    fetchEvents(false);
  }, [fetchEvents]);

  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      fetchEvents(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoSync, fetchEvents]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return events.filter((evt) => {
      if (filter === 'commits' && evt.kind !== 'commit') return false;
      if (filter === 'issues' && evt.kind !== 'issue') return false;
      if (!query) return true;
      return (
        evt.title.toLowerCase().includes(query) ||
        evt.detail.toLowerCase().includes(query) ||
        evt.actor.toLowerCase().includes(query) ||
        evt.actorHandle.toLowerCase().includes(query) ||
        evt.ref.toLowerCase().includes(query)
      );
    });
  }, [events, filter, searchQuery]);

  const handleCopyRef = (refValue: string) => {
    navigator.clipboard.writeText(refValue).then(() => {
      setCopiedSha(refValue);
      onShowToast(`Copied ${refValue} to clipboard.`);
      setTimeout(() => setCopiedSha(null), 1600);
    });
  };

  return (
    <section
      aria-label="Client Activity Stream"
      className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5"
    >
      {/* Top Bar Contract: Title + Active Repo on left, concise controls on right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold text-white">{repoSlug}</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className={source === 'github_api' ? 'text-emerald-400' : 'text-amber-400'}>
              {source === 'github_api' ? 'Live GitHub REST API' : 'Engagement Repository Mirror'}
            </span>
            {fetchedAt && (
              <>
                <span className="text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-400 tabular-nums">
                  Synced {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </>
            )}
          </div>
          <h3 className="text-lg font-bold text-white">Client Activity Stream</h3>
          <p className="text-xs text-slate-400">
            Real-time stream of commits and issue status updates across your active engagement repository.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={autoSync}
            onClick={() => setAutoSync((prev) => !prev)}
            className={`px-3 py-2 rounded-lg border text-xs font-mono transition-colors whitespace-nowrap ${
              autoSync
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Auto-Sync 30s: {autoSync ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            className="px-3.5 py-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh Stream'}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter repository events"
          className="inline-flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono self-start"
        >
          {(
            [
              { key: 'all', label: `All (${counts.all})` },
              { key: 'commits', label: `Commits (${counts.commits})` },
              { key: 'issues', label: `Issue Updates (${counts.issues})` },
            ] as Array<{ key: EventFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md transition-colors tabular-nums whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-orange-500 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter commits, #issues, or actor..."
            aria-label="Filter repository events by text"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {notice && (
        <div className="text-[11px] font-mono text-slate-400 border border-slate-800 bg-slate-950/60 rounded-lg px-3.5 py-2">
          {notice}
        </div>
      )}

      {/* Event Stream Body: Loading / Error / Empty / Populated */}
      {loading ? (
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg bg-slate-950">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="p-3.5 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-3.5 bg-slate-800 rounded w-2/3" />
                <div className="h-3 bg-slate-800/70 rounded w-1/2" />
              </div>
              <div className="h-3 bg-slate-800 rounded w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="border border-rose-500/30 bg-rose-500/10 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <div className="font-bold">Failed to load repository activity</div>
              <div className="text-rose-200/80 mt-0.5">{error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchEvents(true)}
            className="px-3.5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-bold self-start sm:self-auto"
          >
            Retry Sync
          </button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="border border-slate-800 bg-slate-950 rounded-lg p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-white">No matching repository events</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No commits or issue status updates matched your active filter. Reset filters or refresh the stream to pull latest worktree activity.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {(filter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilter('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white"
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              onClick={() => fetchEvents(true)}
              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs font-mono font-bold text-white"
            >
              Sync Repository Now
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-slate-800 rounded-lg bg-slate-950 divide-y divide-slate-800/80">
          {filteredEvents.map((evt) => {
            const isCommit = evt.kind === 'commit';
            const statusTextColor =
              evt.issueState === 'closed'
                ? 'text-emerald-400'
                : evt.issueState === 'in_review'
                ? 'text-amber-400'
                : 'text-cyan-400';

            return (
              <div
                key={evt.id}
                className="px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors"
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isCommit ? (
                      <GitCommit className="w-4 h-4 text-orange-400" />
                    ) : evt.issueState === 'closed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <CircleDot className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="text-xs sm:text-sm font-semibold text-white break-words">
                      {evt.title}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{evt.detail}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400 tabular-nums">
                      <span className={isCommit ? 'text-orange-400' : statusTextColor}>
                        {isCommit ? `commit ${evt.sha || evt.ref}` : `issue ${evt.ref} · ${evt.issueState || 'open'}`}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span>
                        {evt.actor} (@{evt.actorHandle})
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span>{formatRelativeTime(evt.timestamp)}</span>
                      {evt.labels && evt.labels.length > 0 && (
                        <>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span className="text-slate-500">{evt.labels.join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopyRef(evt.sha || evt.ref)}
                    title={`Copy ${evt.sha || evt.ref}`}
                    className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center space-x-1 transition-colors tabular-nums"
                  >
                    {copiedSha === (evt.sha || evt.ref) ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{evt.sha || evt.ref}</span>
                  </button>

                  <a
                    href={evt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 transition-colors"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
