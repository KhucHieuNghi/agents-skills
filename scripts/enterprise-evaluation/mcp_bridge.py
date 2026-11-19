"""Bounded MCP stdio bridge for development evaluation; not a release harness.

Only the trusted launch configuration selects Docker, mounts and output paths.
The model sees one command tool. Host built-in tools must separately be disabled.
"""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import sys
import time

from broker import ContainerBroker


class ProtocolLimit(RuntimeError):
    pass


class BridgeTermination(BaseException):
    pass


def frames(fd, *, deadline, max_frame=128*1024, max_total=1024*1024):
    buffer = bytearray()
    total = 0
    previous = os.get_blocking(fd)
    os.set_blocking(fd, False)
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(fd, selectors.EVENT_READ)
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise ProtocolLimit("read deadline")
                if not selector.select(min(remaining, .1)):
                    continue
                chunk = os.read(fd, min(65536, max_frame + 1))
                if not chunk:
                    if buffer:
                        raise ProtocolLimit("unterminated frame")
                    return
                total += len(chunk)
                if total > max_total:
                    raise ProtocolLimit("input budget")
                buffer.extend(chunk)
                while b'\n' in buffer:
                    end = buffer.index(b'\n')
                    if end > max_frame:
                        raise ProtocolLimit("frame budget")
                    line = bytes(buffer[:end])
                    del buffer[:end+1]
                    yield line
                if len(buffer) > max_frame:
                    raise ProtocolLimit("frame budget")
    finally:
        os.set_blocking(fd, previous)


def write_frame(fd, value, *, deadline, remaining):
    data = (json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":")) + "\n").encode()
    if len(data) > remaining:
        raise ProtocolLimit("output budget")
    previous = os.get_blocking(fd)
    os.set_blocking(fd, False)
    offset = 0
    try:
        with selectors.DefaultSelector() as selector:
            selector.register(fd, selectors.EVENT_WRITE)
            while offset < len(data):
                wait = deadline - time.monotonic()
                if wait <= 0:
                    raise ProtocolLimit("write deadline")
                if selector.select(min(wait, .1)):
                    try:
                        offset += os.write(fd, data[offset:offset+65536])
                    except BlockingIOError:
                        continue
    finally:
        os.set_blocking(fd, previous)
    return len(data)


def error(identifier, code, message):
    return {"jsonrpc": "2.0", "id": identifier, "error": {"code": code, "message": message}}


class Protocol:
    def __init__(self, execute):
        self.execute = execute
        self.state = "new"
        self.ids = set()
        self.backend_failures = 0

    def handle(self, message):
        if (not isinstance(message, dict) or message.get("jsonrpc") != "2.0"
                or not isinstance(message.get("method"), str)):
            return error(None, -32600, "Invalid request")
        method = message["method"]
        params = message.get("params", {})
        if "id" not in message:
            if method == "notifications/initialized" and self.state == "initializing":
                self.state = "ready"
            return None
        identifier = message["id"]
        if type(identifier) not in (str, int) or len(str(identifier)) > 256:
            return error(None, -32600, "Invalid request ID")
        key = (type(identifier), identifier)
        if key in self.ids:
            return error(identifier, -32600, "Repeated request ID")
        if len(self.ids) >= 1000:
            raise ProtocolLimit("request count")
        self.ids.add(key)
        if not isinstance(params, dict):
            return error(identifier, -32602, "Invalid params")
        if "_meta" in params and not isinstance(params["_meta"], dict):
            return error(identifier, -32602, "Invalid metadata")
        def result(value):
            return {"jsonrpc": "2.0", "id": identifier, "result": value}
        if method == "ping":
            return result({})
        if method == "initialize":
            client = params.get("clientInfo")
            if (self.state != "new" or not isinstance(params.get("protocolVersion"), str)
                    or not isinstance(params.get("capabilities"), dict) or not isinstance(client, dict)
                    or not isinstance(client.get("name"), str) or not isinstance(client.get("version"), str)):
                return error(identifier, -32602, "Invalid initialization")
            self.state = "initializing"
            return result({"protocolVersion": "2025-11-25", "capabilities": {"tools": {}},
                           "serverInfo": {"name": "nkskills-evaluation", "version": "0.1.0-dev"}})
        if self.state != "ready":
            return error(identifier, -32002, "Initialization required")
        if method == "tools/list":
            if set(params) - {"_meta"}:
                return error(identifier, -32602, "Pagination is not available")
            return result({"tools": [{"name": "run_command",
                "description": "Run a command in the fixed evaluation container. Inputs /inputs and skill /skill are read-only; write artifacts under /work. No network.",
                "inputSchema": {"type": "object", "properties": {"command": {"type": "string"}},
                                "required": ["command"], "additionalProperties": False}}]})
        if method != "tools/call":
            return error(identifier, -32601, "Method not found")
        arguments = params.get("arguments")
        if (params.get("name") != "run_command" or set(params) - {"name", "arguments", "_meta"}
                or not isinstance(arguments, dict) or set(arguments) != {"command"}
                or not isinstance(arguments["command"], str) or not arguments["command"]
                or len(arguments["command"].encode("utf-8", errors="replace")) > 65536
                or '\0' in arguments["command"]):
            return error(identifier, -32602, "Invalid tool arguments")
        try:
            code, stdout, stderr = self.execute(arguments["command"])
            payload = {"exitCode": code, "stdout": stdout.decode("utf-8", errors="replace"),
                       "stderr": stderr.decode("utf-8", errors="replace")}
            return result({"content": [{"type": "text", "text": json.dumps(payload)}], "isError": code != 0})
        except Exception:
            self.backend_failures += 1
            # Host paths and runtime configuration stay in the trusted receipt.
            return result({"content": [{"type": "text", "text": "Evaluation workload unavailable or aborted."}],
                           "isError": True})


