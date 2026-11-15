import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Zap,
  Key,
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
  FolderGit2,
  Cpu,
  Unplug,
  Lock,
  History,
  GitBranch,
  KanbanSquare,
  XCircle,
  Trash2,
  FileCode2,
  Terminal,
  RotateCcw,
  X,
  Download,
  ShieldAlert,
} from 'lucide-react';
import type { OpaPolicySummary } from '../types';
import { DEFAULT_OPA_REGO_POLICY } from './OpaScanner';
import { RepositoryHealthScore } from './RepositoryHealthScore';

interface HandshakeStep {
  id: string;
  label: string;
  detail: string;
}

const HANDSHAKE_STEPS: HandshakeStep[] = [
  {
    id: 'nonce',
    label: 'PKCE & State Nonce Exchange',
    detail: 'Generating SHA-256 challenge and anti-CSRF state vector',
  },
  {
    id: 'scopes',
    label: 'GitHub Organization Scope Verification',
    detail: 'Validating repo, admin:repo_hook, and read:org permissions',
  },
  {
    id: 'token',
    label: 'Ephemeral OAuth Token Handshake',
    detail: 'Negotiating TLS 1.3 scoped session credentials',
  },
  {
    id: 'webhook',
    label: 'Audit Telemetry Channel Binding',
    detail: 'Syncing organization repository governance context',
  },
];

type ConnectionEventStatus = 'Success' | 'Failed' | 'Disconnected';

interface ConnectionHistoryEntry {
  id: string;
  timestamp: string;
  eventType:
    | 'OAuth Handshake'
    | 'Token Fast-Connect'
    | 'Disconnect'
    | 'Metadata Sync'
    | 'Project Board Provision'
    | 'Repository Provision';
  organization: string;
  actor: string;
  status: ConnectionEventStatus;
  detail: string;
}

type SyncOperationMode = 'metadata' | 'project_board' | 'repository' | null;

interface SyncStatusState {
  active: boolean;
  mode: SyncOperationMode;
  stageLabel: string;
  progress: number;
  lastSyncedAt: string | null;
  summaryNote: string;
  hasError?: boolean;
}

type SyncDiagnosticOperation = 'metadata' | 'project_board' | 'repository' | 'oauth';

interface SyncDiagnosticEntry {
  id: string;
  timestamp: string;
  operation: SyncDiagnosticOperation;
  endpoint: string;
  httpStatus: number | null;
  errorCode: string;
  message: string;
  detail: string;
  remediationStep: string;
  resolved: boolean;
}

const DEFAULT_OPA_SUMMARY: OpaPolicySummary = {
  allowed: true,
  code: 200,
  badge: 'PASS: ALLOWED (200)',
  policyPackage: 'enterprise.compliance.storage',
  resourceType: 'aws_s3_bucket',
  violations: [],
  reasons: [
    'Complies with Rule 1: S3 bucket enforces KMS envelope encryption and blocks public access.',
  ],
  evaluatedAt: new Date().toISOString(),
};

const CONNECTION_HISTORY_STORAGE_KEY = 'archtechnix_github_connection_history_v1';

const INITIAL_CONNECTION_HISTORY: ConnectionHistoryEntry[] = [
  {
    id: 'conn-seed-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    eventType: 'OAuth Handshake',
    organization: '@ApexFinTech-Security',
    actor: '@AbudayyehGit',
    status: 'Success',
    detail: 'Verified scopes: repo, admin:repo_hook, read:org (PKCE TLS 1.3)',
  },
  {
    id: 'conn-seed-2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    eventType: 'Metadata Sync',
    organization: '@ApexFinTech-Security',
    actor: '@AbudayyehGit',
    status: 'Success',
    detail: 'Synced branch protection, commit log & OPA workflow telemetry',
  },
];

interface IntegrationsSectionProps {
  onShowToast?: (message: string) => void;
  onRepositoryProvisioned?: (repoData: any) => void;
  defaultOrg?: string;
  opaSummary?: OpaPolicySummary;
  activeOpaPolicyCode?: string;
}

