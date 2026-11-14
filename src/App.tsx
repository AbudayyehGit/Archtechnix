import { useState, useEffect, useRef } from 'react';
import { 
  Briefcase, 
  GraduationCap, 
  RotateCcw, 
  ShieldCheck, 
  Ban, 
  Database, 
  Key, 
  Terminal, 
  Scale, 
  CheckSquare, 
  Book, 
  Search, 
  Crosshair, 
  GitPullRequest, 
  Zap, 
  Calculator, 
  FileCode2, 
  ArrowRight,
  CheckCircle2,
  Sun,
  Moon,
  Monitor,
  Calendar
} from 'lucide-react';
import { PRICING_TIERS, OPERATIONAL_DOCS, PROTOTYPE_PORTFOLIO, CURRICULUM_PHASES } from './data';
import {
  AdaptedSkillBlueprint,
  EvolutionStatus,
  IntakeSpecData,
  IntakeValidationThresholds,
  ModalPayload,
  RequirementSpec,
  ScopeBoundaryItem,
  ScopeTaskStatus,
  SkillEvolutionLog,
  SystemSteadyState,
} from './types';
import { PricingCalculator } from './components/PricingCalculator';
import { IntakeGenerator } from './components/IntakeGenerator';
import { OpaScanner } from './components/OpaScanner';
import { AcademyWizard } from './components/AcademyWizard';
import { GlobalModal } from './components/GlobalModal';
import { SeoHead } from './components/SeoHead';
import { TurnaroundTimeline } from './components/TurnaroundTimeline';
import { RecentAutomationEvents } from './components/RecentAutomationEvents';
import { TestimonialCarousel } from './components/TestimonialCarousel';
import { AdvisoryTeam } from './components/AdvisoryTeam';
import { AdvisoryAvailability } from './components/AdvisoryAvailability';
import { IntegrationsSection } from './components/IntegrationsSection';
import { FaqSection } from './components/FaqSection';
import { RpoRtoBenchmarkChart } from './components/RpoRtoBenchmarkChart';
import { BottleneckAssessment } from './components/BottleneckAssessment';
import { PilotAuditDashboard } from './components/PilotAuditDashboard';
import { RetainerGovernanceHub } from './components/RetainerGovernanceHub';
import { GovernanceSteadyStateConsole } from './components/GovernanceSteadyStateConsole';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useAuth } from './contexts/AuthContext';
import { offlineDb } from './lib/offlineDb';
import {
  DEFAULT_INTAKE_THRESHOLDS,
  DEFAULT_REQUIREMENT_SPECS,
  DEFAULT_SKILL_BLUEPRINT,
  evaluateAndAdaptSkill,
} from './lib/governanceEngine';

const STORAGE_KEY = 'omniops_architechnix_state_v2';
const GOVERNANCE_STORAGE_KEY = 'archtechnix_governance_v1';
const SCOPE_STORAGE_KEY = 'archtechnix_scope_boundaries_v1';

type PortalTab = 'funnel' | 'audit' | 'retainer';

