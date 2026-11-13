import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  FileCode2, 
  Search, 
  ShieldCheck, 
  GitPullRequest, 
  ArrowRight, 
  Play, 
  RotateCcw, 
  Lock, 
  Terminal,
  Layers,
  Cpu,
  Award,
  X,
  GitBranch,
  CheckCircle,
  Zap,
  Info
} from 'lucide-react';

export interface TimelineStep {
  id: string;
  hour: string;
  title: string;
  stageName: string;
  leadIcon: React.ElementType;
  status: 'completed' | 'in-progress' | 'queued';
  summary: string;
  description: string;
  etc: string;
  specificActions: string[];
  automatedChecks: string[];
  deliverable: string;
  slaWindow: string;
  isMajorPhase?: boolean;
}

export const TIMELINE_STEPS: TimelineStep[] = [
  {
    id: 'intake',
    hour: '00:00',
    title: 'Intake Received & Coordinates Sealed',
    stageName: 'Intake Received',
    leadIcon: FileCode2,
    status: 'completed',
    isMajorPhase: true,
    etc: 'ETC: 72h Remaining (Intake Phase Target: 06h:00m)',
    summary: 'Schedule A intake parsed; automated cryptographic isolation environment provisioned.',
    description: 'The enterprise client submits structured coordinates via Schedule A intake or automated Stripe checkout. Archtechnix ingest engines parse cloud boundaries, VPC topologies, compliance obligations, and KMS key configurations with zero preliminary discovery phone calls.',
    specificActions: [
      'Parse cloud CIDR blocks, IAM boundary specifications, and KMS key IDs',
      'Verify SOC 2 Type II / ISO 27001 baseline framework alignment',
      'Initialize private cryptographic git repository mirror',
      'Dispatch automated cryptographic receipt & SLA timestamp to stakeholder email'
    ],
    automatedChecks: [
      'Git repository mirror initialized in isolated container',
      'VPC CIDR block and egress boundary validation',
      'SOC 2 Type II / ISO 27001 baseline framework alignment',
      'Automated receipt confirmation dispatched to stakeholder email'
    ],
    deliverable: 'Automated Schedule A Manifest & Scoped Audit Worktree',
    slaWindow: 'Hours 00:00 – 06:00'
  },
  {
    id: 'discovery',
    hour: '18:00',
    title: 'Topology Mapping & Asynchronous Telemetry Extraction',
    stageName: 'Mesh Discovery',
    leadIcon: Search,
    status: 'completed',
    etc: 'ETC: 54h Remaining (Discovery Target: 18h:00m)',
    summary: 'Decoupled event flow analysis, database replication paths, and IAM boundary graphing.',
    description: 'Archtechnix performs deep asynchronous telemetry mapping. Event streams (Kafka/SNS), relational clusters (Aurora/PostgreSQL), and network partition vectors are mapped into a comprehensive architectural dependency graph without disturbing production workloads.',
    specificActions: [
      'Map decoupled event streaming partition vectors (Kafka, SNS, SQS)',
      'Calculate sub-15m RPO / RTO cross-region failover tolerances',
      'Graph cross-account IAM trust relationships and escalation paths',
      'Audit ephemeral runner lifecycle boundaries against NIST SP 800-207'
    ],
    automatedChecks: [
      'Data mesh partition tolerance & event replay verification',
      'Sub-15m RTO / RPO disaster recovery boundary calculation',
      'IAM privilege escalation & cross-account trust boundary audit',
      'Ephemeral runner lifecycle check (NIST SP 800-207)'
    ],
    deliverable: 'Architectural Topology Dependency Graph & Threat Map',
    slaWindow: 'Hours 06:00 – 24:00'
  },
  {
    id: 'review',
    hour: '36:00',
    title: 'Archtechnix Review & Deep Systems Audit',
    stageName: 'Review in Progress',
    leadIcon: ShieldCheck,
    status: 'in-progress',
    isMajorPhase: true,
    etc: 'ETC: 36h Remaining (Audit Target: 24h:00m)',
    summary: 'Principal architectural scrutiny, live OPA Rego constraint testing, and key shredding audit.',
    description: 'The core Archtechnix review phase. Principal advisory architects rigorously evaluate the infrastructure model against zero-trust invariants. Security policies are codified in Rego, cryptographic key shredding protocols are tested, and concrete code remediations are drafted.',
    specificActions: [
      'Peer-level architectural scrutiny of all cloud boundary invariants',
      'Compile and execute declarative Open Policy Agent (OPA) Rego rulesets',
      'Audit KMS envelope encryption (DEK/KEK lifecycles) & test key shredding protocols',
      'Draft production-ready Terraform / OpenTofu remediation modules'
    ],
    automatedChecks: [
      'Open Policy Agent (OPA) declarative ruleset compilation',
      'KMS envelope encryption & DEK/KEK key lifecycle verification',
      'Zero-trust network ingress invariant validation',
      'Drafting production-ready Terraform/OpenTofu remediation modules'
    ],
    deliverable: 'Formal Archtechnix Review Matrix & Rego Security Ruleset',
    slaWindow: 'Hours 24:00 – 48:00'
  },
  {
    id: 'synthesis',
    hour: '54:00',
    title: 'Remediation Synthesis & Automated Verification',
    stageName: 'Synthesis & Testing',
    leadIcon: Cpu,
    status: 'queued',
    etc: 'ETC: 18h Remaining (Verification Target: 12h:00m)',
    summary: 'CI regression testing of proposed Terraform modules and executive ADR generation.',
    description: 'Every recommendation is converted into actionable, copy-paste or PR-ready code. Archtechnix compiles Architectural Decision Records (ADRs), executes dry-run Terraform plans in sandboxed test suites, and verifies that no performance or availability regressions are introduced.',
    specificActions: [
      'Execute automated terraform plan & drift evaluation in isolated test harness',
      'Author executive Architectural Decision Records (ADRs) with trade-off matrices',
      'Cross-map remediations to SOC 2, HIPAA, NIST SP 800-207, and GDPR Art. 17',
      'Formulate verified automated rollback safety runbooks'
    ],
    automatedChecks: [
      'Automated terraform plan & drift evaluation in test sandbox',
      'Executive Architectural Decision Records (ADRs) authored',
      'Compliance cross-mapping matrix (GDPR, SOC 2, HIPAA, NIST)',
      'Verification of rollback safety protocols'
    ],
    deliverable: 'Verified Infrastructure-as-Code (IaC) Modules & ADR Suite',
    slaWindow: 'Hours 48:00 – 60:00'
  },
  {
    id: 'delivery',
    hour: '72:00',
    title: 'Artifact Delivery & Production Handover',
    stageName: 'Artifact Delivery',
    leadIcon: GitPullRequest,
    status: 'queued',
    isMajorPhase: true,
    etc: 'ETC: 00h (Delivery Complete · 72h SLA Fulfilled)',
    summary: 'Final signed Pull Request, Executive Diagnostic Matrix, and optional 1hr sync window.',
    description: 'The engagement culminates with the final artifact dispatch. Clients receive a private GitHub PR containing production-ready code, a board-level Executive Summary Matrix, and access to an optional 60-minute synchronized executive debrief window if requested.',
    specificActions: [
      'Push signed Git Pull Request branch to client private repository',
      'Deliver executive diagnostic PDF & interactive compliance matrix',
      'Cryptographically shred temporary advisory runner credentials and keys',
      'Activate optional 60-minute synchronized executive debrief window'
    ],
    automatedChecks: [
      'Signed Git Pull Request committed to client private repository',
      'Full Executive Diagnostic PDF & Interactive Matrix delivered',
      'Archival of temporary advisory runners & cryptographic keys shredded',
      'Optional 1-hour executive synchronization window activated'
    ],
    deliverable: 'Production Pull Request + Executive Diagnostic Matrix + Retainer Pathway',
    slaWindow: 'Hours 60:00 – 72:00'
  }
];

