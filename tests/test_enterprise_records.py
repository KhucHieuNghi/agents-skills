"""Real byte bindings and hostile JSON; no model or provider fixtures."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / "scripts/enterprise-evaluation"
sys.path.insert(0, str(DIRECTORY))
spec = importlib.util.spec_from_file_location("records", DIRECTORY / "records.py")
records = importlib.util.module_from_spec(spec)
spec.loader.exec_module(records)


def encode(value):
    return json.dumps(value).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def fixture():
    gold = {"defects": [{"id": "d1", "entity": "page", "scenario": "default", "critical": True}],
            "controls": [], "checks": [], "missingData": [], "criticalChecks": []}
    artifacts = {"input": b"synthetic input", "gold": encode(gold), "output": b"frozen finding"}
    registration = {"schemaVersion": "enterprise-registration-v1",
                    "trial": {"evaluationRevision": "r1", "caseId": "case1", "cellId": "cell1", "repetition": 1,
                              "arm": "native", "host": "codex", "originalTrialKey": None},
                    "authorId": "author", "frozenAt": "2026-11-19T01:00:00Z",
                    "artifacts": {k: sha(v) for k, v in artifacts.items()}}
    review = {"schemaVersion": "enterprise-review-v1", "registrationSha256": sha(encode(registration)),
              "reviewer": {"id": "reviewer", "type": "ai", "modelOrRole": "observed-model"},
              "reviewedAt": "2026-11-19T02:00:00Z", "rationale": "The frozen claim matches the seeded issue.",
              "evidenceRefs": [{"artifact": k, "sha256": sha(artifacts[k]), "locator": "whole artifact"} for k in ["gold", "output"]],
              "adjudication": {"status": "completed", "findings": [{"id": "f1", "material": True, "verdict": "match",
                               "defectId": "d1", "entity": "page", "scenario": "default", "controlIds": []}],
                               "assessments": {k: {} for k in ["controls", "checks", "missingData", "criticalChecks"]},
                               "report": "correct", "safety": "correct"}}
    return registration, review, artifacts


class RecordTests(unittest.TestCase):
    def run_score(self, registration, review, artifacts):
        return records.score_bound_trial(encode(registration), encode(review), artifacts)

    def test_bound_bytes_score_without_authenticity_or_release_claim(self):
        registration, review, artifacts = fixture()
        before = copy.deepcopy((registration, review, artifacts))
        result = self.run_score(registration, review, artifacts)
        self.assertEqual(result.get("registrationSha256"), sha(encode(registration)))
        self.assertEqual(result["score"]["counts"]["tp"], 1)
        self.assertIs(result["reviewerIndependenceVerified"], False)
        self.assertIs(result["releaseEligible"], False)
        self.assertEqual((registration, review, artifacts), before)

    def test_changed_input_gold_or_output_rejected(self):
        for name in ["input", "gold", "output"]:
            registration, review, artifacts = fixture(); artifacts[name] += b" "
            with self.subTest(name=name), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_changed_registration_not_adopted_from_review(self):
        registration, review, artifacts = fixture(); registration["trial"]["caseId"] = "different"
        with self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_self_review_missing_attribution_and_bad_times_rejected(self):
        for mutation in ["self", "role", "rationale", "earlier", "naive", "invalid", "type"]:
            registration, review, artifacts = fixture()
            if mutation == "self": review["reviewer"]["id"] = "author"
            elif mutation == "role": review["reviewer"]["modelOrRole"] = ""
            elif mutation == "rationale": review["rationale"] = " "
            elif mutation == "earlier": review["reviewedAt"] = "2026-11-18T00:00:00Z"
            elif mutation == "naive": review["reviewedAt"] = "2026-11-19T02:00:00"
            elif mutation == "invalid": review["reviewedAt"] = "2026-02-30T02:00:00Z"
            else: review["reviewer"]["type"] = "automatic-approval"
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_foreign_or_missing_evidence_reference_rejected(self):
        for mutation in ["missing", "hash", "foreign", "locator", "duplicate"]:
            registration, review, artifacts = fixture()
            if mutation == "missing": review["evidenceRefs"].pop()
            elif mutation == "hash": review["evidenceRefs"][0]["sha256"] = "0"*64
            elif mutation == "foreign": review["evidenceRefs"][0]["artifact"] = "other"
            elif mutation == "locator": review["evidenceRefs"][0]["locator"] = ""
            else: review["evidenceRefs"].append(review["evidenceRefs"][0])
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_invalid_host_arm_repetition_and_assisted_link_rejected(self):
        for key, value in [("host", "other"), ("arm", "success"), ("repetition", True), ("repetition", 0), ("repetition", 1.5), ("arm", "assisted")]:
            registration, review, artifacts = fixture(); registration["trial"][key] = value
            review["registrationSha256"] = sha(encode(registration))
            with self.subTest(key=key, value=value), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_duplicate_keys_nonfinite_invalid_utf8_and_deep_json_rejected(self):
        registration, review, artifacts = fixture()
        bad = [b'{"x":1,"x":2}', b'{"x":NaN}', b'{"x":Infinity}', b'{"x":1e999}', b'\xff', b'['*100+b'0'+b']'*100,
               b'{"x":"\\ud800"}', b'{}'*2, b' '*1048577]
        for raw in bad:
            with self.subTest(raw=raw[:40]), self.assertRaises(ValueError): records.score_bound_trial(encode(registration), raw, artifacts)

    def test_artifact_set_and_type_are_exact(self):
        for mutation in ["missing", "extra", "type", "oversized"]:
            registration, review, artifacts = fixture()
            if mutation == "missing": del artifacts["input"]
            elif mutation == "extra": artifacts["extra"] = b"unregistered"
            elif mutation == "type": artifacts["input"] = "synthetic input"
            else: artifacts["input"] = b'x' * (8*1024*1024+1)
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_assisted_reference_preserved_not_promoted_to_native(self):
        registration, review, artifacts = fixture()
        registration["trial"]["originalTrialKey"] = {k: v for k, v in registration["trial"].items() if k != "originalTrialKey"}
        registration["trial"]["arm"] = "assisted"; review["registrationSha256"] = sha(encode(registration))
        result = self.run_score(registration, review, artifacts)
        self.assertEqual(result.get("trial", {}).get("arm"), "assisted")
        self.assertEqual(result["trial"]["originalTrialKey"]["arm"], "native")

    def test_timestamp_offsets_compare_instants_and_reject_invalid_minutes(self):
        registration, review, artifacts = fixture()
        review["reviewedAt"] = "2026-11-19T08:00:00+07:00"
        self.assertEqual(self.run_score(registration, review, artifacts)["score"]["counts"]["tp"], 1)
        review["reviewedAt"] = "2026-11-19T02:00:00+00:60"
        with self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_duplicate_keys_in_otherwise_valid_envelope_and_surrogate_rejected(self):
        registration, review, artifacts = fixture()
        raw = encode(review).replace(b'"id": "reviewer"', b'"id": "reviewer", "id": "reviewer"')
        with self.assertRaises(ValueError): records.score_bound_trial(encode(registration), raw, artifacts)
        review["rationale"] = "\ud800"
        with self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_assisted_cross_host_or_case_link_rejected(self):
        for key, value in [("host", "claude-code"), ("caseId", "other"), ("arm", "baseline"), ("repetition", 2)]:
            registration, review, artifacts = fixture()
            original = {k: v for k, v in registration["trial"].items() if k != "originalTrialKey"}
            original[key] = value
            registration["trial"]["originalTrialKey"] = original; registration["trial"]["arm"] = "assisted"
            review["registrationSha256"] = sha(encode(registration))
            with self.subTest(key=key), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)

    def test_empty_failed_output_preserves_misses(self):
        registration, review, artifacts = fixture(); artifacts["output"] = b""
        registration["artifacts"]["output"] = sha(b"")
        review["registrationSha256"] = sha(encode(registration))
        review["evidenceRefs"][1]["sha256"] = sha(b"")
        review["adjudication"]["status"] = "absent_report"; review["adjudication"]["findings"] = []
        result = self.run_score(registration, review, artifacts)
        self.assertEqual(result["score"]["counts"]["fn"], 1)
        self.assertEqual(result["score"]["gates"]["report"], "fail")
        self.assertFalse(result["registrationAuthenticityVerified"])

    def test_valid_hashes_do_not_bypass_byte_limits(self):
        for individual in [True, False]:
            registration, review, artifacts = fixture()
            artifacts["input"] = b"x" * (8*1024*1024 + int(individual))
            if not individual: artifacts["output"] = b"y" * (8*1024*1024)
            registration["artifacts"] = {k: sha(v) for k, v in artifacts.items()}
            review["registrationSha256"] = sha(encode(registration))
            for ref in review["evidenceRefs"]: ref["sha256"] = registration["artifacts"][ref["artifact"]]
            with self.subTest(individual=individual), self.assertRaises(ValueError): self.run_score(registration, review, artifacts)


if __name__ == "__main__": unittest.main()
