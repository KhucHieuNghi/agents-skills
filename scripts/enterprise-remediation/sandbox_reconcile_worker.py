"""Private bounded reconciliation observation protocol; never clears quarantine."""
import importlib.util
import json
import math
from pathlib import Path
import sys
import time

spec = importlib.util.spec_from_file_location("sandbox_file", Path(__file__).with_name("sandbox_file.py"))
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate protocol member")
        result[key] = value
    return result


def read(limit):
    line = sys.stdin.buffer.readline(limit + 1)
    if not line.endswith(b"\n") or len(line) > limit:
        raise ValueError("Protocol budget")
    return json.loads(line, object_pairs_hook=unique,
                      parse_constant=lambda _value: (_ for _ in ()).throw(ValueError("Invalid number")))


def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)


publication_possible = False

def authorize(request):
    global publication_possible
    emit({"type": "ready", "request": request})
    reply = read(4096)
    if (isinstance(reply, dict) and set(reply) == {"allowed", "validUntil"} and
            reply["allowed"] is True and type(reply["validUntil"]) in (int, float) and
            math.isfinite(reply["validUntil"]) and time.time() < reply["validUntil"]):
        publication_possible = True
        return reply
    return False


observed = False
try:
    value = read(65536)
    if not isinstance(value, dict) or set(value) != {"root", "rootIdentity", "attemptId", "intentDigest", "currentDigest"}:
        raise ValueError("Invalid reconciliation protocol")
    identity = value["rootIdentity"]
    if not isinstance(identity, list) or len(identity) != 2 or any(type(v) is not int or v < 0 for v in identity):
        raise ValueError("Invalid root identity")
    with backend.SandboxWriter(value["root"], tuple(identity)) as writer:
        result = writer.record_reconciliation(value["attemptId"], value["intentDigest"], value["currentDigest"], authorize)
        observed = True
    emit({"type": "result", "result": {"status": "observed", "observation": result,
                                      "executionAllowed": False, "outcomeResolved": False}})
except backend.OutcomeUnknown:
    emit({"type": "result", "result": {"status": "unknown", "reason": "reconciliation-publication-unknown"}})
except BaseException:
    emit({"type": "result", "result": {"status": "unknown" if observed or publication_possible else "denied", "reason": "reconciliation-publication-unknown" if observed or publication_possible else "reconciliation-rejected"}})
