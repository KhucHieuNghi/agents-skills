import importlib.util
import os
from pathlib import Path
import tempfile
import time
import unittest
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


if __name__ == "__main__":
    unittest.main()
