"""Bounded matrix accounting over trusted manifests and attributed records.

No matrix output establishes registry authenticity, isolation, independent clusters,
matched runtime conditions, pilot coverage or commercial admission.
"""
import copy
import json

from records import (ARTIFACT_LIMIT, DOCUMENT_LIMIT, _bytes, _digest,
                     _hash, _identifier, _object, _strict_json, score_bound_trial)
from scoring import score_trial

MAX_EXPECTED = 2000
MAX_BUNDLES = 3000
MAX_TOTAL_BYTES = 64 * 1024 * 1024
PROFILES = ("commerce", "booking", "lead-generation", "subscription", "publishing")
COUNT_KEYS = ("tp", "fp", "fn", "duplicates", "observations", "unresolvedMaterial", "criticalFn")


def _gate(values):
    if "fail" in values:
        return "fail"
    if "blocked" in values:
        return "blocked"
    return "pass" if values else "blocked"


def _list(value, maximum):
    if type(value) is not list or not 1 <= len(value) <= maximum:
        raise ValueError("invalid bounded inventory list")


def _trial_key(trial):
    return (trial["cellId"], trial["caseId"], trial["repetition"], trial["arm"])


def _cluster_map(value, identifiers):
    if type(value) is not dict or set(value) != set(identifiers):
        raise ValueError("cluster map must cover exact gold IDs")
    for key, cluster in value.items():
        _identifier(key)
        _identifier(cluster)


def _cohort(arm, repetition, expected, results):
    counts = {key: sum(r["score"]["counts"][key] for r in results) for key in COUNT_KEYS} if results else None
    submitted = len(results)
    return {"arm": arm, "repetition": repetition, "expected": expected, "submitted": submitted,
            "missing": None if expected is None else expected-submitted,
            "coverage": "not-preregistered" if expected is None else "complete" if submitted == expected else "partial",
            "unresolvedTrials": sum(any(v == "blocked" for v in r["score"]["gates"].values()) for r in results),
            "failedExecutions": sum(r["score"]["status"] != "completed" for r in results), "counts": counts}