export interface GitHubAutomationItem {
  id: string;
  name: string;
  target: string;
  details: string;
  icon: string;
}

const GITHUB_AUTOMATION_STEPS: GitHubAutomationItem[] = [
  {
    id: 'repo_provisioned',
    name: 'Repository Provisioned',
    target: 'github.com/client-org/archtechnix-audit-workspace',
    details: 'Private repository created with branch protection and ObjectLock enabled',
    icon: 'repo'
  },
  {
    id: 'project_board',
    name: 'Project Board Initialized',
    target: 'GitHub Projects v2 · Kanban Board',
    details: 'Schedule A deliverables mapped to Triage, OPA Scan, IaC Review, and Handover',
    icon: 'board'
  },
  {
    id: 'runner_active',
    name: 'Ephemeral Runner Spun Up',
    target: 'Runner #arch-worker-8921',
    details: 'Isolated container with 15-minute auto-shredding cryptographic TTL active',
    icon: 'runner'
  },
  {
    id: 'scanners_armed',
    name: 'Security Scanners Armed',
    target: '.github/workflows/opa-compliance.yml',
    details: 'Automated OPA Rego validator & Terraform drift detection wired to PR branch',
    icon: 'workflow'
  }
];

interface TurnaroundTimelineProps {
  webhookTriggered?: boolean;
  onTriggerWebhook?: () => void;
}

