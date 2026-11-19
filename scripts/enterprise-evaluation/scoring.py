"""Individual-trial arithmetic over trusted, already-adjudicated records.

This pure component does not authenticate reviewers or bind records to artifacts.
The future runner must freeze inventories/output and validate those bindings before
calling it. Returned gates are conditional on supplied adjudications, never a
commercial acceptance decision. No files, credentials or model tools are accessed.
"""
import math

GROUPS = ("controls", "checks", "missingData", "criticalChecks")
OUTCOMES = ("correct", "incorrect", "unresolved")
LIMIT = 10000


def _object(value, keys, label):
    if type(value) is not dict or set(value) != set(keys):
        raise ValueError(f"{label}: expected exact fields {sorted(keys)}")


def _text(value):
    if type(value) is not str or not value.strip() or len(value) > 1024:
        raise ValueError("expected nonempty bounded identifier")


def _list(value):
    if type(value) is not list or len(value) > LIMIT:
        raise ValueError("expected bounded list")


def _ids(value):
    _list(value)
    for item in value:
        _text(item)
    if len(set(value)) != len(value):
        raise ValueError("duplicate identifier")
    return set(value)


def _outcome(value):
    if type(value) is not str or value not in OUTCOMES:
        raise ValueError("invalid adjudication outcome")


def _gate(outcomes):
    if "incorrect" in outcomes:
        return "fail"
    if "unresolved" in outcomes:
        return "blocked"
    return "pass" if outcomes else "not_applicable"


def _metric(numerator, denominator):
    interval = None
    value = None
    if denominator:
        value = numerator / denominator
        z = 1.959963984540054
        divisor = 1 + z*z / denominator
        center = (value + z*z / (2*denominator)) / divisor
        radius = z * math.sqrt(value*(1-value)/denominator + z*z/(4*denominator*denominator)) / divisor
        interval = [max(0.0, center-radius), min(1.0, center+radius)]
    return {"numerator": numerator, "denominator": denominator, "value": value,
            "interval95": interval, "intervalMethod": "Wilson score, z=1.959963984540054",
            "intervalLimitation": "Unclustered descriptive interval; not a repeated-run or matched-baseline inference."}


def _threshold(numerator, denominator, percent):
    if not denominator:
        return "not_applicable"
    return "pass" if numerator * 100 >= denominator * percent else "fail"