def strict_json(data):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise ValueError("Duplicate JSON key")
            value[key] = item
        return value
    def constant(value):
        raise ValueError("Non-JSON number")
    return json.loads(data.decode("utf-8"), object_pairs_hook=pairs, parse_constant=constant)


def serve(protocol, input_fd, output_fd, *, deadline, transcript=None, journal=None):
    remaining = 8*1024*1024
    if transcript is None:
        transcript = []
    for index, line in enumerate(frames(input_fd, deadline=deadline)):
        if index >= 1000:
            raise ProtocolLimit("message count")
        entry = {"requestSha256": hashlib.sha256(line).hexdigest(),
                 "requestBase64": base64.b64encode(line).decode("ascii"),
                 "response": None, "responseSent": False}
        transcript.append(entry)
        if journal:
            journal("received", entry)
        try:
            message = strict_json(line)
        except (ValueError, UnicodeError, RecursionError):
            response = error(None, -32700, "Parse error")
        else:
            response = protocol.handle(message)
        entry["response"] = response
        if response is not None:
            remaining -= write_frame(output_fd, response, deadline=deadline, remaining=remaining)
            entry["responseSent"] = True
        if journal:
            journal("handled", entry)
    return transcript


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    args = parser.parse_args()
    config = strict_json(args.config.read_bytes())
    # The runner exclusively owns this new private output directory.
    output = Path(config["output"])
    output.mkdir(mode=0o700, parents=False, exist_ok=False)
    broker = ContainerBroker(**config["broker"])
    receipt = {"isolationVerified": False, "semanticAcceptance": False,
               "termination": "incomplete", "transcript": []}
    def execute(command):
        if broker.state == "new":
            broker.start(config["inputs"], config["skill"])
        return broker.execute(command)
    protocol = Protocol(execute)
    previous_term = signal.getsignal(signal.SIGTERM)
    def terminate(signum, frame):
        raise BridgeTermination("SIGTERM")
    signal.signal(signal.SIGTERM, terminate)
    journal_file = (output / "transcript.jsonl").open("x", encoding="utf-8")
    def journal(event, entry):
        journal_file.write(json.dumps({"event": event, **entry}, ensure_ascii=True) + "\n")
        journal_file.flush()
        os.fsync(journal_file.fileno())
    try:
        serve(protocol, sys.stdin.fileno(), sys.stdout.fileno(), deadline=broker.deadline,
              transcript=receipt["transcript"], journal=journal)
        receipt["termination"] = "eof"
        if broker.state == "running":
            receipt["artifacts"] = broker.export(output / "artifacts")
    except (Exception, KeyboardInterrupt, BridgeTermination) as exc:
        receipt["termination"] = "interrupted" if isinstance(exc, (BridgeTermination, KeyboardInterrupt)) else "error"
        receipt["errorType"] = type(exc).__name__
    finally:
        # A repeated shutdown signal must not interrupt the bounded cleanup and
        # receipt write. SIGKILL remains unrecoverable; the journal/guard survive.
        previous_int = signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        if broker.state != "aborted":
            broker.close()
        receipt["broker"] = broker.receipt
        receipt["backendFailures"] = protocol.backend_failures
        journal_file.close()
        temporary = output / "receipt.pending.json"
        temporary.write_text(json.dumps(receipt, indent=2) + "\n")
        temporary.replace(output / "receipt.json")
        signal.signal(signal.SIGTERM, previous_term)
        signal.signal(signal.SIGINT, previous_int)
    return 0 if (receipt["termination"] == "eof" and broker.receipt.get("cleanupVerified")
                 and not protocol.backend_failures) else 1


if __name__ == "__main__":
    raise SystemExit(main())
