import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPdfMetadata,
  buildSpecificationHeaderStamp,
  formatSystemStateVersion,
} from './pdfMetadata';
import type { SystemSteadyState } from '../types';

test('formatSystemStateVersion returns checkpoint label and commit hash when steady states exist', () => {
  const states: SystemSteadyState[] = [
    {
      id: 'ss-1',
      checkpoint_label: 'steady-state-v2.3-dossier-stream-theme',
      git_commit_hash: 'v2.3-verified',
      snapshot_metadata: { blueprintVersion: '2.3' },
      established_at: '2026-11-14T10:00:00.000Z',
    },
    {
      id: 'ss-0',
      checkpoint_label: 'steady-state-v1.0',
      git_commit_hash: 'v1.0',
      snapshot_metadata: {},
      established_at: '2026-10-01T10:00:00.000Z',
    },
  ];

  assert.equal(
    formatSystemStateVersion(states),
    'steady-state-v2.3-dossier-stream-theme (v2.3-verified)'
  );
});

test('formatSystemStateVersion falls back cleanly when no steady states are recorded', () => {
  assert.equal(formatSystemStateVersion([]), 'v1.0-working-draft');
  assert.equal(formatSystemStateVersion(undefined), 'v1.0-working-draft');
});

test('buildSpecificationHeaderStamp includes both system state version and ISO timestamp', () => {
  const stamp = buildSpecificationHeaderStamp(
    'steady-state-v2.3-dossier-stream-theme (v2.3-verified)',
    '2026-11-14T21:15:00.000Z'
  );
  assert.match(stamp, /State: steady-state-v2\.3-dossier-stream-theme \(v2\.3-verified\)/);
  assert.match(stamp, /Generated: 2026-11-14T21:15:00\.000Z/);
});

test('buildPdfMetadata populates author, subject, and creator from intake organization name', () => {
  const meta = buildPdfMetadata({
    docNumber: 'SSD-001',
    title: 'Multi-Region Zero-Trust Event Mesh',
    organizationName: 'Apex FinTech Systems',
    cloudTarget: 'AWS (EKS, Aurora, KMS)',
    stateVersion: 'steady-state-v2.3 (v2.3-verified)',
  });

  assert.equal(meta.title, 'SSD-001 — Multi-Region Zero-Trust Event Mesh (Apex FinTech Systems)');
  assert.equal(meta.author, 'Apex FinTech Systems · Archtechnix {∞} Advisory');
  assert.equal(
    meta.subject,
    'Apex FinTech Systems · SSD-001 Multi-Region Zero-Trust Event Mesh [State: steady-state-v2.3 (v2.3-verified)]'
  );
  assert.equal(meta.creator, 'Apex FinTech Systems via Archtechnix {∞} (OmniOps Systems)');
  assert.match(meta.keywords, /Apex FinTech Systems/);
  assert.match(meta.keywords, /SSD-001/);
});

test('buildPdfMetadata handles dossier mode and blank organization fallback cleanly', () => {
  const meta = buildPdfMetadata({
    title: 'Architecture Governance & Sign-Off Dossier',
    organizationName: '   ',
    stateVersion: 'v1.0-working-draft',
    isDossier: true,
  });

  assert.equal(meta.title, 'Architecture Governance Dossier — Enterprise Client');
  assert.equal(meta.author, 'Enterprise Client · Archtechnix {∞} Advisory');
  assert.equal(meta.creator, 'Enterprise Client via Archtechnix {∞} (OmniOps Systems)');
  assert.match(meta.subject, /\[State: v1\.0-working-draft\]/);
});
