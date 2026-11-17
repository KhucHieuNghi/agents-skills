from pathlib import Path
import hashlib
import json
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ARCHIVE = REPO / "build/agent-skills-solution-content-search-audit-0.1.18.tgz"
assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == "b075d893436616c65fc4c0da0767891adccdd46042cd5e4b74225f1d8f1fe520"
root = Path(tempfile.mkdtemp(prefix="nks-contract-0118-"))
extract = root / "extracted"
extract.mkdir()
subprocess.run(["tar", "-xzf", str(ARCHIVE), "-C", str(extract)], check=True)

def invoke(*args):
    return json.loads(subprocess.check_output(["node", *map(str, args)], cwd=REPO, text=True))

results = []
for target in ["codex", "claude-code", "codex,claude-code"]:
    project = root / target.replace(",", "-")
    project.mkdir()
    installed = invoke("dist/cli.js", "install-solution", "--release", extract / "package", "--digest", "feac2e6b93ee27c7151aefdf9061a2a9c6d34e6807d7261ac131f25c84ba45be", "--project", project, "--target", target)
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
    policy = project / "private-policy.json"
    policy.write_text(json.dumps({"values": ["Declared local content."]}))
    evidence_before = {str(p.relative_to(project / "run")): hashlib.sha256(p.read_bytes()).hexdigest() for p in (project / "run").rglob("*") if p.is_file()}
    redacted = invoke(cli, "redact-report", project / "run", policy, project / "derivatives")
    assert redacted["records"]
    for record in redacted["records"]:
        derivative = (project / "derivatives" / record["artifact"]).read_bytes()
        assert b"Declared local content." not in derivative
        assert hashlib.sha256(derivative).hexdigest() == record["snapshotHash"]
    html = (project / "derivatives/report.html").read_text()
    assert "Redacted presentation" in html
    assert "Declared local content." not in html
    for record in redacted["records"]:
        assert 'href="' + record["artifact"] + '"' in html
    for record in redacted["documents"]:
        assert hashlib.sha256((project / "derivatives" / record["artifact"]).read_bytes()).hexdigest() == record["snapshotHash"]
    coverage = json.loads((project / "derivatives/coverage.json").read_text())
    assert coverage["total"] == 1 and not coverage["complete"]
    evidence_after = {str(p.relative_to(project / "run")): hashlib.sha256(p.read_bytes()).hexdigest() for p in (project / "run").rglob("*") if p.is_file()}
    assert evidence_before == evidence_after
    assert "Declared local content." not in json.dumps(redacted)
    results.append({"redacted": redacted, "originalRunUnchanged": True, "target": target, "installation": installed, "run": json.loads(original), "tamperedBudgetRejected": True, "sourceUnchanged": page.read_text() == "# Fixture\nDeclared local content.\n"})
receipt = {"version": "0.1.18", "root": str(root), "runnerSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "results": results, "limits": "Offline synthetic fixture via freshly installed CLI; not native host semantic evaluation or live network attestation."}
(HERE / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(root)
