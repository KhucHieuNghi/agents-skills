from pathlib import Path
import hashlib
import json
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ARCHIVE = REPO / "build/agent-skills-solution-content-search-audit-0.1.15.tgz"
assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == "efe25161862131bee2c264b0f4885174da0ba3371fa9c15a9d1eec31d4362034"
root = Path(tempfile.mkdtemp(prefix="nks-contract-0115-"))
extract = root / "extracted"
extract.mkdir()
subprocess.run(["tar", "-xzf", str(ARCHIVE), "-C", str(extract)], check=True)

def invoke(*args):
    return json.loads(subprocess.check_output(["node", *map(str, args)], cwd=REPO, text=True))

results = []
for target in ["codex", "claude-code", "codex,claude-code"]:
    project = root / target.replace(",", "-")
    project.mkdir()
    installed = invoke("dist/cli.js", "install-solution", "--release", extract / "package", "--digest", "ea45ca04aebabbcb47abaa2bcd39928659a261640e0be9c93e60669648cbe160", "--project", project, "--target", target)
    cli = project / (".agents/skills" if "codex" in target else ".claude/skills") / "content-search-audit/scripts/audit.mjs"
    content = project / "content"
    content.mkdir()
    page = content / "page.md"
    page.write_text("# Fixture\nDeclared local content.\n")
    config = {"inputs": [{"path": str(page), "source": "fixture"}], "localRoots": [str(content)], "inventoryComplete": True, "maxRunBytes": 2097152}
    config_file = project / "input.json"
    config_file.write_text(json.dumps(config))
    started = invoke(cli, "start", config_file, project / "run")
    runfile = project / "run/run.json"
    original = runfile.read_bytes()
    run = json.loads(original)
    assert run["version"] == "0.2.0" and run["contractVersion"] == 1
    assert run["scope"]["inputs"] == config["inputs"]
    assert run["sourcePermissions"] == {"localRoots": [str(content)], "network": None}
    assert run["budgets"] == {"maxRunBytes": 2097152, "maxLocalBytes": 10485760, "network": None}
    assert invoke(cli, "validate", project / "run")["valid"]
    run["budgets"]["maxRunBytes"] = 1048576
    runfile.write_text(json.dumps(run))
    rejected = subprocess.run(["node", str(cli), "validate", str(project / "run")], capture_output=True, text=True)
    assert rejected.returncode != 0
    runfile.write_bytes(original)
    assert invoke(cli, "validate", project / "run")["valid"]
    assert (project / ".agent-skills/installed.json").is_file()
    results.append({"target": target, "installation": installed, "run": json.loads(original), "tamperedBudgetRejected": True, "sourceUnchanged": page.read_text() == "# Fixture\nDeclared local content.\n"})
receipt = {"version": "0.1.15", "root": str(root), "runnerSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "results": results, "limits": "Offline synthetic fixture via freshly installed CLI; not native host semantic evaluation or live network attestation."}
(HERE / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(root)
