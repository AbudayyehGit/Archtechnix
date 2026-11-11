import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { ModalPayload } from '../types';

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

  if (!modal.isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(modal.content).then(() => {
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/80 whitespace-pre-wrap select-all">
          {modal.content}
        </div>
      </div>
    </div>
  );
};
