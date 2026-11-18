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
root = Path(tempfile.mkdtemp(prefix="nks-release-0134-"))
(Path(__file__).parent / "workspace.txt").write_text(str(root))
digest = "3370e17b9bdf3a28569f09621be9f4ebe1ee7fa492a1f18123f4f888bf6c60e0"
archive = repo / "build/agent-skills-solution-content-search-audit-0.1.34.tgz"
assert hashlib.sha256(archive.read_bytes()).hexdigest() == "7a2e1d98ec301089355a4e4985dbbb9d71f4f23030e0eeda9ea8cc7a43117719"
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
        for member in tf:
            parts = Path(member.name).parts
            if len(parts) >= 3 and parts[0] == host and parts[1] == "targets" and member.isfile():
                destination = work.joinpath(*parts[1:])
                if ".." in parts: raise ValueError("Unsafe fixture path")
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(tf.extractfile(member).read())
    if not (work / "targets").is_dir(): raise ValueError("Missing targets")
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
        (out / (host + ".pid.json")).write_text(json.dumps({"pid": p.pid, "startedAt": started, "command": command}))
        try: p.communicate(prompt, timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
            p.communicate()
    result = {"host": host, "cohort": cohort, "candidate": "0.1.34", "command": command, "exitCode": p.returncode, "durationSeconds": time.time() - started, "componentDigest": "48a6103ce9bb280d9a249a8a3b9a1f286615c19a5d5a7bf3205acee53fd05140", "originalChanges": [name for name, value in before.items() if not (work / name).is_file() or hashlib.sha256((work / name).read_bytes()).hexdigest() != value], "goldCopied": False}
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
for cohort in ["expanded-0131"]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda host: run(cohort, host), ["codex", "claude-code"]))
