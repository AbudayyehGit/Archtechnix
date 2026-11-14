import React, { useEffect, useMemo, useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Scale, 
  CheckSquare, 
  Book, 
  CreditCard, 
  Webhook, 
  Laptop, 
  Cpu, 
  Network, 
  Sparkles,
  FileText,
  ExternalLink,
  Search
} from 'lucide-react';
import { ModalPayload } from '../types';
import { filterGlossaryEntries, parseGlossaryEntries } from '../lib/glossarySearch';

interface GlobalModalProps {
  modal: ModalPayload;
  onClose: () => void;
  onShowToast: (message: string) => void;
}

export const GlobalModal: React.FC<GlobalModalProps> = ({
  modal,
  onClose,
  onShowToast
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setSearchQuery('');
  }, [modal.isOpen, modal.title]);

  const isGlossaryModal = useMemo(
    () => modal.title.toLowerCase().includes('glossary'),
    [modal.title]
  );

  const glossaryEntries = useMemo(
    () => (isGlossaryModal ? parseGlossaryEntries(modal.content) : []),
    [isGlossaryModal, modal.content]
  );

  const filteredGlossaryEntries = useMemo(
    () => filterGlossaryEntries(glossaryEntries, searchQuery),
    [glossaryEntries, searchQuery]
  );

  if (!modal.isOpen) return null;

  const handleCopy = () => {
    const textToCopy =
      isGlossaryModal && glossaryEntries.length > 0 && searchQuery.trim()
        ? filteredGlossaryEntries.map((e) => `* ${e.term}: ${e.definition}`).join('\n')
        : modal.content;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      onShowToast('Document copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const renderIcon = () => {
    switch (modal.iconType) {
      case 'scale':
        return <Scale className="w-5 h-5 text-orange-400" />;
      case 'checkSquare':
        return <CheckSquare className="w-5 h-5 text-teal-400" />;
      case 'book':
        return <Book className="w-5 h-5 text-violet-400" />;
      case 'creditCard':
        return <CreditCard className="w-5 h-5 text-orange-400" />;
      case 'webhook':
        return <Webhook className="w-5 h-5 text-cyan-400" />;
      case 'laptop':
        return <Laptop className="w-5 h-5 text-cyan-400" />;
      case 'cpu':
        return <Cpu className="w-5 h-5 text-violet-400" />;
      case 'network':
        return <Network className="w-5 h-5 text-emerald-400" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-orange-400" />;
      case 'activity':
        return <Sparkles className="w-5 h-5 text-teal-400" />;
      case 'shield':
        return <Scale className="w-5 h-5 text-blue-400" />;
      case 'barChart':
        return <Book className="w-5 h-5 text-cyan-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modal.title}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div>{renderIcon()}</div>
            <h3 className="font-bold text-white text-base font-sans">{modal.title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-mono transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Real-time Search Toolbar for Architecture Glossary */}
        {isGlossaryModal && glossaryEntries.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms (e.g. RPO, OPA, Data Mesh, Key Shredding)..."
                aria-label="Search architecture glossary terms"
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2 text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
              <span>
                Showing {filteredGlossaryEntries.length} of {glossaryEntries.length} terms
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body Content */}
        {isGlossaryModal && glossaryEntries.length > 0 ? (
          <div className="p-6 overflow-y-auto bg-slate-950/80 space-y-3">
            {filteredGlossaryEntries.length === 0 ? (
              <div className="border border-slate-800 rounded-xl p-6 text-center space-y-2 bg-slate-900/60">
                <p className="text-sm font-semibold text-white">No matching glossary terms</p>
                <p className="text-xs text-slate-400">
                  No terms matched "{searchQuery}". Try another keyword or clear your filter.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl bg-slate-900/60">
                {filteredGlossaryEntries.map((entry) => (
                  <div key={entry.term} className="p-4 space-y-1">
                    <div className="text-xs sm:text-sm font-bold text-orange-400 font-mono">
                      {entry.term}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {entry.definition}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/80 whitespace-pre-wrap select-all">
            {modal.content}
          </div>
        )}

        {/* Optional Action Footer for Live Checkout */}
        {modal.checkoutUrl && (
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-400 font-mono">
              Direct checkout link generated via Stripe live API.
            </span>
            <a
              href={modal.checkoutUrl}
              target="_top"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold font-mono text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center justify-center space-x-2 transition-all"
            >
              <span>Open Stripe Checkout</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
