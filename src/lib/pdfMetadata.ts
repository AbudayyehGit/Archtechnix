import type { SystemSteadyState } from '../types';

export interface PdfDocumentMetadata {
  title: string;
  author: string;
  subject: string;
  creator: string;
  keywords: string;
}

export interface BuildPdfMetadataInput {
  docNumber?: string;
  title: string;
  organizationName?: string;
  cloudTarget?: string;
  stateVersion: string;
  isDossier?: boolean;
}

export function formatSystemStateVersion(steadyStates?: SystemSteadyState[]): string {
  if (!steadyStates || steadyStates.length === 0) {
    return 'v1.0-working-draft';
  }
  const latest = steadyStates[0];
  const label = latest.checkpoint_label?.trim() || 'checkpoint';
  const hash = latest.git_commit_hash?.trim();
  return hash ? `${label} (${hash})` : label;
}

export function buildSpecificationHeaderStamp(stateVersion: string, isoTimestamp: string): string {
  const cleanVersion = stateVersion.trim() || 'v1.0-working-draft';
  return `State: ${cleanVersion}   |   Generated: ${isoTimestamp}`;
}

export function buildPdfMetadata({
  docNumber,
  title,
  organizationName,
  cloudTarget,
  stateVersion,
  isDossier = false,
}: BuildPdfMetadataInput): PdfDocumentMetadata {
  const org = organizationName?.trim() || 'Enterprise Client';
  const cleanState = stateVersion.trim() || 'v1.0-working-draft';
  const cleanDocNum = docNumber?.trim() || (isDossier ? 'ARCH-DOSSIER' : 'SPEC');
  const cleanCloud = cloudTarget?.trim() || 'Multi-Region Cloud';

  return {
    title: isDossier
      ? `Architecture Governance Dossier — ${org}`
      : `${cleanDocNum} — ${title} (${org})`,
    author: `${org} · Archtechnix {∞} Advisory`,
    subject: isDossier
      ? `${org} · Architecture Governance, Steady-State & ADR Sign-Off [State: ${cleanState}]`
      : `${org} · ${cleanDocNum} ${title} [State: ${cleanState}]`,
    creator: `${org} via Archtechnix {∞} (OmniOps Systems)`,
    keywords: [
      org,
      'Archtechnix',
      cleanDocNum,
      cleanCloud,
      cleanState,
      'RPO/RTO',
      'Systems Architecture',
    ].join(', '),
  };
}
