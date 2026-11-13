import { CurriculumPhase, PricingTier, ScopeAddon, PrototypeItem } from './types';

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'diagnostic',
    name: 'Asynchronous Pilot Audit',
    badge: '14-Day Async Sprint',
    price: 3500,
    turnaround: '14-Day Diagnostic Sprint',
    description: 'Fixed-fee diagnostics sprint evaluating enterprise infrastructure topology, DevSecOps/compliance posture (ISO 27001, SOC 2, NIST), and prioritized remediation roadmaps.',
    features: [
      'Comprehensive infrastructure topology review & DevSecOps pipeline audit',
      'Compliance posture assessment (ISO/IEC 27001, SOC 2 Type II, NIST SP 800-207)',
      'Sub-15m RPO/RTO resilience verification & disaster recovery gap analysis',
      'Actionable remediation roadmap delivered via Markdown & 15-minute Loom walkthrough',
      'Up to 1 full hour of synchronized alignment call (Teams / Meet / Phone) on predetermined schedule',
      'Zero discovery drag; initiated immediately on Schedule A intake'
    ]
  },
  {
    id: 'retainer',
    name: 'Fractional Advisory Retainer',
    badge: 'Capped at 4 Clients',
    price: 7500,
    period: '/mo',
    turnaround: 'Continuous Async Advisory',
    description: 'Fractional advisory governance, ongoing architecture scaling, pre-commit hook compliance enforcement, and continuous RPO/RTO validation.',
    features: [
      'Ongoing asynchronous PR review & RFC co-authoring (up to 8 PRs/month)',
      'Dedicated private GitHub advisory repository with 24h PR comment turnaround',
      'Pre-commit hook compliance enforcement & automated OPA Rego rule suites',
      'Quarterly live disaster recovery & 15-min RTO failover simulation drills',
      'Up to 1 full hour of synchronized communication per week (Teams / Meet / Phone) on request',
      'Strictly capped at 4 active concurrent clients (respecting 20–25 hour work week)'
    ],
    recommended: true
  },
  {
    id: 'audit',
    name: 'Data Mesh & Zero-Trust Sprint',
    badge: 'Comprehensive Deep Dive',
    price: 12500,
    turnaround: '10-Day PR-Driven SLA',
    description: 'Full-scale decoupled data mesh migration, continuous WAL replication pipeline, and cryptographic erasure architecture.',
    features: [
      'Domain-oriented Decoupled Data Mesh architectural blueprint & data contracts',
      'Production OPA Rego security policy repository ready for CI/CD gates',
      'Cryptographic Key Shredding envelope encryption code (DEK/KEK lifecycle)',
      '30 days direct asynchronous GitHub PR review & RFC advisory support',
      'Zero discovery calls; all artifacts submitted via Git pull request'
    ]
  }
];

export const SCOPE_ADDONS: ScopeAddon[] = [
  {
    id: 'expedite',
    label: '24-Hour Expedited Delivery',
    price: 1200,
    description: 'Accelerates diagnostic review to emergency 24-hour delivery window'
  },
  {
    id: 'terraform',
    label: 'Production Terraform Scaffolding',
    price: 1800,
    description: 'Complete modular Terraform / OpenTofu IaC scripts with OPA pre-commit gates'
  },
  {
    id: 'drDrill',
    label: '15-Min RTO Live Simulation Drill',
    price: 2200,
    description: 'Live failover chaos drill verifying sub-15 minute point-in-time state recovery'
  }
];

