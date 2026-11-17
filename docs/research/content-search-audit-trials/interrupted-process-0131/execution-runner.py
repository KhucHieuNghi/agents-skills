import subprocess,time,json,concurrent.futures,os,signal
from pathlib import Path
root=Path(__file__).resolve().parent
def run(host):
 command=(["codex","exec","--ignore-user-config","--skip-git-repo-check","--ephemeral","--sandbox","workspace-write","--json","--output-last-message",str(root/"codex.response.txt"),"-"] if host=="codex" else ["claude","--print","--setting-sources","project","--strict-mcp-config","--permission-mode","dontAsk","--tools","Read,Glob,Grep,Skill,Bash,Write","--allowedTools","Read","Glob","Grep","Skill(content-search-audit)","Bash","Write","--no-session-persistence","--output-format","stream-json","--verbose"])
 start=time.time()
 with (root/(host+".events.jsonl")).open("w") as out,(root/(host+".stderr.txt")).open("w") as err:
  p=subprocess.Popen(command,cwd=root/host,stdin=subprocess.PIPE,stdout=out,stderr=err,text=True,start_new_session=True)
  (root/(host+".pid.json")).write_text(json.dumps({"pid":p.pid,"command":command,"startedAt":start}))
  try:p.communicate((root/(host+".prompt.txt")).read_text(),timeout=600)
  except subprocess.TimeoutExpired:
   os.killpg(p.pid,signal.SIGKILL);p.communicate()
 execution={"host":host,"exitCode":p.returncode,"durationSeconds":time.time()-start}
 if host=="claude-code":
  for line in (root/(host+".events.jsonl")).read_text().splitlines():
   try: e=json.loads(line)
   except json.JSONDecodeError: continue
   if e.get("type")=="result":
    (root/(host+".response.txt")).write_text(e.get("result", ""));execution["resultError"]=e.get("is_error");execution["costUsd"]=e.get("total_cost_usd")
 (root/(host+".execution.json")).write_text(json.dumps(execution,indent=2)+"\n")
 print(json.dumps(execution),flush=True)
for host in ["codex", "claude-code"]: run(host)
