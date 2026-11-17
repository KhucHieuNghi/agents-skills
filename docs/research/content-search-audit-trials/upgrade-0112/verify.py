"""Replay isolated archive upgrades; never operate on a customer project."""

import hashlib
import json
import shutil
import subprocess
import tarfile
import tempfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[4]
PINS = {
    "0.1.9": (
        "e655ccd9846cb473c4f12cab26f6021dac6622d853c6b8a3e1f44b6e2fc53d7d",
        "7a7e14226f6f7149eae0a1681868f14d302649ea2353f276086b65df0f358425",
    ),
    "0.1.11": (
        "a87987d1fa3c77c01cbc3b12fe20de92137a60f68ba5711e4326040b348188e1",
        "291ec16837e349f3e4a6ad8ce5698ebfd72c8f26e3fd54842388a63ee2c4f5da",
    ),
    "0.1.12": (
        "9355b5a27f5e093d2c40e24060c766fc9207cdd5a4c6f75d9bc89f33c0b3cfeb",
        "9632eb3d61816651ff3a3615623d57c78027824bb7a3ba87165979f9643dd135",
    ),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def snapshot(root):
    result = {}
    for path in sorted(root.rglob("*")):
        key = path.relative_to(root).as_posix()
        if path.is_symlink():
            result[key] = {"link": str(path.readlink())}
        elif path.is_file():
            result[key] = {"sha256": sha(path.read_bytes())}
        elif path.is_dir():
            result[key] = {"directory": True}
    return result


def run(command, version, project, target):
    return subprocess.run(
        [
            "node", str(REPO / "dist/cli.js"), command,
            "--release", str(root / version / "package"),
            "--digest", PINS[version][1],
            "--project", str(project), "--target", target,
        ],
        cwd=REPO, text=True, capture_output=True, check=False,
    )


def require_success(result):
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


root = Path(tempfile.mkdtemp(prefix="nks-upgrade-0112-"))
archives = {}
for version, (archive_hash, _) in PINS.items():
    archive = REPO / f"build/agent-skills-solution-content-search-audit-{version}.tgz"
    assert sha(archive.read_bytes()) == archive_hash, version
    destination = root / version
    destination.mkdir()
    with tarfile.open(archive) as bundle:
        bundle.extractall(destination, filter="data")
    archives[version] = snapshot(destination)

results = []
for previous in ("0.1.9", "0.1.11"):
    for target in ("codex", "claude-code", "codex,claude-code"):
        label = previous + "-" + target.replace(",", "-")
        project = root / label
        project.mkdir()
        customer = project / "customer-notes.md"
        customer.write_text("Customer-owned content: retain exact bytes.\n")
        require_success(run("install-solution", previous, project, target))
        backup = root / (label + "-backup")
        shutil.copytree(project, backup, symlinks=True)
        before = snapshot(project)
        paths = []
        if "codex" in target.split(","):
            paths.append(project / ".agents/skills/content-search-audit")
        if "claude-code" in target.split(","):
            paths.append(project / ".claude/skills/content-search-audit")

        entry = paths[0] / "SKILL.md"
        original = entry.read_bytes()
        entry.write_bytes(original + b"\nCustomer modification\n")
        modified = snapshot(project)
        rejected = run("upgrade-solution", "0.1.12", project, target)
        assert rejected.returncode != 0 and "modified" in rejected.stderr.lower()
        assert snapshot(project) == modified
        entry.write_bytes(original)
        assert snapshot(project) == before

        upgrade = require_success(run("upgrade-solution", "0.1.12", project, target))
        installed = json.loads((project / ".agent-skills/installed.json").read_text())
        lock = installed["solutions"]["content-search-audit"]
        assert lock["version"] == "0.1.12"
        assert lock["digest"] == PINS["0.1.12"][1]
        assert lock["targets"] == target.split(",")
        expected = snapshot(root / "0.1.12/package/skills/content-search-audit")
        assert expected
        for path in paths:
            assert snapshot(path.resolve()) == expected
        assert snapshot(project)["customer-notes.md"] == before["customer-notes.md"]
        after = snapshot(project)

        # Restore the entire isolated project from its known pre-upgrade backup.
        # This is not a CLI downgrade, a live rollback or a crash-recovery claim.
        shutil.rmtree(project)
        shutil.copytree(backup, project, symlinks=True)
        assert snapshot(project) == before
        results.append({
            "fromVersion": previous, "target": target,
            "modifiedInstallExitCode": rejected.returncode,
            "modifiedInstallError": rejected.stderr.strip(),
            "modifiedTreeUnchanged": True,
            "upgradeReceipt": upgrade, "installedLock": installed,
            "installedFilesEqualExtractedArchive": True,
            "customerFileUnchanged": True,
            "restoredFilesDirectoriesAndLinksEqualBackup": True,
            "before": before, "after": after,
        })

for version in PINS:
    assert snapshot(root / version) == archives[version]
    archive = REPO / f"build/agent-skills-solution-content-search-audit-{version}.tgz"
    assert sha(archive.read_bytes()) == PINS[version][0]

receipt = {
    "version": "0.1.12", "root": str(root), "pins": PINS,
    "runnerSha256": sha(Path(__file__).read_bytes()),
    "cliSha256": sha((REPO / "dist/cli.js").read_bytes()),
    "results": results, "sourceArchivesAndExtractedTreesUnchanged": True,
    "limitations": "Isolated CLI upgrade and whole-project backup restoration only; "
    "no native model session, CLI downgrade, live rollback or semantic acceptance.",
}
output = root / "receipt.json"
output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"receipt": str(output), "verifiedUpgradeCases": len(results)}))
