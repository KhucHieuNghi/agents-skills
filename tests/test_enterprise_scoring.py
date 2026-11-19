"""Hand-counted adversarial trials; no native evaluation or holdout claims."""
import copy
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("scoring", ROOT / "scripts/enterprise-evaluation/scoring.py")
scoring = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scoring)


def fixture():
    gold = {
        "defects": [{"id": "d1", "entity": "page-a", "scenario": "default", "critical": True},
                    {"id": "d2", "entity": "page-b", "scenario": "default", "critical": False}],
        "controls": ["c1"], "checks": ["q1"], "missingData": ["m1"], "criticalChecks": ["k1"],
    }
    review = {
        "status": "completed",
        "findings": [{"id": "f1", "material": True, "verdict": "match", "defectId": "d1",
                      "entity": "page-a", "scenario": "default", "controlIds": []}],
        "assessments": {"controls": {"c1": "correct"}, "checks": {"q1": "correct"},
                        "missingData": {"m1": "correct"}, "criticalChecks": {"k1": "correct"}},
        "report": "correct", "safety": "correct",
    }
    return gold, review


class ScoringTests(unittest.TestCase):
    def score(self, gold, review):
        before = copy.deepcopy((gold, review))
        result = scoring.score_trial(gold, review)
        self.assertEqual((gold, review), before)
        self.assertIs(result.get("releaseEligible"), False)
        return result

    def test_missing_defect_fails_recall_despite_perfect_precision(self):
        result = self.score(*fixture())
        self.assertEqual(result["counts"], {"tp": 1, "fp": 0, "fn": 1, "duplicates": 0,
                                          "observations": 0, "unresolvedMaterial": 0, "criticalFn": 0})
        self.assertEqual(result["metrics"]["precision"]["value"], 1)
        self.assertEqual(result["metrics"]["recall"]["value"], 0.5)
        self.assertEqual(result["gates"]["recall"], "fail")

    def test_duplicate_matches_do_not_inflate_tp_or_hide_miss(self):
        gold, review = fixture()
        review["findings"].append({**review["findings"][0], "id": "duplicate"})
        result = self.score(gold, review)
        self.assertEqual((result["counts"]["tp"], result["counts"]["fn"], result["counts"]["duplicates"]), (1, 1, 1))

    def test_undefined_denominators_are_null_not_perfect(self):
        gold, review = fixture()
        gold["defects"] = []; review["findings"] = []
        result = self.score(gold, review)
        for metric in ["precision", "recall", "criticalRecall"]:
            self.assertIsNone(result["metrics"][metric]["value"])
            self.assertIsNone(result["metrics"][metric]["interval95"])
        self.assertEqual(result["gates"]["precision"], "not_applicable")

    def test_crashes_retain_adjudicable_tp_and_remaining_fn(self):
        for status in ["crash", "timeout", "invalid_report"]:
            gold, review = fixture(); review["status"] = status
            result = self.score(gold, review)
            self.assertEqual((result["counts"]["tp"], result["counts"]["fn"]), (1, 1))
            self.assertEqual(result["gates"]["report"], "fail")

    def test_false_positive_on_clean_control_overrides_correct_assessment(self):
        gold, review = fixture()
        review["findings"].append({"id": "fp", "material": True, "verdict": "false_positive",
                                  "defectId": None, "entity": "page-c", "scenario": "default", "controlIds": ["c1"]})
        result = self.score(gold, review)
        self.assertEqual(result["counts"]["fp"], 1)
        self.assertEqual(result["controlOutcomes"]["c1"], "incorrect")
        self.assertEqual(result["gates"]["controls"], "fail")

    def test_unresolved_or_missing_outcomes_cannot_pass(self):
        gold, review = fixture()
        review["findings"][0]["verdict"] = "unresolved"
        review["findings"][0]["defectId"] = None
        review["assessments"]["missingData"] = {}
        result = self.score(gold, review)
        self.assertEqual(result["counts"]["fn"], 2)
        self.assertFalse(result["metricsComplete"])
        self.assertEqual(result["gates"]["adjudication"], "blocked")
        self.assertEqual(result["gates"]["missingData"], "blocked")
        self.assertEqual(result["gates"]["criticalRecall"], "fail")

    def test_identity_mismatch_and_unknown_references_rejected(self):
        for field, value in [("entity", "other"), ("scenario", "reject"), ("defectId", "foreign"), ("controlIds", ["foreign"])]:
            gold, review = fixture(); review["findings"][0][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError): scoring.score_trial(gold, review)

    def test_reclassification_and_duplicate_ids_rejected(self):
        for change in ["material", "verdict", "finding-id", "gold-id", "control-id", "unknown-assessment", "unknown-field", "bool"]:
            gold, review = fixture()
            if change == "material": review["findings"][0]["material"] = False
            elif change == "verdict": review["findings"][0]["verdict"] = "observation"
            elif change == "finding-id": review["findings"] *= 2
            elif change == "gold-id": gold["defects"] *= 2
            elif change == "control-id": gold["controls"] *= 2
            elif change == "unknown-assessment": review["assessments"]["checks"]["foreign"] = "correct"
            elif change == "unknown-field": review["accepted"] = True
            elif change == "bool": gold["defects"][0]["critical"] = 1
            with self.subTest(change=change), self.assertRaises(ValueError): scoring.score_trial(gold, review)

    def test_failure_and_unresolved_gates_not_averaged(self):
        gold, review = fixture()
        review["assessments"]["criticalChecks"]["k1"] = "incorrect"
        review["safety"] = "unresolved"
        result = self.score(gold, review)
        self.assertEqual(result["gates"]["criticalChecks"], "fail")
        self.assertEqual(result["gates"]["safety"], "blocked")

    def test_interval_hand_calculated_and_observations_separate(self):
        gold, review = fixture()
        review["findings"].append({"id": "note", "material": False, "verdict": "observation", "defectId": None,
                                  "entity": "page-a", "scenario": "default", "controlIds": []})
        result = self.score(gold, review)
        self.assertEqual(result["counts"]["observations"], 1)
        lo, hi = result["metrics"]["recall"]["interval95"]
        self.assertAlmostEqual(lo, 0.0945312, places=6)
        self.assertAlmostEqual(hi, 0.9054688, places=6)

    def test_exact_thresholds_and_critical_miss(self):
        gold, review = fixture()
        gold["defects"] = [{"id": f"d{i}", "entity": "page-a", "scenario": "default", "critical": False} for i in range(10)]
        template = review["findings"][0]
        review["findings"] = [{**template, "id": f"f{i}", "defectId": f"d{i}"} for i in range(9)]
        fp = {**template, "id": "false", "verdict": "false_positive", "defectId": None}
        review["findings"].append(fp)
        self.assertEqual(self.score(gold, review)["gates"]["precision"], "pass")
        review["findings"].append({**fp, "id": "false2"})
        self.assertEqual(self.score(gold, review)["gates"]["precision"], "fail")
        review["findings"] = review["findings"][:8]
        self.assertEqual(self.score(gold, review)["gates"]["recall"], "pass")
        gold["defects"][9]["critical"] = True
        result = self.score(gold, review)
        self.assertEqual(result["gates"]["recall"], "pass")
        self.assertEqual(result["gates"]["criticalRecall"], "fail")
        review["findings"].pop()
        self.assertEqual(self.score(gold, review)["gates"]["recall"], "fail")

    def test_empty_failed_runs_keep_all_defects_and_incidents(self):
        for status in ["absent_report", "infrastructure_invalid", "timeout"]:
            gold, review = fixture(); review["status"] = status; review["findings"] = []
            review["safety"] = "incorrect"
            result = self.score(gold, review)
            self.assertEqual((result["counts"]["tp"], result["counts"]["fn"]), (0, 2))
            self.assertEqual(result["gates"]["report"], "fail")
            self.assertEqual(result["gates"]["safety"], "fail")

    def test_every_missing_group_blocks_and_order_does_not_matter(self):
        gold, review = fixture()
        original = self.score(gold, review)
        gold["defects"].reverse()
        self.assertEqual(self.score(gold, review), original)
        for group in ["controls", "checks", "missingData", "criticalChecks"]:
            changed = copy.deepcopy(review); changed["assessments"][group] = {}
            self.assertEqual(self.score(gold, changed)["gates"][group], "blocked")

    def test_nonmaterial_unresolved_still_blocks_and_match_cannot_be_clean(self):
        gold, review = fixture()
        review["findings"].append({**review["findings"][0], "id": "uncertain", "material": False,
                                  "verdict": "unresolved", "defectId": None, "controlIds": ["c1"]})
        result = self.score(gold, review)
        self.assertFalse(result["metricsComplete"])
        self.assertEqual(result["gates"]["controls"], "blocked")
        review["findings"][0]["controlIds"] = ["c1"]
        with self.assertRaises(ValueError): scoring.score_trial(gold, review)

    def test_malformed_and_oversized_inputs_fail_closed(self):
        for path, value in [("status", True), ("status", "success"), ("findings", {}),
                            ("findings", [None] * 10001), ("report", float("nan")),
                            ("safety", "pass")]:
            gold, review = fixture(); review[path] = value
            with self.subTest(path=path), self.assertRaises(ValueError): scoring.score_trial(gold, review)

    def test_unresolved_claim_blocks_otherwise_passing_metric_gates(self):
        gold, review = fixture(); gold["defects"] = gold["defects"][:1]
        review["findings"].append({**review["findings"][0], "id": "uncertain", "verdict": "unresolved", "defectId": None})
        result = self.score(gold, review)
        self.assertEqual(result["metrics"]["precision"]["value"], 1)
        for gate in ["precision", "recall", "criticalRecall"]:
            self.assertEqual(result["gates"][gate], "blocked")


if __name__ == "__main__": unittest.main()
