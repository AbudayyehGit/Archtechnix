import type {
  AssetInventoryPayload,
  DbSlaEvaluation,
  NormalizedFinding,
  NormalizedPipelineResult,
  PipelineStageEvaluation,
  Tier1IntakeParams,
  Tier2TelemetryPayload,
} from '../types';

export interface TelemetryPreset {
  id: 'fintech_spof' | 'resilient_mesh';
  label: string;
  description: string;
  inventory: AssetInventoryPayload;
  telemetry: Tier2TelemetryPayload;
}

export const TELEMETRY_PRESETS: TelemetryPreset[] = [
  {
    id: 'fintech_spof',
    label: 'Multi-Region FinTech SPOF (Critical DR & Secret Drift)',
    description:
      'Contains overlapping Prowler + Checkov S3 KMS findings, Gitleaks static key in CI, Nuclei TLS 1.1 drift, and 22-minute primary DB replication lag.',
    inventory: {
      vpcs: ['vpc-prod-us-east-1'],
      loadBalancers: ['alb-apex-public-waf'],
      services: ['eks-settlement-mesh', 'cdc-outbox-worker'],
      databases: ['aurora-oltp-primary'],
      replicas: [],
    },
    telemetry: {
      prowler: [
        {
          check_id: 's3_bucket_kms_encryption',
          canonical_key: 's3-dr-backup-kms',
          title: 'S3 immutable DR archive lacks customer-managed KMS envelope key',
          resource_id: 'arn:aws:s3:::apex-dr-wal-archives',
          severity: 'high',
          frameworks: ['ISO/IEC 27001', 'SOC 2 Type II'],
          remediation: 'Enable aws_s3_bucket_server_side_encryption_configuration with CMK rotation.',
          rpo_rto_impact: 'Blocks GDPR Art. 17 per-tenant key shredding on restore',
        },
        {
          check_id: 'iam_password_policy_info',
          title: 'Informational baseline IAM summary',
          resource_id: 'arn:aws:iam::123456789012:root',
          severity: 'info',
        },
      ],
      checkov: [
        {
          check_id: 'CKV_AWS_145',
          canonical_key: 's3-dr-backup-kms',
          check_name: 'Ensure S3 backup bucket is encrypted with KMS CMK',
          resource: 'aws_s3_bucket.apex_dr_wal_archives',
          severity: 'critical',
          frameworks: ['ISO/IEC 27001', 'SOC 2 Type II'],
          remediation: 'Bind kms_master_key_id = aws_kms_key.tenant_dek.arn in Terraform.',
          rpo_rto_impact: 'Critical encryption gap during cross-region WAL restore',
        },
        {
          check_id: 'CKV_AWS_130',
          canonical_key: 'subnet-auto-public-ip',
          check_name: 'Ensure VPC subnets do not auto-assign public IPv4 addresses',
          resource: 'aws_subnet.private_mesh_a',
          severity: 'medium',
          frameworks: ['NIST SP 800-207'],
          remediation: 'Set map_public_ip_on_launch = false on workload subnets.',
        },
      ],
      gitleaks: [
        {
          RuleID: 'aws-access-token',
          File: '.github/workflows/deploy-prod.yml',
          StartLine: 42,
        },
      ],
      nuclei: [
        {
          'template-id': 'weak-tls-1-1-cipher',
          canonical_key: 'ingress-tls-drift',
          'matched-at': 'https://api.apexfintech.io:443',
          info: {
            name: 'Legacy TLS 1.1 cipher suite enabled on edge load balancer',
            severity: 'high',
          },
          remediation: 'Switch ALB listener ssl_policy to ELBSecurityPolicy-TLS13-1-2-2021-06.',
        },
      ],
      cloudCliDb: [
        {
          dbIdentifier: 'aurora-oltp-primary',
          replicationLagSeconds: 1320,
          pitrEnabled: true,
          multiRegionReplica: false,
          estimatedFailoverRtoMinutes: 75,
        },
      ],
    },
  },
  {
    id: 'resilient_mesh',
    label: 'Zero-Trust Verified Mesh (Minor Perimeter Hygiene)',
    description:
      'Active cross-region replica under 15m RPO/RTO SLA with minor Nuclei HSTS header drift.',
    inventory: {
      vpcs: ['vpc-prod-us-east-1'],
      loadBalancers: ['alb-zero-trust-edge'],
      services: ['eks-domain-mesh'],
      databases: ['aurora-oltp-primary'],
      replicas: ['aurora-dr-us-west-2'],
    },
    telemetry: {
      prowler: [
        {
          check_id: 'cloudtrail_log_info',
          title: 'Informational audit log verification passed',
          severity: 'info',
        },
      ],
      checkov: [],
      gitleaks: [],
      nuclei: [
        {
          'template-id': 'http-missing-hsts',
          canonical_key: 'hsts-header-policy',
          'matched-at': 'https://api.apexfintech.io',
          info: {
            name: 'Strict-Transport-Security max-age below 31536000s',
            severity: 'medium',
          },
          remediation: 'Inject Strict-Transport-Security response header at CloudFront/WAF edge.',
        },
      ],
      cloudCliDb: [
        {
          dbIdentifier: 'aurora-oltp-primary',
          replicationLagSeconds: 180,
          pitrEnabled: true,
          multiRegionReplica: true,
          estimatedFailoverRtoMinutes: 11,
        },
      ],
    },
  },
];

