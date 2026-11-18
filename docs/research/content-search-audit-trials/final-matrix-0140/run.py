import ast
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
root = Path(tempfile.mkdtemp(prefix="nks-final-matrix-0140-"))
(Path(__file__).parent / "workspace.txt").write_text(str(root))
digest = "4410487c622352ebed49961331dd58341ba31960ed6e3836d652983f7e226b1e"
archive = repo / "build/agent-skills-solution-content-search-audit-0.1.40.tgz"
assert hashlib.sha256(archive.read_bytes()).hexdigest() == "574df835c14b81a0e6fde330582d102e6f60c3ea95024316fcbf484b2f8fe011"
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
    if host == "claude-code":
        parsed = ast.parse((repo / "build/guarded-expanded-0139/run.py").read_text())
        profile_instruction = next(ast.literal_eval(n.value) for n in ast.walk(parsed) if isinstance(n, ast.Assign) and any(isinstance(v, ast.Name) and v.id == "profile_instruction" for v in n.targets))
        original_prompt = prompt
        prompt += profile_instruction
        guard = out / "command-guard.mjs"
        shutil.copyfile(repo / "scripts/eval-content-audit-command-guard.mjs", guard)
        settings = {"hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "rtk", "args": ["proxy", "node", str(guard)], "timeout": 5, "onFailure": "block"}]}]}}
        settings_file = out / "guard.settings.json"
        settings_file.write_text(json.dumps(settings, indent=2) + "\n")
        (out / (host + ".original-prompt.txt")).write_text(original_prompt)
        (out / (host + ".prompt.txt")).write_text(prompt)
        (out / (host + ".profile.json")).write_text(json.dumps({"name": "session-guarded-rtk-node", "guardSha256": hashlib.sha256(guard.read_bytes()).hexdigest(), "settingsSha256": hashlib.sha256(settings_file.read_bytes()).hexdigest(), "originalPromptSha256": hashlib.sha256(original_prompt.encode()).hexdigest(), "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(), "instruction": profile_instruction, "changesCustomerSettings": False}, indent=2) + "\n")
    before = hashes(work)
    (out / (host + ".before.json")).write_text(json.dumps(before, indent=2) + "\n")
    command = (["codex", "exec", "--ignore-user-config", "--skip-git-repo-check", "--ephemeral", "--sandbox", "workspace-write", "--json", "--output-last-message", str(out / "codex.response.txt"), "-"] if host == "codex" else ["claude", "--print", "--setting-sources", "project", "--settings", str(settings_file), "--strict-mcp-config", "--permission-mode", "dontAsk", "--tools", "Read,Glob,Grep,Skill,Bash,Write", "--allowedTools", "Read", "Glob", "Grep", "Skill(content-search-audit)", "Bash", "Write", "--no-session-persistence", "--output-format", "stream-json", "--verbose"])
    command = ["rtk", "proxy", *command]
    started = time.time()
    with (out / (host + ".events.jsonl")).open("w") as stdout, (out / (host + ".stderr.txt")).open("w") as stderr:
        p = subprocess.Popen(command, cwd=work, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr, text=True, start_new_session=True)
        (out / (host + ".pid.json")).write_text(json.dumps({"pid": p.pid, "startedAt": started, "command": command}))
        try: p.communicate(prompt, timeout=900)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)
            p.communicate()
    result = {"host": host, "cohort": cohort, "candidate": "0.1.40", "command": command, "exitCode": p.returncode, "durationSeconds": time.time() - started, "componentDigest": "de029b4f618d1cd441d9f722e0dd60e6233f6d5fbc1dc258b6389d48341c2335", "originalChanges": [name for name, value in before.items() if not (work / name).is_file() or hashlib.sha256((work / name).read_bytes()).hexdigest() != value], "goldCopied": False}
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
for cohort in ["native-0131", "technical-controls-0131"]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(run, cohort, host) for host in ["codex", "claude-code"]]
        for future in futures: future.result()
