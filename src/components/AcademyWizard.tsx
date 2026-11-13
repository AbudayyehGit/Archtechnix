import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  HelpCircle, 
  Copy, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ExternalLink,
  BookOpen,
  Code2
} from 'lucide-react';
import { CURRICULUM_PHASES } from '../data';
import { CurriculumPhase } from '../types';
import { RpoRtoBenchmarkChart } from './RpoRtoBenchmarkChart';

interface AcademyWizardProps {
  currentPhaseNum: number;
  onSelectPhase: (phase: number) => void;
  completedPhases: number[];
  quizAnswers: Record<number, number>;
  onSubmitQuiz: (phase: number, answerIndex: number) => void;
  onOpenDoc: (docKey: 'masa' | 'checklist' | 'glossary') => void;
  onShowToast: (message: string) => void;
}

export const AcademyWizard: React.FC<AcademyWizardProps> = ({
  currentPhaseNum,
  onSelectPhase,
  completedPhases,
  quizAnswers,
  onSubmitQuiz,
  onOpenDoc,
  onShowToast
}) => {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const phase: CurriculumPhase = CURRICULUM_PHASES[currentPhaseNum - 1];
  const isCompleted = completedPhases.includes(currentPhaseNum);
  const savedAnswer = quizAnswers[currentPhaseNum];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(phase.codeSample).then(() => {
      setCopiedCode(true);
      onShowToast('Artifact code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  return (
    <div className="space-y-8">
      {/* 6 Phase Stepper Navigation */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {CURRICULUM_PHASES.map((p) => {
          const active = p.phase === currentPhaseNum;
          const completed = completedPhases.includes(p.phase);
          return (
            <button
              key={p.phase}
              onClick={() => onSelectPhase(p.phase)}
              className={`px-4 py-2.5 rounded-xl text-xs font-mono flex items-center space-x-2 whitespace-nowrap transition-all ${
                active
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                completed ? 'bg-emerald-500/30 text-emerald-300' : 'bg-black/30 text-white'
              }`}>
                {completed ? '✓' : p.phase}
              </span>
              <span>{p.title.split('&')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Reading + Code on Left, Interactive Quiz on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Reading & Code Spec */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
              <span className="text-orange-400 uppercase tracking-wider">
                Phase {phase.phase} of 6 · Deep Architecture Specification
              </span>
              <span className={`flex items-center space-x-1.5 ${
                isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-500'
              }`}>
                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4" />}
                <span>{isCompleted ? 'Phase Mastered' : 'Assessment Pending'}</span>
              </span>
            </div>

            <h2 className="text-2xl font-black text-white mt-4">{phase.title}</h2>
            <p className="text-xs text-cyan-400 font-mono mt-1">{phase.tagline}</p>

            <div className="mt-6 space-y-4 text-slate-300 text-sm leading-relaxed font-light">
              {phase.reading.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Key Invariants Checklist */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-3">
                Core Architectural Invariants
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {phase.keyInvariants.map((inv, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                    <Check className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>{inv}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Production Code Artifact */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300 flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-orange-500" />
                <span>Production Implementation Artifact ({phase.codeLanguage})</span>
              </span>
              <button
                onClick={handleCopyCode}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg flex items-center space-x-1.5 font-mono transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Spec'}</span>
              </button>
            </div>
            <pre className="mt-4 p-4 bg-slate-900 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed border border-slate-800/60">
              {phase.codeSample}
            </pre>
          </div>

          {currentPhaseNum === 2 && (
            <RpoRtoBenchmarkChart compact />
          )}
        </div>

        {/* Right Column: Mastery Quiz & Associated Docs */}
        <div className="space-y-6">
          {/* Quiz Container */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-3">
              <HelpCircle className="w-4 h-4" />
              <span>Mastery Verification Quiz</span>
            </div>

            <h3 className="font-bold text-white text-sm leading-snug">
              {phase.quiz.question}
            </h3>

            <div className="mt-4 space-y-2.5">
              {phase.quiz.options.map((opt, idx) => {
                const isSelected = savedAnswer === idx;
                const isCorrect = idx === phase.quiz.correct;

                let buttonStyles = 'border-slate-800 bg-slate-950 text-slate-300 hover:border-orange-500/60 hover:text-white';
                if (savedAnswer !== undefined) {
                  if (isCorrect) {
                    buttonStyles = 'border-emerald-500 bg-emerald-950/40 text-emerald-200';
                  } else if (isSelected) {
                    buttonStyles = 'border-rose-500 bg-rose-950/40 text-rose-200';
                  } else {
                    buttonStyles = 'border-slate-800/50 bg-slate-950 text-slate-500 opacity-60';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSubmitQuiz(phase.phase, idx)}
                    className={`w-full text-left p-3.5 rounded-xl text-xs font-mono border transition-all ${buttonStyles}`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="text-[11px] font-bold text-slate-500 mt-0.5">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span className="leading-relaxed">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Instant Remediation Notes */}
            {savedAnswer !== undefined && (
              <div className={`mt-5 p-4 rounded-xl border font-mono text-xs ${
                savedAnswer === phase.quiz.correct
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}>
                <div className="flex items-center space-x-2 font-bold mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {savedAnswer === phase.quiz.correct
                      ? 'Mastery Verified (+1 Phase Complete)'
                      : 'Incorrect. Remediation Analysis:'}
                  </span>
                </div>
                <p className="mt-1 leading-relaxed opacity-90">{phase.quiz.explanation}</p>
              </div>
            )}

            {/* Stepper Footer */}
            <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onSelectPhase(Math.max(1, phase.phase - 1))}
                disabled={phase.phase === 1}
                className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Phase</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectPhase(Math.min(6, phase.phase + 1))}
                disabled={phase.phase === 6}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <span>Next Phase</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Resource & Operational Template Launcher */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">
              Phase {phase.phase} Operational Asset
            </span>
            <h4 className="text-xs font-bold text-white">Associated Implementation Contract</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Direct access to the corresponding enterprise agreement or delivery checklist.
            </p>
            <button
              type="button"
              onClick={() => onOpenDoc(phase.associatedDocKey)}
              className="mt-3.5 w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-orange-400 border border-slate-800 rounded-xl text-xs font-mono flex items-center justify-center space-x-2 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Inspect {phase.associatedDocKey.toUpperCase()} Template</span>
              <ExternalLink className="w-3 h-3 ml-1 opacity-70" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
