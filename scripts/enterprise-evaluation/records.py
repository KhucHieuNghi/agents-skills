"""Bind trusted frozen records to bytes; no authentication or release approval.

The caller obtains registration from its trusted preregistration store, not from
model output. Hash equality does not establish when or by whom it was registered.
"""
import copy
from datetime import datetime
import hashlib
import json
import math
import re

from scoring import score_trial

DOCUMENT_LIMIT = 1024 * 1024
ARTIFACT_LIMIT = 8 * 1024 * 1024
TOTAL_LIMIT = 16 * 1024 * 1024
NAMES = ("input", "gold", "output")
KEY_FIELDS = ("evaluationRevision", "caseId", "cellId", "repetition", "arm", "host")


def _object(value, fields):
    if type(value) is not dict or set(value) != set(fields):
        raise ValueError("unexpected record fields")


def _text(value, limit=1024):
    if type(value) is not str or not value.strip() or len(value) > limit:
        raise ValueError("missing or oversized text")


def _identifier(value):
    if type(value) is not str or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:/@+-]{0,255}", value):
        raise ValueError("invalid canonical identifier")


def _hash(value):
    if type(value) is not str or not re.fullmatch(r"[0-9a-f]{64}", value):
        raise ValueError("invalid SHA-256")


def _digest(value):
    return hashlib.sha256(value).hexdigest()


def _bytes(value, limit):
    if type(value) is not bytes or len(value) > limit:
        raise ValueError("expected bounded bytes")


def _strict_json(raw, limit):
    _bytes(raw, limit)
    def pairs(items):
        result = {}
        for key, value in items:
            if key in result:
                raise ValueError("duplicate JSON key")
            result[key] = value
        return result
    def reject_constant(value):
        raise ValueError("non-finite JSON number")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=pairs, parse_constant=reject_constant)
        stack = [(value, 0)]
        count = 0
        while stack:
            item, depth = stack.pop()
            count += 1
            if depth > 64 or count > 100000:
                raise ValueError("JSON structure limit exceeded")
            if type(item) is dict:
                if len(item) > 10000:
                    raise ValueError("JSON object too large")
                for key, child in item.items():
                    key.encode("utf-8", errors="strict")
                    stack.append((child, depth+1))
            elif type(item) is list:
                if len(item) > 10000:
                    raise ValueError("JSON array too large")
                stack.extend((child, depth+1) for child in item)
            elif type(item) is str:
                item.encode("utf-8", errors="strict")
            elif type(item) is float and not math.isfinite(item):
                raise ValueError("non-finite JSON number")
        return value
    except (UnicodeError, RecursionError, ValueError) as exc:
        raise ValueError("invalid bounded UTF-8 JSON") from exc


def _timestamp(value):
    if type(value) is not str or not re.fullmatch(
        r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?(?:Z|[+-][0-9]{2}:[0-9]{2})", value
    ):
        raise ValueError("expected timezone-aware RFC3339 timestamp")
    if value.endswith("-00:00"):
        raise ValueError("unknown local offset")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _key(value):
    _object(value, KEY_FIELDS)
    for key in ("evaluationRevision", "caseId", "cellId"):
        _identifier(value[key])
    if type(value["repetition"]) is not int or not 1 <= value["repetition"] <= 10000:
        raise ValueError("invalid repetition")
    if value["arm"] not in ("native", "baseline", "assisted") or value["host"] not in ("codex", "claude-code"):
        raise ValueError("unsupported host or arm")


