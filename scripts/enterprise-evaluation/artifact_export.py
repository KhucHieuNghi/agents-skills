"""Strict, bounded exporter for a frozen /work tar from a trusted broker.

Caller must supply bounded bytes, quiesce the container, and own a private parent
directory. This helper alone does not establish host or container isolation.
No archive member is executed; permissions and owners are never restored.
"""
import hashlib
import io
import os
from pathlib import Path
import shutil
import tarfile
import tempfile


def _validate_headers(data):
    """Reject metadata extensions before tarfile can consume them invisibly."""
    offset = 0
    while offset + 512 <= len(data):
        block = data[offset:offset + 512]
        if block == bytes(512):
            if len(data) - offset < 1024 or any(data[offset:]):
                raise ValueError("Invalid tar terminator")
            return
        try:
            member = tarfile.TarInfo.frombuf(block, "utf-8", "strict")
        except (tarfile.TarError, UnicodeError) as error:
            raise ValueError("Invalid archive header") from error
        if member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE):
            raise ValueError("Unsupported raw archive header")
        if member.size < 0:
            raise ValueError("Negative member size")
        offset += 512 + ((member.size + 511) // 512) * 512
    raise ValueError("Missing tar terminator")


def _private_directories(root, parts):
    current = root
    for part in parts:
        current = current / part
        current.mkdir(mode=0o700, exist_ok=True)


def export_archive(data, destination, *, max_archive_bytes=32 * 1024 * 1024,
                   max_expanded_bytes=16 * 1024 * 1024, max_entries=1000):
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise FileExistsError(destination)
    if len(data) > max_archive_bytes:
        raise ValueError("Archive byte limit exceeded")
    _validate_headers(data)
    staging = Path(tempfile.mkdtemp(prefix=".artifact-export-", dir=destination.parent))
    records = []
    seen = set()
    total = 0
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as tar:
            for count, member in enumerate(tar, 1):
                if count > max_entries:
                    raise ValueError("Archive entry limit exceeded")
                name = member.name.rstrip("/") if member.isdir() else member.name
                parts = name.split("/")
                if (not parts or parts[0] != "work" or len(parts) > 20
                        or any(p in ("", ".", "..") for p in parts)
                        or "\\" in name or len(name.encode()) > 1024
                        or any(ord(c) < 32 or ord(c) == 127 for c in name)):
                    raise ValueError("Unsafe archive path")
                if (member.pax_headers or member.sparse is not None
                        or member.type not in (tarfile.REGTYPE, tarfile.AREGTYPE, tarfile.DIRTYPE)
                        or member.linkname):
                    raise ValueError("Unsupported archive member")
                if name in seen:
                    raise ValueError("Duplicate archive path")
                seen.add(name)
                if len(parts) == 1 and not member.isdir():
                    raise ValueError("Archive root must be a directory")
                total += member.size
                if member.size < 0 or total > max_expanded_bytes:
                    raise ValueError("Expanded byte limit exceeded")
                target = staging.joinpath(*parts[1:])
                try:
                    if member.isdir():
                        if member.size:
                            raise ValueError("Directory payload is unsupported")
                        _private_directories(staging, parts[1:])
                    else:
                        _private_directories(staging, parts[1:-1])
                        stream = tar.extractfile(member)
                        payload = stream.read(member.size + 1)
                        if len(payload) != member.size:
                            raise ValueError("Truncated archive member")
                        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                        with os.fdopen(fd, "wb") as output:
                            output.write(payload)
                        records.append({"path": "/".join(parts[1:]), "bytes": len(payload),
                                        "sha256": hashlib.sha256(payload).hexdigest()})
                except (FileExistsError, NotADirectoryError) as error:
                    raise ValueError("Conflicting archive paths") from error
        # Private parent ownership is a required caller precondition. Never reuse
        # an output directory from a previous trial.
        if destination.exists() or destination.is_symlink():
            raise FileExistsError(destination)
        staging.rename(destination)
        return sorted(records, key=lambda item: item["path"])
    except tarfile.TarError as error:
        raise ValueError("Invalid uncompressed tar") from error
    finally:
        if staging.exists():
            shutil.rmtree(staging)
