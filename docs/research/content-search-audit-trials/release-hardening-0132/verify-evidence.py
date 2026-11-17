"""Verify this frozen packet without extracting or executing native trial content."""
import hashlib
import json
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parent
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest = json.loads((root / "evidence-manifest.json").read_text())
actual_files = {str(p.relative_to(root)) for p in root.rglob("*") if p.is_file() and p.name != "evidence-manifest.json"}
assert actual_files == set(manifest["files"]), "Packet file inventory changed"
for name, digest in manifest["files"].items():
    assert sha((root / name).read_bytes()) == digest, f"Packet bytes changed: {name}"
archives = json.loads((root / "raw-archives.json").read_text())
for row in archives:
    archive = root / row["archive"]
    assert sha(archive.read_bytes()) == row["sha256"], row["archive"]
    with tarfile.open(archive) as stream:
        members = [m for m in stream.getmembers() if m.isfile()]
        assert len(members) == len({m.name for m in members}), "Duplicate archive members"
        actual = {m.name: sha(stream.extractfile(m).read()) for m in members}
    assert actual == row["members"], row["archive"]
print(json.dumps({"valid": True, "files": len(manifest["files"]), "archives": len(archives), "releaseAccepted": False}))
