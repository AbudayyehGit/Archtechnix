import React, { useEffect, useMemo } from 'react';
import { Download, Printer, ShieldCheck, X } from 'lucide-react';
import {
  buildPdfMetadata,
  buildSpecificationHeaderStamp,
} from '../lib/pdfMetadata';
import { MarkdownViewer } from './MarkdownViewer';

export interface SpecificationPrintPreviewSpec {
  docNumber: string;
  docType: string;
  title: string;
  status: string;
  updatedAt: string;
  markdownContent: string;
  organizationName?: string;
  cloudTarget?: string;
  rpoTarget?: string;
  stateVersion: string;
}

interface SpecificationPrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownloadPdf: (generatedIso: string) => void;
  spec: SpecificationPrintPreviewSpec | null;
}

export const SpecificationPrintPreviewModal: React.FC<SpecificationPrintPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirmDownloadPdf,
  spec,
}) => {
  const previewTimestampIso = useMemo(
    () => (isOpen ? new Date().toISOString() : ''),
    [isOpen, spec?.docNumber, spec?.title]
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !spec) return null;

  const pdfMeta = buildPdfMetadata({
    docNumber: spec.docNumber,
    title: spec.title,
    organizationName: spec.organizationName,
    cloudTarget: spec.cloudTarget,
    stateVersion: spec.stateVersion,
  });

  const orgDisplay = spec.organizationName?.trim() || 'Enterprise Client';
  const headerStamp = buildSpecificationHeaderStamp(spec.stateVersion, previewTimestampIso);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Print Preview — ${spec.docNumber}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/85 backdrop-blur-sm p-3 sm:p-6 print:p-0 print:bg-white"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden print:max-h-none print:border-0 print:shadow-none print:bg-white">
        {/* Modal Control Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-orange-500/15 border border-orange-500/30">
              <Printer className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Print Preview — {spec.docNumber}
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                High-contrast A4 specification proof · Reconciled to {spec.stateVersion}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => onConfirmDownloadPdf(previewTimestampIso)}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-mono font-bold flex items-center space-x-1.5 shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate & Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close Print Preview"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable White-Paper Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/40 print:p-0 print:bg-white print:overflow-visible">
          <article className="print-paper-sheet max-w-3xl mx-auto bg-white text-slate-950 rounded-xl border border-slate-300 shadow-xl overflow-hidden print:shadow-none print:border-0 print:rounded-none">
            {/* Print-Optimized Dark Header Banner (matches generated jsPDF header) */}
            <div className="print-paper-banner bg-[#020617] px-6 sm:px-8 py-5 border-b-4 border-orange-500">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-orange-400">
                ARCHTECHNIX &#123;∞&#125; · {spec.docNumber} ({spec.docType})
              </div>
              <div
                role="heading"
                aria-level={2}
                className="print-banner-title text-lg sm:text-xl font-extrabold tracking-tight mt-1"
              >
                {spec.title}
              </div>
              <div className="print-banner-stamp mt-2.5 text-[11px] font-mono text-slate-300 break-words">
                {headerStamp}
              </div>
            </div>

            {/* Specification & Embedded PDF Tracking Metadata Grid */}
            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-b border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Status & Updated
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {spec.status.toUpperCase()} · {new Date(spec.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    Organization & Cloud
                  </div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {orgDisplay} · {spec.cloudTarget || 'Multi-Region Cloud'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    RPO / RTO SLA Target
                  </div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {spec.rpoTarget || 'Sub-15 Minute'}
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-700">
                <div className="truncate" title={pdfMeta.author}>
                  <span className="font-bold text-slate-900">PDF Author:</span> {pdfMeta.author}
                </div>
                <div className="truncate" title={pdfMeta.creator}>
                  <span className="font-bold text-slate-900">PDF Creator:</span> {pdfMeta.creator}
                </div>
                <div className="truncate" title={pdfMeta.subject}>
                  <span className="font-bold text-slate-900">PDF Subject:</span> {pdfMeta.subject}
                </div>
              </div>
            </div>

            {/* High-Contrast Rendered Specification Body */}
            <div className="px-6 sm:px-8 py-6">
              <MarkdownViewer markdown={spec.markdownContent} variant="print" />
            </div>

            {/* Print Reconciliation Footer */}
            <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>
                  Archtechnix &#123;∞&#125; · {spec.docNumber} · State: {spec.stateVersion}
                </span>
              </span>
              <span>Tracked for {orgDisplay}</span>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
};
