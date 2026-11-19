import importlib.util
import importlib.machinery
import io
import json
import os
from pathlib import Path
import runpy
import sys
import tempfile
import time
import unittest
import uuid
import subprocess
import select
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("sandbox_file", Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_file.py")
m = importlib.util.module_from_spec(spec)
SUPPORTED = os.name == "posix" and all(hasattr(os, name) for name in ("O_DIRECTORY", "O_NOFOLLOW", "O_NONBLOCK"))
if SUPPORTED:
    spec.loader.exec_module(m)


@unittest.skipUnless(SUPPORTED, "POSIX descriptor sandbox capability unavailable")
class SandboxTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="nkskills-remediation-")
        self.root = Path(self.temp.name).resolve()
        (self.root / "fixture.txt").write_bytes(b"before")
        info = self.root.stat()
        self.identity = (info.st_dev, info.st_ino)

    def tearDown(self):
        self.temp.cleanup()

    def apply(self, authorize=lambda _request: True, before=None, deadline=None):
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            return writer.replace(before or m.digest(b"before"), b"after", m.digest(b"after"), deadline if deadline is not None else time.time() + 60, authorize)

    def test_approved_replacement(self):
        result = self.apply()
        self.assertEqual(result["status"], "applied")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")
        self.assertEqual((self.root / "fixture.txt").stat().st_mode & 0o777, 0o600)

    def test_wrong_precondition(self):
        with self.assertRaises(ValueError):
            self.apply(before="0" * 64)
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_denied_and_expired_commit_leave_target_unchanged(self):
        for authorize, deadline in [(lambda _r: False, time.time()+60), (lambda _r: True, time.time()-1)]:
            with self.assertRaises(PermissionError):
                self.apply(authorize=authorize, deadline=deadline)
            self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
            self.assertEqual(list(self.root.glob(".staged-*")), [])

    def test_leaf_symlink_does_not_touch_referent(self):
        outside = self.root / "outside.txt"
        outside.write_bytes(b"outside")
        (self.root / "fixture.txt").unlink()
        (self.root / "fixture.txt").symlink_to(outside)
        with self.assertRaises(OSError):
            self.apply()
        self.assertEqual(outside.read_bytes(), b"outside")

    def test_root_symlink_and_wrong_identity_rejected(self):
        link = self.root / "link"
        link.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(OSError):
            m.SandboxWriter(str(link), self.identity)
        with self.assertRaises(ValueError):
            m.SandboxWriter(str(self.root), (0, 0))

    def test_hardlink_and_executable_target_rejected(self):
        os.link(self.root / "fixture.txt", self.root / "alias")
        with self.assertRaises(ValueError):
            self.apply()
        (self.root / "alias").unlink()
        (self.root / "fixture.txt").chmod(0o700)
        with self.assertRaises(ValueError):
            self.apply()

    def test_changed_target_during_authorization_is_preserved(self):
        def authorize(_request):
            (self.root / "fixture.txt").write_bytes(b"concurrent")
            return True
        with self.assertRaises(ValueError):
            self.apply(authorize=authorize)
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"concurrent")

    def test_non_private_root_and_traversal_rejected(self):
        self.root.chmod(0o755)
        with self.assertRaises(ValueError):
            m.SandboxWriter(str(self.root), self.identity)
        self.root.chmod(0o700)
        with self.assertRaises(ValueError):
            m.SandboxWriter(str(self.root) + "/../" + self.root.name, self.identity)

    def test_post_commit_failure_is_unknown_not_failed_unchanged(self):
        actual = os.fsync
        calls = 0
        def sync(fd):
            nonlocal calls
            calls += 1
            if calls == 2:
                raise OSError("simulated directory sync failure")
            return actual(fd)
        with patch.object(m.os, "fsync", sync), self.assertRaises(m.OutcomeUnknown):
            self.apply()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_corrupted_staging_is_not_committed(self):
        def authorize(_request):
            next(self.root.glob(".staged-*")).write_bytes(b"wrong")
            return True
        with self.assertRaises(ValueError):
            self.apply(authorize=authorize)
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_fifo_is_opened_nonblocking_then_rejected(self):
        (self.root / "fixture.txt").unlink()
        os.mkfifo(self.root / "fixture.txt")
        original = os.open
        def guarded(name, flags, *args, **kwargs):
            if name == "fixture.txt" and not flags & os.O_NONBLOCK:
                raise AssertionError("Potentially blocking target open")
            return original(name, flags, *args, **kwargs)
        with patch.object(m.os, "open", guarded), self.assertRaises(ValueError):
            self.apply()

    def test_cleanup_failure_preserves_denial_and_releases_lock(self):
        def authorize(_request):
            staged = next(self.root.glob(".staged-*"))
            staged.unlink()
            staged.mkdir()
            return False
        with self.assertRaises(PermissionError) as caught:
            self.apply(authorize=authorize)
        self.assertTrue(getattr(caught.exception, "sandbox_cleanup_incomplete", False))
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        self.apply()

    def test_interruption_at_replace_boundary_is_unknown(self):
        original = os.replace
        def interrupted(*args, **kwargs):
            original(*args, **kwargs)
            raise KeyboardInterrupt()
        with patch.object(m.os, "replace", interrupted):
            try:
                self.apply()
            except BaseException as error:
                self.assertIsInstance(error, m.OutcomeUnknown)
            else:
                self.fail("Expected outcome-unknown")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_replaced_staging_inode_is_rejected(self):
        def authorize(_request):
            staged = next(self.root.glob(".staged-*"))
            moved = self.root / "old-stage"
            staged.rename(moved)
            staged.write_bytes(b"after")
            staged.chmod(0o600)
            return True
        with self.assertRaises(ValueError):
            self.apply(authorize=authorize)
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_cooperating_writer_lock_is_nonblocking(self):
        fd = os.open(self.root / ".writer.lock", os.O_RDWR | os.O_CREAT, 0o600)
        try:
            m.fcntl.flock(fd, m.fcntl.LOCK_EX | m.fcntl.LOCK_NB)
            with self.assertRaises(BlockingIOError):
                self.apply()
            self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        finally:
            os.close(fd)
        self.apply()

    def test_refreshed_commit_gate_cannot_extend_or_bypass_expiry(self):
        with self.assertRaises(PermissionError):
            self.apply(authorize=lambda _r: {"allowed": True, "validUntil": time.time()-1})
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        result = self.apply(authorize=lambda _r: {"allowed": True, "validUntil": time.time()+30})
        self.assertEqual(result["status"], "applied")

    def test_worker_context_close_failure_preserves_unknown_after_replace(self):
        class ClosingFailure(m.SandboxWriter):
            def __exit__(self, *args):
                super().__exit__(*args)
                raise OSError("simulated root close failure after replacement")

        class Loader:
            def create_module(self, _spec):
                return None

            def exec_module(self, module):
                module.SandboxWriter = ClosingFailure
                module.OutcomeUnknown = m.OutcomeUnknown

        original = importlib.util.spec_from_file_location

        def backend_spec(name, *args, **kwargs):
            if name == "sandbox_file":
                return importlib.machinery.ModuleSpec(name, Loader())
            return original(name, *args, **kwargs)

        request = {
            "attempt": self.journal_attempt(),
            "root": str(self.root),
            "rootIdentity": list(self.identity),
            "beforeDigest": m.digest(b"before"),
            "afterBase64": "YWZ0ZXI=",
            "afterDigest": m.digest(b"after"),
            "validUntil": time.time() + 60,
        }
        wire = (json.dumps(request) + "\n" + json.dumps({
            "allowed": True, "validUntil": time.time() + 60,
        }) + "\n").encode()
        output = io.StringIO()
        worker = Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py"
        with io.TextIOWrapper(io.BytesIO(wire)) as stdin:
            with patch.object(importlib.util, "spec_from_file_location", backend_spec), patch.object(sys, "stdin", stdin), patch.object(sys, "stdout", output):
                runpy.run_path(str(worker), run_name="__main__")
        messages = [json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual([item["type"] for item in messages], ["ready", "result"])
        self.assertEqual(messages[-1]["result"]["status"], "unknown")
        self.assertEqual(messages[-1]["result"]["reason"], "commit-outcome-unknown")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_worker_return_assignment_interruption_cannot_report_denied(self):
        worker = (Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py").resolve()
        boundary = next(
            number for number, line in enumerate(worker.read_text().splitlines(), 1)
            if line.strip() == "applied = True"
        )
        for error_type in (KeyboardInterrupt, SystemExit, OSError):
            with self.subTest(error_type=error_type.__name__):
                (self.root / "fixture.txt").write_bytes(b"before")
                request = {
                    "attempt": self.journal_attempt(error_type.__name__),
                    "root": str(self.root),
                    "rootIdentity": list(self.identity),
                    "beforeDigest": m.digest(b"before"),
                    "afterBase64": "YWZ0ZXI=",
                    "afterDigest": m.digest(b"after"),
                    "validUntil": time.time() + 60,
                }
                wire = (json.dumps(request) + "\n" + json.dumps({
                    "allowed": True, "validUntil": time.time() + 60,
                }) + "\n").encode()
                output = io.StringIO()

                def interrupt(frame, event, _arg):
                    if event == "line" and frame.f_code.co_filename == str(worker) and frame.f_lineno == boundary:
                        raise error_type("simulated interruption after backend return")
                    return interrupt

                previous_trace = sys.gettrace()
                try:
                    with io.TextIOWrapper(io.BytesIO(wire)) as stdin:
                        with patch.object(sys, "stdin", stdin), patch.object(sys, "stdout", output):
                            sys.settrace(interrupt)
                            runpy.run_path(str(worker), run_name="__main__")
                finally:
                    sys.settrace(previous_trace)
                messages = [json.loads(line) for line in output.getvalue().splitlines()]
                self.assertEqual([item["type"] for item in messages], ["ready", "result"])
                self.assertEqual(messages[-1]["result"]["status"], "unknown")
                self.assertEqual(messages[-1]["result"]["reason"], "commit-outcome-unknown")
                self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")


    def journal_attempt(self, change="change-1"):
        return {"attemptId": str(uuid.uuid5(uuid.NAMESPACE_DNS, change)),
                "planDigest": "a"*64, "changeId": change, "customerId": "customer",
                "assetBindingDigest": "b"*64}

    def apply_journal(self, change="change-1", authorize=lambda _request: True):
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            return writer.replace(m.digest(b"before"), b"after", m.digest(b"after"),
                                  time.time()+60, authorize, attempt=self.journal_attempt(change))

    def test_journal_survives_reopen_and_consumes_same_plan_change(self):
        self.apply_journal()
        intents = list(self.root.glob(".intent-*.json"))
        results = list(self.root.glob(".result-*.json"))
        self.assertEqual(len(intents), 1)
        self.assertEqual(len(results), 1)
        intent = json.loads(intents[0].read_text())
        result = json.loads(results[0].read_text())
        self.assertEqual(intent["attempt"]["attemptId"], self.journal_attempt()["attemptId"])
        self.assertEqual(result["intentDigest"], m.digest(intents[0].read_bytes()))
        self.assertEqual(result["status"], "applied")
        self.assertEqual(intents[0].stat().st_mode & 0o777, 0o600)
        (self.root / "fixture.txt").write_bytes(b"before")
        with self.assertRaises(PermissionError):
            self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_pending_journal_blocks_a_different_plan_after_reopen(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        (self.root / "fixture.txt").write_bytes(b"before")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("other-change")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_corrupt_journal_does_not_become_a_fresh_attempt(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).write_text('{"status":"applied"}')
        (self.root / "fixture.txt").write_bytes(b"before")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("other-change")

    def test_denied_journal_records_no_rename_and_allows_new_approved_change(self):
        with self.assertRaises(PermissionError):
            self.apply_journal(authorize=lambda _r: False)
        result = json.loads(next(self.root.glob(".result-*.json")).read_text())
        self.assertEqual(result["status"], "denied")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        self.assertEqual(self.apply_journal("new-change")["status"], "applied")

    def test_intent_persistence_failure_prevents_target_mutation(self):
        with patch.object(m.os, "fsync", side_effect=OSError("disk")):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")

    def test_orphan_result_and_symlink_journal_are_quarantined(self):
        reserved = self.root / (".result-" + "c"*64 + ".json")
        reserved.write_text("{}")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal()
        reserved.unlink()
        reserved.symlink_to(self.root / "fixture.txt")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")



    def worker_request(self, attempt):
        return {"root": str(self.root), "rootIdentity": list(self.identity),
                "beforeDigest": m.digest(b"before"), "afterBase64": "YWZ0ZXI=",
                "afterDigest": m.digest(b"after"), "validUntil": time.time()+60, "attempt": attempt}

    def test_worker_null_attempt_cannot_bypass_journal(self):
        worker = Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py"
        wire = json.dumps(self.worker_request(None))+"\n"+json.dumps({"allowed": True, "validUntil": time.time()+60})+"\n"
        result = subprocess.run([sys.executable, "-B", "-I", str(worker)], input=wire, text=True, capture_output=True, timeout=5)
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual(messages[-1]["result"]["status"], "denied")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_killed_worker_pending_intent_blocks_new_process(self):
        worker = Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py"
        with subprocess.Popen([sys.executable, "-B", "-I", str(worker)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) as process:
            try:
                process.stdin.write(json.dumps(self.worker_request(self.journal_attempt()))+"\n")
                process.stdin.flush()
                self.assertTrue(select.select([process.stdout], [], [], 5)[0], "worker did not reach gate")
                self.assertEqual(json.loads(process.stdout.readline())["type"], "ready")
                self.assertEqual(len(list(self.root.glob(".intent-*.json"))), 1)
            finally:
                process.kill()
                process.communicate(timeout=5)
        wire = json.dumps(self.worker_request(self.journal_attempt("new-change")))+"\n"+json.dumps({"allowed": True, "validUntil": time.time()+60})+"\n"
        result = subprocess.run([sys.executable, "-B", "-I", str(worker)], input=wire, text=True, capture_output=True, timeout=5)
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual([item["type"] for item in messages], ["result"])
        self.assertEqual(messages[0]["result"]["status"], "unknown")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_result_write_failure_leaves_mutated_target_unknown_on_reopen(self):
        original = m.SandboxWriter._record
        def fail_result(writer, name, value):
            if name.startswith(".result-"):
                raise m.OutcomeUnknown("simulated result persistence failure")
            return original(writer, name, value)
        with patch.object(m.SandboxWriter, "_record", fail_result):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")

    def test_duplicate_attempt_id_for_new_change_is_rejected(self):
        self.apply_journal()
        (self.root / "fixture.txt").write_bytes(b"before")
        attempt = self.journal_attempt()
        attempt["changeId"] = "new-change"
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            with self.assertRaises(PermissionError):
                writer.replace(m.digest(b"before"), b"after", m.digest(b"after"), time.time()+60, lambda _r: True, attempt=attempt)

    def test_ledger_root_identity_filename_and_private_mode_are_checked(self):
        self.apply_journal()
        record = next(self.root.glob(".intent-*.json"))
        record.chmod(0o644)
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")
        record.chmod(0o600)
        value = json.loads(record.read_text())
        value["rootIdentity"][1] += 1
        record.write_text(json.dumps(value))
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")
        record.rename(self.root / (".intent-"+"d"*64+".json"))
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")

    def test_directory_enumeration_is_bounded_before_admission(self):
        for i in range(257):
            (self.root / ("unrelated-"+str(i))).touch()
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")



    def test_journal_post_rename_interrupt_is_persisted_unknown(self):
        original = m.os.replace
        def interrupted(*args, **kwargs):
            original(*args, **kwargs)
            raise KeyboardInterrupt("after rename")
        with patch.object(m.os, "replace", interrupted):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        result = json.loads(next(self.root.glob(".result-*.json")).read_text())
        self.assertEqual(result["status"], "unknown")
        self.assertIs(result["commitAttempted"], True)
        self.assertIsNone(result["verifiedAfterDigest"])
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")

    def test_result_fsync_failure_leaves_publication_incomplete(self):
        original = m.SandboxWriter._record
        def failed_sync(writer, name, value):
            if name.startswith(".result-"):
                with patch.object(m.os, "fsync", side_effect=OSError("result fsync")):
                    return original(writer, name, value)
            return original(writer, name, value)
        with patch.object(m.SandboxWriter, "_record", failed_sync):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")
        self.assertTrue(list(self.root.glob(".journal-stage-*")))
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")

    def test_publication_interrupted_after_link_is_not_a_completed_record(self):
        original = m.os.link
        def interrupted(*args, **kwargs):
            original(*args, **kwargs)
            raise KeyboardInterrupt("after record link")
        with patch.object(m.os, "link", interrupted):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        self.assertTrue(list(self.root.glob(".journal-stage-*")))
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("new-change")



    def test_completed_attempt_cannot_replay_in_a_fresh_worker(self):
        self.apply_journal()
        (self.root / "fixture.txt").write_bytes(b"before")
        worker = Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py"
        wire = json.dumps(self.worker_request(self.journal_attempt()))+"\n"+json.dumps({"allowed": True, "validUntil": time.time()+60})+"\n"
        result = subprocess.run([sys.executable, "-B", "-I", str(worker)], input=wire, text=True, capture_output=True, timeout=5)
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual([item["type"] for item in messages], ["result"])
        self.assertEqual(messages[0]["result"]["status"], "denied")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")



    def inspect_journal(self):
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            return writer.inspect()

    def snapshot_files(self):
        return {item.name: item.read_bytes() for item in self.root.iterdir() if item.is_file()}

    def test_inspection_preserves_bytes_and_separates_history_from_current_state(self):
        self.apply_journal()
        (self.root / "fixture.txt").write_bytes(b"drift")
        before = self.snapshot_files()
        result = self.inspect_journal()
        self.assertEqual(result["status"], "inspected")
        self.assertEqual(result["records"][0]["historicalStatus"], "applied")
        self.assertEqual(result["records"][0]["currentRelation"], "matches-neither")
        self.assertFalse(result["executionAllowed"])
        self.assertEqual(self.snapshot_files(), before)

    def test_reconciliation_records_pending_without_authorizing_retry(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        intent = next(self.root.glob(".intent-*.json"))
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            result = writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), lambda _request: True)
        self.assertEqual(result["historicalStatus"], "pending")
        self.assertFalse(result["outcomeResolved"])
        self.assertFalse(result["executionAllowed"])
        self.assertEqual(len(list(self.root.glob(".reconciliation-*.json"))), 1)
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("different-change")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_invalid_or_orphan_reconciliation_quarantines_inspection(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        intent = next(self.root.glob(".intent-*.json"))
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), lambda _request: True)
        self.assertEqual(self.inspect_journal()["records"][0]["historicalStatus"], "pending")
        record_path = next(self.root.glob(".reconciliation-*.json"))
        record = json.loads(record_path.read_text())
        record["outcomeResolved"] = True
        record_path.write_text(json.dumps(record))
        with self.assertRaises(m.OutcomeUnknown):
            self.inspect_journal()
        record_path.unlink()
        (self.root / (".reconciliation-" + "f" * 64 + ".json")).write_text("{}")
        with self.assertRaises(m.OutcomeUnknown):
            self.inspect_journal()

    def test_reconciliation_rejects_float_root_and_impossible_pending_chronology(self):
        self.apply_journal()
        result_path = next(self.root.glob(".result-*.json"))
        result = json.loads(result_path.read_text())
        result_path.unlink()
        intent = next(self.root.glob(".intent-*.json"))
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), lambda _request: True)
        record_path = next(self.root.glob(".reconciliation-*.json"))
        record = json.loads(record_path.read_text())
        record["rootIdentity"] = [float(v) for v in self.identity]
        record_path.write_text(json.dumps(record))
        with self.assertRaises(m.OutcomeUnknown): self.inspect_journal()
        record["rootIdentity"] = list(self.identity)
        record_path.write_text(json.dumps(record))
        result["completedAt"] = record["observedAt"] - 0.001
        result_path.write_text(json.dumps(result))
        result_path.chmod(0o600)
        with self.assertRaises(m.OutcomeUnknown): self.inspect_journal()
        result["completedAt"] = record["observedAt"] + 0.001
        result_path.write_text(json.dumps(result))
        self.assertEqual(self.inspect_journal()["records"][0]["historicalStatus"], "applied")

    def test_reconciliation_callback_cannot_mutate_bound_root_identity(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        intent = next(self.root.glob(".intent-*.json"))
        def mutate(request):
            request["rootIdentity"][0] = -99
            return True
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            result = writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), mutate)
        self.assertEqual(result["rootIdentity"], list(self.identity))
        record = json.loads(next(self.root.glob(".reconciliation-*.json")).read_bytes())
        self.assertEqual(record["rootIdentity"], list(self.identity))

    def test_reconciliation_denial_or_drift_writes_no_record(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        intent = next(self.root.glob(".intent-*.json"))
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            with self.assertRaises(PermissionError):
                writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), lambda _request: False)
            def drift(_request):
                (self.root / "fixture.txt").write_bytes(b"drift")
                return True
            with self.assertRaises(ValueError):
                writer.record_reconciliation(self.journal_attempt()["attemptId"], m.digest(intent.read_bytes()), m.digest(b"after"), drift)
        self.assertEqual(list(self.root.glob(".reconciliation-*.json")), [])

    def test_pending_matching_after_bytes_is_not_promoted(self):
        self.apply_journal()
        next(self.root.glob(".result-*.json")).unlink()
        before = self.snapshot_files()
        result = self.inspect_journal()
        self.assertEqual(result["records"][0]["historicalStatus"], "pending")
        self.assertEqual(result["records"][0]["currentRelation"], "matches-after")
        self.assertIsNone(result["records"][0]["commitAttempted"])
        self.assertEqual(self.snapshot_files(), before)

    def test_missing_inspection_lock_does_not_create_one(self):
        before = self.snapshot_files()
        with self.assertRaises(m.OutcomeUnknown):
            self.inspect_journal()
        self.assertEqual(self.snapshot_files(), before)

    def test_inspection_refuses_busy_lock(self):
        import fcntl
        lock = os.open(self.root / ".writer.lock", os.O_RDWR | os.O_CREAT, 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaises(m.OutcomeUnknown):
                self.inspect_journal()
        finally:
            os.close(lock)

    def test_malformed_sibling_invalidates_whole_inspection(self):
        self.apply_journal()
        (self.root / (".result-"+"e"*64+".json")).write_text("{}")
        with self.assertRaises(m.OutcomeUnknown):
            self.inspect_journal()

    def test_unknown_history_is_not_changed_by_matching_before_bytes(self):
        original = m.os.replace
        def interrupted(*args, **kwargs):
            original(*args, **kwargs)
            raise KeyboardInterrupt("after rename")
        with patch.object(m.os, "replace", interrupted):
            with self.assertRaises(m.OutcomeUnknown):
                self.apply_journal()
        (self.root / "fixture.txt").write_bytes(b"before")
        result = self.inspect_journal()
        self.assertEqual(result["records"][0]["historicalStatus"], "unknown")
        self.assertEqual(result["records"][0]["currentRelation"], "matches-before")
        self.assertIs(result["records"][0]["commitAttempted"], True)



    def test_full_attempt_capacity_remains_inspectable(self):
        for index in range(100):
            with self.assertRaises(PermissionError):
                self.apply_journal("change-"+str(index), authorize=lambda _r: False)
        result = self.inspect_journal()
        self.assertEqual(len(result["records"]), 100)
        self.assertTrue(all(row["historicalStatus"] == "denied" for row in result["records"]))
        with self.assertRaises(m.OutcomeUnknown):
            self.apply_journal("change-101")

    def test_identical_before_after_is_reported_as_both_without_inference(self):
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.replace(m.digest(b"before"), b"before", m.digest(b"before"), time.time()+60, lambda _r: True, attempt=self.journal_attempt())
        next(self.root.glob(".result-*.json")).unlink()
        result = self.inspect_journal()
        self.assertEqual(result["records"][0]["historicalStatus"], "pending")
        self.assertEqual(result["records"][0]["currentRelation"], "matches-both")

    def test_mixed_completed_and_pending_history_is_not_filtered(self):
        self.apply_journal("first")
        (self.root / "fixture.txt").write_bytes(b"before")
        self.apply_journal("second")
        for file in self.root.glob(".result-*.json"):
            if json.loads(file.read_text())["attemptId"] == self.journal_attempt("second")["attemptId"]:
                file.unlink()
        result = self.inspect_journal()
        self.assertEqual({row["historicalStatus"] for row in result["records"]}, {"applied", "pending"})



    def rollback_attempt(self, rollback_id="rollback-1", original_change="change-1"):
        original = self.journal_attempt(original_change)
        return {**original, "attemptId": str(uuid.uuid5(uuid.NAMESPACE_DNS, "rollback:"+rollback_id)),
                "purpose": "rollback", "rollbackId": rollback_id, "rollbackOf": original["attemptId"],
                "rollbackReceiptDigest": "d"*64}

    def rollback_journal(self, rollback_id="rollback-1"):
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            return writer.replace(m.digest(b"after"), b"before", m.digest(b"before"), time.time()+60,
                                  lambda _r: True, attempt=self.rollback_attempt(rollback_id))

    def test_native_rollback_restores_exact_prior_image_with_separate_history(self):
        self.apply_journal()
        self.rollback_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")
        records = self.inspect_journal()["records"]
        rollback = next(row for row in records if row.get("purpose") == "rollback")
        self.assertEqual(rollback["sequence"], 2)
        self.assertEqual(rollback["rollbackOf"], self.journal_attempt()["attemptId"])
        self.assertEqual(rollback["historicalStatus"], "applied")

    def test_successful_rollback_consumes_original_across_new_ids(self):
        self.apply_journal()
        self.rollback_journal()
        (self.root / "fixture.txt").write_bytes(b"after")
        with self.assertRaises(PermissionError):
            self.rollback_journal("rollback-2")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_intervening_applied_change_blocks_rollback_even_when_bytes_match(self):
        self.apply_journal()
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.replace(m.digest(b"after"), b"third", m.digest(b"third"), time.time()+60, lambda _r: True, attempt=self.journal_attempt("later"))
        (self.root / "fixture.txt").write_bytes(b"after")
        with self.assertRaises(PermissionError):
            self.rollback_journal()

    def test_rollback_cannot_claim_an_original_absent_from_this_root(self):
        (self.root / "fixture.txt").write_bytes(b"after")
        with self.assertRaises(PermissionError):
            self.rollback_journal()
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_journal_sequence_gap_is_not_accepted_as_valid_history(self):
        self.apply_journal()
        intent_file = next(self.root.glob(".intent-*.json"))
        result_file = next(self.root.glob(".result-*.json"))
        intent = json.loads(intent_file.read_text())
        self.assertEqual(intent["schemaVersion"], 2)
        intent["sequence"] = 2
        intent_file.write_bytes(m.SandboxWriter._json_bytes(intent))
        result = json.loads(result_file.read_text())
        result["intentDigest"] = m.digest(intent_file.read_bytes())
        result_file.write_bytes(m.SandboxWriter._json_bytes(result))
        with self.assertRaises(m.OutcomeUnknown):
            self.inspect_journal()



    def downgrade_apply_journal_to_v1(self):
        for intent_file in self.root.glob(".intent-*.json"):
            intent = json.loads(intent_file.read_text())
            self.assertNotIn("purpose", intent["attempt"])
            intent["schemaVersion"] = 1
            intent.pop("sequence")
            intent_file.write_bytes(m.SandboxWriter._json_bytes(intent))
            result_file = self.root / intent_file.name.replace(".intent-", ".result-")
            result = json.loads(result_file.read_text())
            result["schemaVersion"] = 1
            result["intentDigest"] = m.digest(intent_file.read_bytes())
            result_file.write_bytes(m.SandboxWriter._json_bytes(result))

    def test_single_legacy_apply_can_be_rolled_back_without_rewriting_history(self):
        self.apply_journal()
        self.downgrade_apply_journal_to_v1()
        old = {p.name: p.read_bytes() for p in self.root.glob(".*-*.json")}
        self.rollback_journal()
        for name, data in old.items():
            self.assertEqual((self.root / name).read_bytes(), data)
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"before")

    def test_ambiguous_legacy_order_is_rejected_until_a_v2_applied_frontier(self):
        self.apply_journal()
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.replace(m.digest(b"after"), b"after", m.digest(b"after"), time.time()+60, lambda _r: True, attempt=self.journal_attempt("legacy-other"))
        self.downgrade_apply_journal_to_v1()
        with self.assertRaises(PermissionError):
            self.rollback_journal()
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            writer.replace(m.digest(b"after"), b"after", m.digest(b"after"), time.time()+60, lambda _r: True, attempt=self.journal_attempt("ordered"))
            result = writer.replace(m.digest(b"after"), b"after", m.digest(b"after"), time.time()+60, lambda _r: True, attempt=self.rollback_attempt("restore-ordered", "ordered"))
        self.assertEqual(result["status"], "applied")
        self.assertEqual(sorted(row["sequence"] for row in self.inspect_journal()["records"] if row["sequence"] is not None), [3, 4])

    def test_apply_worker_rejects_rollback_metadata_without_rollback_operation(self):
        self.apply_journal()
        worker = Path(__file__).resolve().parents[1] / "scripts/enterprise-remediation/sandbox_worker.py"
        request = self.worker_request(self.rollback_attempt())
        request.update(beforeDigest=m.digest(b"after"),afterBase64="YmVmb3Jl",afterDigest=m.digest(b"before"))
        wire = json.dumps(request)+"\n"+json.dumps({"allowed": True,"validUntil":time.time()+60})+"\n"
        result = subprocess.run([sys.executable,"-B","-I",str(worker)],input=wire,text=True,capture_output=True,timeout=5)
        messages = [json.loads(line) for line in result.stdout.splitlines()]
        self.assertEqual([item["type"] for item in messages], ["result"])
        self.assertEqual(messages[0]["result"]["status"], "denied")
        self.assertEqual((self.root / "fixture.txt").read_bytes(), b"after")

    def test_failed_rollback_does_not_consume_original_for_a_new_approved_id(self):
        self.apply_journal()
        with m.SandboxWriter(str(self.root), self.identity) as writer:
            with self.assertRaises(PermissionError):
                writer.replace(m.digest(b"after"),b"before",m.digest(b"before"),time.time()+60,lambda _r: False,attempt=self.rollback_attempt())
        self.assertEqual(self.rollback_journal("fresh-id")["status"], "applied")


if __name__ == "__main__":
    unittest.main()