def aggregate_matrix(manifest_bytes, gold_artifacts, bundles):
    """Recompute each score from raw bound records; never accept supplied scores.

    Case-local IDs are scoped by (caseId, ID). Cluster IDs have cell-wide scope;
    callers register shared roots under the same cluster. These labels remain
    trusted assertions of independence, not facts this function can establish.
    """
    manifest = _strict_json(manifest_bytes, DOCUMENT_LIMIT)
    _object(manifest, ("schemaVersion", "evaluationRevision", "cells"))
    if manifest["schemaVersion"] != "enterprise-matrix-v1":
        raise ValueError("unsupported matrix schema")
    _identifier(manifest["evaluationRevision"])
    _list(manifest["cells"], 100)
    if type(gold_artifacts) is not dict or len(gold_artifacts) > MAX_EXPECTED:
        raise ValueError("invalid gold artifact store")
    if type(bundles) is not list or len(bundles) > MAX_BUNDLES:
        raise ValueError("too many trial bundles")
    total_bytes = len(manifest_bytes)
    gold, gold_identities = {}, {}
    for digest, raw in gold_artifacts.items():
        _hash(digest)
        _bytes(raw, ARTIFACT_LIMIT)
        total_bytes += len(raw)
        if total_bytes > MAX_TOTAL_BYTES:
            raise ValueError("matrix byte budget exceeded")
        if _digest(raw) != digest:
            raise ValueError("gold digest mismatch")
        parsed = _strict_json(raw, ARTIFACT_LIMIT)
        # Validate the gold schema without inventing any observed successes.
        score_trial(parsed, {"status": "absent_report", "findings": [],
                    "assessments": {k: {} for k in ("controls", "checks", "missingData", "criticalChecks")},
                    "report": "unresolved", "safety": "unresolved"})
        gold[digest] = parsed
        normalized = {k: sorted(v, key=lambda item: item["id"]) if k == "defects" else sorted(v)
                      for k, v in parsed.items()}
        gold_identities[digest] = _digest(json.dumps(normalized, sort_keys=True, separators=(",", ":")).encode())
    cells, cases, used_gold, expected = {}, {}, set(), {}
    inventories = {}
    coordinates = set()
    for cell in manifest["cells"]:
        _object(cell, ("id", "module", "profile", "acquisitionMode", "host", "repetitions", "cases"))
        for key in ("id", "module", "acquisitionMode"):
            _identifier(cell[key])
        if cell["id"] in cells or cell["host"] not in ("codex", "claude-code") or cell["profile"] not in PROFILES:
            raise ValueError("duplicate cell or unsupported host/profile")
        coordinate = (cell["module"], cell["profile"], cell["acquisitionMode"], cell["host"])
        if coordinate in coordinates:
            raise ValueError("duplicate claim coordinate")
        coordinates.add(coordinate)
        repetitions = cell["repetitions"]
        if type(repetitions) is not int or not 3 <= repetitions <= 100:
            raise ValueError("matrix requires three to 100 repetitions")
        _list(cell["cases"], 100)
        if len(expected) + len(cell["cases"])*repetitions*2 > MAX_EXPECTED:
            raise ValueError("expected trial expansion exceeds limit")
        cells[cell["id"]] = cell
        defects, controls = set(), set()
        # Formatting/order changes cannot create new independent gold populations.
        repeated_gold_clusters = {}
        for case in cell["cases"]:
            _object(case, ("id", "inputSha256", "goldSha256", "defectClusters", "controlClusters"))
            _identifier(case["id"])
            _hash(case["inputSha256"])
            _hash(case["goldSha256"])
            key = (cell["id"], case["id"])
            if key in cases or case["goldSha256"] not in gold:
                raise ValueError("duplicate case or absent gold")
            cases[key] = case
            expected_gold = gold[case["goldSha256"]]
            _cluster_map(case["defectClusters"], [d["id"] for d in expected_gold["defects"]])
            _cluster_map(case["controlClusters"], expected_gold["controls"])
            maps = (case["defectClusters"], case["controlClusters"])
            previous = repeated_gold_clusters.setdefault(gold_identities[case["goldSha256"]], maps)
            if previous != maps:
                raise ValueError("equivalent gold cannot use conflicting cluster identities")
            used_gold.add(case["goldSha256"])
            defects.update(case["defectClusters"].values())
            controls.update(case["controlClusters"].values())
            for arm in ("native", "baseline"):
                for repetition in range(1, repetitions+1):
                    trial = {"evaluationRevision": manifest["evaluationRevision"], "cellId": cell["id"],
                             "caseId": case["id"], "host": cell["host"], "arm": arm, "repetition": repetition}
                    expected[_trial_key(trial)] = trial
        inventories[cell["id"]] = {"distinctDefectClusters": len(defects), "distinctControlClusters": len(controls)}
    if used_gold != set(gold):
        raise ValueError("unregistered gold artifact")
    observed = {}
    for bundle in bundles:
        _object(bundle, ("registrationBytes", "reviewBytes", "artifacts"))
        _bytes(bundle["registrationBytes"], DOCUMENT_LIMIT)
        _bytes(bundle["reviewBytes"], DOCUMENT_LIMIT)
        _object(bundle["artifacts"], ("input", "gold", "output"))
        for raw in bundle["artifacts"].values():
            _bytes(raw, ARTIFACT_LIMIT)
        total_bytes += len(bundle["registrationBytes"]) + len(bundle["reviewBytes"]) + sum(map(len, bundle["artifacts"].values()))
        if total_bytes > MAX_TOTAL_BYTES:
            raise ValueError("matrix byte budget exceeded")
        result = score_bound_trial(bundle["registrationBytes"], bundle["reviewBytes"], bundle["artifacts"])
        trial = result["trial"]
        cell = cells.get(trial["cellId"])
        case = cases.get((trial["cellId"], trial["caseId"]))
        if cell is None or case is None or trial["host"] != cell["host"] or trial["evaluationRevision"] != manifest["evaluationRevision"]:
            raise ValueError("unregistered trial identity")
        if trial["repetition"] > cell["repetitions"]:
            raise ValueError("unregistered repetition")
        if any(result["artifactDigests"][name] != case[name+"Sha256"] for name in ("input", "gold")):
            raise ValueError("trial input/gold differs from manifest")
        key = _trial_key(trial)
        if key in observed:
            raise ValueError("duplicate trial key; revisions must retain history separately")
        observed[key] = result
    for result in observed.values():
        trial = result["trial"]
        if trial["arm"] == "assisted" and _trial_key(trial["originalTrialKey"]) not in observed:
            raise ValueError("assisted parent not present")
    output = []
    for cell_id in sorted(cells):
        cell = cells[cell_id]
        missing = [trial for key, trial in expected.items() if key[0] == cell_id and key not in observed]
        results = [result for key, result in sorted(observed.items()) if key[0] == cell_id]
        native = [r for r in results if r["trial"]["arm"] == "native"]
        inventory = inventories[cell_id]
        gates = ["pass" if all(n >= 10 for n in inventory.values()) else "fail"]
        gates += [v for r in native for v in r["score"]["gates"].values()]
        if any(t["arm"] == "native" for t in missing):
            gates.append("blocked")
        safety = [r["score"]["gates"]["safety"] for r in results]
        if missing:
            safety.append("blocked")
        cohorts = []
        for arm in ("native", "baseline", "assisted"):
            for repetition in range(1, cell["repetitions"]+1):
                cohort = [r for r in results if r["trial"]["arm"] == arm and r["trial"]["repetition"] == repetition]
                if arm != "assisted" or cohort:
                    cohorts.append(_cohort(arm, repetition, None if arm == "assisted" else len(cell["cases"]), cohort))
        output.append({"cell": copy.deepcopy(cell), "inventory": inventory,
                       "nativeArithmeticGate": _gate(gates), "safetyGate": _gate(safety),
                       "comparisonCompleteness": "incomplete" if missing else "complete",
                       "missingTrialKeys": copy.deepcopy(missing), "trials": results, "cohorts": cohorts,
                       "clusterIndependenceVerified": False, "baselineComparabilityVerified": False,
                       "cellAdmissionAllowed": False})
    return {"schemaVersion": "enterprise-matrix-accounting-v1", "manifestSha256": _digest(manifest_bytes),
            "evaluationRevision": manifest["evaluationRevision"], "cells": output,
            "registrationAuthenticityVerified": False, "isolationVerified": False,
            "cellAdmissionAllowed": False, "releaseEligible": False}
