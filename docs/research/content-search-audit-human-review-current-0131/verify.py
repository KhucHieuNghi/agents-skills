"""Read-only integrity check; does not execute archives or adjudicate content."""

import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


packet = Path(__file__).resolve().parent
root = packet.parents[2]
manifest_bytes = (packet / "manifest.json").read_bytes()
manifest = json.loads(manifest_bytes)
seen = set()
for record in manifest["files"]:
    relative = PurePosixPath(record["path"])
    require(not relative.is_absolute() and ".." not in relative.parts, "Unsafe manifest path")
    require(str(relative) not in seen, "Duplicate manifest path")
    seen.add(str(relative))
    target = (root / relative).resolve()
    require(target.is_relative_to(root), "Manifest path escapes repository")
    data = target.read_bytes()
    require(len(data) == record["bytes"], f"Byte-length mismatch: {relative}")
    require(digest(data) == record["sha256"], f"Hash mismatch: {relative}")

archives = []
for trial in ["native-0131", "expanded-0131", "technical-controls-0131"]:
    directory = root / "docs/research/content-search-audit-trials" / trial
    receipt = json.loads((directory / "archive-validation.json").read_bytes())
    archive = directory / "artifacts.tgz"
    require(digest(archive.read_bytes()) == receipt["archiveSha256"], f"Archive mismatch: {trial}")
    observed = {}
    with tarfile.open(archive, "r:gz") as tar:
        for member in tar:
            if member.isdir():
                continue
            require(member.isfile(), f"Nonregular archive entry: {member.name}")
            name = str(PurePosixPath(member.name))
            require(not name.startswith("/") and ".." not in PurePosixPath(name).parts, "Unsafe archive path")
            require(name not in observed, f"Duplicate archive member: {name}")
            stream = tar.extractfile(member)
            require(stream is not None, f"Unreadable archive member: {name}")
            with stream:
                hasher = hashlib.sha256()
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    hasher.update(chunk)
            observed[name] = hasher.hexdigest()
    require(observed == receipt["members"], f"Archived member hashes differ: {trial}")
    archives.append({"trial": trial, "verifiedMembers": len(observed)})

print(json.dumps({
    "manifestSha256": digest(manifest_bytes),
    "verifiedFiles": len(seen),
    "archives": archives,
    "integrityValid": True,
    "semanticAcceptanceAssessed": False,
    "releaseAccepted": False,
}, indent=2))
