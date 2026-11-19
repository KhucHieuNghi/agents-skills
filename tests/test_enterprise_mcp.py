"""Protocol and pipe-boundary tests; no native host or Docker acceptance."""
import importlib.util
import json
import os
from pathlib import Path
import sys
import time
import unittest

DIRECTORY = Path(__file__).resolve().parents[1] / "scripts/enterprise-evaluation"
sys.path.insert(0, str(DIRECTORY))
spec = importlib.util.spec_from_file_location("mcp_bridge", DIRECTORY / "mcp_bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


def request(identifier, method, params=None):
    value = {"jsonrpc": "2.0", "id": identifier, "method": method}
    if params is not None:
        value["params"] = params
    return value


class DispatchTests(unittest.TestCase):
    def setUp(self):
        self.calls = []
        def execute(command):
            self.calls.append(command)
            return 0, b'out\n', b'err\n'
        self.server = bridge.Protocol(execute)

    def initialize(self):
        result = self.server.handle(request(1, "initialize", {
            "protocolVersion": "2025-11-25", "capabilities": {},
            "clientInfo": {"name": "test", "version": "1"}}))
        self.assertEqual(result["result"]["protocolVersion"], "2025-11-25")
        self.server.handle({"jsonrpc": "2.0", "method": "notifications/initialized"})

    def test_only_one_tool_and_only_command_argument(self):
        self.initialize()
        tools = self.server.handle(request(2, "tools/list"))["result"]["tools"]
        self.assertEqual([tool["name"] for tool in tools], ["run_command"])
        result = self.server.handle(request(3, "tools/call", {
            "name": "run_command", "arguments": {"command": "printf out"}}))
        self.assertFalse(result["result"]["isError"])
        self.assertEqual(self.calls, ["printf out"])
        self.assertEqual(json.loads(result["result"]["content"][0]["text"])["stderr"], "err\n")

    def test_initialization_and_request_identity_gate_execution(self):
        call = request(2, "tools/call", {"name": "run_command", "arguments": {"command": "x"}})
        self.assertIn("error", self.server.handle(call))
        self.initialize()
        self.assertIn("error", self.server.handle(call))
        self.assertEqual(self.calls, [])

    def test_model_cannot_supply_mount_endpoint_or_output(self):
        self.initialize()
        for index, key in enumerate(("mount", "endpoint", "output"), 2):
            result = self.server.handle(request(index, "tools/call", {
                "name": "run_command", "arguments": {"command": "x", key: "/host"}}))
            self.assertEqual(result["error"]["code"], -32602)
        self.assertEqual(self.calls, [])

    def test_standard_metadata_is_allowed_and_must_be_an_object(self):
        self.initialize()
        result = self.server.handle(request(2, "tools/list", {"_meta": {"trace": "test"}}))
        self.assertIn("result", result)
        for identifier, method, params in [
            (3, "tools/list", {"_meta": "bad"}),
            (4, "tools/call", {"name": "run_command", "arguments": {"command": "x"}, "_meta": []}),
            (5, "tools/list", {"cursor": "unsupported"}),
        ]:
            with self.subTest(method=method):
                self.assertEqual(self.server.handle(request(identifier, method, params))["error"]["code"], -32602)
        self.assertEqual(self.calls, [])

    def test_notification_cannot_execute_and_backend_error_is_sanitized(self):
        self.initialize()
        self.assertIsNone(self.server.handle({"jsonrpc": "2.0", "method": "tools/call",
            "params": {"name": "run_command", "arguments": {"command": "x"}}}))
        def fail(command):
            raise RuntimeError("secret host path /private/key")
        self.server.execute = fail
        result = self.server.handle(request(2, "tools/call", {
            "name": "run_command", "arguments": {"command": "x"}}))
        self.assertTrue(result["result"]["isError"])
        self.assertNotIn("private", json.dumps(result))
        self.assertEqual(self.calls, [])


class FramingTests(unittest.TestCase):
    def test_partial_frame_cannot_wait_forever(self):
        read, write = os.pipe()
        try:
            os.write(write, b'{')
            with self.assertRaises(bridge.ProtocolLimit):
                list(bridge.frames(read, deadline=time.monotonic()+.05))
        finally:
            os.close(read); os.close(write)

    def test_frame_and_cumulative_limits(self):
        for payload, limits in [(b'123456\n', {"max_frame": 4}),
                                (b'1\n2\n3\n', {"max_total": 4}),
                                (b'{}', {})]:
            read, write = os.pipe()
            try:
                os.write(write, payload); os.close(write)
                with self.assertRaises(bridge.ProtocolLimit):
                    list(bridge.frames(read, deadline=time.monotonic()+1, **limits))
            finally:
                os.close(read)

    def test_multiple_frames_preserve_boundaries(self):
        read, write = os.pipe()
        try:
            os.write(write, b'{}\n{"id":1}\n'); os.close(write)
            self.assertEqual(list(bridge.frames(read, deadline=time.monotonic()+1)),
                             [b'{}', b'{"id":1}'])
        finally:
            os.close(read)

    def test_unread_output_hits_deadline(self):
        read, write = os.pipe()
        try:
            with self.assertRaises(bridge.ProtocolLimit):
                bridge.write_frame(write, {"data": "x"*1024*1024},
                                   deadline=time.monotonic()+.05, remaining=2*1024*1024)
        finally:
            os.close(read); os.close(write)

    def test_strict_json_rejects_duplicate_keys_and_non_json_numbers(self):
        for value in (b'{"id":1,"id":2}', b'{"id":NaN}', b'\xff'):
            with self.assertRaises(ValueError):
                bridge.strict_json(value)

    def test_partial_transcript_survives_write_failure(self):
        read, write = os.pipe()
        output_read, output_write = os.pipe()
        transcript = []
        try:
            os.write(write, b'{"jsonrpc":"2.0","id":1,"method":"ping"}\n')
            os.close(write); os.close(output_read)
            with self.assertRaises(BrokenPipeError):
                bridge.serve(bridge.Protocol(lambda command: None), read, output_write,
                             deadline=time.monotonic()+1, transcript=transcript)
            self.assertEqual(len(transcript), 1)
            self.assertFalse(transcript[0]["responseSent"])
            self.assertEqual(transcript[0]["response"]["result"], {})
        finally:
            os.close(read); os.close(output_write)


if __name__ == "__main__":
    unittest.main()