def score_bound_trial(registration_bytes, review_bytes, artifacts):
    """Validate supplied identity attribution and exact byte bindings, then score.

    Artifact locators and rationale are retained, not semantically verified. A
    trusted runner/registry must verify preregistration, reviewer independence,
    findings completeness, adjudication sources and assisted-parent existence.
    """
    _bytes(registration_bytes, DOCUMENT_LIMIT)
    _bytes(review_bytes, DOCUMENT_LIMIT)
    _object(artifacts, NAMES)
    for raw in artifacts.values():
        _bytes(raw, ARTIFACT_LIMIT)
    if len(registration_bytes) + len(review_bytes) + sum(map(len, artifacts.values())) > TOTAL_LIMIT:
        raise ValueError("aggregate input byte limit exceeded")
    registration = _strict_json(registration_bytes, DOCUMENT_LIMIT)
    review = _strict_json(review_bytes, DOCUMENT_LIMIT)
    _object(registration, ("schemaVersion", "trial", "authorId", "frozenAt", "artifacts"))
    _object(review, ("schemaVersion", "registrationSha256", "reviewer", "reviewedAt", "rationale", "evidenceRefs", "adjudication"))
    if registration["schemaVersion"] != "enterprise-registration-v1" or review["schemaVersion"] != "enterprise-review-v1":
        raise ValueError("unsupported record schema")
    _hash(review["registrationSha256"])
    if _digest(registration_bytes) != review["registrationSha256"]:
        raise ValueError("review binds different registration bytes")
    _object(registration["artifacts"], NAMES)
    for name in NAMES:
        expected = registration["artifacts"][name]
        _hash(expected)
        if _digest(artifacts[name]) != expected:
            raise ValueError("artifact digest mismatch")
    trial = registration["trial"]
    _object(trial, (*KEY_FIELDS, "originalTrialKey"))
    _key({k: trial[k] for k in KEY_FIELDS})
    original = trial["originalTrialKey"]
    if trial["arm"] == "assisted":
        _key(original)
        if original["arm"] != "native" or any(original[k] != trial[k] for k in KEY_FIELDS if k != "arm"):
            raise ValueError("assisted parent must be matching native trial")
    elif original is not None:
        raise ValueError("only assisted trials carry original trial key")
    _identifier(registration["authorId"])
    reviewer = review["reviewer"]
    _object(reviewer, ("id", "type", "modelOrRole"))
    _identifier(reviewer["id"])
    _text(reviewer["modelOrRole"])
    if reviewer["type"] not in ("ai", "human") or reviewer["id"] == registration["authorId"]:
        raise ValueError("invalid reviewer attribution or self-review")
    if _timestamp(review["reviewedAt"]) < _timestamp(registration["frozenAt"]):
        raise ValueError("review predates freeze")
    _text(review["rationale"], 16384)
    references = review["evidenceRefs"]
    if type(references) is not list or not 2 <= len(references) <= 1000:
        raise ValueError("missing or oversized evidence references")
    seen, names = set(), set()
    for reference in references:
        _object(reference, ("artifact", "sha256", "locator"))
        name = reference["artifact"]
        if type(name) is not str or name not in NAMES:
            raise ValueError("unknown evidence artifact")
        _hash(reference["sha256"])
        _text(reference["locator"])
        if reference["sha256"] != registration["artifacts"][name]:
            raise ValueError("evidence reference digest mismatch")
        key = (name, reference["locator"])
        if key in seen:
            raise ValueError("duplicate evidence reference")
        seen.add(key)
        names.add(name)
    if not {"gold", "output"}.issubset(names):
        raise ValueError("gold and output references required")
    score = score_trial(_strict_json(artifacts["gold"], ARTIFACT_LIMIT), review["adjudication"])
    return {"schemaVersion": "enterprise-bound-score-v1", "trial": copy.deepcopy(trial),
            "registrationSha256": _digest(registration_bytes), "reviewSha256": _digest(review_bytes),
            "artifactDigests": registration["artifacts"].copy(), "reviewer": reviewer.copy(),
            "reviewedAt": review["reviewedAt"], "rationale": review["rationale"],
            "evidenceRefs": copy.deepcopy(references), "score": score,
            "identityAttributionChecked": True, "reviewerIndependenceVerified": False,
            "registrationAuthenticityVerified": False, "evidenceSemanticsVerified": False,
            "assistedParentExistenceVerified": False, "cellAdmissionAllowed": False, "releaseEligible": False}
