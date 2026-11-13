import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  ShieldCheck, 
  Lock, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Check, 
  Zap, 
  RefreshCw, 
  Search, 
  Key, 
  Cpu, 
  FileCode2,
  AlertCircle
} from 'lucide-react';

export interface AutomationEvent {
  id: string;
  eventType: 'security' | 'branch' | 'ci' | 'compliance' | 'webhook';
  title: string;
  description: string;
  targetRef: string;
  timestampText: string;
  timestampIso: string;
  commitHash?: string;
  statusBadge: 'active' | 'enforced' | 'passed' | 'verified' | 'clean' | 'committed';
  statusColor: string;
  iconType: 'shield' | 'branch' | 'terminal' | 'key' | 'cpu' | 'file' | 'webhook';
}

const INITIAL_AUTOMATION_EVENTS: AutomationEvent[] = [
  {
    id: 'evt-sec-scan-01',
    eventType: 'security',
    title: 'Secret scanning enabled & high-entropy regex armed',
    description: 'Scans all commits, pull requests, and git tags for leaked cloud tokens, private keys, and database passwords before merge.',
    targetRef: 'repo:archtechnix-audit-workspace',
    timestampText: '2m ago',
    timestampIso: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    commitHash: '9a4f21b',
    statusBadge: 'active',
    statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    iconType: 'shield'
  },
  {
    id: 'evt-branch-prot-02',
    eventType: 'branch',
    title: 'Branch protection enforced on main',
    description: 'Requires signed commits, 2 mandatory peer reviews, passing OPA Rego compliance checks, and disables direct force pushes.',
    targetRef: 'branch:refs/heads/main',
    timestampText: '7m ago',
    timestampIso: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    commitHash: 'e41b77c',
    statusBadge: 'enforced',
    statusColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    iconType: 'branch'
  },
  {
    id: 'evt-opa-gate-03',
    eventType: 'compliance',
    title: 'OPA Rego storage & KMS compliance check passed',
    description: 'Evaluated storage_compliance.rego ruleset against cloud topology. All 14 zero-trust invariants verified with 0 policy violations.',
    targetRef: 'workflow:.github/workflows/opa-eval.yml',
    timestampText: '14m ago',
    timestampIso: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
    commitHash: 'f8012da',
    statusBadge: 'passed',
    statusColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    iconType: 'terminal'
  },
  {
    id: 'evt-runner-ttl-04',
    eventType: 'ci',
    title: 'Ephemeral CI/CD runner container provisioned',
    description: 'Ephemeral worker container provisioned with a strict 15-minute Time-To-Live (TTL) and memory-locked disk for audit safety.',
    targetRef: 'runner:arch-worker-amd64-9041',
    timestampText: '28m ago',
    timestampIso: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    commitHash: '11c9e83',
    statusBadge: 'active',
    statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    iconType: 'cpu'
  },
  {
    id: 'evt-key-shred-05',
    eventType: 'security',
    title: 'KMS envelope encryption & key lifecycle audit executed',
    description: 'Validated DEK/KEK rotation schedule against AWS KMS key policies. Verified cryptographic key shredding compliance under GDPR Art. 17.',
    targetRef: 'arn:aws:kms:us-east-1:***:key/omni-shred-9',
    timestampText: '45m ago',
    timestampIso: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    commitHash: '72e315a',
    statusBadge: 'verified',
    statusColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    iconType: 'key'
  },
  {
    id: 'evt-tf-drift-06',
    eventType: 'ci',
    title: 'Terraform multi-region drift detection check completed',
    description: 'Executed sandbox plan against target VPC topology. Confirmed zero unmanaged security group ingress rules across us-east-1 and us-west-2.',
    targetRef: 'workspace:prod-mesh-dr',
    timestampText: '1h 12m ago',
    timestampIso: new Date(Date.now() - 72 * 60 * 1000).toISOString(),
    commitHash: 'c45b882',
    statusBadge: 'clean',
    statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    iconType: 'terminal'
  },
  {
    id: 'evt-sched-a-07',
    eventType: 'compliance',
    title: 'Schedule A intake specification sealed in worktree',
    description: 'Client architectural coordinates and compliance frameworks cryptographically sealed into immutable repository specification file.',
    targetRef: '/specs/SCHEDULE_A_SPECIFICATION.md',
    timestampText: '1h 55m ago',
    timestampIso: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    commitHash: '39a1d40',
    statusBadge: 'committed',
    statusColor: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    iconType: 'file'
  },
  {
    id: 'evt-webhook-ack-08',
    eventType: 'webhook',
    title: 'Inbound Stripe webhook acknowledged (checkout.session.completed)',
    description: 'HMAC signature validated; triggered automated advisory repository provisioning and invited client technical lead.',
    targetRef: 'webhook:checkout.session.completed',
    timestampText: '2h 10m ago',
    timestampIso: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
    statusBadge: 'verified',
    statusColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    iconType: 'webhook'
  }
];

interface RecentAutomationEventsProps {
  webhookTriggered?: boolean;
  onShowToast?: (message: string) => void;
}

