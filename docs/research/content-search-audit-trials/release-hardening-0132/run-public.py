import concurrent.futures
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import tarfile
import tempfile
import time

repo = Path(__file__).resolve().parents[2]
root = Path(tempfile.mkdtemp(prefix="nks-release-0132-"))
(Path(__file__).parent / "workspace-public.txt").write_text(str(root))
digest = "8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc"
archive = repo / "build/agent-skills-solution-content-search-audit-0.1.32.tgz"
extract = root / "release"
extract.mkdir()
with tarfile.open(archive) as tf:
    tf.extractall(extract, filter="data")

def hashes(project):
    return {p.relative_to(project).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in project.rglob("*") if p.is_file()}

def run(cohort, host):
    work = root / cohort / host
    work.mkdir(parents=True)
    source = repo / "docs/research/content-search-audit-trials" / cohort / "artifacts.tgz"
    with tarfile.open(source) as tf:
        prompt = tf.extractfile(host + ".prompt.txt").read().decode()
    shutil.copytree(root / "initial-discovery", work / "initial-discovery")
    install = subprocess.run(["rtk", "proxy", "node", str(repo / "dist/cli.js"), "install-solution", "--release", str(extract / "package"), "--digest", digest, "--project", str(work), "--target", host], text=True, capture_output=True, check=True)
    out = root / cohort
    (out / (host + ".install.json")).write_text(install.stdout)
    (out / (host + ".prompt.txt")).write_text(prompt)
    before = hashes(work)
    (out / (host + ".before.json")).write_text(json.dumps(before, indent=2) + "\n")
    command = (["codex", "exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral", "--sandbox", "workspace-write", "--json", "--output-last-message", str(out / "codex.response.txt"), "-"] if host == "codex" else ["claude", "--print", "--setting-sources", "project", "--strict-mcp-config", "--permission-mode", "dontAsk", "--tools", "Read,Glob,Grep,Skill,Bash,Write", "--allowedTools", "Read", "Glob", "Grep", "Skill(content-search-audit)", "Bash", "Write", "--no-session-persistence", "--output-format", "stream-json", "--verbose"])
    command = ["rtk", "proxy", *command]
    started = time.time()
    with (out / (host + ".events.jsonl")).open("w") as stdout, (out / (host + ".stderr.txt")).open("w") as stderr:
        p = subprocess.Popen(command, cwd=work, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr, text=True, start_new_session=True)
        try: p.communicate(prompt, timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
            p.communicate()
    result = {"host": host, "cohort": cohort, "candidate": "0.1.32", "command": command, "exitCode": p.returncode, "durationSeconds": time.time() - started, "componentDigest": "3a38d900b80989939c27581cecda17a70b94a8082808e09dfcf50524abbbaf5e", "originalChanges": [name for name, value in before.items() if not (work / name).is_file() or hashlib.sha256((work / name).read_bytes()).hexdigest() != value], "goldCopied": False}
    if host == "claude-code":
        for line in (out / (host + ".events.jsonl")).read_text().splitlines():
            try: event = json.loads(line)
            except json.JSONDecodeError: continue
            if event.get("type") == "result":
                (out / (host + ".response.txt")).write_text(event.get("result", ""))
                result.update(resultError=event.get("is_error"), costUsd=event.get("total_cost_usd"))
    (out / (host + ".execution.json")).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result), flush=True)

print(json.dumps({"workspace": str(root)}), flush=True)
config = {"sourceId": "internal-links", "seeds": ["https://nkskills.getgroove.me/"], "localRoots": [], "network": {"allowedOrigins": ["https://nkskills.getgroove.me"], "retries": 1}, "maxPages": 1, "maxDepth": 5, "maxStoredBytes": 67108864, "maxGraphBytes": 8388608}
(root / "initial-config.json").write_text(json.dumps(config, indent=2))
initial = subprocess.run(["rtk", "proxy", "node", str(extract / "package/skills/content-search-audit/scripts/audit.mjs"), "discover-links", str(root / "initial-config.json"), str(root / "initial-discovery")], capture_output=True, text=True, check=True)
(root / "initial-receipt.json").write_text(initial.stdout)
for host in ["codex", "claude-code"]:
    run("public-pilot-0131", host)
