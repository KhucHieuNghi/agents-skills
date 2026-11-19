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
        base = {"attemptId", "planDigest", "changeId", "customerId", "assetBindingDigest"}
        if not isinstance(attempt, dict) or set(attempt) not in (base, base | {"purpose", "rollbackId", "rollbackOf", "rollbackReceiptDigest"}):
            raise ValueError("Invalid attempt metadata")
        if "purpose" in attempt:
            if attempt["purpose"] != "rollback" or not isinstance(attempt["rollbackId"], str) or not re.fullmatch("[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}", attempt["rollbackId"]):
                raise ValueError("Invalid rollback identity")
            if str(uuid.UUID(attempt["rollbackOf"])) != attempt["rollbackOf"] or not isinstance(attempt["rollbackReceiptDigest"], str) or not re.fullmatch("[a-f0-9]{64}", attempt["rollbackReceiptDigest"]):
                raise ValueError("Invalid rollback binding")
        if str(uuid.UUID(attempt["attemptId"])) != attempt["attemptId"]:
            raise ValueError("Invalid attempt ID")
        for key in ("planDigest", "assetBindingDigest"):
            if not isinstance(attempt[key], str) or not re.fullmatch("[a-f0-9]{64}", attempt[key]):
                raise ValueError("Invalid attempt digest")
        if not isinstance(attempt["changeId"], str) or not re.fullmatch("[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}", attempt["changeId"]):
            raise ValueError("Invalid change ID")
        if not isinstance(attempt["customerId"], str) or not 1 <= len(attempt["customerId"]) <= 256:
            raise ValueError("Invalid customer ID")

    def _attempt_key(self, attempt):
        parts = [attempt["planDigest"], attempt["changeId"]]
        if attempt.get("purpose") == "rollback":
            parts = ["rollback", *parts, attempt["rollbackId"], attempt["rollbackOf"]]
        return digest(self._json_bytes(parts))

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

    def _scan_journal(self, allow_unresolved=False):
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
            if len(intents) > 100 or any(name.startswith(".result-") and ".intent-" + name[len(".result-"):] not in names for name in names):
                raise ValueError("Incomplete journal inventory")
            ids = set()
            records = []
            for name in intents:
                raw = self._read(name, ledger=True)
                intent = self._parse_record(raw)
                fields = {"schemaVersion", "attempt", "rootIdentity", "target", "beforeDigest", "afterDigest", "startedAt"}
                if not isinstance(intent, dict) or type(intent.get("schemaVersion")) is not int or intent["schemaVersion"] not in (1, 2) or set(intent) != (fields | {"sequence"} if intent["schemaVersion"] == 2 else fields):
                    raise ValueError("Invalid intent schema")
                if intent["schemaVersion"] == 2 and (type(intent["sequence"]) is not int or not 1 <= intent["sequence"] <= 100):
                    raise ValueError("Invalid journal sequence")
                self._valid_attempt(intent["attempt"])
                if intent["schemaVersion"] == 1 and "purpose" in intent["attempt"]:
                    raise ValueError("Legacy rollback is unsupported")
                expected_key = self._attempt_key(intent["attempt"])
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
                    if not allow_unresolved:
                        raise ValueError("Pending attempt")
                    records.append((expected_key, intent, digest(raw), None))
                    continue
                result = self._parse_record(self._read(result_name, ledger=True))
                if not isinstance(result, dict) or set(result) != {"schemaVersion", "intentDigest", "attemptId", "target", "expectedBeforeDigest", "expectedAfterDigest", "verifiedAfterDigest", "status", "commitAttempted", "completedAt"}:
                    raise ValueError("Invalid result schema")
                if type(result["schemaVersion"]) is not int or result["schemaVersion"] != intent["schemaVersion"] or result["intentDigest"] != digest(raw) or result["attemptId"] != intent["attempt"]["attemptId"] or result["target"] != NAME or result["expectedBeforeDigest"] != intent["beforeDigest"] or result["expectedAfterDigest"] != intent["afterDigest"]:
                    raise ValueError("Result binding mismatch")
                if result["status"] not in ("applied", "denied", "unknown") or result["commitAttempted"] is not (result["status"] != "denied") or result["verifiedAfterDigest"] != (intent["afterDigest"] if result["status"] == "applied" else None):
                    raise ValueError("Invalid attempt outcome")
                if result["status"] == "unknown" and not allow_unresolved:
                    raise ValueError("Unknown attempt outcome")
                if type(result["completedAt"]) not in (int, float) or not math.isfinite(result["completedAt"]) or result["completedAt"] < intent["startedAt"]:
                    raise ValueError("Invalid result timestamp")
                records.append((expected_key, intent, digest(raw), result))
            legacy = sum(row[1]["schemaVersion"] == 1 for row in records)
            sequences = sorted(row[1]["sequence"] for row in records if row[1]["schemaVersion"] == 2)
            if sequences != list(range(legacy + 1, len(records) + 1)):
                raise ValueError("Journal sequence gap or duplicate")
            return names, ids, records
        except BaseException:
            raise OutcomeUnknown("Journal requires recovery") from None

    def _begin_attempt(self, attempt, before_digest, after_digest):
        self._valid_attempt(attempt)
        if not re.fullmatch("[a-f0-9]{64}", before_digest):
            raise ValueError("Invalid before digest")
        key = self._attempt_key(attempt)
        names, ids, records = self._scan_journal()
        if len(records) >= 100:
            raise OutcomeUnknown("Attempt budget exceeded")
        if ".intent-" + key + ".json" in names or attempt["attemptId"] in ids:
            raise PermissionError("Attempt already consumed")
        if attempt.get("purpose") == "rollback":
            applied = [row for row in records if row[3]["status"] == "applied"]
            originals = [row for row in applied if row[1]["attempt"]["attemptId"] == attempt["rollbackOf"] and "purpose" not in row[1]["attempt"]]
            if len(originals) != 1 or any(row[1]["attempt"].get("rollbackOf") == attempt["rollbackOf"] for row in applied):
                raise PermissionError("Rollback original absent or consumed")
            original = originals[0]
            ordered = [row for row in applied if row[1]["schemaVersion"] == 2]
            latest = max(ordered, key=lambda row: row[1]["sequence"]) if ordered else applied[0] if len(applied) == 1 else None
            if latest is not original:
                raise PermissionError("Rollback ordering is unresolved")
            source = original[1]
            if any(source["attempt"][field] != attempt[field] for field in ("planDigest", "changeId", "customerId", "assetBindingDigest")) or before_digest != source["afterDigest"] or after_digest != source["beforeDigest"]:
                raise PermissionError("Rollback original scope or image mismatch")
        intent = {"schemaVersion": 2, "sequence": len(records) + 1, "attempt": dict(attempt), "rootIdentity": list(self.identity),
                  "target": NAME, "beforeDigest": before_digest, "afterDigest": after_digest, "startedAt": time.time()}
        raw = self._record(".intent-" + key + ".json", intent)
        return key, intent, digest(raw)

    def inspect(self):
        """Read-only observation under an existing cooperating-writer lock. Never repairs."""
        lock = None
        try:
            lock = os.open(".writer.lock", os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=self.fd)
            info = os.fstat(lock)
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
                raise ValueError("Invalid inspection lock")
            fcntl.flock(lock, fcntl.LOCK_SH | fcntl.LOCK_NB)
            _names, _ids, records = self._scan_journal(allow_unresolved=True)
            current = digest(self._read())
            summaries = []
            for key, intent, intent_digest, result in records:
                before = current == intent["beforeDigest"]
                after = current == intent["afterDigest"]
                summaries.append({
                    "journalKey": key, **intent["attempt"], "intentDigest": intent_digest,
                    "sequence": intent.get("sequence"),
                    "historicalStatus": result["status"] if result else "pending",
                    "commitAttempted": result["commitAttempted"] if result else None,
                    "expectedBeforeDigest": intent["beforeDigest"], "expectedAfterDigest": intent["afterDigest"],
                    "verifiedAfterDigest": result["verifiedAfterDigest"] if result else None,
                    "startedAt": intent["startedAt"], "completedAt": result["completedAt"] if result else None,
                    "currentRelation": "matches-both" if before and after else "matches-before" if before else "matches-after" if after else "matches-neither",
                })
            return {"status": "inspected", "schemaVersion": 1, "rootIdentity": list(self.identity),
                    "target": NAME, "observedAt": time.time(), "currentDigest": current,
                    "records": summaries, "executionAllowed": False}
        except BaseException:
            raise OutcomeUnknown("Inspection unavailable; retain sandbox") from None
        finally:
            if lock is not None:
                os.close(lock)

    def _finish_attempt(self, record, status):
        key, intent, intent_digest = record
        completed_at = time.time()
        if completed_at < intent["startedAt"]:
            raise OutcomeUnknown("Journal clock moved backwards")
        self._record(".result-" + key + ".json", {
            "schemaVersion": intent["schemaVersion"], "intentDigest": intent_digest, "attemptId": intent["attempt"]["attemptId"],
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
