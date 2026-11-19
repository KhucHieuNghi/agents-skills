"""POSIX sandbox primitive, not a public executor or authorization source.

Caller must own an exclusive private sandbox and supply a trusted authorization
callback. Only cooperating writers are serialized; this is not a CAS primitive
against arbitrary same-UID filesystem mutation. No production asset support.
"""
import fcntl
import hashlib
import math
import os
import secrets
import stat
import sys
import time

LIMIT = 1024 * 1024
NAME = "fixture.txt"


class OutcomeUnknown(RuntimeError):
    """Replacement may have happened; inspect state before any retry."""


def digest(data):
    return hashlib.sha256(data).hexdigest()


class SandboxWriter:
    def __init__(self, root, expected_identity):
        if not isinstance(root, str) or len(root) > 8192 or not root.startswith("/"):
            raise ValueError("Invalid sandbox root")
        parts = root.split("/")[1:]
        if not parts or any(part in ("", ".", "..") for part in parts):
            raise ValueError("Invalid sandbox root components")
        flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
        fd = os.open("/", flags)
        try:
            for part in parts:
                child = os.open(part, flags, dir_fd=fd)
                os.close(fd)
                fd = child
            info = os.fstat(fd)
            if (info.st_dev, info.st_ino) != expected_identity or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
                raise ValueError("Unapproved or non-private sandbox root")
            self.fd = fd
            self.identity = expected_identity
        except BaseException:
            os.close(fd)
            raise

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        os.close(self.fd)

    def _read(self, name=NAME):
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=self.fd)
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_mode & 0o111 or info.st_size > LIMIT:
                raise ValueError("Unsupported sandbox target")
            data = bytearray()
            while len(data) <= LIMIT:
                chunk = os.read(fd, min(65536, LIMIT + 1 - len(data)))
                if not chunk:
                    return bytes(data)
                data.extend(chunk)
            raise ValueError("Sandbox target budget")
        finally:
            os.close(fd)

    def replace(self, before_digest, after_bytes, after_digest, valid_until, authorize):
        if not isinstance(after_bytes, bytes) or len(after_bytes) > LIMIT or digest(after_bytes) != after_digest:
            raise ValueError("Invalid replacement bytes")
        if not isinstance(valid_until, (int, float)) or isinstance(valid_until, bool) or not math.isfinite(valid_until) or not callable(authorize):
            raise ValueError("Invalid commit gate")
        lock = os.open(".writer.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=self.fd)
        staged = None
        commit_attempted = False
        try:
            info = os.fstat(lock)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError("Invalid sandbox lock")
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if digest(self._read()) != before_digest:
                raise ValueError("Stale sandbox precondition")
            staged = ".staged-" + secrets.token_hex(16)
            fd = os.open(staged, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600, dir_fd=self.fd)
            staged_info = os.fstat(fd)
            with os.fdopen(fd, "wb") as stream:
                stream.write(after_bytes)
                stream.flush()
                os.fsync(stream.fileno())
            request = {"target": NAME, "rootIdentity": self.identity, "beforeDigest": before_digest, "afterDigest": after_digest}
            gate = authorize(request)
            commit_deadline = valid_until
            if isinstance(gate, dict) and set(gate) == {"allowed", "validUntil"}:
                fresh = gate["validUntil"]
                if (gate["allowed"] is not True or isinstance(fresh, bool)
                        or not isinstance(fresh, (int, float)) or not math.isfinite(fresh)):
                    raise PermissionError("Invalid refreshed commit gate")
                commit_deadline = min(valid_until, fresh)
            elif gate is not True:
                raise PermissionError("Sandbox commit not authorized")
            if digest(self._read()) != before_digest:
                raise ValueError("Sandbox precondition changed during preparation")
            current = os.stat(staged, dir_fd=self.fd, follow_symlinks=False)
            if ((current.st_dev, current.st_ino) != (staged_info.st_dev, staged_info.st_ino)
                    or stat.S_IMODE(current.st_mode) != 0o600
                    or digest(self._read(staged)) != after_digest):
                raise ValueError("Sandbox staging changed during preparation")
            if time.time() >= commit_deadline:
                raise PermissionError("Sandbox commit authorization expired")
            # Once rename is attempted, interruption cannot prove the target unchanged.
            self.commit_attempted = True
            commit_attempted = True
            os.replace(staged, NAME, src_dir_fd=self.fd, dst_dir_fd=self.fd)
            staged = None
            os.fsync(self.fd)
            if digest(self._read()) != after_digest:
                raise OutcomeUnknown("Sandbox post-write digest mismatch")
            return {"status": "applied", "target": NAME, "rootIdentity": self.identity, "beforeDigest": before_digest, "afterDigest": after_digest}
        except BaseException as error:
            if commit_attempted and not isinstance(error, OutcomeUnknown):
                raise OutcomeUnknown("Sandbox post-commit verification incomplete") from None
            raise
        finally:
            active_error = sys.exc_info()[1]
            try:
                if staged is not None:
                    try:
                        os.unlink(staged, dir_fd=self.fd)
                    except FileNotFoundError:
                        pass
                    except OSError:
                        if active_error is None:
                            raise
                        active_error.sandbox_cleanup_incomplete = True
            finally:
                os.close(lock)