export const RecentAutomationEvents: React.FC<RecentAutomationEventsProps> = ({
  webhookTriggered = false,
  onShowToast
}) => {
  const [events, setEvents] = useState<AutomationEvent[]>(INITIAL_AUTOMATION_EVENTS);
  const [filter, setFilter] = useState<'all' | 'security' | 'branch' | 'ci' | 'compliance'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasInjectedWebhook, setHasInjectedWebhook] = useState<boolean>(false);

  // Prepend live event when mock webhook fires
  useEffect(() => {
    if (webhookTriggered && !hasInjectedWebhook) {
      setHasInjectedWebhook(true);
      const newLiveEvent: AutomationEvent = {
        id: `evt-live-${Date.now()}`,
        eventType: 'webhook',
        title: 'Live Webhook Event: checkout.session.completed Dispatched',
        description: 'Automated GitHub provisioning triggered. Private advisory repository mirrored, branch protection active, and 15m ephemeral runner armed.',
        targetRef: 'webhook:checkout.session.completed',
        timestampText: 'Just now',
        timestampIso: new Date().toISOString(),
        commitHash: Math.random().toString(36).substring(2, 9),
        statusBadge: 'active',
        statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
        iconType: 'webhook'
      };
      setEvents((prev) => [newLiveEvent, ...prev]);
    }
  }, [webhookTriggered, hasInjectedWebhook]);

  const handleSimulateEvent = () => {
    const randomHashes = ['f3b890a', '48d12ce', 'b901a4e', '7c4581f', 'e29da44'];
    const chosenHash = randomHashes[Math.floor(Math.random() * randomHashes.length)];
    const simulatedEvents: Partial<AutomationEvent>[] = [
      {
        eventType: 'security',
        title: 'Secret scanning verified 0 high-entropy leaks',
        description: 'Automated push protection verified all diff chunks against 210+ provider credential patterns.',
        targetRef: 'check:secret-scanning-push-protection',
        iconType: 'shield',
        statusBadge: 'passed',
        statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      },
      {
        eventType: 'branch',
        title: 'Branch protection rule updated: strict review required',
        description: 'Enforced CODEOWNERS approval rule and linear git history on archtechnix/remediation-v1 branch.',
        targetRef: 'branch:archtechnix/remediation-v1',
        iconType: 'branch',
        statusBadge: 'enforced',
        statusColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
      },
      {
        eventType: 'ci',
        title: 'OPA Rego test suite executed: 100% pass',
        description: 'CI runner validated zero-trust network rules and verified KMS envelope encryption for AWS S3 buckets.',
        targetRef: 'workflow:.github/workflows/opa-compliance.yml',
        iconType: 'terminal',
        statusBadge: 'passed',
        statusColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30'
      }
    ];

    const pick = simulatedEvents[Math.floor(Math.random() * simulatedEvents.length)];
    const newEvt: AutomationEvent = {
      id: `evt-dyn-${Date.now()}`,
      eventType: pick.eventType as any,
      title: pick.title!,
      description: pick.description!,
      targetRef: pick.targetRef!,
      timestampText: 'Just now',
      timestampIso: new Date().toISOString(),
      commitHash: chosenHash,
      statusBadge: pick.statusBadge as any,
      statusColor: pick.statusColor!,
      iconType: pick.iconType as any
    };

    setEvents((prev) => [newEvt, ...prev]);
    if (onShowToast) {
      onShowToast(`New GitHub automation event logged: ${newEvt.title}`);
    }
  };

  const handleCopyHash = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      if (onShowToast) onShowToast(`Copied ${text} to clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter((e) => e.eventType === filter);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'shield':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'branch':
        return <GitBranch className="w-4 h-4 text-cyan-400" />;
      case 'key':
        return <Key className="w-4 h-4 text-amber-400" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-violet-400" />;
      case 'file':
        return <FileCode2 className="w-4 h-4 text-orange-400" />;
      case 'webhook':
        return <Zap className="w-4 h-4 text-cyan-400" />;
      default:
        return <Terminal className="w-4 h-4 text-teal-400" />;
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Audit Stream · GitHub Webhook Ingest</span>
          </div>
          <h4 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Recent Automation Events
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Real-time webhook and CI/CD security audit activities triggered across client repositories, branch protections, and policy gates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {/* Dispatch Test Event Button */}
          <button
            onClick={handleSimulateEvent}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors shadow-sm"
            title="Simulate Inbound GitHub Webhook Event"
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>Simulate Event</span>
          </button>

          {/* Category Filter Pills */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'all' 
                  ? 'bg-orange-500 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilter('security')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'security' 
                  ? 'bg-orange-500 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Security
            </button>
            <button
              onClick={() => setFilter('branch')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'branch' 
                  ? 'bg-orange-500 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Branches
            </button>
            <button
              onClick={() => setFilter('ci')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === 'ci' 
                  ? 'bg-orange-500 text-white font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CI / OPA
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Compact Events List */}
      <div className="mt-4 max-h-[360px] overflow-y-auto pr-1 space-y-2.5 font-mono text-xs">
        {filteredEvents.map((evt) => (
          <div
            key={evt.id}
            className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
          >
            {/* Left Column: Icon, Title, and Description */}
            <div className="flex items-start space-x-3 min-w-0">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                {renderIcon(evt.iconType)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-100 text-xs truncate">
                    {evt.title}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border font-semibold ${evt.statusColor}`}>
                    {evt.statusBadge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-snug line-clamp-1 sm:line-clamp-2">
                  {evt.description}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                  <span className="text-cyan-400/90">{evt.targetRef}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {evt.timestampText}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Commit Hash / Target Action */}
            {evt.commitHash && (
              <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0 pl-11 sm:pl-0">
                <button
                  onClick={() => handleCopyHash(evt.commitHash!, evt.id)}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 hover:text-white flex items-center space-x-1.5 transition-colors"
                  title="Copy Commit SHA"
                >
                  <span className="text-orange-400">commit</span>
                  <span className="text-slate-300">{evt.commitHash}</span>
                  {copiedId === evt.id ? (
                    <Check className="w-3 h-3 text-emerald-400 ml-1" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500 ml-1 group-hover:text-slate-300" />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Audit Bar */}
      <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-500">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Immutable audit trails committed to client repository worktree</span>
        </div>
        <span className="text-slate-500">Showing {filteredEvents.length} verifiable pipeline events</span>
      </div>
    </div>
  );
};