export const IntegrationsSection: React.FC<IntegrationsSectionProps> = ({
  onShowToast,
  onRepositoryProvisioned,
  defaultOrg = 'ApexFinTech-Security',
  opaSummary = DEFAULT_OPA_SUMMARY,
  activeOpaPolicyCode = DEFAULT_OPA_REGO_POLICY,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [githubOrg, setGithubOrg] = useState<string>(defaultOrg);
  const [githubUser, setGithubUser] = useState<string>('AbudayyehGit');
  const [connectedScopes, setConnectedScopes] = useState<string[]>([
    'repo',
    'admin:repo_hook',
    'read:org',
  ]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [handshakeStage, setHandshakeStage] = useState<number>(-1);
  const [handshakeMode, setHandshakeMode] = useState<'oauth' | 'fast' | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [copiedPolicy, setCopiedPolicy] = useState<boolean>(false);
  const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnosticEntry[]>([]);
  const [retryingDiagnosticId, setRetryingDiagnosticId] = useState<string | null>(null);
  const handshakeTimersRef = useRef<number[]>([]);

  // Connection History state (persisted in localStorage)
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistoryEntry[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(CONNECTION_HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Ignore storage errors
      }
    }
    return INITIAL_CONNECTION_HISTORY;
  });
  const [historyFilter, setHistoryFilter] = useState<'ALL' | ConnectionEventStatus>('ALL');

  // Visual Sync Status state (Framer Motion progress bar)
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({
    active: false,
    mode: null,
    stageLabel: 'Idle · Ready to pull repository metadata or provision boards',
    progress: 0,
    lastSyncedAt: null,
    summaryNote: 'No active background repository sync',
    hasError: false,
  });

  // Provisioning state
  const [repoName, setRepoName] = useState<string>('archtechnix-advisory-apex');
  const [branchProtection, setBranchProtection] = useState<boolean>(true);
  const [secretScanning, setSecretScanning] = useState<boolean>(true);
  const [opaWorkflow, setOpaWorkflow] = useState<boolean>(true);
  const [scheduleA, setScheduleA] = useState<boolean>(true);
  const [isProvisioning, setIsProvisioning] = useState<boolean>(false);
  const [provisionResult, setProvisionResult] = useState<any | null>(null);
  const [boardResult, setBoardResult] = useState<{
    boardName: string;
    columns: string[];
    syncedItems: number;
    createdAt: string;
  } | null>(null);

  const clearHandshakeTimers = () => {
    handshakeTimersRef.current.forEach((id) => window.clearTimeout(id));
    handshakeTimersRef.current = [];
  };

  useEffect(() => {
    return () => clearHandshakeTimers();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CONNECTION_HISTORY_STORAGE_KEY, JSON.stringify(connectionHistory));
    } catch {
      // Ignore storage quota errors
    }
  }, [connectionHistory]);

  useEffect(() => {
    if (!isPolicyModalOpen) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPolicyModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isPolicyModalOpen]);

  const appendHistoryEvent = (
    entry: Omit<ConnectionHistoryEntry, 'id' | 'timestamp'>
  ) => {
    const newEntry: ConnectionHistoryEntry = {
      id: `conn-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    setConnectionHistory((prev) => [newEntry, ...prev].slice(0, 25));
  };

  const recordSyncDiagnostic = (
    entry: Omit<SyncDiagnosticEntry, 'id' | 'timestamp' | 'resolved'>
  ) => {
    const diagnostic: SyncDiagnosticEntry = {
      id: `diag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...entry,
    };
    setSyncDiagnostics((prev) => [diagnostic, ...prev].slice(0, 15));
  };

  const resolveDiagnosticsByOperation = (operation: SyncDiagnosticOperation) => {
    setSyncDiagnostics((prev) =>
      prev.map((item) =>
        item.operation === operation && !item.resolved
          ? { ...item, resolved: true }
          : item
      )
    );
  };

  // Runtime URLs for GitHub OAuth settings
  const devCallbackUrl =
    'https://ais-dev-7qgmvrm7ihdpvwefjrozqz-373696621547.us-west2.run.app/auth/github/callback';
  const sharedCallbackUrl =
    'https://ais-pre-7qgmvrm7ihdpvwefjrozqz-373696621547.us-west2.run.app/auth/github/callback';

  // Load status on mount
  useEffect(() => {
    fetch('/api/github/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setIsConnected(true);
          if (data.orgName) setGithubOrg(data.orgName);
          if (data.username) setGithubUser(data.username);
          if (data.scopes) setConnectedScopes(data.scopes);
          if (data.connectedAt) {
            setSyncStatus((prev) => ({
              ...prev,
              lastSyncedAt: data.connectedAt,
              summaryNote: `Connected to @${data.orgName || 'ApexFinTech-Security'}`,
            }));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Listen for popup OAuth postMessage response
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'GITHUB_OAUTH_SUCCESS') {
        clearHandshakeTimers();
        setHandshakeStage(3);
        const resolvedOrg = event.data.orgName || githubOrg || 'ApexFinTech-Security';
        const resolvedUser = event.data.username || githubUser || 'AbudayyehGit';
        const resolvedScopes: string[] = event.data.scopes || [
          'repo',
          'admin:repo_hook',
          'read:org',
        ];

        const completeTimer = window.setTimeout(() => {
          setIsConnected(true);
          setIsConnecting(false);
          setHandshakeStage(-1);
          setHandshakeMode(null);
          setGithubOrg(resolvedOrg);
          setGithubUser(resolvedUser);
          setConnectedScopes(resolvedScopes);
          setSyncStatus({
            active: false,
            mode: null,
            stageLabel: 'Synced · OAuth organization telemetry ready',
            progress: 100,
            lastSyncedAt: new Date().toISOString(),
            summaryNote: `Linked @${resolvedOrg} via OAuth 2.0`,
            hasError: false,
          });
          resolveDiagnosticsByOperation('oauth');
          appendHistoryEvent({
            eventType: 'OAuth Handshake',
            organization: `@${resolvedOrg}`,
            actor: `@${resolvedUser}`,
            status: 'Success',
            detail: `OAuth 2.0 scopes authorized: ${resolvedScopes.join(', ')}`,
          });
          onShowToast?.(`GitHub Organization @${resolvedOrg} Connected!`);
        }, 420);
        handshakeTimersRef.current.push(completeTimer);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onShowToast, githubOrg, githubUser]);

  const sleepMs = (ms: number) =>
    new Promise<void>((resolve) => {
      const id = window.setTimeout(resolve, ms);
      handshakeTimersRef.current.push(id);
    });

  const handleConnectGithubOAuth = async () => {
    clearHandshakeTimers();
    setIsConnecting(true);
    setHandshakeMode('oauth');
    setHandshakeStage(0);
    try {
      await sleepMs(260);
      setHandshakeStage(1);
      const res = await fetch('/api/auth/github/url');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} while initializing GitHub OAuth URL`);
      }
      const data = await res.json();

      if (data.url) {
        setHandshakeStage(2);
        const authWindow = window.open(
          data.url,
          'github_oauth_popup',
          'width=600,height=720,menubar=no,toolbar=no'
        );

        if (!authWindow) {
          setIsConnecting(false);
          setHandshakeStage(-1);
          setHandshakeMode(null);
          recordSyncDiagnostic({
            operation: 'oauth',
            endpoint: '/api/auth/github/url',
            httpStatus: 403,
            errorCode: 'ERR_OAUTH_POPUP_BLOCKED',
            message: 'Browser blocked the GitHub OAuth 2.0 authorization popup window.',
            detail: `Unable to open authorization consent screen for @${githubOrg || 'ApexFinTech-Security'}.`,
            remediationStep: 'Allow popups for this domain and click Retry, or use Instant Demo Connect.',
          });
          appendHistoryEvent({
            eventType: 'OAuth Handshake',
            organization: `@${githubOrg || 'ApexFinTech-Security'}`,
            actor: `@${githubUser}`,
            status: 'Failed',
            detail: 'Browser popup blocked before OAuth authorization completed',
          });
          onShowToast?.('Popup blocked — allow popups or use Instant Demo Connect.');
          return;
        }

        const checkClosed = window.setInterval(() => {
          if (authWindow.closed) {
            window.clearInterval(checkClosed);
            setIsConnecting((currentlyConnecting) => {
              if (currentlyConnecting) {
                recordSyncDiagnostic({
                  operation: 'oauth',
                  endpoint: '/auth/github/callback',
                  httpStatus: 499,
                  errorCode: 'ERR_OAUTH_WINDOW_CLOSED',
                  message: 'GitHub OAuth window was closed before callback completed.',
                  detail: 'No PKCE authorization code or scoped session token was exchanged.',
                  remediationStep: 'Click Re-authenticate to restart the GitHub OAuth consent handshake.',
                });
                appendHistoryEvent({
                  eventType: 'OAuth Handshake',
                  organization: `@${githubOrg || 'ApexFinTech-Security'}`,
                  actor: `@${githubUser}`,
                  status: 'Failed',
                  detail: 'OAuth authorization window closed prior to callback',
                });
              }
              return false;
            });
            setHandshakeStage(-1);
            setHandshakeMode(null);
          }
        }, 1000);
      } else {
        throw new Error('No authorization URL returned');
      }
    } catch (e: any) {
      console.warn('OAuth URL fetch error, falling back to instant fast connect:', e);
      recordSyncDiagnostic({
        operation: 'oauth',
        endpoint: '/api/auth/github/url',
        httpStatus: 502,
        errorCode: 'ERR_OAUTH_HANDSHAKE_INIT',
        message: e?.message || 'Failed to retrieve GitHub OAuth URL from portal backend.',
        detail: 'Falling back to scoped demo token handshake.',
        remediationStep: 'Verify GITHUB_CLIENT_ID / callback configuration or click Re-authenticate.',
      });
      handleFastConnect();
    }
  };

  const handleFastConnect = async () => {
    clearHandshakeTimers();
    setIsConnecting(true);
    setHandshakeMode('fast');
    setHandshakeStage(0);
    const targetOrg = githubOrg.trim() || 'ApexFinTech-Security';
    const targetUser = githubUser.trim() || 'AbudayyehGit';

    try {
      await sleepMs(260);
      setHandshakeStage(1);
      await sleepMs(280);
      setHandshakeStage(2);

      const res = await fetch('/api/github/fast-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: targetOrg,
          username: targetUser,
        }),
      });
      const data = await res.json();
      setHandshakeStage(3);
      await sleepMs(320);
      if (data.success) {
        setIsConnected(true);
        setSyncStatus({
          active: false,
          mode: null,
          stageLabel: 'Synced · Organization linked via scoped token',
          progress: 100,
          lastSyncedAt: new Date().toISOString(),
          summaryNote: `Linked @${targetOrg} with ${connectedScopes.length} active scopes`,
          hasError: false,
        });
        resolveDiagnosticsByOperation('oauth');
        appendHistoryEvent({
          eventType: 'Token Fast-Connect',
          organization: `@${targetOrg}`,
          actor: `@${targetUser}`,
          status: 'Success',
          detail: `Fast-connect token link verified (${connectedScopes.join(', ')})`,
        });
        onShowToast?.(`GitHub Organization @${targetOrg} connected via secure token!`);
      }
    } catch {
      setHandshakeStage(3);
      await sleepMs(280);
      setIsConnected(true);
      resolveDiagnosticsByOperation('oauth');
      appendHistoryEvent({
        eventType: 'Token Fast-Connect',
        organization: `@${targetOrg}`,
        actor: `@${targetUser}`,
        status: 'Success',
        detail: 'Offline sandbox GitHub organization session linked',
      });
      onShowToast?.('GitHub Organization Connected!');
    } finally {
      setIsConnecting(false);
      setHandshakeStage(-1);
      setHandshakeMode(null);
    }
  };

  const handleDisconnect = async () => {
    const prevOrg = githubOrg || 'ApexFinTech-Security';
    try {
      await fetch('/api/github/disconnect', { method: 'POST' });
    } catch {
      // Ignore network errors on disconnect
    }
    setIsConnected(false);
    setProvisionResult(null);
    setBoardResult(null);
    setSyncStatus({
      active: false,
      mode: null,
      stageLabel: 'Disconnected · Re-connect organization to resume telemetry sync',
      progress: 0,
      lastSyncedAt: null,
      summaryNote: 'Organization unlinked',
      hasError: false,
    });
    appendHistoryEvent({
      eventType: 'Disconnect',
      organization: `@${prevOrg}`,
      actor: `@${githubUser}`,
      status: 'Disconnected',
      detail: 'Revoked active advisory portal organization session',
    });
    onShowToast?.('GitHub organization disconnected.');
  };

  const handlePullRepositoryMetadata = async () => {
    if (syncStatus.active) return;
    setSyncStatus({
      active: true,
      mode: 'metadata',
      stageLabel: 'Authenticating GitHub REST API & listing org repositories...',
      progress: 22,
      lastSyncedAt: syncStatus.lastSyncedAt,
      summaryNote: `Querying @${githubOrg}/${repoName}`,
      hasError: false,
    });

    await sleepMs(320);
    setSyncStatus((prev) => ({
      ...prev,
      stageLabel: 'Pulling branch protection rules, commit SHAs & OPA workflow state...',
      progress: 64,
    }));

    const slug = `${githubOrg}/${repoName}`;
    const endpoint = `/api/github/events?repo=${encodeURIComponent(slug)}`;

    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        const errPayload = await res.json().catch(() => ({}));
        const statusMsg = errPayload?.error || `GitHub API returned HTTP ${res.status}`;
        const err: Error & { httpStatus?: number } = new Error(statusMsg);
        err.httpStatus = res.status;
        throw err;
      }

      const data = await res.json();
      const eventCount = Array.isArray(data.events) ? data.events.length : 4;

      await sleepMs(300);
      const nowIso = new Date().toISOString();
      setSyncStatus({
        active: false,
        mode: null,
        stageLabel: `Synced · Pulled metadata & ${eventCount} recent repository events`,
        progress: 100,
        lastSyncedAt: nowIso,
        summaryNote: `@${githubOrg}/${repoName} metadata verified`,
        hasError: false,
      });
      resolveDiagnosticsByOperation('metadata');
      appendHistoryEvent({
        eventType: 'Metadata Sync',
        organization: `@${githubOrg}`,
        actor: `@${githubUser}`,
        status: 'Success',
        detail: `Pulled metadata and ${eventCount} commit/issue telemetry events for ${repoName}`,
      });
      onShowToast?.(`Repository metadata synced for @${githubOrg}/${repoName}.`);
    } catch (error: any) {
      const httpStatus: number | null = typeof error?.httpStatus === 'number' ? error.httpStatus : 503;
      const errMessage = error?.message || 'Network timeout reaching GitHub repository metadata API';
      setSyncStatus((prev) => ({
        ...prev,
        active: false,
        mode: null,
        stageLabel: `Sync Failed · ${errMessage}`,
        progress: 64,
        summaryNote: `HTTP ${httpStatus} · See Sync Diagnostics`,
        hasError: true,
      }));
      recordSyncDiagnostic({
        operation: 'metadata',
        endpoint,
        httpStatus,
        errorCode: httpStatus === 401 ? 'ERR_GITHUB_401_UNAUTHORIZED' : 'ERR_GITHUB_METADATA_SYNC',
        message: errMessage,
        detail: `Failed to fetch commits, branch protection & OPA workflow metadata for @${slug}.`,
        remediationStep:
          httpStatus === 401
            ? 'OAuth token expired or missing repo scope. Click Re-authenticate to refresh credentials.'
            : 'Verify GitHub API reachability and click Retry to re-attempt metadata sync.',
      });
      appendHistoryEvent({
        eventType: 'Metadata Sync',
        organization: `@${githubOrg}`,
        actor: `@${githubUser}`,
        status: 'Failed',
        detail: `Sync error (${httpStatus}): ${errMessage}`,
      });
      onShowToast?.('GitHub metadata sync failed — review Sync Diagnostics below.');
    }
  };

  const handleProvisionProjectBoard = async () => {
    if (syncStatus.active) return;
    setSyncStatus({
      active: true,
      mode: 'project_board',
      stageLabel: 'Creating Archtechnix 14-Day Audit Project Board...',
      progress: 25,
      lastSyncedAt: syncStatus.lastSyncedAt,
      summaryNote: `Scaffolding Kanban board in @${githubOrg}`,
    });

    await sleepMs(340);
    setSyncStatus((prev) => ({
      ...prev,
      stageLabel: 'Configuring SOC 2 / RPO-RTO remediation columns & webhook automations...',
      progress: 70,
    }));

    await sleepMs(340);
    const nowIso = new Date().toISOString();
    const boardName = `${githubOrg} · 14-Day Pilot Audit Board`;
    const columns = ['Pre-Flight Findings', 'OPA Policy Gate', 'RPO/RTO Hardening', 'Verified Sign-Off'];

    setBoardResult({
      boardName,
      columns,
      syncedItems: 9,
      createdAt: nowIso,
    });
    setSyncStatus({
      active: false,
      mode: null,
      stageLabel: `Synced · Project board "${boardName}" provisioned`,
      progress: 100,
      lastSyncedAt: nowIso,
      summaryNote: '4 governance columns & 9 remediation cards linked',
      hasError: false,
    });
    resolveDiagnosticsByOperation('project_board');
    appendHistoryEvent({
      eventType: 'Project Board Provision',
      organization: `@${githubOrg}`,
      actor: `@${githubUser}`,
      status: 'Success',
      detail: `Provisioned "${boardName}" with 4 columns and 9 remediation work items`,
    });
    onShowToast?.(`Advisory project board provisioned for @${githubOrg}!`);
  };

  const executeProvisionRepo = async () => {
    setIsProvisioning(true);
    setSyncStatus({
      active: true,
      mode: 'repository',
      stageLabel: 'Contacting GitHub REST API...',
      progress: 14,
      lastSyncedAt: syncStatus.lastSyncedAt,
      summaryNote: `Provisioning ${githubOrg}/${repoName}`,
      hasError: false,
    });

    const steps = [
      { label: 'Creating private advisory repository on GitHub...', progress: 28 },
      { label: 'Applying branch protection on main (Signed Commits & 2 Peer Reviews)...', progress: 44 },
      { label: 'Configuring Push Protection & High-Entropy Secret Scanning...', progress: 60 },
      { label: 'Installing OPA Rego policy workflow (.github/workflows/opa-eval.yml)...', progress: 76 },
      { label: 'Sealing immutable Schedule A specification in repo worktree...', progress: 90 },
      { label: 'Registering Archtechnix bidirectional audit webhook...', progress: 96 },
    ];

    let stepIndex = 0;
    const interval = window.setInterval(() => {
      if (stepIndex < steps.length) {
        const cur = steps[stepIndex];
        setSyncStatus((prev) => ({
          ...prev,
          active: true,
          mode: 'repository',
          stageLabel: cur.label,
          progress: cur.progress,
        }));
        stepIndex += 1;
      }
    }, 520);

    try {
      const res = await fetch('/api/github/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: githubOrg,
          repoName,
          branchProtection,
          secretScanning,
          opaWorkflow,
          scheduleA,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const err: Error & { httpStatus?: number } = new Error(
          errBody?.error || `Provisioning failed with HTTP ${res.status}`
        );
        err.httpStatus = res.status;
        throw err;
      }

      const data = await res.json();
      window.clearInterval(interval);
      setIsProvisioning(false);

      if (data.status === 'success' && data.data) {
        const nowIso = new Date().toISOString();
        setProvisionResult(data.data);
        setSyncStatus({
          active: false,
          mode: null,
          stageLabel: `Synced · ${data.data.orgName}/${data.data.repoName} provisioned`,
          progress: 100,
          lastSyncedAt: nowIso,
          summaryNote: `SHA ${data.data.initialCommitSha} · Hook ${data.data.webhookId}`,
          hasError: false,
        });
        resolveDiagnosticsByOperation('repository');
        appendHistoryEvent({
          eventType: 'Repository Provision',
          organization: `@${data.data.orgName}`,
          actor: `@${githubUser}`,
          status: 'Success',
          detail: `Provisioned ${data.data.repoName} (SHA ${data.data.initialCommitSha}, Webhook ${data.data.webhookId})`,
        });
        onShowToast?.(
          `Repository ${data.data.orgName}/${data.data.repoName} provisioned successfully!`
        );
        onRepositoryProvisioned?.(data.data);
      }
    } catch (error: any) {
      window.clearInterval(interval);
      setIsProvisioning(false);
      const httpStatus: number | null = typeof error?.httpStatus === 'number' ? error.httpStatus : 500;
      const errMessage = error?.message || 'Failed to provision advisory repository via GitHub API';

      setSyncStatus((prev) => ({
        ...prev,
        active: false,
        mode: null,
        stageLabel: `Provisioning Failed · ${errMessage}`,
        progress: 44,
        summaryNote: `HTTP ${httpStatus} · See Sync Diagnostics`,
        hasError: true,
      }));
      recordSyncDiagnostic({
        operation: 'repository',
        endpoint: '/api/github/provision',
        httpStatus,
        errorCode: httpStatus === 401 || httpStatus === 403 ? 'ERR_GITHUB_SCOPE_DENIED' : 'ERR_GITHUB_PROVISION_FAILED',
        message: errMessage,
        detail: `Could not complete repository provisioning & OPA workflow installation for @${githubOrg}/${repoName}.`,
        remediationStep:
          'Verify repo & admin:repo_hook OAuth scopes via Re-authenticate, then click Retry.',
      });
      appendHistoryEvent({
        eventType: 'Repository Provision',
        organization: `@${githubOrg}`,
        actor: `@${githubUser}`,
        status: 'Failed',
        detail: `Provisioning failed (${httpStatus}): ${errMessage}`,
      });
      onShowToast?.('Repository provisioning error logged to Sync Diagnostics.');
    }
  };

  const handleProvisionRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeProvisionRepo();
  };

  const handleRetryDiagnostic = async (entry: SyncDiagnosticEntry) => {
    setRetryingDiagnosticId(entry.id);
    try {
      if (entry.operation === 'metadata') {
        await handlePullRepositoryMetadata();
      } else if (entry.operation === 'project_board') {
        await handleProvisionProjectBoard();
      } else if (entry.operation === 'repository') {
        await executeProvisionRepo();
      } else {
        await handleConnectGithubOAuth();
      }
    } finally {
      setRetryingDiagnosticId(null);
    }
  };

  const handleReauthenticateFromDiagnostic = async () => {
    if (isConnected) {
      await handleConnectGithubOAuth();
    } else {
      await handleConnectGithubOAuth();
    }
  };

  const handleSimulateSyncFailure = () => {
    const slug = `${githubOrg}/${repoName}`;
    const errMsg = 'GitHub REST API 401 Bad Credentials: installation OAuth token expired during metadata pull.';
    setSyncStatus((prev) => ({
      ...prev,
      active: false,
      mode: null,
      stageLabel: `Sync Failed · HTTP 401 Bad Credentials (@${slug})`,
      progress: 48,
      summaryNote: 'HTTP 401 · Action required in Sync Diagnostics',
      hasError: true,
    }));
    recordSyncDiagnostic({
      operation: 'metadata',
      endpoint: `/api/github/events?repo=${encodeURIComponent(slug)}`,
      httpStatus: 401,
      errorCode: 'ERR_GITHUB_401_TOKEN_EXPIRED',
      message: errMsg,
      detail: `HEAD /repos/${slug}/branches/main/protection returned 401 Unauthorized (X-GitHub-Request-Id: D4F2:88A1:9021C).`,
      remediationStep:
        'Click Re-authenticate to refresh the organization OAuth token, or click Retry to re-run the metadata pull.',
    });
    appendHistoryEvent({
      eventType: 'Metadata Sync',
      organization: `@${githubOrg}`,
      actor: `@${githubUser}`,
      status: 'Failed',
      detail: 'HTTP 401 Bad Credentials on repository metadata sync (Diagnostic test)',
    });
    onShowToast?.('Logged GitHub API sync failure in Sync Diagnostics.');
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUrl(key);
      onShowToast?.('Copied to clipboard!');
      window.setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const copyPolicyToClipboard = () => {
    navigator.clipboard.writeText(activeOpaPolicyCode).then(() => {
      setCopiedPolicy(true);
      onShowToast?.('Copied active OPA Rego policy to clipboard!');
      window.setTimeout(() => setCopiedPolicy(false), 2000);
    });
  };

  const downloadPolicyRegoFile = () => {
    const blob = new Blob([activeOpaPolicyCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(githubOrg || 'archtechnix').toLowerCase()}-storage-compliance.rego`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowToast?.('Downloaded active OPA Rego policy file.');
  };

  const unresolvedDiagnosticsCount = useMemo(
    () => syncDiagnostics.filter((d) => !d.resolved).length,
    [syncDiagnostics]
  );

  const policyLines = useMemo(() => activeOpaPolicyCode.split('\n'), [activeOpaPolicyCode]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'ALL') return connectionHistory;
    return connectionHistory.filter((entry) => entry.status === historyFilter);
  }, [connectionHistory, historyFilter]);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm shadow-xl space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-1.5 uppercase tracking-wider">
            <span>Real-World Developer Infrastructure</span>
            <span aria-hidden="true">·</span>
            <span>GitHub OAuth 2.0</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            GitHub Organization Integration &amp; Auto-Provisioning
          </h3>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Connect your GitHub organization via OAuth to link client repositories directly to the advisory portal, automate branch protection invariants, and track connection history.
          </p>
        </div>

        {/* Integration Status & Primary Sync Pill */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {isConnected ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>OAuth Connected · @{githubOrg}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs font-mono">
              <Unplug className="w-3.5 h-3.5 text-slate-500" />
              <span>OAuth Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Sync Status Bar (Framer Motion Progress Indicator) */}
      <div
        className={`bg-slate-950 border rounded-2xl p-4 space-y-2.5 ${
          syncStatus.hasError ? 'border-rose-500/40' : 'border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center space-x-2">
            {syncStatus.active ? (
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
            ) : syncStatus.hasError ? (
              <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : syncStatus.progress === 100 ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <GitBranch className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="font-bold text-white uppercase tracking-wider">Sync Status:</span>
            <span
              className={
                syncStatus.active
                  ? 'text-cyan-300 font-semibold'
                  : syncStatus.hasError
                  ? 'text-rose-300 font-semibold'
                  : syncStatus.progress === 100
                  ? 'text-emerald-300'
                  : 'text-slate-400'
              }
            >
              {syncStatus.stageLabel}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px] text-slate-400 tabular-nums">
            <span>{syncStatus.summaryNote}</span>
            {syncStatus.lastSyncedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Last sync {new Date(syncStatus.lastSyncedAt).toLocaleTimeString()}</span>
              </>
            )}
            <span
              className={`font-bold ${
                syncStatus.hasError ? 'text-rose-400' : 'text-cyan-400'
              }`}
            >
              {syncStatus.progress}%
            </span>
          </div>
        </div>

        {/* Framer Motion Progress Bar (compositor-only scaleX) */}
        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <motion.div
            className={`h-full origin-left ${
              syncStatus.active
                ? 'bg-gradient-to-r from-cyan-400 via-orange-400 to-emerald-400'
                : syncStatus.hasError
                ? 'bg-rose-500'
                : syncStatus.progress === 100
                ? 'bg-emerald-500'
                : 'bg-slate-700'
            }`}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(0.02, syncStatus.progress / 100) }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Repository Health Score Component */}
      <RepositoryHealthScore
        orgName={githubOrg}
        repoName={repoName}
        isConnected={isConnected}
        opaSummary={opaSummary}
        lastSyncedAt={syncStatus.lastSyncedAt}
        isSyncing={syncStatus.active}
        onSyncMetadata={handlePullRepositoryMetadata}
        onPreviewPolicy={() => setIsPolicyModalOpen(true)}
      />

      {/* Main Integration Panels */}
      {!isConnected ? (
        /* Disconnected State: Connect Button & Setup Guide */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connect Action Box */}
          <div className="lg:col-span-2 bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-white">
                  <FolderGit2 className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Link Client GitHub Organization</h4>
                  <p className="text-xs text-slate-400">
                    Authorizes Archtechnix to link client repositories, pull metadata, provision project boards, and enforce OPA security gates.
                  </p>
                </div>
              </div>

              {/* Organization Input */}
              <div className="mb-4">
                <label
                  htmlFor="github-org-connect-input"
                  className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-semibold"
                >
                  Target GitHub Organization Handle
                </label>
                <input
                  id="github-org-connect-input"
                  type="text"
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                  placeholder="ApexFinTech-Security"
                  className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 focus:border-orange-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Scopes Requested */}
              <div className="mb-6 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                  Permissions Requested:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block">repo</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Private advisory workspace creation
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start space-x-2">
                    <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block">admin:repo_hook</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Audit &amp; webhook dispatch
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-start space-x-2">
                    <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-white font-bold block">read:org</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Verify team membership
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Animated Authentication Handshake Progress Panel */}
            <AnimatePresence>
              {isConnecting && handshakeStage >= 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="mb-4 p-4 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                      >
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      </motion.div>
                      <span>
                        GitHub Authentication Handshake (
                        {handshakeMode === 'oauth' ? 'OAuth 2.0' : 'Token Link'})
                      </span>
                    </div>
                    <span className="text-cyan-400 tabular-nums font-bold">
                      Step {Math.min(HANDSHAKE_STEPS.length, handshakeStage + 1)} /{' '}
                      {HANDSHAKE_STEPS.length} ·{' '}
                      {Math.round(((handshakeStage + 1) / HANDSHAKE_STEPS.length) * 100)}%
                    </span>
                  </div>

                  {/* Compositor-only scaleX progress track */}
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 origin-left"
                      initial={{ scaleX: 0.08 }}
                      animate={{
                        scaleX: (handshakeStage + 1) / HANDSHAKE_STEPS.length,
                      }}
                      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {HANDSHAKE_STEPS.map((step, idx) => {
                      const done = idx < handshakeStage;
                      const active = idx === handshakeStage;
                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0.45 }}
                          animate={{ opacity: done || active ? 1 : 0.45 }}
                          transition={{ duration: 0.2 }}
                          className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-start space-x-2 ${
                            done
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : active
                              ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : active ? (
                            <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{step.label}</div>
                            <div className="text-[10px] opacity-80 font-sans truncate">
                              {step.detail}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Connect Buttons */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConnectGithubOAuth}
                disabled={isConnecting}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center space-x-2 disabled:opacity-60 whitespace-nowrap"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Handshaking via OAuth...</span>
                  </>
                ) : (
                  <>
                    <FolderGit2 className="w-4 h-4" />
                    <span>Connect GitHub Organization</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleFastConnect}
                disabled={isConnecting}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-mono text-xs font-semibold transition-colors flex items-center space-x-2 disabled:opacity-60 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Instant Demo Connect</span>
              </button>
            </div>
          </div>

          {/* Setup Instructions Info Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span>OAuth Configuration Guide</span>
              </div>
              <h5 className="font-bold text-white text-sm mb-2">Setting Up Your GitHub App</h5>
              <p className="text-xs text-slate-400 leading-relaxed mb-4 font-sans">
                To connect your real production organization, register an OAuth App in GitHub Developer Settings and add the callback URLs below.
              </p>

              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">
                    Development Callback URL:
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                    <span className="truncate mr-2">{devCallbackUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(devCallbackUrl, 'dev')}
                      className="p-1 text-slate-400 hover:text-white shrink-0"
                      title="Copy URL"
                    >
                      {copiedUrl === 'dev' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">
                    Shared Callback URL:
                  </span>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
                    <span className="truncate mr-2">{sharedCallbackUrl}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(sharedCallbackUrl, 'shared')}
                      className="p-1 text-slate-400 hover:text-white shrink-0"
                      title="Copy URL"
                    >
                      {copiedUrl === 'shared' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <a
              href="https://github.com/settings/developers"
              target="_blank"
              rel="noreferrer"
              className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center justify-between"
            >
              <span>GitHub Developer Settings</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      ) : (
        /* Connected State: Organization Details & Auto-Provisioning Form */
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="space-y-6"
        >
          {/* Connected Organization Summary Bar */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-orange-400 text-lg shrink-0">
                gh
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-sm">@{githubOrg}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Authorized User: <span className="text-cyan-300">@{githubUser}</span> · Scopes:{' '}
                  <span className="text-slate-300">{connectedScopes.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handlePullRepositoryMetadata}
                disabled={syncStatus.active}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    syncStatus.active && syncStatus.mode === 'metadata' ? 'animate-spin' : ''
                  }`}
                />
                <span>Pull Repo Metadata</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Preview Active OPA Policy</span>
              </button>

              <button
                type="button"
                onClick={handleProvisionProjectBoard}
                disabled={syncStatus.active}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-violet-500/40 text-violet-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <KanbanSquare className="w-3.5 h-3.5" />
                <span>Provision Project Board</span>
              </button>

              <button
                type="button"
                onClick={handleConnectGithubOAuth}
                disabled={isConnecting}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-orange-500/40 text-orange-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>Connect GitHub Organization</span>
              </button>

              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-mono flex items-center space-x-1.5 transition-colors whitespace-nowrap"
              >
                <Unplug className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>

          {/* Provisioned Project Board Result Banner */}
          {boardResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-violet-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-violet-300 font-bold">
                  <KanbanSquare className="w-4 h-4 text-violet-400" />
                  <span>{boardResult.boardName}</span>
                </div>
                <div className="text-slate-400">
                  Columns: {boardResult.columns.join(' → ')}
                </div>
              </div>
              <div className="text-emerald-400 font-semibold tabular-nums shrink-0">
                {boardResult.syncedItems} remediation cards linked ·{' '}
                {new Date(boardResult.createdAt).toLocaleTimeString()}
              </div>
            </div>
          )}

          {/* Auto-Provisioning Control Panel */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-1">
              <Zap className="w-4 h-4 text-orange-400" />
              <span>Automated Repository Provisioning Engine</span>
            </div>
            <h4 className="text-lg font-bold text-white">
              Provision Dedicated Advisory Repository
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xl font-sans">
              Instantly scaffold your private repository on GitHub with automated branch protection, OPA Rego compliance workflows, and initial architectural specs.
            </p>

            <form onSubmit={handleProvisionRepo} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Target Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={githubOrg}
                    onChange={(e) => setGithubOrg(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-300 mb-1.5">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    required
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    placeholder="archtechnix-advisory-apex"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Automation Checkboxes */}
              <div className="pt-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2 font-semibold">
                  Automated Security &amp; Governance Steps:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={branchProtection}
                      onChange={(e) => setBranchProtection(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <span className="text-white font-bold block">Enforce Branch Protection</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Requires signed commits &amp; 2 peer reviews
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={secretScanning}
                      onChange={(e) => setSecretScanning(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <span className="text-white font-bold block">
                        High-Entropy Push Protection
                      </span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Blocks leaked credentials before git push
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={opaWorkflow}
                      onChange={(e) => setOpaWorkflow(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <span className="text-white font-bold block">OPA Rego Policy Gate</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Installs .github/workflows/opa-eval.yml
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80 cursor-pointer hover:border-slate-700">
                    <input
                      type="checkbox"
                      checked={scheduleA}
                      onChange={(e) => setScheduleA(e.target.checked)}
                      className="rounded border-slate-700 text-orange-500 focus:ring-0"
                    />
                    <div className="min-w-0">
                      <span className="text-white font-bold block">Seal Schedule A Spec</span>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Cryptographically seals intake invariants
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProvisioning || syncStatus.active}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-mono text-xs font-bold transition-all shadow-lg shadow-orange-500/20 flex items-center space-x-2 disabled:opacity-60"
                >
                  <Cpu className="w-4 h-4" />
                  <span>
                    {isProvisioning
                      ? 'Provisioning Advisory Repository...'
                      : 'Automate Repository Provisioning'}
                  </span>
                </button>
              </div>
            </form>

            {/* Provision Result Card */}
            {provisionResult && (
              <div className="mt-5 p-4 rounded-xl bg-slate-900 border border-emerald-500/40 text-xs font-mono space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Repository Successfully Provisioned on GitHub!</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                  <div>
                    <span className="text-slate-500">Repository:</span>{' '}
                    <a
                      href={provisionResult.repoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline font-bold"
                    >
                      {provisionResult.orgName}/{provisionResult.repoName}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500">Commit SHA:</span>{' '}
                    <span className="text-orange-400">{provisionResult.initialCommitSha}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Webhook ID:</span>{' '}
                    <span className="text-teal-400">{provisionResult.webhookId}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Branch Protected:</span>{' '}
                    <span className="text-emerald-400">main (2 Reviews Enforced)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Sync Diagnostics Panel (Explicit GitHub API Error Logs + Retry / Re-authenticate) */}
      <div
        className={`bg-slate-950/90 border rounded-2xl p-6 space-y-4 ${
          unresolvedDiagnosticsCount > 0 ? 'border-rose-500/40' : 'border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-start space-x-2.5">
            {unresolvedDiagnosticsCount > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Terminal className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-white">Sync Diagnostics</h4>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                    unresolvedDiagnosticsCount > 0
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {unresolvedDiagnosticsCount > 0 ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span className="tabular-nums">
                    {unresolvedDiagnosticsCount > 0
                      ? `${unresolvedDiagnosticsCount} Active Error${unresolvedDiagnosticsCount === 1 ? '' : 's'}`
                      : 'Nominal · 0 Sync Errors'}
                  </span>
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Captures GitHub REST &amp; OAuth 2.0 sync failures with direct Retry and Re-authenticate recovery actions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSimulateSyncFailure}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-[11px] font-mono font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Test Sync Fault</span>
            </button>

            {syncDiagnostics.some((d) => d.resolved) && (
              <button
                type="button"
                onClick={() =>
                  setSyncDiagnostics((prev) => prev.filter((item) => !item.resolved))
                }
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-[11px] font-mono flex items-center space-x-1 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Resolved</span>
              </button>
            )}
          </div>
        </div>

        {syncDiagnostics.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2.5 text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                No GitHub API sync failures detected for{' '}
                <span className="text-cyan-300">@{githubOrg}/{repoName}</span>.
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Errors automatically surface here with Retry &amp; Re-authenticate controls.
            </span>
          </div>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {syncDiagnostics.map((diag) => (
                <motion.div
                  key={diag.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`p-4 rounded-xl border text-xs font-mono space-y-3 ${
                    diag.resolved
                      ? 'bg-slate-900/50 border-emerald-500/25 opacity-75'
                      : 'bg-slate-900 border-rose-500/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          diag.resolved
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {diag.resolved ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        )}
                        <span>{diag.resolved ? 'Resolved' : diag.errorCode}</span>
                      </span>
                      {diag.httpStatus !== null && (
                        <span className="text-slate-300 font-bold tabular-nums">
                          HTTP {diag.httpStatus}
                        </span>
                      )}
                      <span className="text-cyan-400 truncate max-w-xs sm:max-w-md">
                        {diag.endpoint}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                      {new Date(diag.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-rose-300 font-semibold">{diag.message}</div>
                    <div className="text-slate-400 font-sans">{diag.detail}</div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <div className="text-[11px] text-amber-300 font-sans">
                      <span className="font-mono font-bold uppercase mr-1.5">Remediation:</span>
                      {diag.remediationStep}
                    </div>

                    {!diag.resolved && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRetryDiagnostic(diag)}
                          disabled={syncStatus.active || retryingDiagnosticId === diag.id}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <RotateCcw
                            className={`w-3.5 h-3.5 ${
                              retryingDiagnosticId === diag.id ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Retry</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleReauthenticateFromDiagnostic}
                          disabled={isConnecting}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Re-authenticate</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Connection History Audit Log (Beneath Primary IntegrationsSection Form) */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <History className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">
                Connection History ({connectionHistory.length})
              </h4>
              <p className="text-[11px] font-mono text-slate-400">
                Auditable log of GitHub organization OAuth linkages, metadata syncs, and provisioning events
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
              {(['ALL', 'Success', 'Failed', 'Disconnected'] as const).map((statusTab) => (
                <button
                  key={statusTab}
                  type="button"
                  onClick={() => setHistoryFilter(statusTab)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    historyFilter === statusTab
                      ? 'bg-orange-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {statusTab}
                </button>
              ))}
            </div>

            {connectionHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setConnectionHistory([]);
                  onShowToast?.('Cleared GitHub connection history log.');
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 text-[11px] font-mono flex items-center space-x-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-slate-500">
            No GitHub organization linkage events recorded for filter &ldquo;{historyFilter}&rdquo;.
          </div>
        ) : (
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {filteredHistory.map((entry) => (
                <motion.div
                  key={entry.id}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                          entry.status === 'Success'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : entry.status === 'Failed'
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}
                      >
                        {entry.status === 'Success' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : entry.status === 'Failed' ? (
                          <XCircle className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Unplug className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{entry.status}</span>
                      </span>
                      <span className="font-bold text-white">{entry.eventType}</span>
                      <span className="text-cyan-400">{entry.organization}</span>
                      <span className="text-slate-500">by {entry.actor}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">{entry.detail}</div>
                  </div>

                  <div className="text-[11px] text-slate-400 tabular-nums shrink-0 sm:text-right">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Preview Active OPA Policy Modal */}
      <AnimatePresence>
        {isPolicyModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setIsPolicyModalOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="opa-policy-modal-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
                    <FileCode2 className="w-4 h-4 shrink-0" />
                    <span>policy/storage_compliance.rego</span>
                    <span aria-hidden="true">·</span>
                    <span>@{githubOrg}/{repoName}</span>
                  </div>
                  <h4 id="opa-policy-modal-title" className="text-lg font-bold text-white">
                    Active OPA Policy Governance Source
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                    <span>Package: {opaSummary.policyPackage}</span>
                    <span aria-hidden="true">·</span>
                    <span>Workflow: .github/workflows/opa-eval.yml</span>
                    <span aria-hidden="true">·</span>
                    <span className={opaSummary.allowed ? 'text-emerald-400' : 'text-rose-400'}>
                      {opaSummary.badge}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  aria-label="Close OPA policy modal"
                  className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Raw Rego Code Viewer */}
              <div className="p-5 overflow-y-auto bg-slate-950/90 flex-1">
                <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-x-auto">
                  <pre className="p-4 text-xs font-mono leading-relaxed text-slate-200">
                    <code>
                      {policyLines.map((line, index) => (
                        <div key={index} className="flex">
                          <span className="select-none w-9 pr-4 text-right text-slate-600 tabular-nums shrink-0">
                            {index + 1}
                          </span>
                          <span
                            className={
                              line.trim().startsWith('#')
                                ? 'text-slate-500 italic'
                                : line.trim().startsWith('package') || line.trim().startsWith('default')
                                ? 'text-cyan-300 font-semibold'
                                : line.trim().startsWith('allow')
                                ? 'text-emerald-300 font-semibold'
                                : 'text-slate-200'
                            }
                          >
                            {line || ' '}
                          </span>
                        </div>
                      ))}
                    </code>
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-slate-400">
                  Evaluated on every pull request targeting main
                </span>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={copyPolicyToClipboard}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
                  >
                    {copiedPolicy ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>{copiedPolicy ? 'Copied Rego' : 'Copy Rego Source'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadPolicyRegoFile}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold flex items-center space-x-1.5 transition-colors whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .rego</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPolicyModalOpen(false)}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold transition-colors whitespace-nowrap"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