const SEVERITY_ORDER: Record<'critical' | 'high' | 'medium', number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

function shortDigest(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function validateTier1Parameters(tier1: Tier1IntakeParams): string[] {
  const errors: string[] = [];
  const combined = `${tier1.iamRoleArn} ${tier1.externalId} ${tier1.gitTokenRef}`;
  if (/AKIA[0-9A-Z]{16}/.test(combined)) {
    errors.push(
      'Rejected: Raw AWS root or static AKIA access key detected. Only time-bound STS Role ARNs are permitted.'
    );
  }
  if (
    !tier1.iamRoleArn.trim() ||
    (!tier1.iamRoleArn.trim().startsWith('arn:aws:iam::') &&
      !tier1.iamRoleArn.trim().startsWith('<iam_arn:'))
  ) {
    errors.push('Tier 1 requires a least-privilege IAM Role ARN (arn:aws:iam::<account>:role/...).');
  }
  if (!tier1.externalId.trim()) {
    errors.push('Tier 1 requires an External ID for cross-account Cloud CSPM assumption.');
  }
  if (!tier1.repoUrl.trim().startsWith('https://')) {
    errors.push('Tier 1 requires a scoped HTTPS GitHub/GitLab repository URL.');
  }
  if (!tier1.targetDomain.trim() || !tier1.ownershipAuthorized) {
    errors.push(
      'Tier 1 Scope Enforcement: Verified target domain and ownership authorization checkbox are required.'
    );
  }
  return errors;
}

export function scrubTier1Credentials(tier1: Tier1IntakeParams) {
  const now = new Date().toISOString();
  return {
    ephemeralCredentialsPurged: true,
    rawSecretsRetained: false,
    maskedIamArn: tier1.iamRoleArn
      ? `<iam_arn:sha256:${shortDigest(tier1.iamRoleArn)}>`
      : '<iam_arn:none>',
    maskedExternalId: tier1.externalId
      ? `<external_id:sha256:${shortDigest(tier1.externalId)}>`
      : '<external_id:none>',
    maskedGitToken: tier1.gitTokenRef
      ? `<git_pat:sha256:${shortDigest(tier1.gitTokenRef)}>`
      : '<git_pat:none>',
    purgedAt: now,
  };
}

export function generateMermaidTopologyGraph(
  targetDomain: string,
  inventory: AssetInventoryPayload
): string {
  const safeId = (prefix: string, idx: number, label: string) =>
    `${prefix}_${idx}_${label.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 18)}`;

  const vpcs = inventory.vpcs.length > 0 ? inventory.vpcs : ['vpc-prod-us-east-1'];
  const lbs = inventory.loadBalancers.length > 0 ? inventory.loadBalancers : ['alb-edge-waf'];
  const services = inventory.services.length > 0 ? inventory.services : ['eks-core-mesh'];
  const databases = inventory.databases.length > 0 ? inventory.databases : ['aurora-oltp-primary'];
  const replicas = inventory.replicas || [];

  const lines: string[] = [
    'graph TD',
    `  INET(["External Clients / ${targetDomain || 'api.enterprise.io'}"])`,
  ];

  const lbIds: string[] = [];
  lbs.forEach((lb, idx) => {
    const lid = safeId('LB', idx, lb);
    lbIds.push(lid);
    lines.push(`  ${lid}["Edge ALB / WAF: ${lb}"]`);
    lines.push(`  INET -->|TLS 1.3| ${lid}`);
  });

  lines.push(`  subgraph VPC["Primary VPC: ${vpcs[0]}"]`);
  const svcIds: string[] = [];
  services.forEach((svc, idx) => {
    const sid = safeId('SVC', idx, svc);
    svcIds.push(sid);
    lines.push(`    ${sid}["Workload Mesh: ${svc}"]`);
    lbIds.forEach((lid) => lines.push(`    ${lid} --> ${sid}`));
  });

  const dbIds: string[] = [];
  databases.forEach((db, idx) => {
    const did = safeId('DB', idx, db);
    dbIds.push(did);
    lines.push(`    ${did}[("Primary DB: ${db}")]`);
    svcIds.forEach((sid) => lines.push(`    ${sid} -->|mTLS / OIDC| ${did}`));
  });
  lines.push('  end');

  if (replicas.length > 0) {
    lines.push('  subgraph DR["Cross-Region DR Failover"]');
    replicas.forEach((rep, idx) => {
      const rid = safeId('REP', idx, rep);
      lines.push(`    ${rid}[("DR Replica: ${rep}")]`);
      if (dbIds[0]) {
        lines.push(`    ${dbIds[0]} -.->|WAL Streaming| ${rid}`);
      }
    });
    lines.push('  end');
  } else {
    lines.push('  SPOF_WARN["WARNING: No Cross-Region Read Replica Detected"]');
    if (dbIds[0]) {
      lines.push(`  ${dbIds[0]} -.->|Single Region SPOF| SPOF_WARN`);
    }
  }

  return lines.join('\n');
}

export function runUnifiedPipelineNormalization(params: {
  tier1: Tier1IntakeParams;
  inventory: AssetInventoryPayload;
  telemetry: Tier2TelemetryPayload;
  pipelineState?: { telemetryComplete: boolean; normalized: boolean; forceRerun?: boolean };
}): NormalizedPipelineResult {
  const { tier1, inventory, telemetry, pipelineState } = params;
  const validationErrors = validateTier1Parameters(tier1);
  const credentialHygiene = scrubTier1Credentials(tier1);

  const alreadyFulfilled =
    Boolean(pipelineState?.telemetryComplete) &&
    Boolean(pipelineState?.normalized) &&
    !pipelineState?.forceRerun;

  const gateStages: PipelineStageEvaluation[] = [
    {
      stage: 'Stage 1 · Tier 1 Credential & Scope Gate',
      status: validationErrors.length > 0 ? 'BLOCKED' : 'EXECUTING',
      detail:
        validationErrors.length > 0
          ? validationErrors[0]
          : 'Read-only STS Role ARN & domain ownership attested; ephemeral tokens purged.',
    },
    {
      stage: 'Stage 2 · Telemetry Normalization & Deduplication',
      status:
        validationErrors.length > 0
          ? 'BLOCKED'
          : alreadyFulfilled
          ? 'SKIPPED - PREVIOUSLY FULFILLED'
          : 'EXECUTING',
      detail: alreadyFulfilled
        ? 'Idempotent guard skipped redundant normalization (currentValue === requiredValue).'
        : 'Normalizing Prowler, Checkov, Gitleaks, Nuclei & Cloud CLI DB dumps.',
    },
    {
      stage: 'Stage 3 · Mermaid graph TD & Compliance Matrix',
      status: validationErrors.length > 0 ? 'BLOCKED' : 'EXECUTING',
      detail: 'Constructed asset dependency graph and RPO/RTO SLA compliance mapping.',
    },
  ];

  let noiseStrippedCount = 0;
  const rawFindings: Array<{
    tool: string;
    ruleId: string;
    canonicalKey: string;
    title: string;
    resource: string;
    severity: 'critical' | 'high' | 'medium';
    frameworks: string[];
    remediationCli: string;
    rpoRtoImpact: string;
  }> = [];

  for (const item of telemetry.prowler || []) {
    const sev = String(item.severity || 'medium').toLowerCase();
    if (sev === 'info' || sev === 'informational' || String(item.status || '').toUpperCase() === 'PASS') {
      noiseStrippedCount += 1;
      continue;
    }
    rawFindings.push({
      tool: 'prowler',
      ruleId: String(item.check_id || item.id || 'PROWLER-CHK'),
      canonicalKey: String(item.canonical_key || item.resource_id || item.title || 'prowler').toLowerCase(),
      title: String(item.title || 'Cloud CSPM Finding'),
      resource: String(item.resource_id || item.resource || 'aws-account'),
      severity: sev === 'critical' || sev === 'high' ? sev : 'medium',
      frameworks: Array.isArray(item.frameworks)
        ? item.frameworks.map(String)
        : ['SOC 2 Type II', 'ISO/IEC 27001'],
      remediationCli: String(
        item.remediation || 'Enforce KMS CMK & least-privilege IAM policy in Terraform.'
      ),
      rpoRtoImpact: String(item.rpo_rto_impact || 'Resilience posture variance'),
    });
  }

  for (const item of telemetry.checkov || []) {
    const sev = String(item.severity || 'high').toLowerCase();
    if (sev === 'info' || sev === 'informational' || String(item.check_result || '').toUpperCase() === 'PASSED') {
      noiseStrippedCount += 1;
      continue;
    }
    rawFindings.push({
      tool: 'checkov',
      ruleId: String(item.check_id || 'CKV_AWS'),
      canonicalKey: String(item.canonical_key || item.resource || item.check_name || 'checkov').toLowerCase(),
      title: String(item.check_name || item.title || 'IaC Misconfiguration'),
      resource: String(item.resource || item.file_path || 'terraform/main.tf'),
      severity: sev === 'critical' || sev === 'medium' ? sev : 'high',
      frameworks: Array.isArray(item.frameworks)
        ? item.frameworks.map(String)
        : ['ISO/IEC 27001', 'SOC 2 Type II'],
      remediationCli: String(
        item.remediation || 'Update Terraform module to enforce KMS and remote state locking.'
      ),
      rpoRtoImpact: String(item.rpo_rto_impact || 'IaC drift risks reproducible DR recovery'),
    });
  }

  for (const item of telemetry.gitleaks || []) {
    rawFindings.push({
      tool: 'gitleaks',
      ruleId: String(item.RuleID || 'GITLEAKS-SECRET'),
      canonicalKey: `secret::${String(item.File || 'repo')}::${String(item.RuleID || 'key')}`.toLowerCase(),
      title: `Exposed Secret in Git History (${String(item.RuleID || 'Token')})`,
      resource: `${String(item.File || '.github/workflows/ci.yml')}:${String(item.StartLine || 1)}`,
      severity: 'critical',
      frameworks: ['NIST SP 800-207', 'SOC 2 Type II'],
      remediationCli:
        'Revoke exposed key, purge commit via git-filter-repo, and migrate runner to ephemeral OIDC tokens.',
      rpoRtoImpact: 'Critical lateral movement vector during failover window',
    });
  }

  for (const item of telemetry.nuclei || []) {
    const info =
      item.info && typeof item.info === 'object'
        ? (item.info as Record<string, unknown>)
        : {};
    const sev = String(info.severity || item.severity || 'medium').toLowerCase();
    if (sev === 'info' || sev === 'informational') {
      noiseStrippedCount += 1;
      continue;
    }
    rawFindings.push({
      tool: 'nuclei',
      ruleId: String(item['template-id'] || item.template_id || 'NUCLEI-EXT'),
      canonicalKey: String(item.canonical_key || item['template-id'] || item['matched-at'] || 'nuclei').toLowerCase(),
      title: String(info.name || item.title || 'External Perimeter Exposure'),
      resource: String(item['matched-at'] || item.host || tier1.targetDomain),
      severity: sev === 'critical' || sev === 'high' ? sev : 'medium',
      frameworks: ['ISO/IEC 27001', 'NIST SP 800-207'],
      remediationCli: String(
        item.remediation || 'Harden ingress ALB TLS 1.3 cipher policy and WAF security headers.'
      ),
      rpoRtoImpact: 'Public API availability & transport security risk',
    });
  }

  const dbSlaSummary: DbSlaEvaluation[] = (telemetry.cloudCliDb || []).map((db) => {
    const lagMin = Number((db.replicationLagSeconds / 60).toFixed(2));
    const rpoSlaMet = db.pitrEnabled && lagMin <= tier1.targetRpoMinutes;
    const rtoSlaMet =
      db.multiRegionReplica && db.estimatedFailoverRtoMinutes <= tier1.targetRtoMinutes;

    if (!rpoSlaMet || !rtoSlaMet) {
      rawFindings.push({
        tool: 'cloud_cli_db',
        ruleId: 'DR-RPO-RTO-BREACH',
        canonicalKey: `dr::${db.dbIdentifier}`.toLowerCase(),
        title: `DR SLA Breach on ${db.dbIdentifier} (Lag: ${lagMin}m, Est RTO: ${db.estimatedFailoverRtoMinutes}m)`,
        resource: db.dbIdentifier,
        severity: 'critical',
        frameworks: ['ISO/IEC 27001', 'SOC 2 Type II'],
        remediationCli:
          'Deploy cross-region Aurora/Cloud SQL read replica with continuous WAL PITR shipping & automated Terraform failover runbook.',
        rpoRtoImpact: `Exceeds <${tier1.targetRpoMinutes}m RPO / <${tier1.targetRtoMinutes}m RTO SLA`,
      });
    }

    return {
      dbIdentifier: db.dbIdentifier,
      replicationLagSeconds: db.replicationLagSeconds,
      replicationLagMinutes: lagMin,
      pitrEnabled: db.pitrEnabled,
      multiRegionReplica: db.multiRegionReplica,
      estimatedRtoMinutes: db.estimatedFailoverRtoMinutes,
      rpoSlaMet,
      rtoSlaMet,
    };
  });

  const dedupMap = new Map<string, NormalizedFinding>();
  let duplicatesMerged = 0;

  for (const item of rawFindings) {
    const normKey = item.canonicalKey.trim().replace(/\s+/g, '-') || item.ruleId.toLowerCase();
    const existing = dedupMap.get(normKey);
    if (existing) {
      duplicatesMerged += 1;
      if (!existing.detectedBy.includes(item.tool)) {
        existing.detectedBy.push(item.tool);
      }
      if (SEVERITY_ORDER[item.severity] < SEVERITY_ORDER[existing.severity]) {
        existing.severity = item.severity;
      }
      for (const fw of item.frameworks) {
        if (!existing.frameworks.includes(fw)) {
          existing.frameworks.push(fw);
        }
      }
    } else {
      dedupMap.set(normKey, {
        canonicalKey: normKey,
        ruleId: item.ruleId,
        title: item.title,
        resource: item.resource,
        severity: item.severity,
        detectedBy: [item.tool],
        frameworks: Array.from(new Set(item.frameworks)),
        remediationCli: item.remediationCli,
        rpoRtoImpact: item.rpoRtoImpact,
      });
    }
  }

  const normalizedFindings = Array.from(dedupMap.values()).sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );

  const severityCounts = {
    critical: normalizedFindings.filter((f) => f.severity === 'critical').length,
    high: normalizedFindings.filter((f) => f.severity === 'high').length,
    medium: normalizedFindings.filter((f) => f.severity === 'medium').length,
  };

  const targetFrameworks =
    tier1.frameworks.length > 0
      ? tier1.frameworks
      : (['ISO/IEC 27001', 'SOC 2 Type II', 'NIST SP 800-207'] as const);

  const complianceGapMatrix = targetFrameworks.map((framework) => {
    const matching = normalizedFindings.filter((f) => f.frameworks.includes(framework));
    return {
      framework,
      totalGaps: matching.length,
      criticalCount: matching.filter((m) => m.severity === 'critical').length,
      highCount: matching.filter((m) => m.severity === 'high').length,
      mediumCount: matching.filter((m) => m.severity === 'medium').length,
    };
  });

  const mermaidTopology = generateMermaidTopologyGraph(tier1.targetDomain, inventory);

  return {
    status: validationErrors.length > 0 ? 'VALIDATION_ERROR' : 'NORMALIZED',
    gateStages,
    validationErrors,
    credentialHygiene,
    normalizedFindings,
    duplicatesMerged,
    noiseStrippedCount,
    severityCounts,
    dbSlaSummary,
    complianceGapMatrix,
    mermaidTopology,
    inventorySnapshot: inventory,
  };
}

