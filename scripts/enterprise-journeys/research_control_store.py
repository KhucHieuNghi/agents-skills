"""Opaque encrypted control records only. No keys or research text enter this worker."""
import ctypes
import json
import os
from pathlib import Path
import sqlite3
import stat
import tempfile
import shutil
import sys


def publish_exclusive(source, target):
    libc = ctypes.CDLL(None, use_errno=True)
    if sys.platform == "darwin":
        rename = libc.renamex_np
        rename.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_uint]
        result = rename(os.fsencode(source), os.fsencode(target), 4)  # RENAME_EXCL
    elif sys.platform.startswith("linux"):
        rename = libc.renameat2
        rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
        result = rename(-100, os.fsencode(source), -100, os.fsencode(target), 1)  # RENAME_NOREPLACE
    else:
        raise ValueError("unsupported atomic publication")
    if result != 0:
        raise OSError(ctypes.get_errno(), "publication failed")


def main():
    os.umask(0o077)
    request = json.loads(sys.stdin.buffer.read(8 * 1024 * 1024 + 1))
    if set(request) != {"operation", "directory", "scope", "expected", "envelope"}:
        raise ValueError("shape")
    root = Path(request["directory"])
    if not root.is_absolute() or root.resolve() != root:
        raise ValueError("path")
    target = root
    staging = None
    if request["operation"] == "create":
        if root.exists() or root.is_symlink():
            raise ValueError("existing target")
        staging = Path(tempfile.mkdtemp(prefix=".research-control-init-", dir=root.parent))
        root = staging
    info = root.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        raise ValueError("directory")
    path = root / "control.sqlite"
    if request["operation"] == "create":
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY | os.O_NOFOLLOW, 0o600)
        os.close(fd)
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1 or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
        raise ValueError("database")
    connection = sqlite3.connect(str(path), timeout=5, isolation_level=None)
    try:
        connection.execute("PRAGMA journal_mode=DELETE")
        connection.execute("PRAGMA synchronous=FULL")
        connection.execute("BEGIN IMMEDIATE")
        if request["operation"] == "create":
            if request["expected"] is not None:
                raise ValueError("expected")
            connection.execute("CREATE TABLE control (id INTEGER PRIMARY KEY CHECK(id=1), scope TEXT NOT NULL, revision INTEGER NOT NULL, envelope TEXT NOT NULL)")
            connection.execute("INSERT INTO control VALUES (1, ?, 1, ?)", (request["scope"], request["envelope"]))
        row = connection.execute("SELECT scope,revision,envelope FROM control WHERE id=1").fetchone()
        if not row or row[0] != request["scope"]:
            raise ValueError("scope")
        if request["operation"] == "replace":
            if type(request["expected"]) is not int or row[1] != request["expected"]:
                connection.rollback()
                print(json.dumps({"error": "conflict"}))
                return
            connection.execute("UPDATE control SET revision=?,envelope=? WHERE id=1", (row[1]+1, request["envelope"]))
            row = (row[0], row[1]+1, request["envelope"])
        elif request["operation"] not in {"create", "read"}:
            raise ValueError("operation")
        connection.commit()
        connection.close()
        if staging is not None:
            descriptor = os.open(staging, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
            publish_exclusive(staging, target)
            staging = None
            descriptor = os.open(target.parent, os.O_RDONLY | os.O_DIRECTORY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        print(json.dumps({"revision": row[1], "envelope": row[2]}))
    finally:
        connection.close()
        if staging is not None and staging.exists():
            shutil.rmtree(staging)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        # A mutation may already be committed/published. Never retry blindly.
        # Never echo payloads, filesystem paths or SQL errors containing supplied values.
        print(json.dumps({"error": "storage-outcome-unknown"}))
        sys.exit(1)
