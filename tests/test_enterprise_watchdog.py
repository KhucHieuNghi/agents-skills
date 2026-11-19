"""Watchdog lifecycle tests use an isolated fake Docker client, not the daemon."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/enterprise-evaluation/watchdog.py"
NAME = "nk-audit-broker-" + "a"*32


class WatchdogTests(unittest.TestCase):
    def run_case(self, reason, *, wrong_id=False, uncertain=False, late=False):
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            state = root / "container"
            state.write_text("exists")
            client = root / "docker"
            client.write_text("#!" + sys.executable + "\n" +
                "import sys,pathlib\n" +
                "p=pathlib.Path(" + repr(str(state)) + ")\n" +
                "args=sys.argv[3:]\n" +
                "if args[0]=='ps': print(" + repr("unexpected" if wrong_id else "b"*64) + " if p.exists() else '')\n" +
                "elif args[:2]==['rm','-f']: p.unlink(missing_ok=True)\n")
            client.chmod(0o700)
            receipt = root / "receipt.json"
            proc = subprocess.Popen([sys.executable, str(SCRIPT), "--docker", str(client),
                "--endpoint", "unix:///tmp/fake.sock", "--name", NAME,
                "--deadline", str(time.monotonic() + (.3 if reason == "deadline" else 5)),
                "--receipt", str(receipt), "--grace", ".15"],
                stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            timer = None
            try:
                self.assertEqual(proc.stdout.readline(), b"READY\n")
                if late:
                    state.unlink()
                    timer = threading.Timer(.05, lambda: state.write_text("late"))
                    timer.start()
                if reason == "completed":
                    proc.stdin.write(b"D"); proc.stdin.flush()
                elif reason == "disconnect":
                    if uncertain:
                        proc.stdin.write(b"C"); proc.stdin.flush()
                    proc.stdin.close()
                proc.wait(timeout=5)
                result = json.loads(receipt.read_text())
                self.assertEqual(result["reason"], reason)
                self.assertEqual(result["cleanupVerified"], not wrong_id and not uncertain)
                self.assertEqual(state.exists(), wrong_id)
                self.assertEqual(proc.returncode, 1 if wrong_id or uncertain else 0)
            finally:
                if timer:
                    timer.join()
                if proc.poll() is None:
                    proc.kill(); proc.wait()
                for stream in (proc.stdin, proc.stdout, proc.stderr):
                    stream.close()

    def test_disconnect_cleans_workload(self):
        self.run_case("disconnect")

    def test_deadline_cleans_workload_with_parent_pipe_open(self):
        self.run_case("deadline")

    def test_normal_completion_also_verifies_cleanup(self):
        self.run_case("completed")

    def test_unexpected_daemon_identifier_is_never_removed(self):
        self.run_case("disconnect", wrong_id=True)

    def test_interrupted_creation_is_not_verified_by_empty_inventory(self):
        self.run_case("disconnect", uncertain=True)

    def test_late_creation_during_grace_is_removed_but_unverified(self):
        self.run_case("disconnect", uncertain=True, late=True)


if __name__ == "__main__":
    unittest.main()
