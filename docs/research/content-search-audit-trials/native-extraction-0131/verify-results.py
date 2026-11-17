from pathlib import Path
import json,hashlib,subprocess
root=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
initial=json.loads((root/'input-hashes.json').read_text())
changed=[name for name,digest in initial.items() if not (root/name).is_file() or sha(root/name)!=digest]
results={'candidate':'0.1.31','initialFileCount':len(initial),'changedInitialFiles':changed,'hosts':{},'releaseAccepted':False}
for host,hidden in [('codex','.agents'),('claude-code','.claude')]:
 project=root/host;helper=project/hidden/'skills/content-search-audit/scripts/audit.mjs';runs=[]
 for f in sorted(project.rglob('run.json')):
  if any(x.startswith('.') for x in f.relative_to(project).parts):continue
  run=f.parent
  r=subprocess.run(['rtk','proxy','node',str(helper),'validate',str(run)],capture_output=True,text=True)
  try:v=json.loads(r.stdout)
  except Exception:v={'unparsedOutput':r.stdout,'stderr':r.stderr}
  (root/(host+'.'+run.name+'.validation.json')).write_text(json.dumps(v,indent=2)+'\n')
  checks=[json.loads(x) for x in (run/'checks.jsonl').read_text().splitlines() if x.strip()]
  statuses={s:sum(c['status']==s for c in checks) for s in sorted({c['status'] for c in checks})}
  runs.append({'path':str(run.relative_to(project)),'exitCode':r.returncode,'valid':v.get('valid'),'completionAllowed':v.get('completionAllowed'),'coverage':v.get('coverage'),'checkStatuses':statuses,'findings':len(json.loads((run/'findings.json').read_text()))})
 results['hosts'][host]={'execution':json.loads((root/(host+'.execution.json')).read_text()),'runs':runs}
(root/'independent-validation.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'initialFiles':len(initial),'changed':changed,'runs':{h:len(v['runs']) for h,v in results['hosts'].items()}}))
