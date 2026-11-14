import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Download,
  Edit3,
  Eye,
  FileCode2,
  FileText,
  Plus,
  Save,
  Shield,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { downloadArchitectureDossierPdf } from '../lib/dossierPdf';
import {
  DEFAULT_OFFLINE_ADRS,
  DEFAULT_OFFLINE_AGENDA,
  offlineDb,
  type OfflineAdrDoc,
  type OfflinePreReadItem,
  type OfflineSyncAgenda,
} from '../lib/offlineDb';
import type { IntakeSpecData, SystemSteadyState } from '../types';
import { ClientActivityStream } from './ClientActivityStream';
import { MarkdownViewer } from './MarkdownViewer';

interface RetainerGovernanceHubProps {
  onActivateRetainerCheckout: () => void;
  onShowToast: (msg: string) => void;
  isCheckingOut?: boolean;
  intakeData?: IntakeSpecData;
  steadyStates?: SystemSteadyState[];
}

const DOC_CATEGORIES: Array<{
  type: OfflineAdrDoc['docType'];
  label: string;
}> = [
  { type: 'SSD', label: 'SSD & Architecture' },
  { type: 'ADR', label: 'Decision Records (ADRs)' },
  { type: 'DATA_FLOW', label: 'Data Flow & Compliance' },
  { type: 'RISK_REGISTER', label: 'Risk & Mitigation' },
];

