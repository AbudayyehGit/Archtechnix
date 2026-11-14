import os
import unittest
from unittest.mock import MagicMock, patch

from architechnix_engine import (
    APIError,
    ArchitechnixResilientEngine,
    generate_mermaid_topology,
    normalize_and_deduplicate,
    run_deterministic_self_check,
    scrub_ephemeral_credentials,
    validate_tier1_intake,
)


class ArchitechnixEngineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.base_payload = {
            "tier1_intake": {
                "iam_role_arn": "arn:aws:iam::123456789012:role/ArchitechnixAuditRO",
                "external_id": "ext-998877",
                "repo_url": "https://github.com/apex-fintech/core-mesh",
                "git_pat": "ghp_ephemeral_secret_abc123",
                "target_domain": "api.apexfintech.io",
                "ownership_authorized": True,
                "target_rpo_minutes": 15,
                "target_rto_minutes": 60,
            },
            "asset_inventory": {
                "vpcs": ["vpc-prod-01"],
                "load_balancers": ["alb-edge"],
                "services": ["mesh-worker"],
                "databases": ["aurora-main"],
                "replicas": ["aurora-dr-west"],
            },
            "tier2_telemetry": {
                "prowler": [
                    {
                        "check_id": "s3_kms",
                        "canonical_key": "s3-kms-key",
                        "title": "S3 lacks KMS key",
                        "resource_id": "s3://backups",
                        "severity": "high",
                    },
                    {"check_id": "info_1", "title": "Info noise", "severity": "info"},
                ],
                "checkov": [
                    {
                        "check_id": "CKV_AWS_145",
                        "canonical_key": "s3-kms-key",
                        "check_name": "S3 CMK missing",
                        "resource": "s3://backups",
                        "severity": "critical",
                    }
                ],
                "gitleaks": [],
                "nuclei": [],
                "cloud_cli_db": [
                    {
                        "db_identifier": "aurora-main",
                        "replication_lag_seconds": 120,
                        "pitr_enabled": True,
                        "multi_region_replica": True,
                        "estimated_failover_rto_minutes": 12,
                    }
                ],
            },
        }

    def test_rejects_root_access_keys_and_unverified_domain(self) -> None:
        bad = dict(self.base_payload)
        bad["tier1_intake"] = dict(self.base_payload["tier1_intake"])
        bad["tier1_intake"]["iam_role_arn"] = "AKIA1234567890ABCDEF"
        bad["tier1_intake"]["ownership_authorized"] = False
        ok, errs = validate_tier1_intake(bad)
        self.assertFalse(ok)
        self.assertGreaterEqual(len(errs), 2)

    def test_scrubs_ephemeral_credentials_and_deduplicates(self) -> None:
        scrubbed = scrub_ephemeral_credentials(self.base_payload)
        self.assertTrue(scrubbed["tier1_intake"]["git_pat"].startswith("<git_pat:sha256:"))
        self.assertTrue(scrubbed["credential_hygiene"]["ephemeral_credentials_purged"])

        norm = normalize_and_deduplicate(scrubbed)
        self.assertEqual(norm["duplicates_merged"], 1)
        self.assertEqual(norm["severity_counts"]["critical"], 1)
        self.assertEqual(len(norm["normalized_findings"]), 1)

    def test_generates_valid_mermaid_graph_td(self) -> None:
        graph = generate_mermaid_topology(self.base_payload)
        self.assertTrue(graph.startswith("graph TD"))
        self.assertIn("aurora-dr-west", graph)

    def test_idempotent_gate_skips_completed_stages(self) -> None:
        with patch("architechnix_engine.genai") as mock_genai:
            mock_genai.Client.return_value = MagicMock()
            engine = ArchitechnixResilientEngine(api_key="test-key-only")
            pre_done = {"pipeline_state": {"telemetry_complete": True, "normalized": True}}
            out = engine.evaluate_pre_check_gate(pre_done)
            self.assertIn("[SKIPPED - PREVIOUSLY FULFILLED]", out["gate_log"][0])

    def test_graceful_fallback_on_429_to_flash(self) -> None:
        with patch("architechnix_engine.genai") as mock_genai, patch("architechnix_engine.types") as mock_types:
            mock_types.GenerateContentConfig.return_value = MagicMock()
            client = MagicMock()
            mock_genai.Client.return_value = client

            resp_ok = MagicMock()
            resp_ok.text = "# Pilot Audit Report\n[STATUS: STEADY_STATE_REACHED]"

            client.models.generate_content.side_effect = [
                APIError("Quota exceeded", code=429),
                resp_ok,
            ]

            engine = ArchitechnixResilientEngine(api_key="test-key-only")
            report = engine.synthesize_audit(self.base_payload)
            self.assertIn("Pilot Audit Report", report)
            self.assertEqual(client.models.generate_content.call_count, 2)
            second_model = client.models.generate_content.call_args_list[1].kwargs["model"]
            self.assertEqual(second_model, "gemini-2.5-flash")

    def test_missing_api_key_raises_environment_error(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(EnvironmentError):
                ArchitechnixResilientEngine(api_key=None)

    def test_deterministic_self_check(self) -> None:
        summary = run_deterministic_self_check()
        self.assertEqual(summary["status"], "STEADY_STATE_REACHED")
        self.assertGreaterEqual(summary["duplicates_merged"], 1)


if __name__ == "__main__":
    unittest.main()
