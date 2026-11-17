"""Author-side installed CLI checks; no native model or transcription claim."""
import hashlib
import json
import subprocess
import tarfile
import tempfile
import wave
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
COMPONENT = "b6b9a1d81f786cfe25c85047187108791d42e208748446a97ae2a20657cc819f"
RELEASE = "1cd662b8c2c244d97a1cffe7409526e3c641832f11fbc87185a6e2a1bc9c4a4d"
ARCHIVE = "2d5051e7981c0ea6a199520bc98f612ff54816e8290dfea8aa29012bfe24cc49"


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def digest(directory):
    records = "".join(
        f"{f.relative_to(directory).as_posix()}\0{sha(f)}\n"
        for f in sorted(directory.rglob("*")) if f.is_file()
    )
    return hashlib.sha256(records.encode()).hexdigest()


def save(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def call(*args):
    result = subprocess.run(["rtk", "proxy", *map(str, args)],
                            capture_output=True, text=True, check=True)
    return json.loads(result.stdout) if result.stdout.strip() else None


archive = REPO / "build/agent-skills-solution-content-search-audit-0.1.25.tgz"
assert sha(archive) == ARCHIVE
root = Path(tempfile.mkdtemp(prefix="nks-transcript-0125-"))
(root / "extracted").mkdir()
call("tar", "-xzf", archive, "-C", root / "extracted")
results = []
for target in ("codex", "claude-code", "codex,claude-code"):
    project = root / target.replace(",", "-")
    project.mkdir()
    installation = call("node", REPO / "dist/cli.js", "install-solution",
                        "--release", root / "extracted/package", "--digest", RELEASE,
                        "--project", project, "--target", target)
    skill = project / (".claude" if target == "claude-code" else ".agents") / "skills/content-search-audit"
    assert digest(skill) == COMPONENT
    save(project / "installation.json", installation)
    content = project / "content"
    content.mkdir()
    transcript = content / "supplied-vi.txt"
    text = "Bản ghi do chủ nội dung cung cấp: chọn vùng Miền Tây.\n"
    transcript.write_text(text)
    audio = content / "silent-control.wav"
    # Real silent control, explicitly unrelated to the supplied transcript.
    with wave.open(str(audio), "wb") as sound:
        sound.setparams((1, 1, 8000, 80, "NONE", "not compressed"))
        sound.writeframes(bytes([128]) * 80)
    missing = content / "unavailable-transcript.txt"
    before = {f.name: sha(f) for f in content.iterdir()}
    config = {"localRoots": [str(content)], "inventoryComplete": True,
              "partitionSize": 1, "inputs": [
        {"path": str(transcript), "source": source, "type": "transcript", "locale": "vi"}
        for source in ("cms", "repository")
    ] + [{"path": str(audio), "source": "repository", "type": "audio"},
         {"path": str(missing), "source": "cms", "type": "transcript"}]}
    save(project / "config.json", config)

    def cli(*args):
        return call("node", skill / "scripts/audit.mjs", *args)

    expected = {"pending": 1, "audited": 0, "failed": 1, "blocked": 0,
                "unsupported": 1, "excluded": 0}
    for mode in ("start", "campaign"):
        directory = project / mode
        started = cli(mode, project / "config.json", directory)
        validated = cli("validate" if mode == "start" else "campaign-validate", directory)
        save(project / f"{mode}-result.json", started)
        save(project / f"{mode}-validation.json", validated)
        assert validated["valid"]
        assert validated["coverage"]["complete"] is False
        if mode == "start":
            assert validated["completionAllowed"] is False
        assert validated["coverage"]["total"] == 3
        assert validated["coverage"]["states"] == expected
        directories = [directory]
        if mode == "campaign":
            manifest = json.loads((directory / "campaign.json").read_text())
            directories = [directory / part["path"] for part in manifest["parts"]]
            assert len(directories) == 3
        inventory, evidence, findings = [], [], []
        for part in directories:
            for filename, destination in [("inventory.jsonl", inventory), ("evidence.jsonl", evidence)]:
                destination.extend(json.loads(line) for line in (part / filename).read_text().splitlines())
            findings.extend(json.loads((part / "findings.json").read_text()))
        supplied = next(item for item in inventory if item["path"] == str(transcript))
        assert supplied["sources"] == ["cms", "repository"]
        assert supplied["state"] == "pending" and supplied["locale"] == "vi"
        assert len(evidence) == 1 and evidence[0]["value"] == text
        assert evidence[0]["itemId"] == supplied["itemId"] and not findings
        results.append({"target": target, "mode": mode, "coverage": validated["coverage"],
                        "completionAllowed": False, "evidenceCount": 1, "findingCount": 0})
    assert before == {f.name: sha(f) for f in content.iterdir()}
    assert digest(skill) == COMPONENT

files = [f for f in root.rglob("*") if f.is_file()
         and "skills" not in f.relative_to(root).parts
         and "extracted" not in f.relative_to(root).parts]
with tarfile.open(root / "artifacts.tgz", "w:gz") as output:
    for file in files:
        output.add(file, arcname=str(file.relative_to(root)), recursive=False)
with tarfile.open(root / "artifacts.tgz") as retained:
    for file in files:
        assert retained.extractfile(str(file.relative_to(root))).read() == file.read_bytes()
save(root / "receipt.json", {"version": "0.1.25", "root": str(root),
    "runnerSha256": sha(Path(__file__)), "releaseArchiveSha256": ARCHIVE,
    "componentDigest": COMPONENT, "results": results,
    "artifactArchiveSha256": sha(root / "artifacts.tgz"), "byteComparedFiles": len(files),
    "limits": "Author-side installed CLI accounting. No speech recognition, semantic audit or model compliance measured.",
    "releaseAccepted": False})
print(root)