export const CURRICULUM_PHASES: CurriculumPhase[] = [
  {
    phase: 1,
    title: 'Asynchronous Operating Architecture',
    tagline: 'Eliminating Discovery Meetings & Implementing Spec-Driven PR Delivery',
    reading: [
      'The traditional enterprise consulting model collapses under synchronous drag: endless exploratory Zoom discovery calls, ambiguous verbal scoping, unbilled project management overhead, and slide-deck theater that produces zero running code.',
      'Archtechnix replicates the Dedicated operating protocol: every engagement starts with a structured Markdown intake specification (Schedule A). The client supplies concrete infrastructure coordinates (VPC boundaries, cloud provider, KMS keys, compliance frameworks, repository mirror).',
      'All deliverables exist exclusively as code Pull Requests, Architectural Decision Records (ADRs), and automated test suites. Feedback and review take place directly within GitHub or GitLab inline comments, generating an immutable, auditable paper trail.'
    ],
    keyInvariants: [
      'Zero discovery calls: 100% asynchronous initiation via Schedule A intake spec',
      'Git-driven deliverables: Output delivered as Terraform, Rego policies, and PRs',
      'Inline PR critique: Eliminates verbal ambiguity and guarantees audit compliance',
      'Fixed-price commitments: 72-hour delivery SLA with zero billable hourly disputes'
    ],
    codeLanguage: 'typescript',
    codeSample: `// Dedicated-Grade Asynchronous Schedule A Intake Interface
export interface ScheduleAIntakeSpec {
  organizationId: string;
  cloudProvider: 'AWS' | 'GCP' | 'Azure' | 'MultiCloud';
  rpoMinutesTarget: number; // Maximum allowable: 15 minutes
  rtoMinutesTarget: number; // Sub-15 minute cold-standby target
  cryptographicKeyShredding: boolean; // Mandated for GDPR Art. 17
  zeroTrustPolicyEngine: 'OPA_Rego' | 'Kyverno';
  asyncApprovalPrUrl: string; // Deliverables reviewed only via Git PR
  immutableAuditStorage: 'AWS_S3_ObjectLock' | 'GCP_BucketLock';
}`,
    quiz: {
      question: 'Why does the Archtechnix advisory model reject discovery Zoom calls in favor of asynchronous Schedule A specifications?',
      options: [
        'Because video conferencing technology is unreliable across enterprise VPNs.',
        'Because synchronous discovery calls introduce ambiguous verbal scoping, unpaid consultative hours, and lack Git-verifiable auditability.',
        'Because cloud architecture cannot legally be discussed verbally under US federal regulations.',
        'To force enterprise clients to hire dedicated junior offshore scrum masters.'
      ],
      correct: 1,
      explanation: 'Synchronous exploratory meetings are the primary root cause of scope creep and unbilled consultative work. Enforcing a structured Markdown intake spec establishes immediate technical boundaries, clear coordinates, and an auditable paper trail.'
    },
    associatedDocKey: 'masa'
  },
  {
    phase: 2,
    title: 'Data Systems & Enterprise Architecture',
    tagline: 'Decoupled Data Mesh Paradigms & Sub-15 Minute RPO/RTO Targets',
    reading: [
      'Centralized data lakes and monolithic transactional databases inevitably become organizational and operational bottlenecks. In this phase, we architect Decoupled Data Meshes with autonomous domain boundaries.',
      'Data is treated as a first-class product owned by decentralized domain teams. Cross-domain analytical sharing occurs via published contracts, schema registries, and asynchronous streaming events (e.g. Kafka or Apache Iceberg) rather than direct SQL queries into production tables.',
      'For business-critical stateful storage, we enforce a strict 15-minute Recovery Point Objective (RPO) and Recovery Time Objective (RTO). This is achieved through continuous Write-Ahead Log (WAL) replication, automated snapshot archiving, and cold-standby infrastructure automated via IaC.'
    ],
    keyInvariants: [
      'Domain ownership: Data is published as an autonomous product with strict schema contracts',
      'Continuous WAL streaming: Sub-second transactional log replication to alternate regions',
      'Sub-15m RPO: Maximum allowable data loss of 900 seconds across catastrophic region failure',
      'Sub-15m RTO: Fully automated cold-standby spin-up without manual infrastructure provisioning'
    ],
    codeLanguage: 'hcl',
    codeSample: `# Disaster Recovery Target Blueprint: Continuous WAL & Sub-15m RTO
resource "aws_backup_plan" "tier1_mesh_dr" {
  name = "sub-15-minute-mesh-dr-plan"

  rule {
    rule_name                = "15m_continuous_wal_archival"
    target_vault_name        = aws_backup_vault.dr_primary_vault.name
    schedule                 = "cron(0/15 * * * ? *)"
    enable_continuous_backup = true

    lifecycle {
      delete_after = 30 # Days
    }

    copy_action {
      destination_vault_arn = aws_backup_vault.dr_cross_region_standby.arn
    }
  }
}`,
    quiz: {
      question: 'In enterprise disaster recovery, what is the core architectural requirement to achieve a verified 15-minute RPO (Recovery Point Objective)?',
      options: [
        'Executing full database tape backups every night at 00:00 UTC.',
        'Continuous WAL (Write-Ahead Log) replication and sub-15 minute incremental snapshot shipping to an alternate failure domain.',
        'Vertically scaling the primary database instance by doubling CPU and RAM allocations.',
        'Exporting CSV dumps of customer tables to an unversioned public S3 bucket.'
      ],
      correct: 1,
      explanation: 'RPO represents allowable data loss measured in time. A 15-minute RPO requires continuous write-ahead log shipping and automated incremental snapshot mirroring to an alternate regional failure domain every 15 minutes or faster.'
    },
    associatedDocKey: 'checklist'
  },
  {
    phase: 3,
    title: 'Regulatory Engineering & Compliance Automation',
    tagline: 'Policy-as-Code, Open Policy Agent (OPA), and Cryptographic Shredding',
    reading: [
      'Enterprise regulatory compliance (GDPR, CCPA, SOC2 Type II) must not be a manual quarterly spreadsheet review. We treat compliance as automated software engineering through Policy-as-Code.',
      'Using Open Policy Agent (OPA) and Rego, every infrastructure commit and pull request is deterministically evaluated against security invariants before merge. If a resource violates encryption standards or exposes ingress ports, the build fails instantly with actionable remediation.',
      'Furthermore, we implement Cryptographic Key Shredding to solve GDPR Article 17 ("Right to be Forgotten"). Rather than rewriting petabytes of immutable historical backups, each tenant or entity is encrypted with a unique Data Encryption Key (DEK). Deleting the tenant\'s DEK renders all historical cold-storage ciphertext mathematically unrecoverable in microseconds.'
    ],
    keyInvariants: [
      'Policy-as-Code in CI: OPA Rego pre-merge gate prevents non-compliant resources from deploying',
      'Cryptographic Key Shredding: Deletion of unique DEKs achieves instant mathematical erasure',
      'Envelope encryption: Master Key (KEK) wraps Data Encryption Keys (DEK) with automated rotation',
      'Audit log immutability: Object-Lock WORM compliance storage for all regulatory access events'
    ],
    codeLanguage: 'rego',
    codeSample: `# Open Policy Agent: Rego Rule for Cryptographic Shredding & S3 KMS
package enterprise.compliance.storage

default allow = false

# Rule 1: S3 Data Mesh buckets must enforce KMS envelope encryption
allow {
    input.resource_type == "aws_s3_bucket"
    input.encryption.kms_key_id != ""
    input.public_access_block == true
}

# Rule 2: Ephemeral runners must enforce cryptographic key shredding
allow {
    input.resource_type == "ephemeral_runner"
    input.ttl_minutes <= 15
    input.cryptographic_shredding_enabled == true
}`,
    quiz: {
      question: 'How does Cryptographic Key Shredding solve GDPR\'s "Right to be Forgotten" in massive immutable cold-storage data lakes?',
      options: [
        'By executing sequential DELETE queries across petabytes of compressed historical tape backups.',
        'By encrypting each entity\'s data with a unique DEK; destroying that key immediately renders all historical ciphertext permanently unrecoverable.',
        'By physically degaussing and replacing all server hard drives in the primary datacenter.',
        'By submitting legal exemption waivers stating that cloud data lakes are immune to privacy regulations.'
      ],
      correct: 1,
      explanation: 'Traversing petabytes of immutable historical backups to delete specific user records is computationally and structurally impossible. Cryptographic key shredding destroys the unique key used to encrypt that entity\'s records, achieving instantaneous mathematical erasure across all backups.'
    },
    associatedDocKey: 'glossary'
  },
  {
    phase: 4,
    title: 'DevSecOps & Zero Trust Security Controls',
    tagline: 'Shift-Left Scanning, NIST SP 800-207, & Ephemeral CI/CD Runners',
    reading: [
      'Perimeter-based network security is obsolete. Modern cloud systems assume the internal network perimeter is already breached, adhering strictly to NIST SP 800-207 Zero Trust Architecture.',
      'No user, microservice, or build runner holds implicit trust based on network address. Every transaction requires mutual TLS (mTLS), short-lived OpenID Connect (OIDC) identity tokens, and contextual least-privilege authorization.',
      'CI/CD runners operate in 100% ephemeral mode: containers spawn on-demand for a single pipeline job with a hard 15-minute maximum TTL, run as non-root on read-only filesystems, and auto-terminate immediately to neutralize lateral movement attacks.'
    ],
    keyInvariants: [
      'Zero standing privilege: Temporary OIDC credentials replace static IAM access keys in CI/CD',
      'Ephemeral runners: 1-to-1 pipeline runner lifecycle with automatic 15-minute termination',
      'Shift-left static analysis: SAST, dependency vulnerability scanning, and secret detection in git hooks',
      'mTLS microsegmentation: Mutual TLS encryption between all service mesh endpoints'
    ],
    codeLanguage: 'yaml',
    codeSample: `# Kubernetes Ephemeral Runner Pod (Zero-Standing-Privilege)
apiVersion: actions.summerwind.dev/v1alpha1
kind: RunnerDeployment
metadata:
  name: omniops-ephemeral-runner
spec:
  template:
    spec:
      ephemeral: true # Pod terminates immediately after single execution
      serviceAccountName: runner-zero-trust-role
      securityContext:
        readOnlyRootFilesystem: true
        runAsNonRoot: true
        allowPrivilegeEscalation: false
      resources:
        limits:
          cpu: "2"
          memory: "4Gi"`
  ,
    quiz: {
      question: 'Under NIST SP 800-207 Zero Trust Architecture, what is the policy regarding internal network communication inside a private VPC?',
      options: [
        'Internal traffic inside a private VPC is implicitly trusted and unencrypted.',
        'All traffic, internal or external, must be explicitly authenticated, authorized, and encrypted (e.g. via mTLS and short-lived tokens).',
        'Security firewalls are required only at the boundary of the corporate VPN gateway.',
        'Internal services must only change admin passwords every 90 days.'
      ],
      correct: 1,
      explanation: 'NIST SP 800-207 asserts that no request, user, or service is trusted based on network topology. Every transaction must be authenticated, authorized within context, and encrypted regardless of origin.'
    },
    associatedDocKey: 'checklist'
  },
  {
    phase: 5,
    title: 'Productization, Packaging & Payment Procurement',
    tagline: 'Fixed-Price Tiers & Automated Stripe Webhook Ingestion Pipelines',
    reading: [
      'The solo technical advisor must never bill by the hour. Hourly billing penalizes experience, misaligns client incentives, and caps revenue while inviting contentious time-tracking audits.',
      'Instead, we package high-value capabilities into standardized, high-contrast productized tiers: $3,500 Asynchronous Pilot Audit (72-hour turnaround) and $7,500/month Fractional Advisory Retainer.',
      'We enforce a strict capacity constraint of maximum 4 active monthly clients to protect a sustainable 20–25 hour work week. This generates predictable financials: $0 floor -> $15,000 midpoint (2 clients) -> $30,000 monthly ceiling (4 clients). Live synchronous calls are restricted exclusively to high-stake executive alignment and billed separately as premium exceptions.',
      'Procurement is fully automated: when a client completes checkout on Stripe, an asynchronous webhook (checkout.session.completed) verifies the signature, provisions a private GitHub advisory repository, and generates the Schedule A intake checklist automatically.'
    ],
    keyInvariants: [
      'Value-based fixed pricing: $3,500 Pilot Audit -> $7,500/mo Retainer pipeline',
      'Capacity boundary: Strictly capped at 4 active monthly retainers (20–25 hr work week)',
      'Financial target: $0 floor -> $15,000 midpoint -> $30,000 ceiling per month',
      'Async by default: Live calls restricted exclusively to high-stake executive alignment exceptions'
    ],
    codeLanguage: 'python',
    codeSample: `# FastAPI Stripe Webhook Ingestion Endpoint
from fastapi import FastAPI, Request, Header, HTTPException
import stripe

app = FastAPI()

@app.post("/api/v1/stripe/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(...)):
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await provision_advisory_repo(
            customer_email=session["customer_email"],
            tier=session["metadata"]["tier"],
            schedule_a_id=session["metadata"]["schedule_a_id"]
        )
    return {"status": "success", "event_id": event["id"]}`,
    quiz: {
      question: 'What is the primary commercial advantage of fixed-price productized advisory tiers over traditional hourly consulting billing?',
      options: [
        'Clients pay significantly less total compensation to the advisor.',
        'It decouples revenue from hours worked, eliminates billing disputes, and aligns client-advisor incentives on rapid, high-impact delivery.',
        'It obligates the advisor to work 80 billable hours per week.',
        'Hourly consulting billing has been declared illegal by international commercial courts.'
      ],
      correct: 1,
      explanation: 'Productized fixed pricing prices the value and speed of the outcome rather than time spent. This incentivizes rapid delivery, automated tooling, and allows an experienced solo practitioner to scale revenue sustainably.'
    },
    associatedDocKey: 'masa'
  },
  {
    phase: 6,
    title: 'Client Acquisition & Growth Engines',
    tagline: 'High-Intent Content Moats, GitHub Prospecting, & Tactical B2B SEO',
    reading: [
      'High-value enterprise clients do not respond to generic cold LinkedIn messages. They hire advisors whom their senior engineers already recognize as canonical technical authorities.',
      'We execute a disciplined 4-Week Outbound Prospecting Sprint:',
      '• Week 1: Target list curation (30–50 decision-makers in tech/healthcare startups) and proof-of-work alignment.',
      '• Week 2: Value-first, low-friction initial outreach focusing on architectural and compliance insights (zero sales pitch).',
      '• Week 3: Asynchronous value drop (teardowns, OPA samples) and conversion into the $3,500 Asynchronous Pilot Audit.',
      '• Week 4: Audit delivery via markdown specs and seamless conversion into the $7,500 monthly retainer.',
      'We also maintain open-source reference repositories on GitHub containing pre-packaged OPA security rules and Terraform scaffolding. When enterprise teams search for production OPA templates, they fork our repositories, and submit Schedule A specifications directly when custom advisory is required.'
    ],
    keyInvariants: [
      '4-Week Outbound Sprint: Week 1 list (30–50 CTOs) -> Week 2 value -> Week 3 Pilot ($3.5k) -> Week 4 Retainer ($7.5k)',
      'Technical content moat: Exhaustive post-mortems and architecture breakdowns earn organic authority',
      'Open-source trojan horses: High-utility GitHub repositories generate qualified enterprise inbound leads',
      'The 72-hour turnaround moat: Delivering production PRs in 3 days beats legacy 6-week agency procurement'
    ],
    codeLanguage: 'html',
    codeSample: `<!-- Tactical B2B SEO Microdata / Schema.org -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "name": "Archtechnix Advisory",
  "description": "Zero-meeting asynchronous enterprise cloud architecture, OPA Rego policy-as-code, and data mesh audits.",
  "url": "https://archtechnix.com",
  "priceRange": "$3500 - $7500",
  "areaServed": "Global Enterprise",
  "founder": {
    "@type": "Person",
    "name": "OmniOps Systems Architect"
  },
  "serviceType": [
    "Decoupled Data Mesh Architecture",
    "Open Policy Agent CI/CD Auditing",
    "Sub-15 Minute Disaster Recovery Engineering"
  ]
}
<\/script>`,
    quiz: {
      question: 'How does an open-source technical repository function as an acquisition engine for an asynchronous advisory practice?',
      options: [
        'It displays paid banner advertisements to visiting software developers.',
        'Enterprise engineers searching for solutions star and fork the repo, validating the advisor\'s technical authority and leading to direct inbound advisory requests.',
        'GitHub pays monthly ad-revenue dividends directly to repository owners.',
        'It requires developers to enter corporate credit card credentials before cloning the git code.'
      ],
      correct: 1,
      explanation: 'Open-source reference implementations establish instant technical credibility. When engineering teams hit production edge cases, the repository author is perceived as the ultimate expert to hire.'
    },
    associatedDocKey: 'glossary'
  }
];

