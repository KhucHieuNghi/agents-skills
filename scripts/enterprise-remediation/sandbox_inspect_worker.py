"""Private read-only sandbox inspection protocol. No admission, repair or grant."""
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location("sandbox_file", Path(__file__).with_name("sandbox_file.py"))
backend = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backend)


def unique(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("Duplicate input field")
        value[key] = item
    return value


try:
    line = sys.stdin.buffer.readline(65537)
    if len(line) > 65536 or not line.endswith(b"\n"):
        raise ValueError("Inspection input budget")
    value = json.loads(line, object_pairs_hook=unique)
    if not isinstance(value, dict) or set(value) != {"root", "rootIdentity"}:
        raise ValueError("Invalid inspection request")
    identity = value["rootIdentity"]
    if not isinstance(identity, list) or len(identity) != 2 or any(type(v) is not int or v < 0 for v in identity):
        raise ValueError("Invalid root identity")
    with backend.SandboxWriter(value["root"], tuple(identity)) as writer:
        result = writer.inspect()
    print(json.dumps(result, separators=(",", ":")), flush=True)
except BaseException:
    print(json.dumps({"status": "unknown", "reason": "sandbox-inspection-unavailable"}), flush=True)
