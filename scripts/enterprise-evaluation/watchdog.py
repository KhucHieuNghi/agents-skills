"""Independent, finite-lifetime cleanup guard for one trusted broker identity.

stdin is a non-inherited parent lease pipe. EOF or deadline triggers cleanup;
the trusted parent may send D only after its Docker operations have quiesced.
The guard never executes model command text or removes arbitrary names.
"""
import argparse
import json
import math
import os
from pathlib import Path
import re
import selectors
import sys
import time

from broker import bounded_process


def cleanup(docker, endpoint, name, grace):
    until = time.monotonic() + grace
    started = time.monotonic()
    attempts = 0
    errors = []
    verified = False
    def call(args):
        code, out, err = bounded_process([docker, "--host", endpoint, *args],
            seconds=2, max_bytes=65536, env={"PATH": os.defpath, "HOME": "/nonexistent"})
        if code:
            raise RuntimeError("Docker cleanup command failed")
        return out.decode("ascii").strip().splitlines()
    def inventory():
        ids = call(["ps", "-aq", "--no-trunc", "--filter", "name=^/" + name + "$",
                    "--filter", "label=nkskills.evaluation=" + name])
        if len(ids) > 1 or any(not re.fullmatch("[0-9a-f]{64}", value) for value in ids):
            raise RuntimeError("Unexpected cleanup inventory")
        return ids
    while True:
        attempts += 1
        verified = False
        try:
            for identifier in inventory():
                call(["rm", "-f", identifier])
            verified = not inventory()
        except Exception as error:
            errors.append(type(error).__name__ + ": " + str(error)[:200])
        if time.monotonic() >= until:
            break
        time.sleep(min(.1, max(0, until - time.monotonic())))
    return {"absenceObserved": verified, "observationSeconds": time.monotonic() - started,
            "attempts": attempts, "errors": errors}


def main():
    parser = argparse.ArgumentParser()
    for key in ("docker", "endpoint", "name", "receipt"):
        parser.add_argument("--" + key, required=True)
    parser.add_argument("--deadline", type=float, required=True)
    parser.add_argument("--grace", type=float, default=30)
    args = parser.parse_args()
    if (not re.fullmatch("nk-audit-broker-[0-9a-f]{32}", args.name)
            or not args.endpoint.startswith("unix:///") or not Path(args.docker).is_absolute()
            or not math.isfinite(args.deadline) or not math.isfinite(args.grace)
            or not 0 <= args.grace <= 60):
        parser.error("Invalid trusted guard configuration")
    receipt = Path(args.receipt)
    # The parent owns this private directory. Exclusive creation prevents reuse.
    fd = os.open(receipt, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    reason = "disconnect"
    creation_quiesced = True
    try:
        try:
            sys.stdout.write("READY\n"); sys.stdout.flush()
            with selectors.DefaultSelector() as selector:
                selector.register(sys.stdin, selectors.EVENT_READ)
                while True:
                    remaining = args.deadline - time.monotonic()
                    if remaining <= 0:
                        reason = "deadline"
                        break
                    if selector.select(min(remaining, .1)):
                        data = os.read(sys.stdin.fileno(), 64)
                        if not data:
                            break
                        done = False
                        for event in data:
                            if event == ord("C"):
                                creation_quiesced = False
                            elif event == ord("Q"):
                                creation_quiesced = True
                            elif event == ord("D") and creation_quiesced:
                                reason = "completed"
                                done = True
                                break
                            else:
                                creation_quiesced = False
                                done = True
                                break
                        if done:
                            break
        except BrokenPipeError:
            reason = "disconnect"
        result = cleanup(args.docker, args.endpoint, args.name,
                         0 if reason == "completed" else args.grace)
        result["creationQuiesced"] = creation_quiesced
        result["cleanupVerified"] = result["absenceObserved"] and creation_quiesced
        result.update({"name": args.name, "reason": reason, "isolationVerified": False})
        with os.fdopen(fd, "w") as output:
            json.dump(result, output, indent=2); output.write("\n")
            output.flush(); os.fsync(output.fileno())
        return 0 if result["cleanupVerified"] else 1
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        raise


if __name__ == "__main__":
    raise SystemExit(main())
