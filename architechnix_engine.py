"""
Architechnix {∞} (OmniOps Systems) — Production v2.2 Unified Execution & Synthesis Engine
=========================================================================================
Processes raw JSON/SARIF scanner telemetry (Prowler, Checkov, Gitleaks, Nuclei, Cloud CLI DB)
and Tier 1 intake parameters, enforces idempotent pre-check guards, generates Mermaid.js
topologies and compliance gap matrices, and executes two-pass Gemini API synthesis with
graceful model fallback (gemini-2.5-pro -> gemini-2.5-flash).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
except ImportError:  # pragma: no cover - surfaced clearly at runtime if SDK missing
    genai = None  # type: ignore[assignment]
    types = None  # type: ignore[assignment]

    class APIError(Exception):  # type: ignore[no-redef]
        def __init__(self, message: str = "", code: int = 500):
            super().__init__(message)
            self.code = code
            self.message = message


logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("architechnix.engine")

SYSTEM_PROMPT_DEFAULT = (
    "You are the Principal Systems Architect for Architechnix {∞} (OmniOps Systems). "
    "Produce crisp, plain-English, verifiable DevSecOps audit reports with deterministic "
    "Mermaid topologies, RPO/RTO SLA gap analysis, and copy-pasteable Terraform/CLI fixes."
)

SEVERITY_RANK = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _mask_secret(value: str, prefix: str = "redacted") -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]
    return f"<{prefix}:sha256:{digest}>"


def scrub_ephemeral_credentials(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Security invariant: never store raw IAM Role ARNs, External IDs, or Git PATs in plain text.
    Replaces ephemeral secrets with deterministic hashes and records purge attestation.
    """
    sanitized = deepcopy(payload)
    tier1 = sanitized.setdefault("tier1_intake", {})

    iam_arn = str(tier1.get("iam_role_arn", "") or "").strip()
    external_id = str(tier1.get("external_id", "") or "").strip()
    git_token = str(tier1.get("git_pat", "") or "").strip()

    if iam_arn and not iam_arn.startswith("<iam_arn:sha256:"):
        tier1["iam_role_arn"] = _mask_secret(iam_arn, "iam_arn")
    if external_id and not external_id.startswith("<external_id:sha256:"):
        tier1["external_id"] = _mask_secret(external_id, "external_id")
    if git_token and not git_token.startswith("<git_pat:sha256:"):
        tier1["git_pat"] = _mask_secret(git_token, "git_pat")

    sanitized["credential_hygiene"] = {
        "ephemeral_credentials_purged": True,
        "raw_secrets_retained": False,
        "purged_at": _utc_now_iso(),
    }
    return sanitized


