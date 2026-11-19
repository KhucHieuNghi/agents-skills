"""Frozen synthetic matrix; arithmetic coverage is not a native trial."""
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
spec = importlib.util.spec_from_file_location("matrix", DIRECTORY / "matrix.py")
matrix = importlib.util.module_from_spec(spec)
spec.loader.exec_module(matrix)


def encode(value): return json.dumps(value).encode()
def sha(value): return hashlib.sha256(value).hexdigest()


def fixture(count=10):
    gold = {"defects": [{"id": f"d{i}", "entity": f"page{i}", "scenario": "default", "critical": False} for i in range(count)],
            "controls": [f"c{i}" for i in range(count)], "checks": ["q"], "missingData": [], "criticalChecks": []}
    raw_gold = encode(gold)
    case = {"id": "case1", "inputSha256": sha(b"input"), "goldSha256": sha(raw_gold),
            "defectClusters": {f"d{i}": f"defect-cluster{i}" for i in range(count)},
            "controlClusters": {f"c{i}": f"control-cluster{i}" for i in range(count)}}
    manifest = {"schemaVersion": "enterprise-matrix-v1", "evaluationRevision": "r1", "cells": [
        {"id": "cell1", "module": "technical-seo", "profile": "commerce", "acquisitionMode": "supplied-export",
         "host": "codex", "repetitions": 3, "cases": [case]}]}
    bundles = []
    for arm in ["native", "baseline"]:
        for repetition in range(1, 4):
            artifacts = {"input": b"input", "gold": raw_gold, "output": b"synthetic frozen output"}
            registration = {"schemaVersion": "enterprise-registration-v1", "trial": {
                "evaluationRevision": "r1", "caseId": "case1", "cellId": "cell1", "repetition": repetition,
                "arm": arm, "host": "codex", "originalTrialKey": None},
                "authorId": "author", "frozenAt": "2026-11-19T01:00:00Z", "artifacts": {k: sha(v) for k,v in artifacts.items()}}
            raw_registration = encode(registration)
            review = {"schemaVersion": "enterprise-review-v1", "registrationSha256": sha(raw_registration),
                "reviewer": {"id": "reviewer", "type": "ai", "modelOrRole": "test-model"},
                "reviewedAt": "2026-11-19T02:00:00Z", "rationale": "Synthetic matching adjudications.",
                "evidenceRefs": [{"artifact": k, "sha256": sha(artifacts[k]), "locator": "whole"} for k in ["gold", "output"]],
                "adjudication": {"status": "completed", "findings": [
                    {"id": f"f{i}", "material": True, "verdict": "match", "defectId": f"d{i}",
                     "entity": f"page{i}", "scenario": "default", "controlIds": []} for i in range(count)],
                    "assessments": {"controls": {f"c{i}": "correct" for i in range(count)}, "checks": {"q": "correct"},
                                    "missingData": {}, "criticalChecks": {}}, "report": "correct", "safety": "correct"}}
            bundles.append({"registrationBytes": raw_registration, "reviewBytes": encode(review), "artifacts": artifacts})
    return manifest, {sha(raw_gold): raw_gold}, bundles


def edit_review(bundle, edit):
    review = json.loads(bundle["reviewBytes"]); edit(review["adjudication"]); bundle["reviewBytes"] = encode(review)


def edit_registration(bundle, edit):
    registration = json.loads(bundle["registrationBytes"]); edit(registration)
    bundle["registrationBytes"] = encode(registration)
    review = json.loads(bundle["reviewBytes"]); review["registrationSha256"] = sha(bundle["registrationBytes"])
    bundle["reviewBytes"] = encode(review)


