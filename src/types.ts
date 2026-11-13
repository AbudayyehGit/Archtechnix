export interface PhaseQuiz {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface CurriculumPhase {
  phase: number;
  title: string;
  tagline: string;
  reading: string[];
  keyInvariants: string[];
  codeSample: string;
  codeLanguage: string;
  quiz: PhaseQuiz;
  associatedDocKey: 'masa' | 'checklist' | 'glossary';
}

export interface PricingTier {
  id: 'diagnostic' | 'audit' | 'retainer';
  name: string;
  badge: string;
  price: number;
  period?: string;
  turnaround: string;
  description: string;
  features: string[];
  recommended?: boolean;
}

export interface ScopeAddon {
  id: 'expedite' | 'terraform' | 'drDrill';
  label: string;
  price: number;
  description: string;
}

export interface IntakeSpecData {
  org: string;
  cloud: string;
  rpo: string;
  repo: string;
  compliance: {
    gdpr: boolean;
    soc2: boolean;
    nist: boolean;
  };
  notes: string;
}

export interface PrototypeItem {
  id: string;
  title: string;
  badge: string;
  iconType: 'scale' | 'checkSquare' | 'book' | 'creditCard' | 'webhook' | 'laptop' | 'cpu' | 'network' | 'sparkles' | 'activity' | 'shield' | 'barChart';
  description: string;
  techStack: string[];
  statusMetric: string;
  endpointUrl?: string;
  content: string;
}

export interface ModalPayload {
  isOpen: boolean;
  title: string;
  iconType: 'scale' | 'checkSquare' | 'book' | 'creditCard' | 'webhook' | 'laptop' | 'cpu' | 'network' | 'sparkles' | 'activity' | 'shield' | 'barChart';
  content: string;
  checkoutUrl?: string;
}
