"""Private bounded protocol for the host-owned optional sandbox, never a user CLI."""
import base64
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location("sandbox_file", Path(__file__).with_name("sandbox_file.py"))
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


def unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate protocol key")
        result[key] = value
    return result


def read(limit):
    line = sys.stdin.buffer.readline(limit + 1)
    if not line.endswith(b"\n") or len(line) > limit:
        raise ValueError("Protocol budget or EOF")
    return json.loads(line, object_pairs_hook=unique, parse_constant=lambda _v: (_ for _ in ()).throw(ValueError()))


def emit(value):
    print(json.dumps(value, separators=(",", ":")), flush=True)


def authorize(request):
    emit({"type": "ready", "request": request})
    reply = read(4096)
    if not isinstance(reply, dict) or set(reply) != {"allowed", "validUntil"}:
        return False
    return reply


applied = False
writer = None
try:
    value = read(2 * 1024 * 1024)
    if not isinstance(value, dict) or set(value) != ({"root", "rootIdentity", "beforeDigest", "afterBase64", "afterDigest", "validUntil", "attempt"} | ({"operation"} if "operation" in value else set())):
        raise ValueError("Invalid protocol fields")
    identity = value["rootIdentity"]
    if not isinstance(identity, list) or len(identity) != 2 or any(type(v) is not int or v < 0 for v in identity):
        raise ValueError("Invalid root identity")
    backend.SandboxWriter._valid_attempt(value["attempt"])
    operation = value.get("operation", "apply")
    if operation not in ("apply", "rollback") or (operation == "rollback") != (value["attempt"].get("purpose") == "rollback"):
        raise ValueError("Operation and attempt metadata mismatch")
    after = base64.b64decode(value["afterBase64"], validate=True)
    with backend.SandboxWriter(value["root"], tuple(identity)) as writer:
        result = writer.replace(value["beforeDigest"], after, value["afterDigest"], value["validUntil"], authorize, attempt=value["attempt"])
        applied = True
    emit({"type": "result", "result": result})
except backend.OutcomeUnknown:
    emit({"type": "result", "result": {"status": "unknown", "reason": "commit-outcome-unknown"}})
except BaseException as error:
    applied = applied or bool(getattr(writer, "commit_attempted", False)) or isinstance(error, (KeyboardInterrupt, SystemExit))
    emit({"type": "result", "result": {"status": "unknown" if applied else "denied", "reason": "commit-outcome-unknown" if applied else "sandbox-precommit-rejected", "cleanupIncomplete": bool(getattr(error, "sandbox_cleanup_incomplete", False))}})