export default function App() {
  const { user, idToken, capacity, refreshWorkspace, refreshCapacity } = useAuth();
  const [mode, setMode] = useState<'business' | 'academy'>('business');
  const [portalTab, setPortalTab] = useState<PortalTab>('funnel');
  const [currentPhase, setCurrentPhase] = useState<number>(1);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [selectedTier, setSelectedTier] = useState<'diagnostic' | 'audit' | 'retainer'>('audit');
  const [selectedAddons, setSelectedAddons] = useState({
    expedite: false,
    terraform: false,
    drDrill: false
  });

  const [intakeData, setIntakeData] = useState<IntakeSpecData>({
    org: 'Apex FinTech Systems',
    cloud: 'AWS (EKS, Aurora, KMS)',
    rpo: 'Sub-15 Minute (Zero Data Loss)',
    repo: 'https://github.com/apex-fintech/core-mesh',
    compliance: {
      gdpr: true,
      soc2: true,
      nist: false
    },
    notes: 'Need decoupled event mesh audit, OPA policy generation for KMS key shredding, and sub-15m RTO disaster recovery blueprints.'
  });

  const [modal, setModal] = useState<ModalPayload>({
    isOpen: false,
    title: '',
    iconType: 'scale',
    content: ''
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [webhookTriggered, setWebhookTriggered] = useState<boolean>(false);

  // Governance, Idempotent Guards, Steady-State Checkpoints & Evolutionary Skill Builder
  const [requirementSpecs, setRequirementSpecs] = useState<RequirementSpec[]>(DEFAULT_REQUIREMENT_SPECS);
  const [steadyStates, setSteadyStates] = useState<SystemSteadyState[]>([]);
  const [evolutionLogs, setEvolutionLogs] = useState<SkillEvolutionLog[]>([]);
  const [intakeThresholds, setIntakeThresholds] = useState<IntakeValidationThresholds>(
    DEFAULT_INTAKE_THRESHOLDS
  );
  const [adaptedBlueprint, setAdaptedBlueprint] = useState<AdaptedSkillBlueprint>(
    DEFAULT_SKILL_BLUEPRINT
  );
  const [governanceHydrated, setGovernanceHydrated] = useState<boolean>(false);
  const [scopeBoundaries, setScopeBoundaries] = useState<ScopeBoundaryItem[]>([]);
  const [scopeHydrated, setScopeHydrated] = useState<boolean>(false);

  // Check for Stripe Checkout return parameters (?status=success&session_id=...)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const status = urlParams.get('status');

    if (status === 'success' && sessionId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      fetch(`/api/session-status?session_id=${encodeURIComponent(sessionId)}`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      })
        .then((res) => res.json())
        .then((data) => {
          refreshCapacity();
          if (idToken) refreshWorkspace();
          setModal({
            isOpen: true,
            title: 'Payment Successful - Archtechnix Advisory Activated',
            iconType: 'checkSquare',
            content: `STRIPE CHECKOUT VERIFIED (LIVE)
Session ID: ${sessionId}
Payment Status: ${data.paymentStatus || 'paid'}
Amount Captured: $${data.amountTotal ? (data.amountTotal / 100).toLocaleString() : '3,500'} USD
Customer Email: ${data.customerEmail || 'Authorized'}
Client Reference: ${data.clientReferenceId || 'ARCH-ENGAGEMENT'}

Operational Pipeline:
1. Schedule A intake verified & immutable baseline locked.
2. Private GitHub advisory repository provisioned.
3. Async-by-Default + Weekly Strategic Sync cadence activated.
4. Archtechnix Principal Architect assigned.`
          });
          showToast('Payment confirmed! Archtechnix advisory engagement activated.');
        })
        .catch(() => {
          showToast('Payment confirmed! Welcome to Archtechnix.');
        });
    } else if (status === 'cancelled') {
      window.history.replaceState({}, document.title, window.location.pathname);
      showToast('Stripe checkout was cancelled. You can resume anytime.');
    }
  }, [idToken, refreshCapacity, refreshWorkspace]);

  // Theme Settings: Supports 'system' (Sync with System Theme), 'dark' (Archtechnix Dark), and 'light' (High-Contrast Light)
  const [themeMode, setThemeMode] = useState<'system' | 'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('omniops_theme_mode');
      if (savedMode === 'system' || savedMode === 'dark' || savedMode === 'light') {
        return savedMode;
      }
      const legacy = localStorage.getItem('omniops_theme');
      if (legacy === 'light' || legacy === 'dark') return legacy;
    }
    return 'dark';
  });

  const [osPrefersDark, setOsPrefersDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  const [themeMenuOpen, setThemeMenuOpen] = useState<boolean>(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setOsPrefersDark(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setOsPrefersDark(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!themeMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [themeMenuOpen]);

  const theme: 'dark' | 'light' =
    themeMode === 'system' ? (osPrefersDark ? 'dark' : 'light') : themeMode;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    try {
      localStorage.setItem('omniops_theme_mode', themeMode);
      localStorage.setItem('omniops_theme', theme);
    } catch {
      // LocalStorage fallback
    }
  }, [theme, themeMode]);

  const handleToggleSystemThemeSync = () => {
    setThemeMode((prev) => {
      if (prev === 'system') {
        return osPrefersDark ? 'dark' : 'light';
      }
      return 'system';
    });
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.mode) setMode(parsed.mode);
        if (parsed.portalTab === 'funnel' || parsed.portalTab === 'audit' || parsed.portalTab === 'retainer') {
          setPortalTab(parsed.portalTab);
        }
        if (parsed.currentPhase) setCurrentPhase(parsed.currentPhase);
        if (parsed.completedPhases) setCompletedPhases(parsed.completedPhases);
        if (parsed.quizAnswers) setQuizAnswers(parsed.quizAnswers);
        if (parsed.selectedTier) setSelectedTier(parsed.selectedTier);
        if (parsed.selectedAddons) setSelectedAddons(parsed.selectedAddons);
        if (parsed.intakeData) setIntakeData(parsed.intakeData);
      }
      offlineDb.intakeDrafts
        .get('active-schedule-a')
        .then((rec) => {
          if (rec?.data) setIntakeData(rec.data);
        })
        .catch(() => {});
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, []);

  // Save state on mutation
  useEffect(() => {
    try {
      const payload = {
        mode,
        portalTab,
        currentPhase,
        completedPhases,
        quizAnswers,
        selectedTier,
        selectedAddons,
        intakeData
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }, [mode, portalTab, currentPhase, completedPhases, quizAnswers, selectedTier, selectedAddons, intakeData]);

  // Hydrate governance telemetry & steady-state checkpoints (localStorage + Express API)
  useEffect(() => {
    let active = true;
    try {
      const savedGov = localStorage.getItem(GOVERNANCE_STORAGE_KEY);
      if (savedGov) {
        const parsed = JSON.parse(savedGov);
        if (Array.isArray(parsed.requirementSpecs)) setRequirementSpecs(parsed.requirementSpecs);
        if (Array.isArray(parsed.steadyStates)) setSteadyStates(parsed.steadyStates);
        if (Array.isArray(parsed.evolutionLogs)) setEvolutionLogs(parsed.evolutionLogs);
        if (parsed.intakeThresholds) setIntakeThresholds(parsed.intakeThresholds);
        if (parsed.adaptedBlueprint) setAdaptedBlueprint(parsed.adaptedBlueprint);
      }
    } catch (e) {
      console.warn('Governance localStorage load error', e);
    }

    fetch('/api/governance/state')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (Array.isArray(data.steadyStates)) {
          setSteadyStates((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            const merged = [...prev];
            for (const item of data.steadyStates as SystemSteadyState[]) {
              if (!seen.has(item.id)) merged.push(item);
            }
            return merged.length > 0 ? merged : data.steadyStates;
          });
        }
        if (Array.isArray(data.evolutionLogs)) {
          setEvolutionLogs((prev) => {
            const seen = new Set(prev.map((l) => l.id));
            const merged = [...prev];
            for (const item of data.evolutionLogs as SkillEvolutionLog[]) {
              if (!seen.has(item.id)) merged.push(item);
            }
            return merged.length > 0 ? merged : data.evolutionLogs;
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setGovernanceHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  // Persist governance state to localStorage on mutation
  useEffect(() => {
    if (!governanceHydrated) return;
    try {
      localStorage.setItem(
        GOVERNANCE_STORAGE_KEY,
        JSON.stringify({
          requirementSpecs,
          steadyStates,
          evolutionLogs,
          intakeThresholds,
          adaptedBlueprint,
        })
      );
    } catch (e) {
      console.warn('Governance localStorage save error', e);
    }
  }, [
    governanceHydrated,
    requirementSpecs,
    steadyStates,
    evolutionLogs,
    intakeThresholds,
    adaptedBlueprint,
  ]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleCommitSteadyState = (stateRecord: SystemSteadyState) => {
    setSteadyStates((prev) => [stateRecord, ...prev]);
    fetch('/api/governance/steady-states', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stateRecord),
    }).catch(() => {});
  };

  const handleRecordEvolution = (
    logEntry: SkillEvolutionLog,
    nextThresholds: IntakeValidationThresholds,
    nextBlueprint: AdaptedSkillBlueprint,
    didAutoAdapt: boolean
  ) => {
    setEvolutionLogs((prev) => [logEntry, ...prev]);
    if (didAutoAdapt) {
      setIntakeThresholds(nextThresholds);
      setAdaptedBlueprint(nextBlueprint);
    }
    fetch('/api/governance/evolution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    }).catch(() => {});
  };

  const handleUpdateEvolutionStatus = (id: string, status: EvolutionStatus) => {
    setEvolutionLogs((prev) =>
      prev.map((item) => (item.id === id ? { ...item, evolution_status: status } : item))
    );
    fetch(`/api/governance/evolution/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evolution_status: status }),
    }).catch(() => {});
  };

  // Hydrate & persist ScopeBoundaryLog items (localStorage + Express API)
  useEffect(() => {
    let active = true;
    try {
      const savedScope = localStorage.getItem(SCOPE_STORAGE_KEY);
      if (savedScope) {
        const parsed = JSON.parse(savedScope);
        if (Array.isArray(parsed)) setScopeBoundaries(parsed);
      }
    } catch {
      // Ignore storage error
    }

    fetch('/api/scope-boundaries')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.items)) return;
        setScopeBoundaries((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const merged = [...prev];
          for (const item of data.items as ScopeBoundaryItem[]) {
            if (!seen.has(item.id)) merged.push(item);
          }
          return merged.length > 0 ? merged : data.items;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (active) setScopeHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!scopeHydrated) return;
    try {
      localStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify(scopeBoundaries));
    } catch {
      // Ignore storage error
    }
  }, [scopeBoundaries, scopeHydrated]);

  const handleAddScopeItem = (item: ScopeBoundaryItem) => {
    setScopeBoundaries((prev) => [item, ...prev]);
    fetch('/api/scope-boundaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).catch(() => {});
  };

  const handleUpdateScopeStatus = (id: string, status: ScopeTaskStatus) => {
    setScopeBoundaries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
    fetch(`/api/scope-boundaries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  };

  const handleEscalateOutOfScopeToSkillBuilder = (item: ScopeBoundaryItem) => {
    const outOfScopeCount =
      scopeBoundaries.filter((s) => s.classification === 'out_of_scope_retainer_candidate').length +
      1;
    const outcome = evaluateAndAdaptSkill(
      {
        skillName: `Scope-Boundary Escalation: ${item.title.slice(0, 48)}`,
        sprintType: 'pilot_audit_14d',
        deliveryDays: 14,
        outOfScopeFlags: outOfScopeCount,
        architectVelocityScore: 92,
        rpoVerifiedMinutes: 12,
        clientRequirementDelta: `out_of_scope_retainer_candidate logged (${item.requestedHours}h): ${item.rationale}`,
      },
      intakeThresholds,
      adaptedBlueprint
    );
    handleRecordEvolution(
      outcome.logEntry,
      outcome.nextThresholds,
      outcome.nextBlueprint,
      outcome.didAutoAdapt
    );
  };

  const handleResetData = () => {
    if (window.confirm('Reset all saved wizard progress, quiz answers, and intake drafts?')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(GOVERNANCE_STORAGE_KEY);
      localStorage.removeItem(SCOPE_STORAGE_KEY);
      localStorage.removeItem('archtechnix_sprint_start_v1');
      window.location.reload();
    }
  };

  const handleToggleAddon = (addonId: 'expedite' | 'terraform' | 'drDrill') => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: !prev[addonId]
    }));
  };

  const handleQuizSubmit = (phase: number, answerIndex: number) => {
    const curPhase = CURRICULUM_PHASES[phase - 1];
    setQuizAnswers((prev) => ({ ...prev, [phase]: answerIndex }));

    if (answerIndex === curPhase.quiz.correct) {
      if (!completedPhases.includes(phase)) {
        setCompletedPhases((prev) => [...prev, phase]);
      }
      showToast(`Phase ${phase} Mastered! Knowledge Verified.`);
    } else {
      showToast('Assessment requires remediation. Check the explanation.');
    }
  };

  const handleOpenDoc = (docKey: 'masa' | 'checklist' | 'glossary' | 'standards' | 'sdlc') => {
    const doc = OPERATIONAL_DOCS[docKey];
    if (doc) {
      setModal({
        isOpen: true,
        title: doc.title,
        iconType: doc.iconType,
        content: doc.content
      });
    }
  };

  const handleOpenPrototype = (id: string) => {
    const proto = PROTOTYPE_PORTFOLIO.find((p) => p.id === id);
    if (proto) {
      setModal({
        isOpen: true,
        title: proto.title,
        iconType: proto.iconType,
        content: proto.content
      });
    }
  };

  const handleStripeCheckout = async (tierOverride?: 'diagnostic' | 'audit' | 'retainer') => {
    setIsCheckingOut(true);
    const activeTierId = tierOverride || selectedTier;
    const tier = PRICING_TIERS.find((t) => t.id === activeTierId) || PRICING_TIERS[1];
    let total = tier.price;
    if (!tierOverride) {
      if (selectedAddons.expedite) total += 1200;
      if (selectedAddons.terraform) total += 1800;
      if (selectedAddons.drDrill) total += 2200;
    }

    const clientRef = `ARCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      showToast(`Initiating live Stripe Checkout for ${tier.name}...`);
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          tierId: activeTierId,
          tierName: tier.name,
          amount: total,
          addons: tierOverride ? {} : selectedAddons,
          clientReferenceId: clientRef,
          customerEmail: user?.email || 'enterprise-client@archtechnix.com',
          successUrl: `${window.location.origin}/?status=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/?status=cancelled`
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Failed to create Stripe Checkout session');
      }

      setModal({
        isOpen: true,
        title: 'Redirecting to Stripe Hosted Checkout',
        iconType: 'creditCard',
        content: `LIVE STRIPE CHECKOUT INITIALIZED
Session ID: ${data.id}
Tier: ${tier.name}
Billing Mode: ${activeTierId === 'retainer' ? 'Recurring Monthly Subscription ($7,500/mo)' : 'Fixed-Fee Audit'}
Total Investment: $${total.toLocaleString()} USD
Turnaround SLA: ${activeTierId === 'diagnostic' ? '14-Day Async Sprint' : activeTierId === 'retainer' ? 'Continuous Async + Weekly 60m Sync' : '10 Business Days'}
Status: ACTIVE_GATEWAY

Stripe Hosted Checkout URL:
${data.url}

Click "Open Stripe Checkout" below or wait for automatic redirection to complete payment securely on Stripe.`,
        checkoutUrl: data.url
      });

      showToast('Stripe session ready! Launching checkout...');

      setTimeout(() => {
        try {
          if (window.top) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          window.location.href = data.url;
        }
      }, 1200);
    } catch (err: any) {
      console.error('Stripe Checkout Error:', err);
      showToast(`Stripe Gateway Error: ${err.message || 'Payment initiation failed'}`);
      setModal({
        isOpen: true,
        title: 'Stripe Gateway Notice',
        iconType: 'creditCard',
        content: `Stripe API Error: ${err.message || 'Unknown network error'}\n\nPlease check that your server is running and Stripe credentials are valid.`
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSimulateWebhook = () => {
    setWebhookTriggered(true);
    showToast('Stripe Webhook checkout.session.completed fired! GitHub automations triggered.');
    const webhookEvent = {
      id: `evt_${Math.random().toString(36).substring(2, 14)}`,
      object: 'event',
      type: 'checkout.session.completed',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `cs_test_${Math.random().toString(36).substring(2, 10)}`,
          amount_total: 750000,
          currency: 'usd',
          customer_details: {
            email: 'cto@enterprise-partner.io',
            name: 'Enterprise CTO'
          },
          metadata: {
            engagement_tier: 'Full Data Mesh & Zero-Trust Audit',
            repo_provision: 'omniops-advisory/apex-mesh-audit',
            zero_meeting_spec: 'SCHEDULE-A-APPROVED'
          }
        }
      }
    };

    setModal({
      isOpen: true,
      title: 'Incoming Stripe Webhook Ingestion Event',
      iconType: 'webhook',
      content: `// INCOMING WEBHOOK LISTENER: /api/v1/stripe/webhook
// Signature Verified: HMAC-SHA256 valid

Payload Received:
${JSON.stringify(webhookEvent, null, 2)}

[AUTOMATION EXECUTED]:
1. Verified Stripe HMAC Signature header.
2. Created Private Advisory Repository: "omniops-advisory/apex-mesh-audit".
3. Auto-invited client infrastructure team via GitHub API.
4. Initialized Schedule A Intake Checklist in GitHub Project Board.`
    });
  };

  const navigateToModule = (tab: PortalTab, sectionId?: string) => {
    setMode('business');
    setPortalTab(tab);
    if (sectionId) {
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToIntake = () => {
    navigateToModule('funnel', 'zero-intake-section');
  };

  const progressPercentage = Math.round((completedPhases.length / 6) * 100);

  return (
    <div className="ai-studio-root min-h-screen w-full min-w-full bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      {/* Dynamic SEO Metadata, OpenGraph, Twitter Cards, Canonical & Schema.org JSON-LD */}
      <SeoHead mode={mode} currentPhaseNum={currentPhase} selectedTierId={selectedTier} />

      {/* ========================================================================= */}
      {/* TOP GLOBAL NAVIGATION (OPTIMIZED FOR ZERO MOBILE OVERFLOW)               */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 w-full transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4 w-full">
          {/* Brand Lockup */}
          <div 
            onClick={() => setMode('business')}
            className="brand-lockup-container flex items-center space-x-2 cursor-pointer select-none shrink-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-teal-500 via-cyan-500 to-orange-500 flex items-center justify-center font-bold text-white text-xs sm:text-base shadow-lg shadow-teal-500/10 shrink-0">
              {'{∞}'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center space-x-1">
                <span className="font-extrabold text-slate-100 tracking-tight text-sm sm:text-base md:text-lg">
                  Arch<span className="text-orange-500">technix</span>
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono tracking-widest uppercase truncate hidden lg:block">
                72-Hour Spec-Driven Solo Advisory
              </span>
            </div>
          </div>

          {/* Mode Switcher Pill - Stationary, non-floating, fully visible, min 44x44px touch targets */}
          <div className="nav-mode-container flex items-center justify-center shrink-0 overflow-x-auto whitespace-nowrap">
            <nav aria-label="Mode Switcher" className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-full shadow-inner overflow-x-auto whitespace-nowrap">
              <button
                onClick={() => setMode('business')}
                className={`min-h-[44px] min-w-[44px] px-3 sm:px-4 rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  mode === 'business'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span>Portal</span>
              </button>
              <button
                onClick={() => setMode('academy')}
                className={`min-h-[44px] min-w-[44px] px-3 sm:px-4 rounded-full text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all duration-200 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  mode === 'academy'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Wizard</span>
              </button>
            </nav>
          </div>

          {/* Right Action Zone: Retainer Capacity Counter, PWA Install, Theme Toggle, & Reset */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
            <div className="hidden md:flex items-center space-x-2 text-[11px] font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 tabular-nums">
              <span className="text-slate-400">Retainer Slots:</span>
              <span className="text-emerald-400 font-bold">
                {capacity.availableSlots} / {capacity.maxSlots} Open
              </span>
            </div>

            <PWAInstallButton />

            {/* Theme Settings Control with Sync with System Theme Toggle */}
            <div ref={themeMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setThemeMenuOpen((prev) => !prev)}
                aria-expanded={themeMenuOpen}
                aria-haspopup="dialog"
                aria-label="Theme settings"
                title="Theme settings"
                className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl flex items-center justify-center space-x-1.5 text-xs font-mono font-medium transition-all duration-200 bg-slate-900 border border-slate-800 hover:border-orange-500/50 text-slate-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 shadow-sm"
              >
                {themeMode === 'system' ? (
                  <>
                    <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="hidden xl:inline text-[11px] text-cyan-300">Auto</span>
                  </>
                ) : theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="hidden xl:inline text-[11px] text-amber-300/90">Dark</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="hidden xl:inline text-[11px] text-indigo-600">Light</span>
                  </>
                )}
              </button>

              {themeMenuOpen && (
                <div
                  role="dialog"
                  aria-label="Theme preferences"
                  className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-4 z-50 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-white">Theme Settings</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        Active: {theme === 'dark' ? 'Archtechnix Dark' : 'High-Contrast Light'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      OS: {osPrefersDark ? 'Dark' : 'Light'}
                    </span>
                  </div>

                  {/* Sync with System Theme Toggle */}
                  <div className="flex items-center justify-between gap-3 py-1">
                    <div>
                      <div className="text-xs font-semibold text-white">Sync with System Theme</div>
                      <div className="text-[11px] text-slate-400">
                        Uses OS prefers-color-scheme
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={themeMode === 'system'}
                      aria-label="Sync with System Theme"
                      onClick={handleToggleSystemThemeSync}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                        themeMode === 'system' ? 'bg-orange-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                          themeMode === 'system' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Manual Mode Selector */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setThemeMode('dark');
                        setThemeMenuOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors ${
                        themeMode === 'dark'
                          ? 'bg-orange-500/15 border-orange-500/50 text-orange-400 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setThemeMode('light');
                        setThemeMenuOpen(false);
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors ${
                        themeMode === 'light'
                          ? 'bg-orange-500/15 border-orange-500/50 text-orange-500 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Browser State Button */}
            <button
              onClick={handleResetData}
              title="Reset Local Browser State"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors bg-slate-900 sm:bg-transparent rounded-xl border sm:border-0 border-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* VIEW 1: ARCHITECHNIX COMMERCIAL BUSINESS ADVISORY PORTAL                  */}
      {/* ========================================================================= */}
      {mode === 'business' && (
        <main className="flex-1 animate-in fade-in duration-300">
          {/* Sticky Portal Workspace Tab Strip */}
          <div className="sticky top-16 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80">
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Portal Workspace Views" className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
                <button
                  role="tab"
                  aria-selected={portalTab === 'funnel'}
                  onClick={() => navigateToModule('funnel')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition-all border ${
                    portalTab === 'funnel'
                      ? 'bg-orange-500/15 text-orange-400 border-orange-500/40'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 shrink-0" />
                  <span>Conversion & Intake</span>
                </button>
                <button
                  role="tab"
                  aria-selected={portalTab === 'audit'}
                  onClick={() => navigateToModule('audit')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition-all border ${
                    portalTab === 'audit'
                      ? 'bg-teal-500/15 text-teal-400 border-teal-500/40'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Pilot Audit Portal</span>
                </button>
                <button
                  role="tab"
                  aria-selected={portalTab === 'retainer'}
                  onClick={() => navigateToModule('retainer')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold flex items-center space-x-2 transition-all border ${
                    portalTab === 'retainer'
                      ? 'bg-violet-500/15 text-violet-400 border-violet-500/40'
                      : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <FileCode2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Retainer Governance Hub</span>
                </button>
              </div>

              <div className="hidden lg:flex items-center space-x-3 text-[11px] font-mono text-slate-400">
                <span>Model: <strong className="text-slate-200">Async-by-Default + 1 Weekly Sync</strong></span>
                <span className="text-slate-700">|</span>
                <button
                  onClick={() => navigateToModule('retainer', 'advisory-availability-section')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book 1-Hr Sync</span>
                </button>
              </div>
            </div>
          </div>

          {portalTab === 'funnel' && (
            <>
              {/* Hero Section */}
              <section className="relative overflow-hidden py-16 lg:py-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
                  <div className="max-w-3xl">
                    {/* Hero Upper Scarcity & Model Badge */}
                    <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-mono mb-6 max-w-full tabular-nums">
                      <span className="font-bold text-emerald-400">{capacity.label}</span>
                      <span className="text-slate-600">·</span>
                      <span>Async-by-Default + 1 Weekly Strategic Sync</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                      Stop scheduling discovery calls.<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-amber-200">
                        Deploy verified cloud architectures on spec.
                      </span>
                    </h1>
                    <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed font-light">
                      Archtechnix delivers fixed-price $3,500 Pilot Audits and $7,500/mo fractional architecture retainers for scaling technology enterprises—combining decoupled data mesh engineering, automated OPA Rego compliance, and sub-15 minute RPO/RTO validation.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3 sm:gap-4 items-center">
                      <button
                        onClick={() => handleStripeCheckout('diagnostic')}
                        disabled={isCheckingOut}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-3.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center space-x-2 transition-all font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                      >
                        <span>Start $3,500 Pilot Audit</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigateToModule('funnel', 'bottleneck-assessment-section')}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-5 py-3.5 rounded-xl flex items-center space-x-2 transition-all font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <span>5-Point Bottleneck Assessment</span>
                        <Calculator className="w-4 h-4 text-orange-400" />
                      </button>
                      <button
                        onClick={() => navigateToModule('audit', 'pilot-audit-section')}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-5 py-3.5 rounded-xl flex items-center space-x-2 transition-all font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <span>Pilot Audit Hub</span>
                        <ShieldCheck className="w-4 h-4 text-teal-400" />
                      </button>
                      <button
                        onClick={() => navigateToModule('retainer', 'retainer-hub-section')}
                        className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold px-5 py-3.5 rounded-xl flex items-center space-x-2 transition-all font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        <span>Retainer Hub</span>
                        <FileCode2 className="w-4 h-4 text-violet-400" />
                      </button>
                    </div>

                    {/* Quick Section Anchors */}
                    <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-slate-400">
                      <span className="text-slate-500">Direct Jump:</span>
                      <button onClick={() => navigateToModule('funnel', 'bottleneck-assessment-section')} className="text-slate-300 hover:text-orange-400 transition-colors underline underline-offset-2">
                        Bottleneck Quiz
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('audit', 'pilot-audit-section')} className="text-slate-300 hover:text-teal-400 transition-colors underline underline-offset-2">
                        Compliance Matrix
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('retainer', 'retainer-hub-section')} className="text-slate-300 hover:text-violet-400 transition-colors underline underline-offset-2">
                        SSD / ADRs & Sync Agenda
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('funnel', 'zero-intake-section')} className="text-slate-300 hover:text-cyan-400 transition-colors underline underline-offset-2">
                        Schedule A Spec
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('retainer', 'integrations-section')} className="text-slate-300 hover:text-orange-400 transition-colors underline underline-offset-2">
                        GitHub OAuth
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('retainer', 'advisory-availability-section')} className="text-slate-300 hover:text-emerald-400 transition-colors underline underline-offset-2">
                        Sync Calendar
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => navigateToModule('retainer', 'governance-steady-state-section')} className="text-slate-300 hover:text-orange-400 transition-colors underline underline-offset-2">
                        Steady-State & Guards
                      </button>
                      <span className="text-slate-700" aria-hidden="true">·</span>
                      <button onClick={() => setMode('academy')} className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2">
                        Flex Wizard
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Operational Highlights / Dedicated Workflow Comparison */}
              <section className="py-12 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-6 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>The Asynchronous-First Operating Model with Weekly Sync Window</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-teal-500/40 transition-colors">
                      <div className="text-teal-400 mb-3"><Ban className="w-6 h-6" /></div>
                      <h3 className="font-bold text-white text-base">Async-First + 1hr Weekly Sync</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Zero discovery call fatigue. Day-to-day work is spec-driven, with up to 1 full hour of weekly synchronized Teams/phone communication available at client request.
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-colors">
                      <div className="text-cyan-400 mb-3"><Database className="w-6 h-6" /></div>
                      <h3 className="font-bold text-white text-base">Decoupled Data Mesh</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Domain-driven federated data architectures with sub-15 minute RPO/RTO target disaster recovery blueprints.
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-violet-500/40 transition-colors">
                      <div className="text-violet-400 mb-3"><Key className="w-6 h-6" /></div>
                      <h3 className="font-bold text-white text-base">Key Shredding & OPA</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Policy-as-code automation and cryptographic key shredding protocols for GDPR/CCPA & zero-trust compliance.
                      </p>
                    </div>

                    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 hover:border-orange-500/40 transition-colors">
                      <div className="text-orange-400 mb-3"><Terminal className="w-6 h-6" /></div>
                      <h3 className="font-bold text-white text-base">Git-Driven Artifacts</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        Final artifacts delivered strictly as PRs, Terraform modules, Open Policy Agent bundles, and architecture diagrams.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Module 1: Interactive 5-Question Technical Bottleneck Assessment */}
              <section id="bottleneck-assessment-section" className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <BottleneckAssessment
                    organizationName={intakeData.org}
                    capacity={capacity}
                    isCheckingOut={isCheckingOut}
                    onLaunchPilotCheckout={() => handleStripeCheckout('diagnostic')}
                    onBookCalSync={() => navigateToModule('retainer', 'advisory-availability-section')}
                    onShowToast={showToast}
                    onSyncFindingsToIntake={(summaryNotes, recommendedTier) => {
                      setSelectedTier(recommendedTier);
                      setIntakeData((prev) => ({
                        ...prev,
                        notes: summaryNotes,
                      }));
                      navigateToModule('funnel', 'zero-intake-section');
                    }}
                  />
                </div>
              </section>

              {/* Interactive Pricing Calculator Section */}
              <section id="pricing-section" className="py-16 bg-slate-900/40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="text-center max-w-2xl mx-auto mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                      Transparent Procurement
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-3">Productized Advisory Tier Calculator</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      Select your scope and immediately initiate $3,500 Pilot Audit or $7,500/mo Retainer checkout via Stripe.
                    </p>
                  </div>

                  <PricingCalculator
                    selectedTier={selectedTier}
                    onSelectTier={setSelectedTier}
                    selectedAddons={selectedAddons}
                    onToggleAddon={handleToggleAddon}
                    onSimulateStripe={() => handleStripeCheckout()}
                    onSimulateWebhook={handleSimulateWebhook}
                    onScrollToIntake={scrollToIntake}
                    isCheckingOut={isCheckingOut}
                    capacity={capacity}
                  />
                </div>
              </section>

              {/* Zero-Meeting Intake Specification Section */}
              <section id="zero-intake-section" className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl mb-8">
                    <span className="text-xs font-mono uppercase tracking-wider text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                      Protocol Intake Engine
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-3">Schedule A: Zero-Meeting Intake Specification</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      Dedicated workflow replication. Fill in infrastructure coordinates—drafts autosave locally in IndexedDB and sync to Cloud SQL on sign-in.
                    </p>
                  </div>

                  <IntakeGenerator
                    intakeData={intakeData}
                    onUpdate={setIntakeData}
                    onShowToast={showToast}
                    thresholds={intakeThresholds}
                  />
                </div>
              </section>

              {/* Visual Step-by-Step 72-Hour Turnaround Progress Timeline & Automation Events Section */}
              <section id="timeline-section" className="py-16 bg-slate-900/30 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                  <TurnaroundTimeline 
                    webhookTriggered={webhookTriggered}
                    onTriggerWebhook={handleSimulateWebhook}
                  />
                  <RecentAutomationEvents 
                    webhookTriggered={webhookTriggered}
                    onShowToast={showToast}
                  />
                </div>
              </section>

              {/* Sub-15m RPO/RTO Disaster Recovery Benchmark Visualization */}
              <section id="rpo-rto-section" className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <RpoRtoBenchmarkChart />
                </div>
              </section>

              {/* Enterprise CTO Success Stories / Testimonial Carousel */}
              <section id="testimonials-section" className="py-16 bg-slate-900/40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <TestimonialCarousel />
                </div>
              </section>

              {/* Applied Engineering & Portfolio Hub */}
              <section className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl mb-12">
                    <span className="text-xs font-mono uppercase tracking-wider text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                      Applied Engineering Proof of Work
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-3">Production Architecture Portfolio</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      Battle-tested prototypes and architectures built across the Archtechnix advisory ecosystem.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {PROTOTYPE_PORTFOLIO.map((proto) => (
                      <div
                        key={proto.id}
                        className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-md border border-cyan-500/20">
                              {proto.badge}
                            </span>
                            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{proto.statusMetric}</span>
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-white">{proto.title}</h3>
                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{proto.description}</p>

                          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono">
                            {proto.techStack.map((tech: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-950 text-slate-300 rounded border border-slate-800">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center">
                          <span className="text-[11px] font-mono text-slate-500">Autonomous Architecture</span>
                          <button
                            onClick={() => handleOpenPrototype(proto.id)}
                            className="text-xs text-orange-400 hover:text-orange-300 font-mono flex items-center space-x-1"
                          >
                            <span>Inspect Architecture Spec</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Principal Advisory Team */}
              <section id="advisory-team-section" className="py-16 bg-slate-900/40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <AdvisoryTeam />
                </div>
              </section>

              {/* Frequently Asked Questions */}
              <section id="faq-section" className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <FaqSection />
                </div>
              </section>
            </>
          )}

          {portalTab === 'audit' && (
            <>
              {/* Module 2: Pilot Audit Diagnostic Dashboard */}
              <section id="pilot-audit-section" className="py-12 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <PilotAuditDashboard
                    isCheckingOut={isCheckingOut}
                    onLaunchPilotCheckout={() => handleStripeCheckout('diagnostic')}
                    onActivateRetainerCheckout={() => handleStripeCheckout('retainer')}
                    onShowToast={showToast}
                    intakeData={intakeData}
                    scopeBoundaries={scopeBoundaries}
                    onAddScopeItem={handleAddScopeItem}
                    onUpdateScopeStatus={handleUpdateScopeStatus}
                    onEscalateOutOfScopeToSkillBuilder={handleEscalateOutOfScopeToSkillBuilder}
                    onCommitSteadyState={handleCommitSteadyState}
                    capacity={capacity}
                  />
                </div>
              </section>

              {/* Live OPA Rego Scanner Section */}
              <section id="opa-scanner-section" className="py-16 bg-slate-900/30 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl mb-8">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                      Interactive Compliance Sandbox
                    </span>
                    <h2 className="text-3xl font-extrabold text-white mt-3">Live Policy-as-Code (OPA Rego) Scanner</h2>
                    <p className="text-slate-400 text-sm mt-2">
                      Test production security rules against cloud infrastructure states in real time. Validate compliance before merging PRs.
                    </p>
                  </div>

                  <OpaScanner />
                </div>
              </section>
            </>
          )}

          {portalTab === 'retainer' && (
            <>
              {/* Module 3: Retainer Governance Hub (SSDs, ADRs, Weekly Sync Agenda Builder) */}
              <section id="retainer-hub-section" className="py-12 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <RetainerGovernanceHub
                    isCheckingOut={isCheckingOut}
                    onActivateRetainerCheckout={() => handleStripeCheckout('retainer')}
                    onShowToast={showToast}
                    intakeData={intakeData}
                    steadyStates={steadyStates}
                  />
                </div>
              </section>

              {/* Principal Architect Advisory Availability & 1-Hour Sync Booking */}
              <section id="advisory-availability-section" className="py-16 bg-slate-900/40 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <AdvisoryAvailability 
                    onShowToast={showToast}
                    defaultOrg={intakeData.org}
                    defaultRepo={intakeData.repo}
                  />
                </div>
              </section>

              {/* GitHub Organization OAuth Integration & Automated Repository Provisioning Section */}
              <section id="integrations-section" className="py-16 bg-slate-950 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <IntegrationsSection 
                    onShowToast={showToast}
                    defaultOrg={intakeData.org}
                    onRepositoryProvisioned={(repoData) => {
                      setIntakeData((prev) => ({
                        ...prev,
                        repo: repoData.repoUrl
                      }));
                    }}
                  />
                </div>
              </section>

              {/* Idempotent Guards, Steady-State Checkpoints & Supabase RLS Migration */}
              <section id="governance-steady-state-section" className="py-16 bg-slate-900/30 border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <GovernanceSteadyStateConsole
                    requirementSpecs={requirementSpecs}
                    onUpdateSpecs={setRequirementSpecs}
                    steadyStates={steadyStates}
                    onCommitSteadyState={handleCommitSteadyState}
                    intakeThresholds={intakeThresholds}
                    adaptedBlueprint={adaptedBlueprint}
                    onShowToast={showToast}
                  />
                </div>
              </section>
            </>
          )}

          {portalTab === 'funnel' && (
            <>
              {/* Operational Business Documents & Linked Glossary */}
              <section className="py-16 bg-slate-950 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-8">
                <span className="text-xs font-mono uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                  Operational Playbooks & Legal Artifacts
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-3">Production Form Templates</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Ready-to-deploy contractual and technical agreements. Copy in one click.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-orange-400 mb-3"><Scale className="w-6 h-6" /></div>
                    <h3 className="font-bold text-white text-base">MASA Contract</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Master Asynchronous Services Agreement: Governs IP ownership, strict asynchronous SLA, and key destruction liability caps.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDoc('masa')}
                    className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-orange-400 border border-slate-800 text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span>View & Copy MASA Agreement</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-teal-400 mb-3"><CheckSquare className="w-6 h-6" /></div>
                    <h3 className="font-bold text-white text-base">Technical Artifact Checklist</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      18-point verification checklist validating zero-standing privilege, Terraform state encryption, and sub-15m disaster recovery.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDoc('checklist')}
                    className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <span>View & Copy Checklist</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-violet-400 mb-3"><Book className="w-6 h-6" /></div>
                    <h3 className="font-bold text-white text-base">Architecture Glossary</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Searchable technical glossary covering Data Mesh, RPO/RTO, Key Shredding, Rego, and Zero-Trust terms with direct contextual definitions.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDoc('glossary')}
                    className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-violet-400 border border-slate-800 text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Launch Glossary</span>
                  </button>
                </div>

                <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="text-cyan-400 mb-3"><ShieldCheck className="w-6 h-6" /></div>
                    <h3 className="font-bold text-white text-base">W3C & ISO Charter</h3>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Official standards compliance charter certifying WCAG 2.2 AA accessibility, ISO/IEC 27001 data security, and ISO 9001:2015 quality frameworks.
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenDoc('standards')}
                    className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 text-xs font-mono rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Inspect Standards Charter</span>
                  </button>
                </div>
              </div>

              {/* Minimum SDLC Documentation Suite Callout */}
              <div className="mt-8 p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 text-teal-400 border border-teal-500/20 mb-2">
                    <span>Mandatory Engineering Baseline</span>
                  </div>
                  <h3 className="text-base font-bold text-white">Minimum SDLC Documentation Suite</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Standardized technical governance: 1. System Specification Document (SSD) · 2. Data Flow & Compliance Matrix · 3. Risk & Mitigation Register · 4. Change Log / ADRs.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenDoc('sdlc')}
                  className="bg-slate-950 hover:bg-slate-800 border border-teal-500/40 text-teal-300 px-4 py-2.5 rounded-xl text-xs font-mono flex items-center space-x-2 transition-colors shrink-0"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>Inspect SDLC Suite</span>
                </button>
              </div>
            </div>
          </section>

          {/* Tactical SEO & 4-Week Outbound Prospecting Growth Roadmap */}
          <section className="py-16 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mb-8">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  Growth Engine & Operational Cadence
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-3">High-Intent B2B Enterprise Acquisition Strategy</h2>
                <p className="text-slate-400 text-sm mt-2">
                  How Archtechnix captures $200k+ enterprise consulting pipelines with zero outbound cold calling and disciplined asynchronous prospecting.
                </p>
              </div>

              {/* 4-Week Outbound Prospecting Sprint Card */}
              <div className="mb-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div className="flex items-center space-x-2 text-sm font-bold text-white">
                    <Crosshair className="w-4 h-4 text-orange-500" />
                    <span>The 4-Week Outbound Prospecting Sprint Protocol</span>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">Target: Tech & Healthcare Scaleups</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-orange-400 font-bold mb-1">Week 1: Curate & Align</div>
                    <p className="text-slate-400 font-sans text-xs">
                       Curate 30–50 decision-makers (CTOs / VPs of Engineering) in tech and healthcare scaleups. Align target repositories with verified proof-of-work blueprints.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-1">Week 2: Value-First Touch</div>
                    <p className="text-slate-400 font-sans text-xs">
                      Low-friction initial outreach delivering concrete architectural teardowns and policy-as-code insights. Zero aggressive pitch or discovery call requests.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-teal-400 font-bold mb-1">Week 3: $3,500 Pilot Audit</div>
                    <p className="text-slate-400 font-sans text-xs">
                      Asynchronous value drop (teardowns, OPA rules) and frictionless conversion into the fixed-price $3,500 Pilot Audit sprint.
                    </p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-emerald-400 font-bold mb-1">Week 4: $7,500/mo Retainer</div>
                    <p className="text-slate-400 font-sans text-xs">
                      Audit delivery via clean markdown specifications, followed by natural onboarding into the $7,500/month continuous advisory retainer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-xs">
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <div className="text-emerald-400 font-bold text-sm mb-3 flex items-center space-x-2">
                    <Crosshair className="w-4 h-4" />
                    <span>High-Value Programmatic Keywords</span>
                  </div>
                  <ul className="space-y-2 text-slate-400">
                    <li className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      "OPA Rego CI/CD pipeline automation AWS"
                    </li>
                    <li className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      "15-minute RTO disaster recovery cross-region"
                    </li>
                    <li className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      "Cryptographic key shredding GDPR compliance"
                    </li>
                    <li className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                      "Decoupled data mesh solo architect fixed price"
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <div className="text-cyan-400 font-bold text-sm mb-3 flex items-center space-x-2">
                    <GitPullRequest className="w-4 h-4" />
                    <span>GitHub Moat Engineering</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed font-sans text-xs">
                    Publishing reference implementations with pre-configured GitHub Actions security scanners. Enterprise engineers searching for OPA rules or Terraform compliance discover the repositories and submit Schedule A specifications directly through PR templates.
                  </p>
                </div>

                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <div className="text-orange-400 font-bold text-sm mb-3 flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>The 72-Hour Turnaround Moat</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed font-sans text-xs">
                    Traditional enterprise consultancies require 6 weeks of procurement and 12 kickoff calls before a single line of IaC is written. Archtechnix delivers verified production PRs and diagnostic matrices within 72 hours of Stripe checkout activation, eliminating bureaucratic drag.
                  </p>
                </div>
              </div>
            </div>
          </section>
            </>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: THE FLEX WIZARD (6-PHASE INTERACTIVE LEARNING ACADEMY)            */}
      {/* ========================================================================= */}
      {mode === 'academy' && (
        <main className="flex-1 animate-in fade-in duration-300">
          {/* Academy Header & Progress Meter */}
          <div className="bg-slate-900 border-b border-slate-800 py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-md text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Interactive Solo-Advisory Masterclass</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white mt-1.5 font-sans">
                    Enterprise Architecture Flex Wizard
                  </h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Master the 6 disciplines of asynchronous, spec-driven technical consulting.
                  </p>
                </div>

                {/* Overall Progress Meter */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center space-x-4 min-w-[280px]">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-mono mb-1.5">
                      <span className="text-slate-400">Curriculum Progress:</span>
                      <span className="text-orange-400 font-bold tabular-nums">
                        {completedPhases.length} / 6 Phases ({progressPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-teal-400 via-cyan-400 to-orange-500 h-2 transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded-md border ${
                    completedPhases.length === 6
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {completedPhases.length === 6 ? 'Master Architect' : `${completedPhases.length}/6 Complete`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active Phase Content Area */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <AcademyWizard
              currentPhaseNum={currentPhase}
              onSelectPhase={setCurrentPhase}
              completedPhases={completedPhases}
              quizAnswers={quizAnswers}
              onSubmitQuiz={handleQuizSubmit}
              onOpenDoc={handleOpenDoc}
              onShowToast={showToast}
              evolutionLogs={evolutionLogs}
              intakeThresholds={intakeThresholds}
              adaptedBlueprint={adaptedBlueprint}
              onRecordEvaluation={handleRecordEvolution}
              onUpdateLogStatus={handleUpdateEvolutionStatus}
            />
          </section>
        </main>
      )}

      {/* Standardized Footer: W3C, ISO 9001/27001 & Copyright Governance */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950/95 py-10 px-4 sm:px-6 lg:px-8 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-teal-500 via-cyan-500 to-orange-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
              {'{∞}'}
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-tight font-sans">
                Arch<span className="text-orange-500">technix</span>
              </span>
              <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                Asynchronous Solo-Advisory Architecture & High-Scale Cloud Governance.
              </p>
            </div>
          </div>

          {/* Standards & Certifications Line */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px]">
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-cyan-400">
              W3C WCAG 2.2 AA
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-teal-400">
              ISO/IEC 27001
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-emerald-400">
              ISO 9001:2015
            </span>
            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-orange-400">
              NIST SP 800-207
            </span>
          </div>

          {/* Copyright & Quick Links */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-[11px]">
            <button
              onClick={() => handleOpenDoc('masa')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              MASA Terms
            </button>
            <span className="text-slate-700 hidden sm:inline">·</span>
            <button
              onClick={() => handleOpenDoc('standards')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Compliance Charter
            </button>
            <span className="text-slate-700 hidden sm:inline">·</span>
            <span className="text-slate-500">
              © {new Date().getFullYear()} Archtechnix. All rights reserved.
            </span>
          </div>
        </div>
      </footer>

      {/* Global Document Modal */}
      <GlobalModal
        modal={modal}
        onClose={() => setModal({ ...modal, isOpen: false })}
        onShowToast={showToast}
      />

      {/* Offline Status Indicator */}
      <OfflineIndicator />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-orange-500 text-white font-mono text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
