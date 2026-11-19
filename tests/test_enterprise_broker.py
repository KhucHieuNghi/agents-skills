"""Process-budget and lifecycle tests for the evaluation broker."""
import importlib.util
import copy
from pathlib import Path
import sys
import time
import unittest
from unittest.mock import patch

DIRECTORY = Path(__file__).resolve().parents[1] / "scripts/enterprise-evaluation"
sys.path.insert(0, str(DIRECTORY))
spec = importlib.util.spec_from_file_location("broker", DIRECTORY / "broker.py")
broker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(broker)


class ProcessBudgetTests(unittest.TestCase):
    def test_stdout_stderr_and_exit_are_preserved(self):
        result = broker.bounded_process([sys.executable, "-c",
            "import sys; print('out'); print('err',file=sys.stderr); sys.exit(7)"],
            seconds=2, max_bytes=100)
        self.assertEqual(result, (7, b"out\n", b"err\n"))

    def test_timeout_and_combined_output_caps(self):
        for code, seconds, cap, reason in [
            ("import time; time.sleep(5)", .1, 100, "timeout"),
            ("import sys; sys.stderr.write('x'*10000)", 2, 20, "output-limit"),
        ]:
            with self.subTest(reason=reason), self.assertRaises(broker.ProcessLimit) as error:
                broker.bounded_process([sys.executable, "-c", code], seconds=seconds, max_bytes=cap)
            self.assertEqual(error.exception.reason, reason)

    def test_descendant_holding_pipe_cannot_extend_deadline(self):
        with self.assertRaises(broker.ProcessLimit):
            broker.bounded_process([sys.executable, "-c",
                "import subprocess,sys; subprocess.Popen([sys.executable,'-c','import time; time.sleep(5)'])"],
                seconds=.2, max_bytes=100)

    def test_invalid_limits_do_not_spawn(self):
        for seconds, cap in [(0, 1), (float('nan'), 1), (1, -1), (1, True)]:
            with self.assertRaises(ValueError):
                broker.bounded_process(["nonexistent"], seconds=seconds, max_bytes=cap)


class BrokerStateTests(unittest.TestCase):
    def make_broker(self):
        with patch.object(broker.shutil, "which", return_value="/test/docker"):
            return broker.ContainerBroker(endpoint="unix:///tmp/test.sock", image="node@sha256:" + "a"*64,
                platform="linux/amd64", command_seconds=1, session_seconds=10, output_bytes=100)

    def test_command_before_start_is_rejected(self):
        with self.assertRaises(RuntimeError):
            self.make_broker().execute("echo x")

    def test_timeout_aborts_whole_container_and_denies_next_call(self):
        instance = self.make_broker()
        instance.state = "running"
        calls = []
        def fake(args, **kwargs):
            calls.append(args)
            if args[0] == "exec":
                raise broker.ProcessLimit("timeout")
            if args[0] == "inspect":
                return 0, b'[]', b''
            return 0, b'', b''
        instance._docker = fake
        with self.assertRaises(broker.ProcessLimit):
            instance.execute("sleep 100")
        self.assertEqual(instance.state, "aborted")
        self.assertTrue(any(call[:2] == ["rm", "-f"] for call in calls))
        with self.assertRaises(RuntimeError):
            instance.execute("echo retry")

    def test_output_budget_is_cumulative(self):
        instance = self.make_broker()
        instance.state = "running"
        instance._docker = lambda args, **kwargs: (0, b'x'*60, b'')
        instance.execute("one")
        self.assertEqual(instance.remaining_output, 40)

    def test_expired_session_cannot_start_export(self):
        instance = self.make_broker()
        instance.state = "running"
        instance.deadline = time.monotonic() - 1
        calls = []
        def fake(args, **kwargs):
            calls.append(args)
            return 0, b'', b''
        instance._docker = fake
        with self.assertRaises(broker.ProcessLimit):
            instance.export("unused")
        self.assertFalse(any(call[0] in ("pause", "cp") for call in calls))

    def test_checked_operation_uses_remaining_session_budget(self):
        instance = self.make_broker()
        instance.deadline = time.monotonic() + .5
        budgets = []
        def fake(args, **kwargs):
            budgets.append(kwargs["seconds"])
            return 0, b'', b''
        instance._docker = fake
        instance._checked(["inspect", instance.name])
        self.assertLessEqual(budgets[0], .5)

    def test_effective_runtime_settings_must_be_present_and_exact(self):
        instance = self.make_broker()
        inspected = {
            "HostConfig": {"Tmpfs": {
                "/work": "rw,noexec,nosuid,nodev,size=32m,uid=1000,gid=1000",
                "/tmp": "rw,noexec,nosuid,nodev,size=16m,uid=1000,gid=1000"},
                "ShmSize": 16*1024*1024, "IpcMode": "private",
                "Ulimits": [{"Name": "nofile", "Soft": 256, "Hard": 256}],
                "LogConfig": {"Type": "none"}},
            "Image": "sha256:test", "Config": {"Image": instance.image},
            "State": {"Running": True}, "Mounts": [
                {"Type": "tmpfs", "Destination": "/work"},
                {"Type": "tmpfs", "Destination": "/tmp"}],
        }
        instance._verify_additional_settings(inspected, {"Id": "sha256:test"})
        for field in inspected["HostConfig"]:
            altered = copy.deepcopy(inspected)
            del altered["HostConfig"][field]
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                instance._verify_additional_settings(altered, {"Id": "sha256:test"})

        for field in ("Image", "State", "Config", "Mounts"):
            altered = copy.deepcopy(inspected)
            del altered[field]
            with self.subTest(field=field), self.assertRaises(RuntimeError):
                instance._verify_additional_settings(altered, {"Id": "sha256:test"})

    def test_export_cleanup_failure_is_not_accepted(self):
        instance = self.make_broker()
        instance.state = "running"
        def fake(args, **kwargs):
            if args[0] == "inspect":
                return 0, b'{"Paused":true}', b''
            if args[0] == "rm":
                return 1, b'', b'removal failed'
            return 0, b'', b''
        instance._docker = fake
        with patch.object(broker, "export_archive", return_value=[]):
            with self.assertRaisesRegex(RuntimeError, "cleanup unverified"):
                instance.export("unused")
        self.assertIs(instance.receipt["cleanupVerified"], False)


if __name__ == "__main__":
    unittest.main()
