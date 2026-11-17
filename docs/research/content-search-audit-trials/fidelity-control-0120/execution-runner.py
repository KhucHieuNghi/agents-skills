import subprocess,time,json,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parent
def run(i):
 project=root/f"rep-{i}"
 command=["claude","--print","--setting-sources","project","--strict-mcp-config","--permission-mode","dontAsk","--tools","Read,Glob,Grep,Skill,Bash,Write","--allowedTools","Read","Glob","Grep","Skill(content-search-audit)","Bash","Write","--no-session-persistence","--output-format","stream-json","--verbose"]
 start=time.time()
 with (project/"events.jsonl").open("w") as out,(project/"stderr.txt").open("w") as err:
  p=subprocess.Popen(command,cwd=project,stdin=subprocess.PIPE,stdout=out,stderr=err,text=True)
  (project/"pid.json").write_text(json.dumps({"pid":p.pid,"command":command,"startedAt":start}))
  p.communicate((project/"prompt.txt").read_text())
 execution={"rep":i,"exitCode":p.returncode,"durationSeconds":time.time()-start}
 for line in (project/"events.jsonl").read_text().splitlines():
  try:e=json.loads(line)
  except json.JSONDecodeError:continue
  if e.get("type")=="result":
   (project/"response.txt").write_text(e.get("result",""));execution.update(resultError=e.get("is_error"),costUsd=e.get("total_cost_usd"))
 (project/"execution.json").write_text(json.dumps(execution,indent=2)+"\n")
 print(json.dumps(execution),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(run,range(1,6)))