export const OPERATIONAL_DOCS = {
  masa: {
    title: 'Master Asynchronous Services Agreement (MASA)',
    iconType: 'scale' as const,
    content: `# MASTER ASYNCHRONOUS SERVICES AGREEMENT (MASA)
Effective Date: November 11, 2026
Between: Archtechnix ("Advisor") and Enterprise Client ("Client")

## 1. Operating Protocol: Asynchronous-First Delivery & Synchronized Window
1.1 Asynchronous-First Delivery: Both parties explicitly agree that day-to-day architecture reviews, recommendations, and operational artifacts are executed asynchronously via Git Pull Requests, Markdown Specifications, and encrypted repository attachments to guarantee velocity and immutable audit trails.
1.2 Synchronized Weekly Window: The Advisor shall provide up to one (1) full hour of synchronized real-time communication per week via Microsoft Teams, Google Meet, or direct telephone call. Such session shall be scheduled upon Client's advance request at a mutually agreed-upon predetermined date and time, available once per week from the start of the project through final delivery.
1.3 Pull Request Authority: Code changes, Terraform modules, and OPA policies shall remain authoritative within Git pull requests and inline issue commentary.

## 2. Service Tiers & Turnaround SLA
2.1 Tier 1 (Architectural Diagnostic): Delivery guaranteed within 72 hours of Schedule A execution.
2.2 Tier 2 (Decoupled Data Mesh & Zero-Trust Audit): 10 business days for complete repo delivery and policy-as-code scaffolding.
2.3 Revisions: Client shall provide feedback exclusively via Git inline comments within seven (7) calendar days of artifact receipt.

## 3. Cryptographic Data Shredding & Liability
3.1 In the event of engagement termination or upon formal GDPR Article 17 request, Advisor shall execute automated cryptographic key shredding on all local and remote customer test artifacts.
3.2 Advisor's total cumulative liability under this Agreement shall not exceed the total fees paid by Client during the preceding three (3) calendar months.`
  },

  checklist: {
    title: '18-Point Technical Artifact Delivery Checklist',
    iconType: 'checkSquare' as const,
    content: `# ARCHITECHNIX 18-POINT TECHNICAL ARTIFACT DELIVERY CHECKLIST

## Section 1: Data Mesh & Storage Decoupling
[ ] 01. S3 / Cloud Storage buckets enforce default KMS SSE-KMS with unique customer keys.
[ ] 02. Multi-region asynchronous log replication configured with sub-15m target latency.
[ ] 03. Automated continuous WAL log archiving verified with simulated point-in-time recovery.
[ ] 04. Domain data products segregated into discrete VPCs with cross-account IAM role assumptions.
[ ] 05. Zero unencrypted persistent volumes allowed in Kubernetes/EKS cluster definitions.

## Section 2: Policy-as-Code & Compliance (OPA Rego)
[ ] 06. OPA Rego pre-merge gate running in CI/CD (GitHub Actions / GitLab CI).
[ ] 07. Public IP ingress prohibited on all compute instances.
[ ] 08. Automated Cryptographic Key Shredding test suite passes with 0 key remnants.
[ ] 09. Audit trail logging directed to immutable write-once-read-many (WORM) storage.
[ ] 10. GDPR & CCPA automated deletion webhook triggers verified.

## Section 3: DevSecOps & Zero Trust (NIST SP 800-207)
[ ] 11. CI/CD runners operate in 100% ephemeral mode with maximum 15-minute TTL.
[ ] 12. Mutual TLS (mTLS) enforced across all internal service mesh communications.
[ ] 13. Short-lived OIDC tokens replace long-lived cloud provider credentials in CI.
[ ] 14. Static Application Security Testing (SAST) blocks PRs with High or Critical CVEs.
[ ] 15. Dependency container base images signed using Cosign/Sigstore.

## Section 4: Asynchronous Handover & Operations
[ ] 16. Architectural Decision Records (ADRs) authored in repository /docs/adr.
[ ] 17. Asynchronous Loom walkthrough recorded without live synchronous attendance.
[ ] 18. Formal client sign-off acquired via approved GitHub Pull Request merge.`
  },

  glossary: {
    title: 'Enterprise Architecture & Solo-Advisory Glossary',
    iconType: 'book' as const,
    content: `# ARCHTECHNIX TECHNICAL GLOSSARY

* Asynchronous Advisory: Professional consulting conducted without real-time meetings or discovery calls, relying entirely on structured Markdown specs, Loom video briefs, and Git PR reviews.
* Cryptographic Key Shredding: The intentional deletion of the Data Encryption Key (DEK) used to encrypt sensitive customer data. Without the key, ciphertext in backups is rendered irrevocably unreadable, meeting GDPR erasure requirements without expensive backup rewrites.
* Decoupled Data Mesh: An architectural paradigm shifting from centralized data lakes to decentralized, domain-owned analytical data products with self-serve infrastructure and federated governance.
* Ephemeral CI/CD Runner: A temporary build container or VM provisioned for the sole duration of a single pipeline job and destroyed immediately upon completion, neutralizing persistent lateral threat vectors.
* Master Asynchronous Services Agreement (MASA): The foundational legal contract establishing fixed pricing, PR-based delivery milestones, zero-meeting boundaries, and cryptographic data protection standards.
* NIST SP 800-207: The canonical United States government cybersecurity standard defining Zero Trust Architecture—mandating that implicit trust based on network physical location is abolished.
* Open Policy Agent (OPA) & Rego: An open-source, general-purpose policy engine and declarative language (Rego) that enables unified, context-aware policy enforcement across microservices, Kubernetes, and CI/CD pipelines.
* RPO (Recovery Point Objective): The maximum acceptable age of files or data that must be recovered from backup storage for normal operations to resume if a system failure occurs. Archtechnix targets sub-15 minutes.
* RTO (Recovery Time Objective): The maximum acceptable duration of time that a system can remain offline following a disaster or catastrophic outage before normal operations are restored.
* Schedule A Specification: The structured technical intake document authored by the client outlining cloud topology, IAM boundaries, compliance targets, and repository access prior to project kickoff.`
  },

  standards: {
    title: 'W3C, ISO & Gold-Standard Architecture Compliance Framework',
    iconType: 'shield' as const,
    content: `# ARCHTECHNIX ENTERPRISE COMPLIANCE & INTERNATIONAL STANDARDS CHARTER
Status: ACTIVE_GOVERNANCE_SPECIFICATION
Jurisdiction: Global Enterprise Cloud Engagements

## 1. W3C (World Wide Web Consortium) & Accessibility Standards
* W3C Web Content Accessibility Guidelines (WCAG) 2.2 AA Compliance:
  - Contrast ratios strictly >= 4.5:1 for standard text and >= 3:1 for large display elements.
  - Interactive touch target sizing compliant with WCAG 2.5.8 (Target Size Minimum >= 24px) and Gold Standard ergonomic mobile baseline (>= 44x44px).
  - Valid ARIA landmark navigation roles (<header>, <nav>, <main>, <footer>) with explicit focus-visible states.

## 2. ISO (International Organization for Standardization) Compliance
* ISO/IEC 27001 (Information Security Management):
  - Encryption at rest via AES-256 and continuous KMS key rotation.
  - Ephemeral runner isolation guaranteeing zero residual disk state post-pipeline execution.
* ISO 9001:2015 (Quality Management Systems):
  - Standardized technical artifact delivery checklists with 18-point pre-merge gates.
  - Formalized SLA performance metrics (72h turnaround on diagnostic sprints, 24h on PR reviews).
* ISO/IEC 25010 (System and Software Quality Models):
  - Sub-15 minute RTO (Recovery Time Objective) and sub-15 minute RPO (Recovery Point Objective) architecture benchmarks.

* NIST SP 800-207 Zero Trust Architecture (ZTA):
  - Complete elimination of implicit network perimeter trust.
  - Contextual authentication via short-lived OpenID Connect (OIDC) identity tokens.
* GDPR Article 17 ("Right to be Forgotten"):
  - Automated Cryptographic Key Shredding rendering historical ciphertext unrecoverable in microseconds.`
  },

  sdlc: {
    title: 'Minimum SDLC Documentation Suite (Architecture Governance)',
    iconType: 'checkSquare' as const,
    content: `# MINIMUM SDLC DOCUMENTATION SUITE (ARCHITECHNIX & OMNIOPS)
Status: MANDATORY_GOVERNANCE_STANDARD
Target: Enterprise Cloud & Healthcare/FinTech Scaled Systems

## 1. System Specification Document (SSD)
* Markdown-based technical requirements repository in /docs/specifications.
* Defines VPC topology, service mesh boundaries, and microservice interfaces.
* Authoritative single source of truth for architectural invariants and data contracts.

## 2. Data Flow & Compliance Matrix
* End-to-end mapping of data ingestion, processing pipelines, and persistence.
* Encryption-at-rest (AES-256 via KMS) and transit (mTLS / TLS 1.3) verification.
* Cryptographic Key Shredding lifecycle specs for GDPR Article 17 ("Right to be Forgotten").

## 3. Risk & Mitigation Register
* Systematic tracking of technical debt, cloud cost inefficiencies, and CVEs.
* High/Critical severity thresholds with automated GitHub Actions CI blockers.
* Disaster recovery playbooks for sub-15 minute RPO/RTO cold-standby restoration.

## 4. Change Log / ADRs (Architectural Decision Records)
* Chronological immutable records of technical decisions stored in /docs/adr.
* Format: Context, Decision, Validation Status, and Consequences.
* Approved exclusively via Git Pull Request merges.`
  }
};

