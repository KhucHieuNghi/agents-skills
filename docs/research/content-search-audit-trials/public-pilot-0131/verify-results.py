import json,hashlib,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parent
host=sys.argv[1]
project=root/host
execution=json.loads((root/(host+".execution.json")).read_text())
preflight=json.loads((root/"preflight.json").read_text())
pkg=project/(".agents" if host=="codex" else ".claude")/"skills/content-search-audit"
original=preflight["initialFiles"][host]
for name,value in original.items():
 assert hashlib.sha256((project/name).read_bytes()).hexdigest()==value,name
checks=[]
inputConfigsSkipped=[]
for file in project.rglob("*.json"):
 if any(part in [".agents",".claude",".agent-skills"] for part in file.relative_to(project).parts): continue
 if file.name not in ["discovery.json","campaign.json","run.json"]:continue
 if file.name=="campaign.json" and "inputs" in json.loads(file.read_text()) and "campaignId" not in json.loads(file.read_text()):
  inputConfigsSkipped.append(str(file.relative_to(project)));continue
 command={"discovery.json":"discovery-validate","campaign.json":"campaign-validate","run.json":"validate"}[file.name]
 r=subprocess.run(["rtk","proxy","node",str(pkg/"scripts/audit.mjs"),command,str(file.parent)],capture_output=True,text=True)
 checks.append({"path":str(file.parent.relative_to(project)),"command":command,"exitCode":r.returncode,"stdout":r.stdout,"stderr":r.stderr})
result={"host":host,"execution":execution,"originalFilesUnchanged":len(original),"validationChecks":checks,"inputConfigsSkipped":inputConfigsSkipped,"releaseAccepted":False}
(root/(host+".independent-validation.json")).write_text(json.dumps(result,indent=2)+"\n")
print(json.dumps({"host":host,"originalFilesUnchanged":len(original),"validatedDirectories":len(checks),"failures":[c["path"] for c in checks if c["exitCode"]!=0]}))