export const TurnaroundTimeline: React.FC<TurnaroundTimelineProps> = ({
  webhookTriggered = false,
  onTriggerWebhook
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2); // Default to 'Archtechnix Review'
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);

  // Local state to allow testing the webhook directly in the timeline
  const [localWebhookTriggered, setLocalWebhookTriggered] = useState<boolean>(webhookTriggered);

  useEffect(() => {
    setLocalWebhookTriggered(webhookTriggered);
  }, [webhookTriggered]);

  // Milestone Achieved Notification State
  const [milestoneNotice, setMilestoneNotice] = useState<{
    show: boolean;
    title: string;
    subtitle: string;
    fromStage: string;
    toStage: string;
    hour: string;
  } | null>(null);

  const activeStep = TIMELINE_STEPS[activeStepIndex];

  const handleStepTransition = (newIndex: number) => {
    if (newIndex === activeStepIndex) return;

    const fromStep = TIMELINE_STEPS[activeStepIndex];
    const toStep = TIMELINE_STEPS[newIndex];

    setActiveStepIndex(newIndex);

    // Trigger visual Milestone Achieved notification
    setMilestoneNotice({
      show: true,
      title: `Milestone Achieved: ${toStep.stageName}`,
      subtitle: `Successfully advanced from ${fromStep.stageName} (Hour ${fromStep.hour}) to ${toStep.stageName} (Hour ${toStep.hour})`,
      fromStage: fromStep.stageName,
      toStage: toStep.stageName,
      hour: toStep.hour
    });
  };

  // Auto-dismiss milestone notification after 6 seconds
  useEffect(() => {
    if (milestoneNotice?.show) {
      const timer = setTimeout(() => {
        setMilestoneNotice((prev) => (prev ? { ...prev, show: false } : null));
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [milestoneNotice]);

  const handleNext = () => {
    const nextIdx = activeStepIndex < TIMELINE_STEPS.length - 1 ? activeStepIndex + 1 : 0;
    handleStepTransition(nextIdx);
  };

  const handlePrev = () => {
    const prevIdx = activeStepIndex > 0 ? activeStepIndex - 1 : TIMELINE_STEPS.length - 1;
    handleStepTransition(prevIdx);
  };

  const handleAutoPlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    let current = activeStepIndex;
    const interval = setInterval(() => {
      current = (current + 1) % TIMELINE_STEPS.length;
      handleStepTransition(current);
      if (current === TIMELINE_STEPS.length - 1) {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 2800);
  };

  const handleManualWebhookToggle = () => {
    if (onTriggerWebhook) {
      onTriggerWebhook();
    }
    setLocalWebhookTriggered(true);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      {/* Subtle ambient lighting */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header and top metadata */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3 text-xs text-orange-400 font-mono mb-2">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              Guaranteed 72-Hour Turnaround SLA
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-400">Zero-Meeting Operating Model</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-teal-400 font-semibold">100% Async Delivery</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            The Archtechnix 72-Hour Turnaround Journey
          </h3>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            From the moment your Schedule A intake is locked to production Git pull requests and executive matrices in exactly three business days.
          </p>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
          <button
            onClick={handleAutoPlay}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-all duration-200 border ${
              isPlaying
                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-700'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isPlaying ? 'animate-pulse fill-current' : ''}`} />
            <span>{isPlaying ? 'Simulating Journey...' : 'Simulate 72h Timeline'}</span>
          </button>

          <button
            onClick={() => handleStepTransition(0)}
            title="Reset to Hour 00:00"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* GitHub Automation Pipeline Status Ribbon (Driven by Mock Webhook State) */}
      <div className="my-6 p-4 rounded-2xl bg-slate-950 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center space-x-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${localWebhookTriggered ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              GitHub CI/CD Automation Pipeline
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              localWebhookTriggered 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {localWebhookTriggered ? 'Webhook Fired · 4/4 Steps Triggered' : 'Awaiting Stripe Webhook'}
            </span>
          </div>

          <button
            onClick={handleManualWebhookToggle}
            className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 self-start sm:self-auto ${
              localWebhookTriggered 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40' 
                : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-400 shadow-sm'
            }`}
          >
            <Zap className="w-3 h-3" />
            <span>{localWebhookTriggered ? 'Re-Trigger Webhook Event' : 'Simulate Webhook Trigger'}</span>
          </button>
        </div>

        {/* 4 Automation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3.5">
          {GITHUB_AUTOMATION_STEPS.map((step) => {
            const isTriggered = localWebhookTriggered;
            return (
              <div 
                key={step.id}
                className={`p-3 rounded-xl border text-xs font-mono transition-all ${
                  isTriggered
                    ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[11px] font-bold truncate ${isTriggered ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {step.name}
                  </span>
                  {isTriggered ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400/70 shrink-0 ml-1" />
                  )}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono truncate">{step.target}</div>
                <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{step.details}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visual Step-by-Step Track */}
      <div className="py-6">
        <div className="relative">
          {/* Background Connecting Line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 bg-slate-800 z-0" />
          
          {/* Active Progress Fill Line */}
          <div 
            className="hidden md:block absolute top-1/2 left-0 h-0.5 -translate-y-1/2 bg-gradient-to-r from-orange-500 via-amber-400 to-teal-400 z-0 transition-all duration-500"
            style={{ width: `${(activeStepIndex / (TIMELINE_STEPS.length - 1)) * 100}%` }}
          />

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 relative z-10">
            {TIMELINE_STEPS.map((step, idx) => {
              const Icon = step.leadIcon;
              const isCurrent = idx === activeStepIndex;
              const isPast = idx < activeStepIndex;
              const isHovered = hoveredStepIndex === idx;

              return (
                <div 
                  key={step.id} 
                  className="relative"
                  onMouseEnter={() => setHoveredStepIndex(idx)}
                  onMouseLeave={() => setHoveredStepIndex(null)}
                >
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      handleStepTransition(idx);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl transition-all duration-200 border group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      isCurrent
                        ? 'bg-slate-950 border-orange-500 shadow-lg shadow-orange-500/10 scale-[1.02]'
                        : isPast
                          ? 'bg-slate-950/70 border-slate-700/80 hover:border-slate-600'
                          : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[11px] font-mono font-bold ${
                        isCurrent 
                          ? 'text-orange-400' 
                          : isPast 
                            ? 'text-teal-400' 
                            : 'text-slate-500'
                      }`}>
                        Hour {step.hour}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className={`w-2 h-2 rounded-full ${
                          isCurrent 
                            ? 'bg-orange-500 animate-ping' 
                            : isPast 
                              ? 'bg-teal-400' 
                              : 'bg-slate-700'
                        }`} />
                        <Info className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isCurrent
                          ? 'bg-orange-500 text-white'
                          : isPast
                            ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-xs font-semibold tracking-tight truncate ${
                        isCurrent ? 'text-white' : 'text-slate-300'
                      }`}>
                        {step.stageName}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400 line-clamp-1">
                      {step.slaWindow}
                    </p>
                  </button>

                  {/* Interactive Tooltip on Hover */}
                  {isHovered && (
                    <div className="absolute top-full mt-2 left-0 right-0 sm:min-w-[280px] sm:-left-6 z-30 bg-slate-950 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 text-orange-400" />
                          <span>{step.stageName}</span>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">Hour {step.hour}</span>
                      </div>

                      {/* Estimated Time to Completion */}
                      <div className="text-[11px] font-mono text-amber-300 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2.5 py-1.5 mb-2.5 flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">{step.etc}</span>
                      </div>

                      {/* Specific Actions Archtechnix Takes */}
                      <div className="text-[11px] font-mono text-slate-400 mb-1.5 font-bold uppercase tracking-wider">
                        Specific Actions Archtechnix Takes:
                      </div>
                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {step.specificActions.slice(0, 3).map((act, i) => (
                          <li key={i} className="flex items-start gap-1.5 leading-snug">
                            <span className="text-orange-400 shrink-0 mt-0.5">▸</span>
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-emerald-400 flex items-center justify-between">
                        <span>Zero Meetings Required</span>
                        <span className="text-slate-500">Click to Select</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Milestone Achieved Notification Banner */}
      {milestoneNotice?.show && (
        <div className="mb-6 p-4 bg-gradient-to-r from-orange-950/40 via-amber-950/30 to-teal-950/40 border border-orange-500/40 rounded-2xl flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300 shadow-xl">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20 mt-0.5">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Milestone Achieved
                </span>
                <span className="text-xs font-bold text-white font-sans">
                  {milestoneNotice.title}
                </span>
                <span className="text-slate-600 text-xs hidden sm:inline">·</span>
                <span className="text-[11px] font-mono text-teal-400 hidden sm:inline">
                  Hour {milestoneNotice.hour} Reached
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {milestoneNotice.subtitle}. All previous operational invariants have been cryptographically verified and locked into the engagement worktree.
              </p>
            </div>
          </div>

          <button
            onClick={() => setMilestoneNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Active Step Detailed Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 transition-all duration-300">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono mb-2">
              <span className="text-orange-400 font-bold uppercase tracking-wider">
                Phase 0{activeStepIndex + 1} of 05
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-400">{activeStep.slaWindow}</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero-Meeting SLA Guaranteed
              </span>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {activeStep.title}
            </h4>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={handlePrev}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white font-mono transition-colors"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-xs text-white font-mono font-semibold transition-colors flex items-center gap-1 shadow-sm"
            >
              <span>Next Phase</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Description & Concrete Automated Checks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
          {/* Left Column: Scope, Actions, and Deliverable */}
          <div className="lg:col-span-7 space-y-5">
            <div>
              <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-400" />
                Operational Methodology & SLA Window
              </h5>
              <p className="text-sm text-slate-200 leading-relaxed font-light">
                {activeStep.description}
              </p>
            </div>

            {/* Concrete Actions Archtechnix Executes */}
            <div>
              <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Specific Actions Archtechnix Takes
              </h5>
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                {activeStep.specificActions.map((action, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0 mt-1.5" />
                    <span className="leading-relaxed">{action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-1">
              <h5 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <GitPullRequest className="w-3.5 h-3.5 text-teal-400" />
                Phase Deliverable
              </h5>
              <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono text-teal-300 flex items-center justify-between">
                <span className="truncate">{activeStep.deliverable}</span>
                <span className="text-[10px] text-slate-500 shrink-0 ml-2">Signed & Verified</span>
              </div>
            </div>
          </div>

          {/* Right Column: Automated Quality Checks & Security Invariants */}
          <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Automated Checks & Invariants
                </span>
                <span className="text-[10px] font-mono text-emerald-400">CI Verified</span>
              </div>

              <ul className="space-y-2.5">
                {activeStep.automatedChecks.map((check, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{check}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Lead: Archtechnix Principal
              </span>
              <span className="text-slate-500">Continuous 72h Audit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