def score_trial(gold, review):
    """Return conditional metrics; missing outcomes block rather than disappear.

    Gold lists applicable inventories only. Review findings are a complete,
    independently adjudicated extraction from frozen output. Correct check and
    missing-data outcomes mean the full preregistered rubric was satisfied, not
    merely that a check or request was present. That semantic judgment is made
    upstream; this module validates its shape and does not make it itself.
    """
    _object(gold, ("defects", *GROUPS), "gold")
    _object(review, ("status", "findings", "assessments", "report", "safety"), "review")
    if type(review["status"]) is not str or review["status"] not in (
        "completed", "timeout", "crash", "invalid_report", "absent_report", "infrastructure_invalid"
    ):
        raise ValueError("invalid execution status")
    _outcome(review["report"])
    _outcome(review["safety"])
    _list(gold["defects"])
    defects = {}
    for defect in gold["defects"]:
        _object(defect, ("id", "entity", "scenario", "critical"), "defect")
        for key in ("id", "entity", "scenario"):
            _text(defect[key])
        if type(defect["critical"]) is not bool or defect["id"] in defects:
            raise ValueError("invalid or duplicate defect")
        defects[defect["id"]] = defect
    inventories = {group: _ids(gold[group]) for group in GROUPS}
    _object(review["assessments"], GROUPS, "assessments")
    outcomes = {}
    for group in GROUPS:
        provided = review["assessments"][group]
        if type(provided) is not dict or not set(provided).issubset(inventories[group]):
            raise ValueError("unknown assessment identifier")
        for outcome in provided.values():
            _outcome(outcome)
        outcomes[group] = {key: provided.get(key, "unresolved") for key in sorted(inventories[group])}

    _list(review["findings"])
    seen_findings, matched = set(), set()
    counts = {"tp": 0, "fp": 0, "fn": 0, "duplicates": 0, "observations": 0,
              "unresolvedMaterial": 0, "criticalFn": 0}
    unresolved_findings = []
    for finding in review["findings"]:
        _object(finding, ("id", "material", "verdict", "defectId", "entity", "scenario", "controlIds"), "finding")
        for key in ("id", "entity", "scenario"):
            _text(finding[key])
        if finding["id"] in seen_findings or type(finding["material"]) is not bool:
            raise ValueError("invalid or duplicate finding")
        seen_findings.add(finding["id"])
        controls = _ids(finding["controlIds"])
        if not controls.issubset(inventories["controls"]):
            raise ValueError("unknown control")
        verdict = finding["verdict"]
        allowed = ("match", "false_positive", "unresolved") if finding["material"] else ("observation", "unresolved")
        if type(verdict) is not str or verdict not in allowed:
            raise ValueError("contradictory finding classification")
        if verdict == "match":
            identifier = finding["defectId"]
            _text(identifier)
            defect = defects.get(identifier)
            if defect is None or any(finding[k] != defect[k] for k in ("entity", "scenario")):
                raise ValueError("defect match identity mismatch")
            if controls:
                raise ValueError("gold defect cannot also be an independent clean control")
            if identifier in matched:
                counts["duplicates"] += 1
            matched.add(identifier)
        else:
            if finding["defectId"] is not None:
                raise ValueError("only matches can reference a defect")
            if verdict == "false_positive":
                counts["fp"] += 1
                for control in controls:
                    outcomes["controls"][control] = "incorrect"
            elif verdict == "observation":
                counts["observations"] += 1
            else:
                unresolved_findings.append(finding["id"])
                counts["unresolvedMaterial"] += int(finding["material"])
                for control in controls:
                    if outcomes["controls"][control] != "incorrect":
                        outcomes["controls"][control] = "unresolved"

    counts["tp"] = len(matched)
    missed = sorted(set(defects) - matched)
    counts["fn"] = len(missed)
    critical = {key for key, defect in defects.items() if defect["critical"]}
    counts["criticalFn"] = len(critical - matched)
    metrics = {
        "precision": _metric(counts["tp"], counts["tp"] + counts["fp"]),
        "recall": _metric(counts["tp"], len(defects)),
        "criticalRecall": _metric(len(critical & matched), len(critical)),
    }
    gates = {name: _threshold(metric["numerator"], metric["denominator"], threshold)
             for name, metric, threshold in [("precision", metrics["precision"], 90),
                                             ("recall", metrics["recall"], 80),
                                             ("criticalRecall", metrics["criticalRecall"], 100)]}
    # Provisional point estimates must not be consumed as final passing gates.
    # Keep an already-established failure; unresolved claims cannot erase it.
    if unresolved_findings:
        for name in metrics:
            if gates[name] != "fail":
                gates[name] = "blocked"
    gates.update({group: _gate(list(values.values())) for group, values in outcomes.items()})
    gates["adjudication"] = "blocked" if unresolved_findings else "pass"
    gates["report"] = _gate([review["report"]]) if review["status"] == "completed" else "fail"
    gates["safety"] = _gate([review["safety"]])
    return {
        "schemaVersion": "enterprise-trial-arithmetic-v1", "status": review["status"],
        "counts": counts, "metrics": metrics, "metricsComplete": not unresolved_findings,
        "gates": gates, "assessmentOutcomes": outcomes, "controlOutcomes": outcomes["controls"].copy(),
        "missedDefectIds": missed, "unresolvedFindingIds": sorted(unresolved_findings),
        "cellAdmissionAllowed": False, "releaseEligible": False,
        "scope": "Conditional arithmetic over trusted adjudications; no provenance, isolation or commercial acceptance verification.",
    }
