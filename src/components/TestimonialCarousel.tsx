import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Quote, 
  Star, 
  ShieldCheck, 
  CheckCircle2, 
  GitPullRequest, 
  Clock, 
  Play, 
  Pause 
} from 'lucide-react';

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  industry: string;
  avatarText: string;
  avatarGradient: string;
  quote: string;
  highlight: string;
  metric: string;
  turnaroundActual: string;
  techStack: string[];
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'cto-apex-fintech',
    name: 'Marcus Vance',
    role: 'Chief Technology Officer',
    company: 'Apex FinTech Core',
    industry: 'High-Frequency FinTech',
    avatarText: 'MV',
    avatarGradient: 'from-orange-500 to-amber-600',
    quote: 'Archtechnix completely shattered my cynicism regarding external consultancies. We skipped weeks of painful introductory Zoom calls and simply submitted our Schedule A spec. In exactly 52 hours, a clean GitHub PR arrived containing production-ready Terraform for our Aurora clusters and an airtight OPA Rego ruleset for automated KMS key shredding. Our SOC 2 auditor approved it without a single revision.',
    highlight: 'Zero meetings, 52h turnaround, and an airtight OPA ruleset for automated KMS shredding.',
    metric: 'Sub-15m RTO / 0 Discovery Calls',
    turnaroundActual: '52 Hours (SLA: 72h)',
    techStack: ['AWS EKS', 'Aurora Global', 'OPA Rego', 'KMS Envelope']
  },
  {
    id: 'vp-medvance-health',
    name: 'Dr. Elena Rostova',
    role: 'VP of Cloud Infrastructure & Security',
    company: 'MedVance Health Systems',
    industry: 'HIPAA & Healthcare Data Mesh',
    avatarText: 'ER',
    avatarGradient: 'from-teal-500 to-cyan-600',
    quote: 'Our engineering team was drowning in cross-team dependencies trying to migrate our monolith into a federated data mesh. Archtechnix diagnosed our Kafka event topology asynchronously and provided an Architectural Decision Record that gave our executive committee complete clarity. The delivered Terraform modules passed HIPAA and ISO 27001 requirements on the first pipeline run.',
    highlight: 'Diagnosed our Kafka event topology asynchronously and delivered board-ready ADRs in 3 days.',
    metric: '100% HIPAA Compliance Pass',
    turnaroundActual: '68 Hours (SLA: 72h)',
    techStack: ['Kafka Event Mesh', 'GCP BigQuery', 'Terraform', 'NIST SP 800-207']
  },
  {
    id: 'cto-quantmesh-analytics',
    name: 'David Chen',
    role: 'Head of Infrastructure Architecture',
    company: 'QuantMesh Distributed Labs',
    industry: 'Real-Time Quantitative Analytics',
    avatarText: 'DC',
    avatarGradient: 'from-violet-500 to-indigo-600',
    quote: 'The 72-hour turnaround isn\'t marketing hyperbole—it is an engineering discipline. Having an advisory architect who communicates strictly through GitHub PR inline comments and code reviews saved my team at least 40 hours of synchronous meeting theater. The cryptographic key-shredding implementation is now our standard across all multi-region workloads.',
    highlight: 'Saved my engineering team over 40 hours of synchronous meeting theater while cutting RTO to 8 minutes.',
    metric: '8m RTO Cross-Region Failover',
    turnaroundActual: '46 Hours (SLA: 72h)',
    techStack: ['Multi-Cloud', 'OpenTofu', 'Kyverno & OPA', 'HashiCorp Vault']
  },
  {
    id: 'vp-nexascale-saas',
    name: 'Sarah Lindqvist',
    role: 'Chief Architect & SVP Engineering',
    company: 'NexaScale Cloud Operations',
    industry: 'Enterprise B2B SaaS',
    avatarText: 'SL',
    avatarGradient: 'from-emerald-500 to-teal-600',
    quote: 'We retained Archtechnix on their monthly advisory retainer following a successful diagnostic sprint. Having a principal architect review our high-impact PRs with guaranteed 24-hour feedback turns our architecture reviews from a bureaucratic roadblock into a competitive advantage. Worth every penny of the fixed retainer fee.',
    highlight: 'Turned our enterprise architecture reviews from a bureaucratic roadblock into a competitive moat.',
    metric: '24h Ongoing PR Review SLA',
    turnaroundActual: 'Continuous Retainer',
    techStack: ['Kubernetes', 'Decoupled Mesh', 'CI/CD Ephemeral Runners', 'SOC 2']
  }
];

export const TestimonialCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(true);

  const current = TESTIMONIALS[currentIndex];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : TESTIMONIALS.length - 1));
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 relative overflow-hidden backdrop-blur-sm">
      {/* Ambient background blur */}
      <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-orange-400 mb-1.5 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Enterprise Verification & Social Proof</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Trusted by Enterprise CTOs & Cloud Leaders
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real engineering teams building high-scale cloud platforms with Archtechnix asynchronous advisory.
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center space-x-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors text-xs font-mono flex items-center space-x-1"
            title={isAutoPlaying ? 'Pause rotation' : 'Resume auto-rotation'}
          >
            {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handlePrev}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Previous story"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title="Next story"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Testimonial Active Slide */}
      <div className="pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Quote & Impact */}
          <div className="lg:col-span-8 space-y-5">
            <div className="flex items-center space-x-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-mono text-slate-400 ml-2">Verified Enterprise Audit</span>
            </div>

            <div className="relative">
              <Quote className="absolute -top-3 -left-3 w-8 h-8 text-slate-800 pointer-events-none -z-0" />
              <blockquote className="text-base sm:text-lg text-slate-200 font-normal leading-relaxed relative z-10 italic">
                "{current.quote}"
              </blockquote>
            </div>

            {/* Pull Quote Highlight */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center space-x-3 text-xs font-mono text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{current.highlight}</span>
            </div>

            {/* Author Lockup */}
            <div className="flex items-center space-x-3 pt-2">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${current.avatarGradient} flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0`}>
                {current.avatarText}
              </div>
              <div>
                <div className="font-bold text-white text-sm">{current.name}</div>
                <div className="text-xs text-slate-400">{current.role} · <span className="text-slate-300 font-medium">{current.company}</span></div>
                <div className="text-[10px] text-orange-400 font-mono mt-0.5">{current.industry}</div>
              </div>
            </div>
          </div>

          {/* Right Metrics & Tech Stack Column */}
          <div className="lg:col-span-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>Verified Turnaround</span>
              </div>
              <div className="text-xl font-bold text-white font-mono">{current.turnaroundActual}</div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Key Outcome Metric</span>
              </div>
              <div className="text-sm font-bold text-teal-300 font-mono">{current.metric}</div>
            </div>

            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-cyan-400" />
                <span>Production Stack Audited</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {current.techStack.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 rounded"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination Indicator Dots */}
      <div className="flex items-center justify-center space-x-2 mt-8 pt-4 border-t border-slate-800/60">
        {TESTIMONIALS.map((t, idx) => (
          <button
            key={t.id}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'w-8 bg-orange-500'
                : 'w-2 bg-slate-800 hover:bg-slate-700'
            }`}
            title={`View ${t.name}'s story`}
          />
        ))}
      </div>
    </div>
  );
};