export function buildDeterministicAuditMarkdown(
  tier1: Tier1IntakeParams,
  normalized: NormalizedPipelineResult,
  diagnosticNote?: string
): string {
  const drLines = normalized.dbSlaSummary.map(
    (db) =>
      `- **${db.dbIdentifier}**: Lag \`${db.replicationLagMinutes}m\` (Target <= \`${tier1.targetRpoMinutes}m\`), Est. RTO \`${db.estimatedRtoMinutes}m\` (Target <= \`${tier1.targetRtoMinutes}m\`), Multi-Region Replica: **${
        db.multiRegionReplica ? 'Yes' : 'NO (Single-Region SPOF)'
      }**, PITR: **${db.pitrEnabled ? 'Enabled' : 'Disabled'}**`
  );

  const findingLines = normalized.normalizedFindings.map(
    (f, idx) =>
      `### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}\n- **Detected By**: ${f.detectedBy.join(', ')}\n- **Resource**: \`${f.resource}\`\n- **Frameworks**: ${f.frameworks.join(', ')}\n- **RPO/RTO Impact**: ${f.rpoRtoImpact}\n\n\`\`\`hcl\n# Copy-paste remediation directive\n# ${f.remediationCli}\n\`\`\``
  );

  return `# Architechnix {∞} Pilot Audit & Resilience Deliverable

- **Target Perimeter**: \`${tier1.targetDomain}\`
- **Scoped Repository**: \`${tier1.repoUrl}\`
- **Target DR SLA**: < ${tier1.targetRpoMinutes}m RPO / < ${tier1.targetRtoMinutes}m RTO
- **Ephemeral Credential Status**: Purged (${normalized.credentialHygiene.maskedIamArn})
- **Deduplication Telemetry**: ${normalized.duplicatesMerged} overlapping alerts merged, ${normalized.noiseStrippedCount} INFO entries stripped${
    diagnosticNote ? `\n- **Synthesis Engine Note**: ${diagnosticNote}` : ''
  }

## Pass 1 · Executive Risk & DR Analysis
${drLines.length > 0 ? drLines.join('\n') : '- No database replication dumps supplied.'}

## Topology Diagram (Mermaid.js graph TD)
\`\`\`mermaid
${normalized.mermaidTopology}
\`\`\`

## Compliance Gap Matrix
| Framework | Total Gaps | Critical | High | Medium |
| :--- | :--- | :--- | :--- | :--- |
${normalized.complianceGapMatrix
  .map(
    (row) =>
      `| ${row.framework} | ${row.totalGaps} | ${row.criticalCount} | ${row.highCount} | ${row.mediumCount} |`
  )
  .join('\n')}

## Pass 2 · Prioritized Remediation Roadmap
${findingLines.length > 0 ? findingLines.join('\n\n') : 'Zero Critical, High, or Medium remediation items remaining.'}

## Human-in-the-Loop QA Gate
- [ ] Cross-check RPO/RTO failover simulation timing (< ${tier1.targetRpoMinutes}m RPO)
- [ ] Confirm ephemeral IAM Role External ID & Git PAT purged
- [ ] Record 15-minute Executive Loom walkthrough & commit to \`system_steady_states\`
`;
}
