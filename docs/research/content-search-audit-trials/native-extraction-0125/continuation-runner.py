from pathlib import Path
import subprocess,json,time,os,signal
r=Path(__file__).resolve().parent
cmd=["codex","exec","--ignore-user-config","--skip-git-repo-check","--ephemeral","--sandbox","workspace-write","--json","--output-last-message",str(r/"codex-continuation.response.txt"),"-"]
start=time.time()
with (r/"codex-continuation.events.jsonl").open("w") as out,(r/"codex-continuation.stderr.txt").open("w") as err:
 p=subprocess.Popen(cmd,cwd=r/"codex",stdin=subprocess.PIPE,stdout=out,stderr=err,text=True,start_new_session=True)
 (r/"codex-continuation.pid.json").write_text(json.dumps({"pid":p.pid,"command":cmd,"startedAt":start}))
 try:p.communicate((r/"codex-continuation.prompt.txt").read_text(),timeout=600)
 except subprocess.TimeoutExpired:os.killpg(p.pid,signal.SIGKILL);p.communicate()
result={"host":"codex","mode":"continuation after harness timeout","exitCode":p.returncode,"durationSeconds":time.time()-start}
(r/"codex-continuation.execution.json").write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps(result),flush=True)