export const PROTOTYPE_PORTFOLIO: PrototypeItem[] = [
  {
    id: 'dxsyn',
    title: 'DxSyn 1.0 — Clinical Diagnostics AI Engine',
    badge: 'Generative AI Diagnostics',
    iconType: 'activity',
    description: 'Mental health and behavioral diagnostics generative AI engine with multi-modal clinical reasoning, structured DSM-5/ICD-11 validation, and HIPAA compliance enforcement.',
    techStack: ['Gemini 2.5 Pro', 'FastAPI ASGI', 'LangGraph Multi-Agent', 'HIPAA Vault KMS'],
    statusMetric: 'Final Validation Phase',
    endpointUrl: 'https://dxsyn.internal.omniops.systems',
    content: `# DXSYN 1.0 CLINICAL DIAGNOSTICS ARCHITECTURE
Category: Generative AI Diagnostics & Clinical Decision Support Engine
Status: Final Validation Phase (Core Architecture & Code Finalized)

## 1. System Invariants
* Deterministic Evidence Grounding: Clinical reasoning chained through multi-agent LangGraph topology.
* Cryptographic PII Masking: Zero patient identifiers sent to external APIs; pre-processed via local Presidio/KMS tokenizer.
* Regulatory Guardrails: HIPAA Security Rule & FDA SaMD (Software as a Medical Device) Tier 2 compliance.

## 2. Diagnostics Execution Flow
1. Audio/Text Clinical Transcript Ingestion.
2. Normalized Symptom Feature Extraction against DSM-5 criteria matrices.
3. Multi-hypothesis differential diagnosis generation with confidence intervals.
4. Cryptographic immutable session logging to WORM-compliant storage.`
  },
  {
    id: 'financial-streamlit',
    title: 'Financial Data Analyst Streamlit App',
    badge: 'Financial Pipelines',
    iconType: 'barChart',
    description: 'High-frequency analytical data pipeline and automated portfolio stress-testing dashboard with sub-second time-series aggregation and active market feeds.',
    techStack: ['Streamlit Edge', 'Polars', 'Apache Arrow', 'DuckDB Engine'],
    statusMetric: 'Production Active',
    endpointUrl: 'https://finance.omniops.systems',
    content: `# FINANCIAL DATA ANALYST STREAMLIT PIPELINE
Category: Real-time Quantitative Financial Pipeline

## 1. Architectural Highlights
* Data Ingestion: Asynchronous streaming of market ticks via Apache Arrow Flight.
* In-Memory Engine: DuckDB analytical OLAP running embedded on edge containers.
* Resilience: Sub-15 minute state checkpoints stored in encrypted S3 cold vaults.`
  },
  {
    id: 'cloud-run-node',
    title: 'Cloud Run Production Deployment Node',
    badge: 'Serverless Edge Node',
    iconType: 'network',
    description: 'Autoscaling GCP Cloud Run production node running zero-standing-privilege microservices with gRPC ingress, Cloud KMS envelope encryption, and sub-100ms cold boots.',
    techStack: ['GCP Cloud Run', 'Docker OCI', 'gRPC Mesh', 'Cloud KMS'],
    statusMetric: '99.99% Production Uptime',
    endpointUrl: 'https://cloudrun.omniops.systems',
    content: `# CLOUD RUN PRODUCTION DEPLOYMENT NODE
Category: Enterprise Serverless Runtime Environment

## 1. Architecture Topology
* Autoscaling: 0 to 1,000 concurrent instances in < 8 seconds.
* Security: Workload Identity Federation with short-lived OIDC tokens.
* Egress Control: Direct VPC Egress routing through Cloud NAT with static IP whitelisting.`
  },
  {
    id: 'peer-support-ai',
    title: 'Peer Support AI Studio (Behavioral AI)',
    badge: 'Clinical AI Suite',
    iconType: 'activity',
    description: 'Safe, empathetic peer-support conversation assistant with real-time semantic de-escalation classification, safety intercept pipelines, and end-to-end encryption.',
    techStack: ['WebRTC Data', 'Semantic Intercept', 'Llama-Guard / Gemini', 'AES-GCM-256'],
    statusMetric: 'Active Pilot Suite',
    endpointUrl: 'https://peersupport.omniops.systems',
    content: `# PEER SUPPORT AI STUDIO
Category: Behavioral & Clinical AI Suite

## 1. Safety Architecture
* Real-time semantic risk classifier intercepts distress signals in < 50ms.
* Ephemeral conversation tokens shred automatically upon session closure.`
  },
  {
    id: 'scholastic-ai',
    title: 'Scholastic AI Studio (Academic Platform)',
    badge: 'Academic Architecture',
    iconType: 'book',
    description: 'Pedagogical curriculum generation and rubric grading engine with citation grounding, multi-turn Socratic tutoring, and anti-hallucination verification.',
    techStack: ['FastAPI', 'Qdrant RAG', 'LaTeX Engine', 'FERPA Vault'],
    statusMetric: 'Active Academic Node',
    endpointUrl: 'https://scholastic.omniops.systems',
    content: `# SCHOLASTIC AI STUDIO ARCHITECTURE
Category: Academic & Scholastic Architecture

## 1. Compliance & Security
* Strict FERPA student privacy data partitioning.
* Verifiable source citations for 100% of generated pedagogical responses.`
  },
  {
    id: 'twinrayj-optimum',
    title: 'TwinRayj Studios & OptimumPrimers ISO 9001',
    badge: 'ISO 9001 Framework',
    iconType: 'shield',
    description: 'Enterprise quality management framework (ISO 9001) paired with modern Jamstack edge modernization delivering sub-65ms TTFB and 100/100 Core Web Vitals.',
    techStack: ['Cloudflare Edge', 'ISO 9001 Matrix', 'Jamstack Edge SSR', 'Lighthouse 100'],
    statusMetric: 'ISO 9001 Verified',
    endpointUrl: 'https://twinrayjstudios.com',
    content: `# TWINRAYJ STUDIOS & OPTIMUMPRIMERS ISO 9001 FRAMEWORK
Category: Studio Ecosystems & Quality Compliance Frameworks

## 1. ISO 9001 Operational Framework
* Strict audit trail documentation for all code commits and cloud provisioning.
* Continuous SLA testing and automated uptime alerting.`
  },
  {
    id: 'junior-roles',
    title: 'Junior Roles AI Studio',
    badge: 'Interactive Portals',
    iconType: 'sparkles',
    description: 'Automated skill leveling, mock technical interviews, and architectural codebase onboarding portal for aspiring systems engineers.',
    techStack: ['React 19', 'WebAssembly Code Runner', 'Interactive Sandbox'],
    statusMetric: 'Live Interactive Tool',
    endpointUrl: 'https://juniorroles.omniops.systems',
    content: `# JUNIOR ROLES AI STUDIO
Category: Interactive Engineering Onboarding Portal

## 1. Features
* Live interactive terminal sandbox running WebAssembly Linux kernels in-browser.
* Automated code review simulated via OPA Rego pre-commit rules.`
  },
  {
    id: 'peernotebook',
    title: 'Peer Notebook (Offline-First PWA)',
    badge: 'Local-First CRDTs',
    iconType: 'laptop',
    description: 'Peer-to-peer ephemeral engineering notes with cryptographic client-side AES-GCM-256 storage. Zero external server requirement. Built with IndexedDB and WebRTC mesh sync.',
    techStack: ['IndexedDB', 'WebRTC DataChannels', 'Yjs CRDTs', 'AES-GCM-256'],
    statusMetric: 'Verified Production PWA',
    endpointUrl: 'https://peernotebook.omniops.systems',
    content: `# PEER NOTEBOOK ARCHITECTURE BLUEPRINT
Category: Local-First Web Extension & Progressive Web App (PWA)

## 1. Invariants
* Zero Central Database: State resides in browser IndexedDB.
* Cryptographic Isolation: Notes encrypted via AES-GCM-256 with user PBKDF2 passphrase.
* Peer Sync: WebRTC DataChannels handle ephemeral multi-device sync via Yjs CRDTs.`
  }
];