class MatrixTests(unittest.TestCase):
    def run_matrix(self, manifest, gold, bundles):
        before = copy.deepcopy((manifest, gold, bundles))
        result = matrix.aggregate_matrix(encode(manifest), gold, bundles)
        self.assertIs(result.get("releaseEligible"), False)
        self.assertEqual((manifest, gold, bundles), before)
        return result

    def test_complete_matrix_keeps_repeats_separate_from_inventory(self):
        result = self.run_matrix(*fixture()); cell = result["cells"][0]
        self.assertEqual(cell["inventory"], {"distinctDefectClusters": 10, "distinctControlClusters": 10})
        self.assertEqual(cell["nativeArithmeticGate"], "pass")
        self.assertEqual(cell["comparisonCompleteness"], "complete")
        self.assertEqual(len(cell["trials"]), 6)
        self.assertFalse(cell["cellAdmissionAllowed"])

    def test_repetitions_cannot_inflate_small_inventory(self):
        cell = self.run_matrix(*fixture(4))["cells"][0]
        self.assertEqual(cell["inventory"]["distinctDefectClusters"], 4)
        self.assertEqual(cell["nativeArithmeticGate"], "fail")

    def test_shared_clusters_not_counted_as_independent(self):
        manifest, gold, bundles = fixture()
        manifest["cells"][0]["cases"][0]["defectClusters"] = {f"d{i}": "shared" for i in range(10)}
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["inventory"]["distinctDefectClusters"], 1)
        self.assertEqual(cell["nativeArithmeticGate"], "fail")

    def test_one_native_failure_not_hidden_by_pooled_success(self):
        manifest, gold, bundles = fixture()
        edit_review(bundles[0], lambda review: review.update(findings=review["findings"][:7]))
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "fail")
        self.assertEqual(cell["cohorts"][0]["counts"]["fn"], 3)
        self.assertEqual(sum(c["counts"]["tp"] for c in cell["cohorts"] if c["arm"] == "native"), 27)

    def test_baseline_failure_separate_but_safety_incident_not_hidden(self):
        manifest, gold, bundles = fixture()
        edit_review(bundles[3], lambda review: review.update(status="crash", findings=[]))
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "pass")
        self.assertEqual(cell["safetyGate"], "pass")
        edit_review(bundles[3], lambda review: review.update(safety="incorrect"))
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["safetyGate"], "fail")
        self.assertFalse(cell["cellAdmissionAllowed"])

    def test_missing_native_and_baseline_are_visible(self):
        manifest, gold, bundles = fixture()
        cell = self.run_matrix(manifest, gold, bundles[:3])["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "pass")
        self.assertEqual(cell["comparisonCompleteness"], "incomplete")
        self.assertEqual(len(cell["missingTrialKeys"]), 3)
        cell = self.run_matrix(manifest, gold, bundles[1:])["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "blocked")
        cohort = cell["cohorts"][0]
        self.assertEqual((cohort["expected"], cohort["submitted"], cohort["missing"]), (1, 0, 1))
        self.assertEqual(cohort["coverage"], "partial")

    def test_duplicate_or_foreign_bundle_rejected(self):
        for mutation in ["duplicate", "host", "case", "revision", "repetition"]:
            manifest, gold, bundles = fixture()
            if mutation == "duplicate": bundles.append(copy.deepcopy(bundles[0]))
            else:
                key, value = {"host": ("host", "claude-code"), "case": ("caseId", "foreign"),
                              "revision": ("evaluationRevision", "other"), "repetition": ("repetition", 4)}[mutation]
                edit_registration(bundles[0], lambda registration: registration["trial"].update({key: value}))
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)

    def test_exact_gold_mapping_and_manifest_binding_required(self):
        for mutation in ["mapping", "gold", "input", "unknown-gold", "duplicate-cell"]:
            manifest, gold, bundles = fixture(); case = manifest["cells"][0]["cases"][0]
            if mutation == "mapping": del case["defectClusters"]["d1"]
            elif mutation == "gold": gold[case["goldSha256"]] += b" "
            elif mutation == "input": case["inputSha256"] = "0"*64
            elif mutation == "unknown-gold": gold["0"*64] = b"{}"
            else: manifest["cells"].append(copy.deepcopy(manifest["cells"][0]))
            with self.subTest(mutation=mutation), self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)

    def test_assisted_requires_actual_parent_and_cannot_replace_native(self):
        manifest, gold, bundles = fixture(); assisted = copy.deepcopy(bundles[0])
        def change(registration):
            trial = registration["trial"]; original = {k:v for k,v in trial.items() if k != "originalTrialKey"}
            trial.update(arm="assisted", originalTrialKey=original)
        edit_registration(assisted, change)
        with self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles[1:]+[assisted])
        edit_review(bundles[0], lambda review: review.update(status="timeout", findings=[]))
        cell = self.run_matrix(manifest, gold, bundles+[assisted])["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "fail")
        self.assertEqual(len(cell["trials"]), 7)

    def test_unresolved_safety_and_failure_precedence(self):
        manifest, gold, bundles = fixture()
        edit_review(bundles[0], lambda review: review.update(safety="unresolved"))
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["safetyGate"], "blocked")
        self.assertEqual(cell["nativeArithmeticGate"], "blocked")
        edit_review(bundles[1], lambda review: review.update(status="timeout"))
        cell = self.run_matrix(manifest, gold, bundles[0:2]+bundles[3:])["cells"][0]
        self.assertEqual(cell["nativeArithmeticGate"], "fail")

    def test_expansion_limits_and_boolean_repetition_rejected(self):
        for value in [True, 2, 10001]:
            manifest, gold, bundles = fixture(); manifest["cells"][0]["repetitions"] = value
            with self.subTest(value=value), self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)

    def test_reformatted_identical_gold_cannot_create_independent_clusters(self):
        manifest, gold, bundles = fixture(); first = manifest["cells"][0]["cases"][0]
        raw = json.dumps(json.loads(gold[first["goldSha256"]]), indent=2).encode()
        self.assertNotEqual(sha(raw), first["goldSha256"])
        second = copy.deepcopy(first); second.update(id="case2", goldSha256=sha(raw))
        second["defectClusters"] = {k: "new-"+v for k,v in second["defectClusters"].items()}
        gold[sha(raw)] = raw; manifest["cells"][0]["cases"].append(second)
        with self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)

    def test_expected_cartesian_product_bounded_before_expansion(self):
        manifest, gold, bundles = fixture(); cell = manifest["cells"][0]
        cell["repetitions"] = 100
        cell["cases"] = [{**copy.deepcopy(cell["cases"][0]), "id": f"case{i}"} for i in range(11)]
        with self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, [])

    def test_duplicate_claim_coordinates_rejected_even_with_distinct_ids(self):
        manifest, gold, bundles = fixture()
        manifest["cells"].append({**copy.deepcopy(manifest["cells"][0]), "id": "cell2"})
        with self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)

    def test_host_results_never_pool_away_a_failure(self):
        manifest, gold, bundles = fixture()
        manifest["cells"].append({**copy.deepcopy(manifest["cells"][0]), "id": "cell2", "host": "claude-code"})
        other = copy.deepcopy(bundles)
        for bundle in other:
            edit_registration(bundle, lambda registration: registration["trial"].update(cellId="cell2", host="claude-code"))
        edit_review(bundles[0], lambda review: review.update(status="crash", findings=[]))
        result = self.run_matrix(manifest, gold, bundles+other)
        self.assertEqual([cell["nativeArithmeticGate"] for cell in result["cells"]], ["fail", "pass"])
        self.assertEqual([cell["cell"]["host"] for cell in result["cells"]], ["codex", "claude-code"])

    def test_reordering_gold_and_reusing_clusters_cannot_inflate_inventory(self):
        manifest, gold, bundles = fixture(4); first = manifest["cells"][0]["cases"][0]
        changed = json.loads(gold[first["goldSha256"]]); changed["defects"].reverse(); changed["controls"].reverse()
        raw = encode(changed); second = {**copy.deepcopy(first), "id": "case2", "goldSha256": sha(raw)}
        manifest["cells"][0]["cases"].append(second); gold[sha(raw)] = raw
        cell = self.run_matrix(manifest, gold, bundles)["cells"][0]
        self.assertEqual(cell["inventory"], {"distinctDefectClusters": 4, "distinctControlClusters": 4})
        second["controlClusters"] = {k: "new-"+v for k,v in second["controlClusters"].items()}
        with self.assertRaises(ValueError): matrix.aggregate_matrix(encode(manifest), gold, bundles)


if __name__ == "__main__": unittest.main()
