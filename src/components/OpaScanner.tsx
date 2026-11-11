import React, { useState } from 'react';
import { Play, RotateCcw, Shield, CheckCircle2, AlertTriangle, FileCode2 } from 'lucide-react';

interface OPAResult {
  allowed: boolean;
  code: number;
  badge: string;
  violations: string[];
  reasons: string[];
}

export const OpaScanner: React.FC = () => {
  const [policyCode, setPolicyCode] = useState<string>(`package enterprise.compliance.storage

default allow = false

# Rule 1: S3/Data Mesh buckets must enforce KMS envelope encryption
allow {
    input.resource_type == "aws_s3_bucket"
    input.encryption.kms_key_id != ""
    input.public_access_block == true
}

# Rule 2: Ephemeral runner keys must auto-shred within 15 minutes
allow {
    input.resource_type == "ephemeral_runner"
    input.ttl_minutes <= 15
    input.cryptographic_shredding_enabled == true
}`);

  const [jsonInput, setJsonInput] = useState<string>(`{
  "resource_type": "aws_s3_bucket",
  "encryption": {
    "kms_key_id": "arn:aws:kms:us-east-1:123456789:key/omni-shred-9"
  },
  "public_access_block": true
}`);

  const [result, setResult] = useState<OPAResult>({
    allowed: true,
    code: 200,
    badge: 'PASS: ALLOWED (200)',
    violations: [],
    reasons: [
      'Complies with Rule 1: S3 bucket enforces KMS envelope encryption and blocks public access.'
    ]
  });

  const evaluatePolicy = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      let allowed = false;
      const violations: string[] = [];
      const reasons: string[] = [];

      if (parsed.resource_type === 'aws_s3_bucket') {
        const hasKms = Boolean(parsed.encryption?.kms_key_id && parsed.encryption.kms_key_id.length > 5);
        const hasBlock = parsed.public_access_block === true;

        if (hasKms && hasBlock) {
          allowed = true;
          reasons.push('Complies with Rule 1: S3 bucket enforces KMS envelope encryption (DEK/KEK) and blocks public access.');
        } else {
          if (!hasKms) violations.push('VIOLATION: S3 bucket does not configure a valid KMS key ID for envelope encryption.');
          if (!hasBlock) violations.push('VIOLATION: Public access block is disabled or not set to true.');
        }
      } else if (parsed.resource_type === 'ephemeral_runner') {
        const ttlOk = typeof parsed.ttl_minutes === 'number' && parsed.ttl_minutes <= 15;
        const shredOk = parsed.cryptographic_shredding_enabled === true;

        if (ttlOk && shredOk) {
          allowed = true;
          reasons.push('Complies with Rule 2: Ephemeral runner enforces TTL <= 15 min and cryptographic key shredding is active.');
        } else {
          if (!ttlOk) violations.push(`VIOLATION: Runner TTL (${parsed.ttl_minutes ?? 'unset'}m) exceeds 15-minute NIST SP 800-207 security boundary.`);
          if (!shredOk) violations.push('VIOLATION: Cryptographic key shredding is disabled or missing.');
        }
      } else {
        violations.push(`VIOLATION: Unknown or unauthorized resource type '${parsed.resource_type ?? 'undefined'}'. Default deny triggered.`);
      }

      setResult({
        allowed,
        code: allowed ? 200 : 403,
        badge: allowed ? 'PASS: ALLOWED (200)' : 'DENIED: POLICY VIOLATION (403)',
        violations,
        reasons
      });
    } catch (e: any) {
      setResult({
        allowed: false,
        code: 400,
        badge: 'SYNTAX ERROR (400)',
        violations: [`Invalid JSON input: ${e?.message || 'Parse error'}`],
        reasons: []
      });
    }
  };

  const loadPreset = (preset: 's3_pass' | 's3_fail' | 'runner_pass' | 'runner_fail') => {
    switch (preset) {
      case 's3_pass':
        setJsonInput(JSON.stringify({
          resource_type: 'aws_s3_bucket',
          encryption: { kms_key_id: 'arn:aws:kms:us-east-1:123456789:key/omni-shred-9' },
          public_access_block: true
        }, null, 2));
        break;
      case 's3_fail':
        setJsonInput(JSON.stringify({
          resource_type: 'aws_s3_bucket',
          encryption: { kms_key_id: '' },
          public_access_block: false
        }, null, 2));
        break;
      case 'runner_pass':
        setJsonInput(JSON.stringify({
          resource_type: 'ephemeral_runner',
          ttl_minutes: 12,
          cryptographic_shredding_enabled: true
        }, null, 2));
        break;
      case 'runner_fail':
        setJsonInput(JSON.stringify({
          resource_type: 'ephemeral_runner',
          ttl_minutes: 45,
          cryptographic_shredding_enabled: false
        }, null, 2));
        break;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Policy Editor */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Rego Policy: storage_compliance.rego</span>
            </span>
            <span className="text-xs text-slate-500 font-mono">OPA v0.68 Runtime</span>
          </div>
          <textarea
            value={policyCode}
            onChange={(e) => setPolicyCode(e.target.value)}
            rows={12}
            className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
            spellCheck={false}
          />
        </div>
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
          <span className="text-xs text-slate-400 font-mono">Evaluates input cloud resource state against declarative security constraints</span>
          <button
            onClick={evaluatePolicy}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors shadow"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Evaluate OPA Policy</span>
          </button>
        </div>
      </div>

      {/* Input Payload & Output Result */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-mono text-emerald-400 flex items-center space-x-2">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Resource State: resource.json</span>
            </span>
            <div className="flex items-center space-x-1 text-[11px] font-mono">
              <span className="text-slate-500 mr-1">Presets:</span>
              <button onClick={() => loadPreset('s3_pass')} className="text-cyan-400 hover:underline px-1">S3 (Pass)</button>
              <span className="text-slate-600">·</span>
              <button onClick={() => loadPreset('s3_fail')} className="text-rose-400 hover:underline px-1">S3 (Fail)</button>
              <span className="text-slate-600">·</span>
              <button onClick={() => loadPreset('runner_pass')} className="text-emerald-400 hover:underline px-1">Runner (Pass)</button>
              <span className="text-slate-600">·</span>
              <button onClick={() => loadPreset('runner_fail')} className="text-amber-400 hover:underline px-1">Runner (Fail)</button>
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={7}
            className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-lg border border-slate-800 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
            spellCheck={false}
          />
        </div>

        {/* Live Evaluation Box */}
        <div className={`mt-4 p-4 rounded-xl border font-mono ${
          result.allowed 
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
            : result.code === 400 
              ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
              : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <span className="text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              {result.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>Policy Evaluation Diagnostics</span>
            </span>
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
              result.allowed 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : result.code === 400 
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
            }`}>
              {result.badge}
            </span>
          </div>

          <div className="mt-3 text-xs space-y-1.5 leading-relaxed">
            {result.reasons.map((r, i) => (
              <p key={i} className="text-emerald-300">{r}</p>
            ))}
            {result.violations.map((v, i) => (
              <p key={i} className="text-rose-300">{v}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
