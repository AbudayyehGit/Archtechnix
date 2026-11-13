import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// 1. Enterprise Retainer & Audit Clients (linked to Firebase Auth UID)
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  organizationName: text('organization_name').notNull().default('Apex FinTech Systems'),
  primaryCloud: text('primary_cloud').notNull().default('AWS (EKS, Aurora, KMS)'),
  rpoTarget: text('rpo_target').notNull().default('Sub-15 Minute (Zero Data Loss)'),
  repoUrl: text('repo_url').notNull().default('https://github.com/apex-fintech/core-mesh'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Pilot Audits ($3,500 14-day async diagnostic sprints)
export const audits = pgTable('audits', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull().default('14-Day Pilot Architecture & DevSecOps Audit'),
  tier: text('tier').notNull().default('diagnostic'),
  status: text('status').notNull().default('active'), // active | completed | pending_checkout
  overallScore: integer('overall_score').notNull().default(64),
  loomUrl: text('loom_url').notNull().default('https://www.loom.com/share/archtechnix-pilot-briefing'),
  roadmapMarkdown: text('roadmap_markdown').notNull(),
  stripeSessionId: text('stripe_session_id'),
  purchasedAt: timestamp('purchased_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. Fractional Advisory Retainers ($7,500/mo, strictly capped at 4 active concurrent clients)
export const retainers = pgTable('retainers', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull().default('inactive'), // inactive | pending | active | paused
  monthlyAmountUsd: integer('monthly_amount_usd').notNull().default(7500),
  cadenceWindow: text('cadence_window').notNull().default('Async-by-Default + Thursdays 14:00 UTC (60m Sync)'),
  stripeSessionId: text('stripe_session_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  activatedAt: timestamp('activated_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. DevSecOps Compliance Readiness Matrix (SOC 2, ISO 27001, NIST SP 800-207)
export const complianceMetrics = pgTable('compliance_metrics', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  framework: text('framework').notNull(), // SOC2 | ISO27001 | NIST
  controlCode: text('control_code').notNull(),
  controlTitle: text('control_title').notNull(),
  category: text('category').notNull(),
  severity: text('severity').notNull().default('high'), // critical | high | medium
  rpoRtoImpact: text('rpo_rto_impact').notNull().default('None'),
  isCompliant: boolean('is_compliant').notNull().default(false),
  remediationNote: text('remediation_note').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. Architecture Decision Records, SSD, Data Flow Matrix & Risk Register
export const adrs = pgTable('adrs', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  docType: text('doc_type').notNull(), // SSD | ADR | DATA_FLOW | RISK_REGISTER
  docNumber: text('doc_number').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('Accepted'), // Proposed | Accepted | Implemented | Mitigated
  markdownContent: text('markdown_content').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 6. Weekly Strategic Sync Agenda Builder (24h Pre-Read Checklist)
export interface PreReadItem {
  id: string;
  label: string;
  owner: string;
  completed: boolean;
}

export const syncAgendas = pgTable('sync_agendas', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  syncDate: text('sync_date').notNull(),
  timeWindow: text('time_window').notNull().default('60 Minutes · Thursdays 14:00 UTC'),
  architectName: text('architect_name').notNull().default('Tariq Abudayyeh'),
  agendaTitle: text('agenda_title').notNull(),
  preReadChecklist: jsonb('pre_read_checklist').$type<PreReadItem[]>().notNull(),
  decisionLogMarkdown: text('decision_log_markdown').notNull().default(''),
  loomSummaryUrl: text('loom_summary_url').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. Public 5-Question Bottleneck Assessment Submissions
export const bottleneckAssessments = pgTable('bottleneck_assessments', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'set null' }),
  sessionKey: text('session_key').notNull(),
  organizationName: text('organization_name').notNull().default('Prospective Enterprise'),
  answers: jsonb('answers').$type<Record<string, string>>().notNull(),
  readinessScore: integer('readiness_score').notNull(),
  recommendedTier: text('recommended_tier').notNull().default('diagnostic'),
  criticalGaps: jsonb('critical_gaps').$type<string[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Persisted Schedule A Intake Specifications
export interface ComplianceFlags {
  gdpr: boolean;
  soc2: boolean;
  nist: boolean;
}

export const intakeSpecs = pgTable('intake_specs', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id')
    .references(() => clients.id, { onDelete: 'cascade' })
    .notNull(),
  organizationName: text('organization_name').notNull(),
  primaryCloud: text('primary_cloud').notNull(),
  rpoTarget: text('rpo_target').notNull(),
  repoUrl: text('repo_url').notNull(),
  complianceFlags: jsonb('compliance_flags').$type<ComplianceFlags>().notNull(),
  notes: text('notes').notNull(),
  readinessPercent: integer('readiness_percent').notNull().default(100),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 9. Persistent 1-Hour Weekly Advisory Sync Bookings
export const advisoryBookings = pgTable('advisory_bookings', {
  id: serial('id').primaryKey(),
  bookingCode: text('booking_code').notNull().unique(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'set null' }),
  architectId: text('architect_id').notNull(),
  architectName: text('architect_name').notNull(),
  syncDate: text('sync_date').notNull(),
  timeSlot: text('time_slot').notNull(),
  timezone: text('timezone').notNull(),
  orgName: text('org_name').notNull(),
  attendeeEmail: text('attendee_email').notNull(),
  topic: text('topic').notNull(),
  notes: text('notes').notNull().default(''),
  repoUrl: text('repo_url').notNull().default(''),
  meetingUrl: text('meeting_url').notNull(),
  bookedAt: timestamp('booked_at').defaultNow().notNull(),
});

// Drizzle Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  audits: many(audits),
  retainers: many(retainers),
  complianceMetrics: many(complianceMetrics),
  adrs: many(adrs),
  syncAgendas: many(syncAgendas),
  assessments: many(bottleneckAssessments),
  intakeSpecs: many(intakeSpecs),
  advisoryBookings: many(advisoryBookings),
}));

export const auditsRelations = relations(audits, ({ one }) => ({
  client: one(clients, { fields: [audits.clientId], references: [clients.id] }),
}));

export const retainersRelations = relations(retainers, ({ one }) => ({
  client: one(clients, { fields: [retainers.clientId], references: [clients.id] }),
}));

export const complianceMetricsRelations = relations(complianceMetrics, ({ one }) => ({
  client: one(clients, { fields: [complianceMetrics.clientId], references: [clients.id] }),
}));

export const adrsRelations = relations(adrs, ({ one }) => ({
  client: one(clients, { fields: [adrs.clientId], references: [clients.id] }),
}));

export const syncAgendasRelations = relations(syncAgendas, ({ one }) => ({
  client: one(clients, { fields: [syncAgendas.clientId], references: [clients.id] }),
}));

export const intakeSpecsRelations = relations(intakeSpecs, ({ one }) => ({
  client: one(clients, { fields: [intakeSpecs.clientId], references: [clients.id] }),
}));

export const advisoryBookingsRelations = relations(advisoryBookings, ({ one }) => ({
  client: one(clients, { fields: [advisoryBookings.clientId], references: [clients.id] }),
}));
