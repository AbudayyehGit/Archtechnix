import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ShieldCheck, 
  Clock, 
  FileCode2, 
  Layers 
} from 'lucide-react';

export interface FaqItem {
  id: string;
  category: 'async' | 'sla' | 'security' | 'deliverables';
  question: string;
  answer: string;
  keyTakeaway: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-zero-meetings',
    category: 'async',
    question: 'Why does Archtechnix operate on a zero-meeting asynchronous advisory model?',
    answer: 'Traditional enterprise consulting burns 40–60% of project time on exploratory Zoom discovery calls, unbilled slide-deck preparation, and scheduling drag that yields zero running code. Archtechnix replaces discovery calls with structured Schedule A Markdown intake specifications. Our principal architects analyze real infrastructure coordinates (VPC boundaries, event mesh topologies, KMS key configurations) and deliver verified code Pull Requests and Architectural Decision Records directly within Git.',
    keyTakeaway: 'Eliminates exploratory meeting fatigue and grounds all scoping in verifiable Git code.'
  },
  {
    id: 'faq-sync-window',
    category: 'async',
    question: 'Can our executive team schedule a live call if needed?',
    answer: 'Yes. While day-to-day work is strictly asynchronous and Git-driven, every Archtechnix engagement agreement (MASA) guarantees an optional 1-hour synchronized executive debrief window per week via Microsoft Teams, Google Meet, or phone upon client request for milestone alignment or board presentations.',
    keyTakeaway: 'Async-first velocity with a guaranteed 60-minute weekly synchronized executive window.'
  },
  {
    id: 'faq-sla-clock',
    category: 'sla',
    question: 'How is the guaranteed 72-hour turnaround SLA measured and enforced?',
    answer: 'The 72-hour turnaround clock initiates automatically when your Schedule A intake coordinates are locked or Stripe checkout payment is authorized. Within exactly 72 hours, Archtechnix pushes the complete Pull Request branch to your private repository and delivers the signed Executive Diagnostic Matrix. The 24-hour expedite add-on accelerates delivery to a single business day.',
    keyTakeaway: 'Automated SLA timer begins upon intake lock or checkout; verified PR delivered in 72 hours.'
  },
  {
    id: 'faq-turnaround-scope',
    category: 'sla',
    question: 'What happens if our architecture requires complex multi-region remediation?',
    answer: 'The 72-hour Diagnostic sprint identifies all architectural bottlenecks, cross-region failover limits, and compliance gaps with complete remediation code blueprints. For multi-month enterprise migrations, clients onboard seamlessly into our fixed-price 10-day Full Audit sprint or the $7,500/month continuous advisory retainer.',
    keyTakeaway: 'The 72h sprint delivers immediate PRs; ongoing retainers support sustained long-term scale.'
  },
  {
    id: 'faq-data-security',
    category: 'security',
    question: 'Do you require production cloud access or live administrative credentials?',
    answer: 'Never. Archtechnix strictly complies with NIST SP 800-207 Zero Trust Architecture. We never request root cloud IAM credentials or write access to production database clusters. All reviews operate on sanitized Terraform/OpenTofu repositories, architecture coordinate schemas, or non-production staging mirrors.',
    keyTakeaway: 'Zero production access needed. All audits execute against sanitized code and schemas.'
  },
  {
    id: 'faq-key-shredding',
    category: 'security',
    question: 'How does cryptographic key shredding and ephemeral sandboxing protect our data?',
    answer: 'All advisory analysis is run inside ephemeral containers equipped with a strict 15-minute Time-To-Live (TTL). Once code generation and OPA rule testing complete, all temporary keys and container disks are cryptographically shredded. We sign binding mutual NDAs and adhere to SOC 2 Type II and GDPR Article 17 standards.',
    keyTakeaway: 'Ephemeral runners auto-shred within 15 minutes; binding NDAs and SOC 2 compliance.'
  },
  {
    id: 'faq-deliverable-format',
    category: 'deliverables',
    question: 'In what exact format are Archtechnix deliverables provided?',
    answer: 'We deliver strictly production-grade code artifacts: signed Git Pull Requests containing modular Terraform / OpenTofu modules, declarative Open Policy Agent (OPA) Rego rulesets, Architectural Decision Records (ADRs) authored in Markdown, and a board-level Executive Diagnostic PDF with compliance cross-mappings.',
    keyTakeaway: 'Everything delivered as actionable Git PRs, Terraform modules, and OPA Rego policies.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIds, setOpenIds] = useState<string[]>(['faq-zero-meetings', 'faq-sla-clock']);
  const [filterCategory, setFilterCategory] = useState<'all' | 'async' | 'sla' | 'security' | 'deliverables'>('all');

  const toggleItem = (id: string) => {
    setOpenIds((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredItems = filterCategory === 'all' 
    ? FAQ_ITEMS 
    : FAQ_ITEMS.filter((item) => item.category === filterCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-2 uppercase tracking-wider">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            <span>Transparency & Due Diligence</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h3>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Direct, concrete answers regarding the Archtechnix zero-meeting operating model, our guaranteed 72-hour turnaround SLA, and institutional data security protocols.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
              filterCategory === 'all' 
                ? 'bg-orange-500 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Questions
          </button>
          <button
            onClick={() => setFilterCategory('async')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
              filterCategory === 'async' 
                ? 'bg-orange-500 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Async Model
          </button>
          <button
            onClick={() => setFilterCategory('sla')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
              filterCategory === 'sla' 
                ? 'bg-orange-500 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            72h SLA
          </button>
          <button
            onClick={() => setFilterCategory('security')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
              filterCategory === 'security' 
                ? 'bg-orange-500 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Data Security
          </button>
          <button
            onClick={() => setFilterCategory('deliverables')}
            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-colors ${
              filterCategory === 'deliverables' 
                ? 'bg-orange-500 text-white font-bold shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Deliverables
          </button>
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3.5">
        {filteredItems.map((item) => {
          const isOpen = openIds.includes(item.id);
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen 
                  ? 'bg-slate-900/90 border-slate-700 shadow-md' 
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700/80'
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full text-left p-5 sm:p-6 flex items-start justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                aria-expanded={isOpen}
              >
                <div className="flex items-start space-x-3.5">
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 transition-colors ${
                    isOpen ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.category === 'async' ? (
                      <Layers className="w-4 h-4" />
                    ) : item.category === 'sla' ? (
                      <Clock className="w-4 h-4" />
                    ) : item.category === 'security' ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <FileCode2 className="w-4 h-4" />
                    )}
                  </div>
                  <span className="font-bold text-white text-sm sm:text-base leading-snug">
                    {item.question}
                  </span>
                </div>

                <div className={`p-1 rounded-lg text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-orange-400' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-6 pt-0 border-t border-slate-800/80 animate-in fade-in duration-200">
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light mt-4">
                    {item.answer}
                  </p>

                  <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 flex items-center space-x-2.5">
                    <span className="text-orange-400 font-bold shrink-0">Key Invariant:</span>
                    <span className="truncate">{item.keyTakeaway}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
