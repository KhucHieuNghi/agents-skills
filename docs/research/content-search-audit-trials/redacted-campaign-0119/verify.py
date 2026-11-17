from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
from datetime import datetime, timezone

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ARCHIVE = REPO / "build/agent-skills-solution-content-search-audit-0.1.19.tgz"
assert hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() == "41c8ef4ce1bc0101c5a5d8a1391343443bca4b826ca7e763fff3d8fc1824ab00"
root = Path(tempfile.mkdtemp(prefix="nks-contract-0119-"))
extract = root / "extracted"
extract.mkdir()
subprocess.run(["tar", "-xzf", str(ARCHIVE), "-C", str(extract)], check=True)

def invoke(*args):
    return json.loads(subprocess.check_output(["node", *map(str, args)], cwd=REPO, text=True))

results = []
for target in ["codex", "claude-code", "codex,claude-code"]:
    project = root / target.replace(",", "-")
    project.mkdir()
    installed = invoke("dist/cli.js", "install-solution", "--release", extract / "package", "--digest", "9ed06ac4a136683cf6200f09b8edc7ffed6b849c4061b3626f5e0a346f44190e", "--project", project, "--target", target)
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
    campaign_config = dict(config, partitionSize=1)
    campaign_file = project / "campaign-input.json"
    campaign_file.write_text(json.dumps(campaign_config))
    campaign = invoke(cli, "campaign", campaign_file, project / "campaign")
    index = invoke(cli, "campaign-index", project / "campaign", project / "index")
    rows = lambda name: [json.loads(line) for line in (project / "index" / name).read_text().splitlines() if line.strip()]
    item_ids = [item["itemId"] for item in rows("items.jsonl")]
    refs = [item["reference"] for item in rows("evidence.jsonl") if item["kind"] == "content"]
    now = datetime.now(timezone.utc).isoformat()
    context = {"evidenceId": "context", "kind": "audience-context", "locator": "fixture", "collectedAt": now, "value": "Declared local content.", "snapshotHash": hashlib.sha256(b"Declared local content.").hexdigest(), "sourceReferences": refs}
    bundle = {"schemaVersion": 1, "campaignId": index["campaignId"], "sourceManifestHash": index["sourceManifestHash"], "partSnapshotHashes": index["partSnapshotHashes"], "contextEvidence": [context], "findings": [], "reviews": [{"ruleId": rule, "status": "unknown", "reason": "Synthetic fixture; semantic assessment unavailable", "reviewer": "fixture", "reviewedAt": now, "itemIds": item_ids, "evidenceReferences": refs, "contextEvidenceIds": ["context"]} for rule in ["portfolio-task-gaps", "portfolio-duplication", "portfolio-contradictions", "portfolio-journey-links"]]}
    bundle_file = project / "bundle.json"
    bundle_file.write_text(json.dumps(bundle))
    invoke(cli, "campaign-review", project / "campaign", bundle_file, project / "review")
    campaign_hashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for folder in [project / "campaign", project / "review"] for p in folder.rglob("*") if p.is_file()}
    shared = invoke(cli, "campaign-redact-report", project / "campaign", project / "review", policy, project / "shared-campaign")
    report_html = (project / "shared-campaign/report.html").read_text()
    assert "Redacted presentation" in report_html and 'href="../' not in report_html
    assert shared["coverage"]["total"] == 1 and not shared["completionAllowed"]
    for record in shared["redaction"]["derivatives"]:
        data = (project / "shared-campaign" / record["artifact"]).read_bytes()
        assert b"Declared local content." not in data
        assert hashlib.sha256(data).hexdigest() == record["snapshotHash"]
    for name, digest in shared["files"].items():
        assert hashlib.sha256((project / "shared-campaign" / name).read_bytes()).hexdigest() == digest
    assert all(hashlib.sha256(Path(name).read_bytes()).hexdigest() == digest for name, digest in campaign_hashes.items())
    results.append({"campaign": shared, "originalCampaignUnchanged": True, "redacted": redacted, "originalRunUnchanged": True, "target": target, "installation": installed, "run": json.loads(original), "tamperedBudgetRejected": True, "sourceUnchanged": page.read_text() == "# Fixture\nDeclared local content.\n"})
receipt = {"version": "0.1.19", "root": str(root), "runnerSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), "results": results, "limits": "Offline synthetic fixture via freshly installed CLI; not native host semantic evaluation or live network attestation."}
(HERE / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(root)