export const RetainerGovernanceHub: React.FC<RetainerGovernanceHubProps> = ({
  onActivateRetainerCheckout,
  onShowToast,
  isCheckingOut = false,
  intakeData,
  steadyStates = [],
}) => {
  const { user, idToken, workspace, capacity, signInWithGoogle, refreshWorkspace } = useAuth();

  const [docs, setDocs] = useState<OfflineAdrDoc[]>(DEFAULT_OFFLINE_ADRS);
  const [selectedDocId, setSelectedDocId] = useState<number>(1);
  const [isEditingDoc, setIsEditingDoc] = useState<boolean>(false);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [draftMarkdown, setDraftMarkdown] = useState<string>('');
  const [savingDoc, setSavingDoc] = useState<boolean>(false);

  // New ADR / Doc Modal
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [newDocType, setNewDocType] = useState<OfflineAdrDoc['docType']>('ADR');
  const [newDocNumber, setNewDocNumber] = useState<string>('ADR-015');
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocStatus, setNewDocStatus] = useState<string>('Proposed');
  const [newDocContent, setNewDocContent] = useState<string>(
    `# ADR-015: Architecture Decision Title\n\n## Context\nDescribe the architectural bottleneck or regulatory constraint.\n\n## Decision\nOutline the deterministic system invariant or IaC pattern.\n\n## Consequences\n- Operational impact and RPO/RTO verification target.`
  );
  const [creatingDoc, setCreatingDoc] = useState<boolean>(false);

  const [agenda, setAgenda] = useState<OfflineSyncAgenda>(DEFAULT_OFFLINE_AGENDA);
  const [newChecklistLabel, setNewChecklistLabel] = useState<string>('');
  const [savingAgenda, setSavingAgenda] = useState<boolean>(false);

  useEffect(() => {
    offlineDb.adrs
      .toArray()
      .then((rows) => {
        if (rows.length > 0) {
          setDocs(rows);
          setSelectedDocId(rows[0].id);
        } else {
          offlineDb.adrs.bulkPut(DEFAULT_OFFLINE_ADRS).catch(() => {});
        }
      })
      .catch(() => {});

    offlineDb.syncAgendas
      .toArray()
      .then((rows) => {
        if (rows.length > 0) {
          setAgenda(rows[0]);
        } else {
          offlineDb.syncAgendas.put(DEFAULT_OFFLINE_AGENDA).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (workspace?.adrs && workspace.adrs.length > 0) {
      setDocs(workspace.adrs);
      setSelectedDocId((prev) =>
        workspace.adrs.some((d) => d.id === prev) ? prev : workspace.adrs[0].id
      );
      offlineDb.adrs.bulkPut(workspace.adrs).catch(() => {});
    }
    if (workspace?.syncAgendas && workspace.syncAgendas.length > 0) {
      setAgenda(workspace.syncAgendas[0]);
      offlineDb.syncAgendas.put(workspace.syncAgendas[0]).catch(() => {});
    }
  }, [workspace?.adrs, workspace?.syncAgendas]);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === selectedDocId) || docs[0],
    [docs, selectedDocId]
  );

  useEffect(() => {
    if (activeDoc) {
      setDraftTitle(activeDoc.title);
      setDraftMarkdown(activeDoc.markdownContent);
    }
  }, [activeDoc]);

  const retainerActive = workspace?.retainer?.status === 'active';
  const preReadCompleted = agenda.preReadChecklist.filter((i) => i.completed).length;
  const preReadPercent =
    agenda.preReadChecklist.length > 0
      ? Math.round((preReadCompleted / agenda.preReadChecklist.length) * 100)
      : 0;

  const ensureAuthToken = async (): Promise<string | null> => {
    if (user && idToken) return idToken;
    await signInWithGoogle();
    const { auth } = await import('../lib/firebase');
    return auth.currentUser ? await auth.currentUser.getIdToken() : null;
  };

  const handleSaveDoc = async () => {
    if (!activeDoc) return;
    setSavingDoc(true);
    const updatedDoc: OfflineAdrDoc = {
      ...activeDoc,
      title: draftTitle.trim() || activeDoc.title,
      markdownContent: draftMarkdown,
      updatedAt: new Date().toISOString(),
    };

    setDocs((prev) => prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)));
    await offlineDb.adrs.put(updatedDoc).catch(() => {});

    try {
      const token = await ensureAuthToken();
      if (!token) {
        onShowToast('Google Sign-In required to save governance edits to Cloud SQL.');
        setSavingDoc(false);
        return;
      }

      const resp = await fetch(`/api/adrs/${updatedDoc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedDoc),
      });
      if (resp.ok) {
        await refreshWorkspace(token);
        onShowToast(`${updatedDoc.docNumber} persisted to Cloud SQL!`);
      } else {
        onShowToast(`${updatedDoc.docNumber} saved offline; Cloud SQL update returned an error.`);
      }
    } catch {
      onShowToast(`${updatedDoc.docNumber} saved locally in IndexedDB.`);
    }

    setIsEditingDoc(false);
    setSavingDoc(false);
  };

  const handleCreateNewDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) {
      onShowToast('Document title and Markdown content are required.');
      return;
    }

    setCreatingDoc(true);
    try {
      const token = await ensureAuthToken();
      if (!token) {
        onShowToast('Google Sign-In is required to create and persist new ADRs.');
        setCreatingDoc(false);
        return;
      }

      const resp = await fetch('/api/adrs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          docType: newDocType,
          docNumber: newDocNumber.trim() || `ADR-${docs.length + 15}`,
          title: newDocTitle.trim(),
          status: newDocStatus,
          markdownContent: newDocContent,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create ADR document');
      }

      const data = await resp.json();
      if (data.adr) {
        await offlineDb.adrs.put(data.adr).catch(() => {});
        setSelectedDocId(data.adr.id);
      }
      await refreshWorkspace(token);
      setShowNewDocModal(false);
      setNewDocTitle('');
      onShowToast(`${newDocNumber} created and persisted to Cloud SQL!`);
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to create document.');
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleExportGovernanceSuite = () => {
    const bundle = docs
      .map(
        (d) =>
          `<!-- ${d.docNumber} | ${d.docType} | Status: ${d.status} -->\n${d.markdownContent}\n\n---`
      )
      .join('\n\n');

    const header = `# Archtechnix {∞} Retainer Governance Suite
Exported: ${new Date().toISOString()}
Documents Included: ${docs.map((d) => d.docNumber).join(', ')}

---

`;
    const blob = new Blob([header + bundle], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `archtechnix-governance-suite-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('All SSDs, ADRs, Data Flow & Risk documents exported (.md)!');
  };

  const handleDownloadArchitectureDossier = () => {
    try {
      const effectiveIntake: IntakeSpecData = intakeData || {
        org: 'Apex FinTech Systems',
        cloud: 'AWS (EKS, Aurora, KMS)',
        rpo: 'Sub-15 Minute (Zero Data Loss)',
        repo: 'https://github.com/apex-fintech/core-mesh',
        compliance: { gdpr: true, soc2: true, nist: false },
        notes: 'Decoupled event mesh audit, OPA policy generation, and sub-15m RTO disaster recovery validation.',
      };
      const filename = downloadArchitectureDossierPdf({
        intakeData: effectiveIntake,
        steadyStates,
        docs,
        capacityLabel: capacity.label,
      });
      onShowToast(`Architecture Dossier PDF downloaded (${filename})`);
    } catch (err: any) {
      onShowToast(err?.message || 'Unable to generate Architecture Dossier PDF.');
    }
  };

  const handleTogglePreRead = (itemId: string) => {
    const nextChecklist = agenda.preReadChecklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const nextAgenda = {
      ...agenda,
      preReadChecklist: nextChecklist,
      updatedAt: new Date().toISOString(),
    };
    setAgenda(nextAgenda);
    offlineDb.syncAgendas.put(nextAgenda).catch(() => {});
  };

  const handleAddChecklistItem = () => {
    const label = newChecklistLabel.trim();
    if (!label) return;
    const item: OfflinePreReadItem = {
      id: `pr-${Date.now().toString(36)}`,
      label,
      owner: 'Client Engineering',
      completed: false,
    };
    const nextAgenda = {
      ...agenda,
      preReadChecklist: [...agenda.preReadChecklist, item],
      updatedAt: new Date().toISOString(),
    };
    setAgenda(nextAgenda);
    setNewChecklistLabel('');
    offlineDb.syncAgendas.put(nextAgenda).catch(() => {});
  };

  const handleSaveAgenda = async () => {
    setSavingAgenda(true);
    await offlineDb.syncAgendas.put(agenda).catch(() => {});

    try {
      const token = await ensureAuthToken();
      if (!token) {
        onShowToast('Google Sign-In required to persist Weekly Sync Agenda to Cloud SQL.');
        setSavingAgenda(false);
        return;
      }

      const resp = await fetch(`/api/sync-agendas/${agenda.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(agenda),
      });
      if (resp.ok) {
        await refreshWorkspace(token);
        onShowToast('Weekly Strategic Sync Agenda persisted to Cloud SQL!');
      }
    } catch {
      onShowToast('Agenda saved offline in IndexedDB.');
    }
    setSavingAgenda(false);
  };

  return (
    <div className="space-y-8">
      {/* Retainer Activation & Capacity Cap Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded border border-violet-500/20">
              Module 3 · Retainer Governance Hub
            </span>
            <span
              className={`text-xs font-mono px-2.5 py-0.5 rounded border tabular-nums ${
                capacity.availableSlots > 0
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {capacity.label}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Continuous Architecture Governance & Strategic Sync Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Author and export Markdown governance artifacts (SSDs, ADRs, Data Flow Matrix, Risk Register) paired with Async-by-Default + 1 Weekly 60-Minute Strategic Sync preparation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleDownloadArchitectureDossier}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-orange-500/40 text-orange-300 font-mono text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            <span>Download Architecture Dossier</span>
          </button>

          <button
            type="button"
            onClick={handleExportGovernanceSuite}
            className="px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Suite (.MD)</span>
          </button>

          {retainerActive ? (
            <div className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>$7,500/mo Retainer Active</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onActivateRetainerCheckout}
              disabled={isCheckingOut || capacity.availableSlots <= 0}
              className="px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs flex items-center space-x-2 shadow-lg transition-all disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {capacity.availableSlots <= 0
                  ? 'Retainer Capacity Full (4/4)'
                  : isCheckingOut
                  ? 'Opening Stripe Subscription...'
                  : 'Activate $7,500/mo Retainer via Stripe'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Split: Live Markdown Document Viewer + Weekly Strategic Sync Agenda Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Markdown Viewer / Editor */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <FileCode2 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">Governance Artifacts ({docs.length})</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextNum = `ADR-${String(docs.length + 12).padStart(3, '0')}`;
                  setNewDocNumber(nextNum);
                  setShowNewDocModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New ADR / Doc</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditingDoc((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-300 flex items-center space-x-1.5"
              >
                {isEditingDoc ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Preview</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Edit Markdown</span>
                  </>
                )}
              </button>

              {isEditingDoc && (
                <button
                  type="button"
                  onClick={handleSaveDoc}
                  disabled={savingDoc}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingDoc ? 'Saving...' : user ? 'Save to Cloud SQL' : 'Sign In & Save'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Document Selector Pills (includes newly created ADRs) */}
          <div className="flex flex-wrap gap-2">
            {docs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              const catLabel =
                DOC_CATEGORIES.find((c) => c.type === doc.docType)?.label || doc.docType;
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    setSelectedDocId(doc.id);
                    setIsEditingDoc(false);
                  }}
                  className={`px-3 py-2 rounded-lg border text-left transition-colors min-w-[140px] ${
                    isSelected
                      ? 'bg-slate-950 border-orange-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] font-mono text-cyan-400">{doc.docNumber}</div>
                  <div className="text-xs font-semibold truncate max-w-[180px]">{catLabel}</div>
                </button>
              );
            })}
          </div>

          {/* Rendered Markdown OR Editor */}
          {activeDoc && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
                <span className="text-xs font-mono text-slate-400">
                  {activeDoc.docNumber} · Status:{' '}
                  <span className="text-emerald-400 font-semibold">{activeDoc.status}</span>
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Updated {new Date(activeDoc.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {isEditingDoc ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-orange-500"
                  />
                  <textarea
                    value={draftMarkdown}
                    onChange={(e) => setDraftMarkdown(e.target.value)}
                    rows={14}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-orange-500 leading-relaxed"
                  />
                </div>
              ) : (
                <div className="max-h-[540px] overflow-y-auto pr-1">
                  <MarkdownViewer markdown={activeDoc.markdownContent} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Weekly Strategic Sync Agenda Builder (24-Hour Pre-Read Checklist) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">Weekly Sync Agenda Builder</h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Async-by-Default + 1 Weekly 60m Strategic Sync
                </p>
              </div>
            </div>

            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 tabular-nums">
              {preReadPercent}% Pre-Read
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Scheduled Sync Date
              </label>
              <input
                type="date"
                value={agenda.syncDate}
                onChange={(e) => setAgenda({ ...agenda, syncDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                60m Executive Window
              </label>
              <input
                type="text"
                value={agenda.timeWindow}
                onChange={(e) => setAgenda({ ...agenda, timeWindow: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">
              Strategic Escalation Topic
            </label>
            <input
              type="text"
              value={agenda.agendaTitle}
              onChange={(e) => setAgenda({ ...agenda, agendaTitle: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* 24-Hour Pre-Read Checklist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span>24-Hour Pre-Read Checklist</span>
              <span className="text-slate-500 tabular-nums">
                {preReadCompleted}/{agenda.preReadChecklist.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {agenda.preReadChecklist.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    item.completed
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleTogglePreRead(item.id)}
                    className="mt-0.5 rounded text-orange-500 bg-slate-900 border-slate-700 focus:ring-0"
                  />
                  <div className="flex-1 text-xs">
                    <div className={item.completed ? 'line-through text-slate-400' : ''}>
                      {item.label}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      Owner: {item.owner}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={newChecklistLabel}
                onChange={(e) => setNewChecklistLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Add 24h pre-read checkpoint..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono flex items-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Async Pre-Sync Loom */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center space-x-1.5">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              <span>Async Loom Pre-Briefing URL</span>
            </label>
            <input
              type="url"
              value={agenda.loomSummaryUrl}
              onChange={(e) => setAgenda({ ...agenda, loomSummaryUrl: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveAgenda}
            disabled={savingAgenda}
            className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs flex items-center justify-center space-x-2 transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>
              {savingAgenda
                ? 'Syncing Agenda...'
                : user
                ? 'Lock 24h Pre-Read & Save to Cloud SQL'
                : 'Sign In & Save Weekly Agenda'}
            </span>
          </button>
        </div>
      </div>

      {/* Live Client Repository Activity Stream */}
      <ClientActivityStream repoUrl={intakeData?.repo} onShowToast={onShowToast} />

      {/* Create New ADR / Governance Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Create Governance Document / ADR</h3>
                <p className="text-xs text-slate-400">
                  Persisted directly to your Cloud SQL client governance repository
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDoc} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Doc Type</label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value as OfflineAdrDoc['docType'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  >
                    <option value="ADR">ADR (Decision Record)</option>
                    <option value="SSD">SSD (System Spec)</option>
                    <option value="DATA_FLOW">Data Flow Matrix</option>
                    <option value="RISK_REGISTER">Risk Register</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Doc Number</label>
                  <input
                    type="text"
                    required
                    value={newDocNumber}
                    onChange={(e) => setNewDocNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Status</label>
                  <select
                    value={newDocStatus}
                    onChange={(e) => setNewDocStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  >
                    <option value="Proposed">Proposed</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Implemented">Implemented</option>
                    <option value="Mitigated">Mitigated</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Enforce Cross-Region Aurora PITR Snapshot Lock"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Markdown Specification</label>
                <textarea
                  rows={8}
                  required
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewDocModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingDoc}
                  className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold disabled:opacity-60"
                >
                  {creatingDoc
                    ? 'Publishing...'
                    : user
                    ? 'Publish ADR to Cloud SQL'
                    : 'Sign In & Publish ADR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
