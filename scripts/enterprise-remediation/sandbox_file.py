"""POSIX sandbox primitive, not a public executor or authorization source.

Caller must own an exclusive private sandbox and supply a trusted authorization
callback. Only cooperating writers are serialized; this is not a CAS primitive
against arbitrary same-UID filesystem mutation. No production asset support.
"""
import fcntl
import hashlib
import json
import re
import uuid
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

    def _read(self, name=NAME, ledger=False):
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=self.fd)
        try:
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_mode & 0o111 or info.st_size > LIMIT:
                raise ValueError("Unsupported sandbox target")
            limit = 8192 if ledger else LIMIT
            if ledger and (info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_size > limit):
                raise ValueError("Unsupported journal file")
            data = bytearray()
            while len(data) <= limit:
                chunk = os.read(fd, min(65536, limit + 1 - len(data)))
                if not chunk:
                    return bytes(data)
                data.extend(chunk)
            raise ValueError("Sandbox target budget")
        finally:
            os.close(fd)

    @staticmethod
    def _json_bytes(value):
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode("utf8")

    @staticmethod
    def _parse_record(data):
        def unique(pairs):
            value = {}
            for key, item in pairs:
                if key in value:
                    raise ValueError("Duplicate journal member")
                value[key] = item
            return value
        return json.loads(data, object_pairs_hook=unique, parse_constant=lambda _v: (_ for _ in ()).throw(ValueError("Nonfinite journal value")))

    @staticmethod
    def _valid_attempt(attempt):
        if not isinstance(attempt, dict) or set(attempt) != {"attemptId", "planDigest", "changeId", "customerId", "assetBindingDigest"}:
            raise ValueError("Invalid attempt metadata")
        if str(uuid.UUID(attempt["attemptId"])) != attempt["attemptId"]:
            raise ValueError("Invalid attempt ID")
        for key in ("planDigest", "assetBindingDigest"):
            if not isinstance(attempt[key], str) or not re.fullmatch("[a-f0-9]{64}", attempt[key]):
                raise ValueError("Invalid attempt digest")
        if not isinstance(attempt["changeId"], str) or not re.fullmatch("[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}", attempt["changeId"]):
            raise ValueError("Invalid change ID")
        if not isinstance(attempt["customerId"], str) or not 1 <= len(attempt["customerId"]) <= 256:
            raise ValueError("Invalid customer ID")

    def _record(self, name, value):
        data = self._json_bytes(value)
        if len(data) > 8192:
            raise OutcomeUnknown("Journal budget exceeded")
        try:
            staged_name = ".journal-stage-" + secrets.token_hex(16)
            fd = os.open(staged_name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=self.fd)
            with os.fdopen(fd, "wb") as stream:
                stream.write(data)
                stream.flush()
                os.fsync(stream.fileno())
            # Publish only fsynced bytes; link is exclusive and never overwrites a final record.
            os.link(staged_name, name, src_dir_fd=self.fd, dst_dir_fd=self.fd, follow_symlinks=False)
            os.fsync(self.fd)
            os.unlink(staged_name, dir_fd=self.fd)
            os.fsync(self.fd)
        except BaseException:
            raise OutcomeUnknown("Journal persistence incomplete") from None
        return data

    def _begin_attempt(self, attempt, before_digest, after_digest):
        self._valid_attempt(attempt)
        if not re.fullmatch("[a-f0-9]{64}", before_digest):
            raise ValueError("Invalid before digest")
        key = digest(self._json_bytes([attempt["planDigest"], attempt["changeId"]]))
        try:
            names = set()
            with os.scandir(self.fd) as entries:
                for index, entry in enumerate(entries):
                    if index >= 256:
                        raise ValueError("Sandbox directory budget exceeded")
                    if entry.name.startswith(".journal-stage-"):
                        raise ValueError("Incomplete journal publication")
                    if entry.name.startswith((".intent-", ".result-")):
                        if not re.fullmatch(r"\.(intent|result)-[a-f0-9]{64}\.json", entry.name):
                            raise ValueError("Malformed journal name")
                        names.add(entry.name)
            intents = sorted(name for name in names if name.startswith(".intent-"))
            if len(intents) > 100 or len(names) != 2 * len(intents):
                raise ValueError("Incomplete journal inventory")
            ids = set()
            for name in intents:
                raw = self._read(name, ledger=True)
                intent = self._parse_record(raw)
                if not isinstance(intent, dict) or set(intent) != {"schemaVersion", "attempt", "rootIdentity", "target", "beforeDigest", "afterDigest", "startedAt"} or type(intent["schemaVersion"]) is not int or intent["schemaVersion"] != 1:
                    raise ValueError("Invalid intent schema")
                self._valid_attempt(intent["attempt"])
                expected_key = digest(self._json_bytes([intent["attempt"]["planDigest"], intent["attempt"]["changeId"]]))
                if name != ".intent-" + expected_key + ".json" or not isinstance(intent["rootIdentity"], list) or any(type(v) is not int for v in intent["rootIdentity"]) or intent["rootIdentity"] != list(self.identity) or intent["target"] != NAME:
                    raise ValueError("Intent binding mismatch")
                for field in ("beforeDigest", "afterDigest"):
                    if not isinstance(intent[field], str) or not re.fullmatch("[a-f0-9]{64}", intent[field]):
                        raise ValueError("Invalid intent digest")
                if type(intent["startedAt"]) not in (int, float) or not math.isfinite(intent["startedAt"]) or intent["startedAt"] < 0:
                    raise ValueError("Invalid intent timestamp")
                if intent["attempt"]["attemptId"] in ids:
                    raise ValueError("Duplicate attempt ID")
                ids.add(intent["attempt"]["attemptId"])
                result_name = ".result-" + expected_key + ".json"
                if result_name not in names:
                    raise ValueError("Pending attempt")
                result = self._parse_record(self._read(result_name, ledger=True))
                if not isinstance(result, dict) or set(result) != {"schemaVersion", "intentDigest", "attemptId", "target", "expectedBeforeDigest", "expectedAfterDigest", "verifiedAfterDigest", "status", "commitAttempted", "completedAt"}:
                    raise ValueError("Invalid result schema")
                if type(result["schemaVersion"]) is not int or result["schemaVersion"] != 1 or result["intentDigest"] != digest(raw) or result["attemptId"] != intent["attempt"]["attemptId"] or result["target"] != NAME or result["expectedBeforeDigest"] != intent["beforeDigest"] or result["expectedAfterDigest"] != intent["afterDigest"]:
                    raise ValueError("Result binding mismatch")
                if result["status"] not in ("applied", "denied") or result["commitAttempted"] is not (result["status"] == "applied") or result["verifiedAfterDigest"] != (intent["afterDigest"] if result["status"] == "applied" else None):
                    raise ValueError("Unknown attempt outcome")
                if type(result["completedAt"]) not in (int, float) or not math.isfinite(result["completedAt"]) or result["completedAt"] < intent["startedAt"]:
                    raise ValueError("Invalid result timestamp")
            if len(intents) >= 100:
                raise ValueError("Attempt budget exceeded")
        except BaseException:
            raise OutcomeUnknown("Journal requires recovery") from None
        if ".intent-" + key + ".json" in names or attempt["attemptId"] in ids:
            raise PermissionError("Attempt already consumed")
        intent = {"schemaVersion": 1, "attempt": dict(attempt), "rootIdentity": list(self.identity),
                  "target": NAME, "beforeDigest": before_digest, "afterDigest": after_digest, "startedAt": time.time()}
        raw = self._record(".intent-" + key + ".json", intent)
        return key, intent, digest(raw)

    def _finish_attempt(self, record, status):
        key, intent, intent_digest = record
        completed_at = time.time()
        if completed_at < intent["startedAt"]:
            raise OutcomeUnknown("Journal clock moved backwards")
        self._record(".result-" + key + ".json", {
            "schemaVersion": 1, "intentDigest": intent_digest, "attemptId": intent["attempt"]["attemptId"],
            "target": NAME, "expectedBeforeDigest": intent["beforeDigest"], "expectedAfterDigest": intent["afterDigest"],
            "verifiedAfterDigest": intent["afterDigest"] if status == "applied" else None,
            "status": status, "commitAttempted": bool(getattr(self, "commit_attempted", False)), "completedAt": completed_at,
        })

    def replace(self, before_digest, after_bytes, after_digest, valid_until, authorize, attempt=None):
        if not isinstance(after_bytes, bytes) or len(after_bytes) > LIMIT or digest(after_bytes) != after_digest:
            raise ValueError("Invalid replacement bytes")
        if not isinstance(valid_until, (int, float)) or isinstance(valid_until, bool) or not math.isfinite(valid_until) or not callable(authorize):
            raise ValueError("Invalid commit gate")
        self.commit_attempted = False
        record = None
        recorded = False
        lock = os.open(".writer.lock", os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW | os.O_NONBLOCK, 0o600, dir_fd=self.fd)
        staged = None
        commit_attempted = False
        try:
            info = os.fstat(lock)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError("Invalid sandbox lock")
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            if attempt is not None:
                record = self._begin_attempt(attempt, before_digest, after_digest)
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
            if record is not None:
                self._finish_attempt(record, "applied")
                recorded = True
            return {"status": "applied", "target": NAME, "rootIdentity": self.identity, "beforeDigest": before_digest, "afterDigest": after_digest}
        except BaseException as error:
            if record is not None and not recorded:
                self._finish_attempt(record, "unknown" if self.commit_attempted else "denied")
            if (commit_attempted or self.commit_attempted) and not isinstance(error, OutcomeUnknown):
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
