import subprocess,time,json,concurrent.futures
from pathlib import Path
root=Path(__file__).resolve().parent
def run(i):
 p=root/f"rep-{i}"
 command=["claude","--print","--setting-sources","project","--strict-mcp-config","--permission-mode","dontAsk","--tools","","--no-session-persistence","--output-format","stream-json","--verbose"]
 start=time.time()
 with (p/"events.jsonl").open("w") as out,(p/"stderr.txt").open("w") as err:
  proc=subprocess.Popen(command,cwd=p,stdin=subprocess.PIPE,stdout=out,stderr=err,text=True)
  (p/"pid.json").write_text(json.dumps({"pid":proc.pid,"command":command,"startedAt":start}))
  try:proc.communicate((p/"prompt.txt").read_text(),timeout=240)
  except subprocess.TimeoutExpired:proc.kill();proc.communicate()
 result={"rep":i,"exitCode":proc.returncode,"durationSeconds":time.time()-start}
 for line in (p/"events.jsonl").read_text().splitlines():
  try:e=json.loads(line)
  except json.JSONDecodeError:continue
  if e.get("type")=="result":
   (p/"response.txt").write_text(e.get("result",""));result.update(resultError=e.get("is_error"),costUsd=e.get("total_cost_usd"))
 (p/"execution.json").write_text(json.dumps(result,indent=2)+"\n")
 print(json.dumps(result),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(run,range(1,6)))