def validate_tier1_intake(payload: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Enforces Tier 1 schema, zero root IAM keys, and verified domain ownership."""
    errors: List[str] = []
    tier1 = payload.get("tier1_intake", {})

    iam_arn = str(tier1.get("iam_role_arn", "") or "").strip()
    external_id = str(tier1.get("external_id", "") or "").strip()
    repo_url = str(tier1.get("repo_url", "") or "").strip()
    target_domain = str(tier1.get("target_domain", "") or "").strip()
    ownership_ok = bool(tier1.get("ownership_authorized", False))

    if re.search(r"AKIA[0-9A-Z]{16}", iam_arn + external_id + json.dumps(tier1)):
        errors.append("Rejected: Raw AWS root/long-lived AKIA access key detected. Only STS Role ARNs allowed.")

    if not iam_arn or (not iam_arn.startswith("arn:aws:iam::") and not iam_arn.startswith("<iam_arn:sha256:")):
        errors.append("Tier 1 requires a read-only IAM Role ARN (arn:aws:iam::<account>:role/...).")

    if not external_id:
        errors.append("Tier 1 requires an External ID for cross-account IAM assumption.")

    if not repo_url.startswith("https://"):
        errors.append("Tier 1 requires a scoped HTTPS GitHub/GitLab repository URL.")

    if not target_domain or not ownership_ok:
        errors.append("Tier 1 requires a verified perimeter domain and explicit ownership authorization.")

    return (len(errors) == 0, errors)


def normalize_and_deduplicate(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Tier 3 Step 1: Deterministic normalization & deduplication across Prowler, Checkov,
    Gitleaks, Nuclei, and Cloud CLI database replication telemetry.
    """
    tier1 = payload.get("tier1_intake", {})
    telemetry = payload.get("tier2_telemetry", {})
    target_rpo_min = float(tier1.get("target_rpo_minutes", 15))
    target_rto_min = float(tier1.get("target_rto_minutes", 60))

    raw_items: List[Dict[str, Any]] = []

    # 1. Prowler (JSON-OCSF or flat list)
    for item in telemetry.get("prowler", []) or []:
        sev = str(item.get("severity", "medium")).lower()
        if sev in ("info", "informational") or str(item.get("status", "")).upper() == "PASS":
            continue
        raw_items.append(
            {
                "tool": "prowler",
                "rule_id": str(item.get("check_id") or item.get("id") or "PROWLER-CHK"),
                "canonical_key": str(item.get("canonical_key") or item.get("resource_id") or item.get("title", "")).lower(),
                "title": str(item.get("title") or item.get("finding_title") or "Cloud Posture Gap"),
                "resource": str(item.get("resource_id") or item.get("resource") or "aws-account"),
                "severity": sev if sev in SEVERITY_RANK else "medium",
                "frameworks": item.get("frameworks") or ["SOC 2 Type II", "ISO/IEC 27001"],
                "remediation_cli": str(item.get("remediation") or "Apply least-privilege Terraform IAM/KMS module."),
                "rpo_rto_impact": str(item.get("rpo_rto_impact") or "Indirect resilience risk"),
            }
        )

    # 2. Checkov (IaC JSON)
    for item in telemetry.get("checkov", []) or []:
        sev = str(item.get("severity", "high")).lower()
        if sev in ("info", "informational") or str(item.get("check_result", "")).upper() == "PASSED":
            continue
        raw_items.append(
            {
                "tool": "checkov",
                "rule_id": str(item.get("check_id") or "CKV_AWS_DEFAULT"),
                "canonical_key": str(item.get("canonical_key") or item.get("resource") or item.get("check_name", "")).lower(),
                "title": str(item.get("check_name") or item.get("title") or "IaC Misconfiguration"),
                "resource": str(item.get("resource") or item.get("file_path") or "terraform/main.tf"),
                "severity": sev if sev in SEVERITY_RANK else "high",
                "frameworks": item.get("frameworks") or ["ISO/IEC 27001", "SOC 2 Type II"],
                "remediation_cli": str(item.get("remediation") or "Enforce KMS encryption & state locking in Terraform."),
                "rpo_rto_impact": str(item.get("rpo_rto_impact") or "IaC drift affects automated disaster recovery"),
            }
        )

    # 3. Gitleaks (Git history secret scans)
    for item in telemetry.get("gitleaks", []) or []:
        raw_items.append(
            {
                "tool": "gitleaks",
                "rule_id": str(item.get("RuleID") or item.get("rule_id") or "GITLEAKS-SECRET"),
                "canonical_key": f"secret::{item.get('File', 'repo')}::{item.get('RuleID', 'key')}".lower(),
                "title": f"Exposed Secret Detected ({item.get('RuleID', 'Credential')})",
                "resource": f"{item.get('File', 'repo')}:{item.get('StartLine', 1)}",
                "severity": "critical",
                "frameworks": ["NIST SP 800-207", "SOC 2 Type II"],
                "remediation_cli": "Revoke credential immediately, rewrite git history via git-filter-repo, and switch to ephemeral OIDC.",
                "rpo_rto_impact": "Zero-trust compromise risk during incident recovery",
            }
        )

    # 4. Nuclei (External perimeter JSONL)
    for item in telemetry.get("nuclei", []) or []:
        info = item.get("info", {}) if isinstance(item.get("info"), dict) else {}
        sev = str(info.get("severity") or item.get("severity") or "medium").lower()
        if sev in ("info", "informational"):
            continue
        raw_items.append(
            {
                "tool": "nuclei",
                "rule_id": str(item.get("template-id") or item.get("template_id") or "NUCLEI-TLS"),
                "canonical_key": str(item.get("canonical_key") or item.get("template-id") or item.get("matched-at", "")).lower(),
                "title": str(info.get("name") or item.get("title") or "External Perimeter Vulnerability"),
                "resource": str(item.get("matched-at") or item.get("host") or tier1.get("target_domain", "perimeter")),
                "severity": sev if sev in SEVERITY_RANK else "medium",
                "frameworks": ["ISO/IEC 27001", "NIST SP 800-207"],
                "remediation_cli": str(item.get("remediation") or "Enforce TLS 1.3 and strict CSP/HSTS headers at ingress."),
                "rpo_rto_impact": "Public ingress availability & integrity impact",
            }
        )

    # 5. Cloud CLI DB Replication & PITR Dumps
    db_dumps = telemetry.get("cloud_cli_db", []) or []
    db_sla_summary: List[Dict[str, Any]] = []
    for db in db_dumps:
        lag_seconds = float(db.get("replication_lag_seconds", 0))
        lag_minutes = round(lag_seconds / 60.0, 2)
        pitr_enabled = bool(db.get("pitr_enabled", False))
        multi_region = bool(db.get("multi_region_replica", False))
        estimated_rto_min = float(db.get("estimated_failover_rto_minutes", 12 if multi_region else 75))
        rpo_breach = (not pitr_enabled) or (lag_minutes > target_rpo_min)
        rto_breach = (not multi_region) or (estimated_rto_min > target_rto_min)

        db_sla_summary.append(
            {
                "db_identifier": str(db.get("db_identifier") or "primary-db"),
                "replication_lag_seconds": lag_seconds,
                "replication_lag_minutes": lag_minutes,
                "pitr_enabled": pitr_enabled,
                "multi_region_replica": multi_region,
                "estimated_rto_minutes": estimated_rto_min,
                "rpo_sla_met": not rpo_breach,
                "rto_sla_met": not rto_breach,
            }
        )

        if rpo_breach or rto_breach:
            raw_items.append(
                {
                    "tool": "cloud_cli_db",
                    "rule_id": "DR-RPO-RTO-BREACH",
                    "canonical_key": f"dr::{db.get('db_identifier', 'primary-db')}".lower(),
                    "title": f"DR SLA Violation on {db.get('db_identifier', 'primary-db')} (Lag: {lag_minutes}m, Est RTO: {estimated_rto_min}m)",
                    "resource": str(db.get("db_identifier") or "primary-db"),
                    "severity": "critical",
                    "frameworks": ["ISO/IEC 27001", "SOC 2 Type II"],
                    "remediation_cli": "Enable continuous cross-region WAL PITR shipping + automated replica promotion runbook.",
                    "rpo_rto_impact": f"Violates <{target_rpo_min}m RPO / <{target_rto_min}m RTO SLA",
                }
            )

    # Deduplicate by canonical_key, merging source tools and elevating highest severity
    dedup_map: Dict[str, Dict[str, Any]] = {}
    duplicates_merged = 0
    for item in raw_items:
        key = re.sub(r"\s+", "-", item["canonical_key"].strip()) or item["rule_id"].lower()
        if key in dedup_map:
            duplicates_merged += 1
            existing = dedup_map[key]
            if item["tool"] not in existing["detected_by"]:
                existing["detected_by"].append(item["tool"])
            if SEVERITY_RANK.get(item["severity"], 4) < SEVERITY_RANK.get(existing["severity"], 4):
                existing["severity"] = item["severity"]
            for fw in item["frameworks"]:
                if fw not in existing["frameworks"]:
                    existing["frameworks"].append(fw)
        else:
            dedup_map[key] = {
                "canonical_key": key,
                "rule_id": item["rule_id"],
                "title": item["title"],
                "resource": item["resource"],
                "severity": item["severity"],
                "detected_by": [item["tool"]],
                "frameworks": list(dict.fromkeys(item["frameworks"])),
                "remediation_cli": item["remediation_cli"],
                "rpo_rto_impact": item["rpo_rto_impact"],
            }

    normalized_findings = sorted(
        dedup_map.values(),
        key=lambda x: SEVERITY_RANK.get(x["severity"], 4),
    )

    severity_counts = {"critical": 0, "high": 0, "medium": 0}
    for f in normalized_findings:
        if f["severity"] in severity_counts:
            severity_counts[f["severity"]] += 1

    return {
        "normalized_findings": normalized_findings,
        "duplicates_merged": duplicates_merged,
        "severity_counts": severity_counts,
        "db_sla_summary": db_sla_summary,
    }


def generate_mermaid_topology(payload: Dict[str, Any]) -> str:
    """
    Tier 3 Step 2: Parses asset inventory JSON into valid `graph TD` Mermaid.js syntax.
    """
    inv = payload.get("asset_inventory", {})
    tier1 = payload.get("tier1_intake", {})
    domain = str(tier1.get("target_domain") or "api.enterprise.io")
    vpcs = inv.get("vpcs") or ["vpc-prod-us-east-1"]
    lbs = inv.get("load_balancers") or ["alb-public-ingress"]
    services = inv.get("services") or ["eks-core-mesh"]
    databases = inv.get("databases") or ["aurora-oltp-primary"]
    replicas = inv.get("replicas") or []

    def safe_id(prefix: str, idx: int, label: str) -> str:
        slug = re.sub(r"[^a-zA-Z0-9]", "_", label)[:18]
        return f"{prefix}_{idx}_{slug}"

    lines = ["graph TD"]
    lines.append(f'  INET(["External Clients / {domain}"])')

    lb_ids: List[str] = []
    for idx, lb in enumerate(lbs):
        lid = safe_id("LB", idx, str(lb))
        lb_ids.append(lid)
        lines.append(f'  {lid}["Edge ALB / WAF: {lb}"]')
        lines.append(f"  INET -->|TLS 1.3| {lid}")

    vpc_label = str(vpcs[0])
    lines.append(f'  subgraph VPC["Primary VPC: {vpc_label}"]')

    svc_ids: List[str] = []
    for idx, svc in enumerate(services):
        sid = safe_id("SVC", idx, str(svc))
        svc_ids.append(sid)
        lines.append(f'    {sid}["Workload Mesh: {svc}"]')
        for lid in lb_ids:
            lines.append(f"    {lid} --> {sid}")

    db_ids: List[str] = []
    for idx, db in enumerate(databases):
        did = safe_id("DB", idx, str(db))
        db_ids.append(did)
        lines.append(f'    {did}[("Primary DB: {db}")]')
        for sid in svc_ids:
            lines.append(f"    {sid} -->|mTLS / OIDC| {did}")

    lines.append("  end")

    if replicas:
        lines.append('  subgraph DR["Cross-Region DR Failover"]')
        for idx, rep in enumerate(replicas):
            rid = safe_id("REP", idx, str(rep))
            lines.append(f'    {rid}[("DR Replica: {rep}")]')
            if db_ids:
                lines.append(f"    {db_ids[0]} -.->|WAL Streaming| {rid}")
        lines.append("  end")
    else:
        lines.append('  SPOF_WARN["WARNING: No Cross-Region Read Replica Detected"]')
        if db_ids:
            lines.append(f"  {db_ids[0]} -.->|Single Region SPOF| SPOF_WARN")

    return "\n".join(lines)


class ArchitechnixResilientEngine:
    def __init__(self, system_prompt: str = SYSTEM_PROMPT_DEFAULT, api_key: Optional[str] = None):
        resolved_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not resolved_key:
            raise EnvironmentError(
                "Missing GEMINI_API_KEY. Verify Google Cloud project permissions and active API key."
            )
        if genai is None:
            raise ImportError(
                "google-genai SDK is not installed. Run `pip install google-genai` to enable Gemini synthesis."
            )
        self.client = genai.Client(api_key=resolved_key)
        self.system_prompt = system_prompt
        self.primary_model = "gemini-2.5-pro"
        self.fallback_model = "gemini-2.5-flash"

    def evaluate_pre_check_gate(self, payload: dict) -> dict:
        """Idempotent guard: skips completed telemetry/normalization stages."""
        state = payload.get("pipeline_state", {})
        if state.get("telemetry_complete") and state.get("normalized"):
            logger.info("[STATUS: SKIPPED - PREVIOUSLY FULFILLED] Telemetry & normalization verified.")
            payload.setdefault("gate_log", []).append(
                "[SKIPPED - PREVIOUSLY FULFILLED] Telemetry & normalization verified."
            )
            return payload

        logger.info("[STATUS: EXECUTING] Normalizing telemetry and validating pre-flight baselines...")
        is_valid, validation_errors = validate_tier1_intake(payload)
        if not is_valid:
            raise ValueError("Tier 1 Scope/Credential Gate Failed: " + "; ".join(validation_errors))

        clean_payload = scrub_ephemeral_credentials(payload)
        normalized = normalize_and_deduplicate(clean_payload)
        mermaid_graph = generate_mermaid_topology(clean_payload)

        clean_payload["normalized_summary"] = normalized
        clean_payload["mermaid_topology"] = mermaid_graph
        clean_payload.setdefault("pipeline_state", {})["telemetry_complete"] = True
        clean_payload["pipeline_state"]["normalized"] = True
        clean_payload.setdefault("gate_log", []).append(
            "[EXECUTING] Tier 1 verified, credentials purged, Tier 2 normalized & Mermaid graph built."
        )
        return clean_payload

    def _invoke_gemini(self, model_name: str, prompt_content: str) -> str:
        response = self.client.models.generate_content(
            model=model_name,
            contents=prompt_content,
            config=types.GenerateContentConfig(
                system_instruction=self.system_prompt,
                temperature=0.2,
            ),
        )
        return response.text or ""

    def synthesize_audit(self, payload: dict) -> str:
        clean_payload = self.evaluate_pre_check_gate(payload)
        prompt = (
            "Synthesize full Architechnix Pilot Audit deliverable (.md) using Two-Pass structure:\n"
            "- Pass 1 (Executive Risk & DR Analysis): Evaluate DB replication lag vs target RPO/RTO SLAs & SPOFs.\n"
            "- Pass 2 (Remediation Roadmap): Copy-pasteable Terraform/CLI fixes ranked Critical, High, Medium.\n"
            "- Include Compliance Gap Matrix and embedded Mermaid graph TD block.\n\n"
            f"Normalized Payload:\n{json.dumps(clean_payload, indent=2)}"
        )

        try:
            logger.info("Attempting synthesis with primary model: %s", self.primary_model)
            report = self._invoke_gemini(self.primary_model, prompt)
            logger.info("[STATUS: STEADY_STATE_REACHED] Primary synthesis succeeded.")
            return report

        except APIError as e:
            logger.warning("APIError on %s (HTTP %s): %s", self.primary_model, e.code, e.message)
            if e.code in (401, 403, 429):
                logger.info("Falling back to %s due to permission/tier constraint...", self.fallback_model)
                try:
                    report = self._invoke_gemini(self.fallback_model, prompt)
                    logger.info("[STATUS: STEADY_STATE_REACHED] Fallback synthesis succeeded.")
                    return report
                except APIError as fallback_err:
                    raise PermissionError(
                        f"Both {self.primary_model} and {self.fallback_model} failed ({fallback_err.code}). "
                        "Verify Generative Language API enablement, project IAM Owner/Editor role, and active billing."
                    ) from fallback_err
            raise


def run_deterministic_self_check() -> Dict[str, Any]:
    """Runs idempotent normalization & Mermaid topology synthesis without external API calls."""
    sample_payload = {
        "tier1_intake": {
            "iam_role_arn": "arn:aws:iam::123456789012:role/ArchitechnixReadOnlyAudit",
            "external_id": "ext-apex-fintech-2026",
            "repo_url": "https://github.com/apex-fintech/core-mesh",
            "git_pat": "ghp_ephemeral_token_sample_do_not_persist",
            "target_domain": "api.apexfintech.io",
            "ownership_authorized": True,
            "target_rpo_minutes": 15,
            "target_rto_minutes": 60,
        },
        "asset_inventory": {
            "vpcs": ["vpc-prod-us-east-1"],
            "load_balancers": ["alb-apex-ingress"],
            "services": ["eks-payments-mesh"],
            "databases": ["aurora-pg-primary"],
            "replicas": [],
        },
        "tier2_telemetry": {
            "prowler": [
                {
                    "check_id": "s3_bucket_kms_encryption",
                    "canonical_key": "s3-backup-bucket-encryption",
                    "title": "S3 backup bucket lacks KMS CMK encryption",
                    "resource_id": "arn:aws:s3:::apex-dr-backups",
                    "severity": "high",
                },
                {
                    "check_id": "iam_info_noise",
                    "title": "Informational IAM policy summary",
                    "severity": "info",
                },
            ],
            "checkov": [
                {
                    "check_id": "CKV_AWS_145",
                    "canonical_key": "s3-backup-bucket-encryption",
                    "check_name": "Ensure S3 bucket uses KMS CMK",
                    "resource": "aws_s3_bucket.dr_backups",
                    "severity": "critical",
                }
            ],
            "cloud_cli_db": [
                {
                    "db_identifier": "aurora-pg-primary",
                    "replication_lag_seconds": 1320,
                    "pitr_enabled": True,
                    "multi_region_replica": False,
                    "estimated_failover_rto_minutes": 75,
                }
            ],
        },
    }
    valid, errors = validate_tier1_intake(sample_payload)
    assert valid, f"Tier 1 validation unexpectedly failed: {errors}"
    scrubbed = scrub_ephemeral_credentials(sample_payload)
    normalized = normalize_and_deduplicate(scrubbed)
    mermaid = generate_mermaid_topology(scrubbed)
    return {
        "status": "STEADY_STATE_REACHED",
        "credential_hygiene": scrubbed["credential_hygiene"],
        "severity_counts": normalized["severity_counts"],
        "duplicates_merged": normalized["duplicates_merged"],
        "mermaid_preview": mermaid,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Architechnix {∞} Production v2.2 Python Engine")
    parser.add_argument("--self-check", action="store_true", help="Verify deterministic Tier 1-3 pipeline without Gemini API key")
    args = parser.parse_args()
    if args.self_check:
        print(json.dumps(run_deterministic_self_check(), indent=2))
        sys.exit(0)
    print("Run with --self-check or import ArchitechnixResilientEngine.")
