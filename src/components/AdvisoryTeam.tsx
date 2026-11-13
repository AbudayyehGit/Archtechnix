import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  Lock, 
  Terminal, 
  GitPullRequest, 
  CheckCircle2, 
  Layers, 
  Award,
  ExternalLink
} from 'lucide-react';

export interface ArchitectProfile {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarInitials: string;
  avatarGradient: string;
  bio: string;
  coreInvariants: string[];
  certifications: string[];
  githubHandle: string;
  focusArea: 'data-mesh' | 'opa-rego' | 'disaster-recovery';
}

export const ARCHITECTS: ArchitectProfile[] = [
  {
    id: 'tariq-abudayyeh',
    name: 'Tariq Abudayyeh',
    role: 'Founding Principal Architect',
    specialty: 'Decoupled Data Mesh & Event Topology',
    avatarInitials: 'TA',
    avatarGradient: 'from-orange-500 via-amber-500 to-teal-500',
    bio: 'Creator of the Archtechnix zero-meeting advisory protocol. Specializes in transforming tangled enterprise monoliths into domain-driven federated data meshes with sub-15 minute cross-region disaster recovery tolerances.',
    coreInvariants: [
      'Federated domain-owned data products with self-serve VPC coordinates',
      'Kafka / SNS-SQS partition replay and idempotent consumers',
      'Sub-15m RPO multi-region Aurora and DynamoDB replication architectures',
      'Zero-meeting asynchronous Schedule A intake scoping'
    ],
    certifications: [
      'AWS Solutions Architect Professional',
      'Data Mesh Governance Fellow',
      'W3C Web Architecture Contributor'
    ],
    githubHandle: 'AbudayyehGit',
    focusArea: 'data-mesh'
  },
  {
    id: 'soren-lind',
    name: 'Dr. Soren Lind',
    role: 'Principal Security & Policy Architect',
    specialty: 'OPA Rego Audits & Cryptographic Key Shredding',
    avatarInitials: 'SL',
    avatarGradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    bio: 'Specialist in declarative policy-as-code automation. Codifies zero-trust boundary invariants in OPA Rego and engineers automated KMS key shredding workflows that fulfill GDPR Article 17 without rewrites.',
    coreInvariants: [
      'Declarative Open Policy Agent (OPA) Rego rulesets in CI/CD gates',
      'KMS DEK/KEK envelope encryption with sub-15m automated key shredding',
      'NIST SP 800-207 Zero Trust Network Architecture compliance',
      'SOC 2 Type II and ISO 27001 verifiable Git PR audit trails'
    ],
    certifications: [
      'Certified Kubernetes Security Specialist (CKS)',
      'ISO/IEC 27001 Lead Auditor',
      'Open Policy Agent Core Contributor'
    ],
    githubHandle: 'soren-policy-rego',
    focusArea: 'opa-rego'
  },
  {
    id: 'aria-chen',
    name: 'Aria Chen',
    role: 'Principal IaC & Resilience Architect',
    specialty: 'Sub-15m RPO/RTO & Terraform / OpenTofu Modules',
    avatarInitials: 'AC',
    avatarGradient: 'from-violet-500 via-purple-500 to-orange-500',
    bio: 'Infrastructure-as-code author and resilience engineer. Crafts modular, immutable Terraform and OpenTofu modules with built-in rollback guarantees, automated drift detection, and zero-downtime failovers.',
    coreInvariants: [
      'Production-tested Terraform & OpenTofu immutable infrastructure modules',
      'Cross-region automated cold-standby disaster recovery runbooks',
      'Ephemeral CI/CD runner sandboxing with lateral breach neutralization',
      'Architectural Decision Records (ADR) synthesis with trade-off matrices'
    ],
    certifications: [
      'HashiCorp Certified Terraform Associate',
      'Linux Foundation SRE Architect',
      'NIST Cybersecurity Framework Specialist'
    ],
    githubHandle: 'aria-iac-dr',
    focusArea: 'disaster-recovery'
  }
];

export const AdvisoryTeam: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="max-w-3xl">
        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Principal Advisory Architects</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Battle-Tested Principal Architects
        </h3>
        <p className="mt-2 text-sm text-slate-300 leading-relaxed">
          Every Archtechnix engagement is led directly by verified principal architects. No offshore juniors, no non-technical project managers, and zero bloated agency overhead.
        </p>
      </div>

      {/* Architect Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {ARCHITECTS.map((architect) => (
          <div
            key={architect.id}
            className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-all duration-200"
          >
            <div>
              {/* Profile Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-800/80 mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${architect.avatarGradient} flex items-center justify-center font-bold text-white text-base shadow-md shrink-0`}>
                    {architect.avatarInitials}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base leading-snug">{architect.name}</h4>
                    <span className="text-xs font-mono text-orange-400">{architect.role}</span>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 shrink-0">
                  {architect.focusArea === 'data-mesh' ? 'Data Mesh' : architect.focusArea === 'opa-rego' ? 'OPA Rego' : 'IaC & DR'}
                </span>
              </div>

              {/* Specialty & Bio */}
              <div className="mb-4">
                <span className="text-[11px] font-mono text-slate-400 font-semibold block mb-1">
                  Core Discipline: {architect.specialty}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed font-light">
                  {architect.bio}
                </p>
              </div>

              {/* Core Invariants */}
              <div className="mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2 font-bold flex items-center space-x-1">
                  <Layers className="w-3 h-3 text-orange-400" />
                  <span>Verified Architectural Invariants</span>
                </span>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {architect.coreInvariants.map((inv, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-[11px] leading-snug">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>{inv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Certifications and Git Signoff */}
            <div className="pt-4 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {architect.certifications.map((cert, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800/80"
                  >
                    {cert}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
                <span className="flex items-center space-x-1 text-slate-400">
                  <GitPullRequest className="w-3.5 h-3.5 text-orange-400" />
                  <span>Review Authority: Author</span>
                </span>
                <span className="text-cyan-400 flex items-center space-x-1">
                  <span>@{architect.githubHandle}</span>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
