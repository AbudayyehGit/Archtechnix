import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install Archtechnix Advisory App"
        className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-orange-500/60 text-xs font-mono font-semibold text-cyan-400 flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="min-h-[44px] px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-semibold text-cyan-400 flex items-center space-x-1.5 transition-all whitespace-nowrap shrink-0"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2 text-xs text-slate-300 list-decimal pl-4 leading-relaxed">
                <li>
                  Tap the <strong className="text-white">Share</strong> button in your Safari toolbar.
                </li>
                <li>
                  Scroll down and select <strong className="text-white">Add to Home Screen</strong>.
                </li>
                <li>
                  Launch <strong className="text-orange-400">Archtechnix</strong> offline from your home screen.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-mono text-xs font-bold"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
