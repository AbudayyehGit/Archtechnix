import React, { useState } from 'react';
import { Copy, Check, FileText, Send, Lock } from 'lucide-react';
import { IntakeSpecData } from '../types';

interface IntakeGeneratorProps {
  intakeData: IntakeSpecData;
  onUpdate: (data: IntakeSpecData) => void;
  onShowToast: (message: string) => void;
}

export const IntakeGenerator: React.FC<IntakeGeneratorProps> = ({
  intakeData,
  onUpdate,
  onShowToast
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const compiledMarkdown = `# ARCHITECHNIX SCHEDULE A: ZERO-MEETING INTAKE SPEC
Compiled Timestamp: ${new Date().toISOString()}
Authorizing Entity: ${intakeData.org || 'Apex FinTech Systems'}
Status: SPEC_LOCKED_PENDING_PROVISIONING

## 1. Enterprise Infrastructure Profile
* Target Cloud Topology: ${intakeData.cloud}
* Target Resilience / Disaster Recovery: ${intakeData.rpo}
* Regulatory Frameworks Mandated: ${[
    intakeData.compliance.gdpr ? 'GDPR/CCPA Cryptographic Shredding' : null,
    intakeData.compliance.soc2 ? 'SOC2 Type II Immutable Audit Logs' : null,
    intakeData.compliance.nist ? 'NIST SP 800-207 Zero Trust' : null
  ].filter(Boolean).join(', ') || 'Standard Enterprise Posture'}

## 2. Ingestion & Security Coordinates
* Monitored Topology / Git Spec: ${intakeData.repo || 'github.com/client-org/infrastructure'}
* Primary Security Focus: Decoupled Data Mesh, KMS Envelope Encryption, OPA Rego CI/CD
* Context Notes:
> ${intakeData.notes || 'Full architectural audit requested.'}

## 3. Operating Execution & Communication Windows
* Delivery Model: Asynchronous-first. Core deliverables, code reviews, and policy audits are submitted via Pull Request.
* Synchronized Weekly Window: Up to 1 full hour of synchronized communication per week (via Microsoft Teams, Google Meet, or phone call) scheduled at client request on a predetermined date/time throughout the project lifecycle.
* All comments, edge cases, and architectural reviews retain immutable audit history in Git PR threads.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledMarkdown).then(() => {
      setCopied(true);
      onShowToast('Schedule A Markdown copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Interactive Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">Target Organization / Enterprise Name</label>
          <input
            type="text"
            value={intakeData.org}
            onChange={(e) => onUpdate({ ...intakeData, org: e.target.value })}
            placeholder="e.g. Apex FinTech Systems"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">Primary Cloud Provider</label>
            <select
              value={intakeData.cloud}
              onChange={(e) => onUpdate({ ...intakeData, cloud: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
            >
              <option value="AWS (EKS, Aurora, KMS)">AWS (EKS, Aurora, KMS)</option>
              <option value="GCP (GKE, Spanner, Cloud KMS)">GCP (GKE, Spanner, Cloud KMS)</option>
              <option value="Azure (AKS, CosmosDB, KeyVault)">Azure (AKS, CosmosDB, KeyVault)</option>
              <option value="Multi-Cloud / Hybrid On-Prem">Multi-Cloud / Hybrid On-Prem</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">Target RTO / RPO Constraint</label>
            <select
              value={intakeData.rpo}
              onChange={(e) => onUpdate({ ...intakeData, rpo: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
            >
              <option value="Sub-15 Minute (Zero Data Loss)">Sub-15 Minute (Zero Loss Target)</option>
              <option value="Sub-1 Hour (Tier-1 Enterprise)">Sub-1 Hour (Tier-1 Enterprise)</option>
              <option value="Sub-4 Hour Standard">Sub-4 Hour Standard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">Architecture Repo / Topology URL</label>
          <input
            type="text"
            value={intakeData.repo}
            onChange={(e) => onUpdate({ ...intakeData, repo: e.target.value })}
            placeholder="github.com/org/repo-spec (or paste internal git mirror)"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-300 mb-2">Core Regulatory & Compliance Mandate</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={intakeData.compliance.gdpr}
                onChange={(e) => onUpdate({
                  ...intakeData,
                  compliance: { ...intakeData.compliance, gdpr: e.target.checked }
                })}
                className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
              />
              <span>GDPR/CCPA Key Shred</span>
            </label>
            <label className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={intakeData.compliance.soc2}
                onChange={(e) => onUpdate({
                  ...intakeData,
                  compliance: { ...intakeData.compliance, soc2: e.target.checked }
                })}
                className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
              />
              <span>SOC2 Type II</span>
            </label>
            <label className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={intakeData.compliance.nist}
                onChange={(e) => onUpdate({
                  ...intakeData,
                  compliance: { ...intakeData.compliance, nist: e.target.checked }
                })}
                className="text-orange-500 rounded bg-slate-900 border-slate-700 focus:ring-0"
              />
              <span>NIST SP 800-207</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">Critical Architecture Bottleneck Description</label>
          <textarea
            value={intakeData.notes}
            onChange={(e) => onUpdate({ ...intakeData, notes: e.target.value })}
            rows={4}
            placeholder="Detail cross-account IAM friction, data mesh ingestion bottlenecks, or encryption key lifecycle issues..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 font-mono leading-relaxed resize-none"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400">
            <Lock className="w-3.5 h-3.5" />
            <span>Autosaved in Browser Storage</span>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold font-mono flex items-center space-x-2 transition-all shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Copy Schedule A Payload</span>
          </button>
        </div>
      </div>

      {/* Real-time Compiled Markdown Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-300">
            <FileText className="w-4 h-4 text-orange-500" />
            <span>Compiled Markdown Specification</span>
          </div>
          <button
            onClick={handleCopy}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors font-mono"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <pre className="mt-4 p-4 bg-slate-950 border border-slate-800/80 rounded-lg font-mono text-xs text-slate-300 overflow-x-auto flex-1 select-all whitespace-pre-wrap leading-relaxed">
          {compiledMarkdown}
        </pre>

        <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <span>Target Delivery SLA: 72 Hours on Receipt</span>
          <span>Zero Sync Meetings Mandated</span>
        </div>
      </div>
    </div>
  );
};
