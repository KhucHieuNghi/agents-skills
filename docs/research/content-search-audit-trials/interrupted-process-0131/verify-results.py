import sys,json,hashlib,subprocess,collections
from pathlib import Path
root=Path(__file__).resolve().parent;host=sys.argv[1];project=root/host
sha=lambda b:hashlib.sha256(b).hexdigest()
def lines(f):return [json.loads(x) for x in f.read_text().splitlines()]
def hashes(d):return {str(f.relative_to(d)):sha(f.read_bytes()) for f in d.rglob('*') if f.is_file()}
pre=json.loads((root/'preflight.json').read_text());execution=json.loads((root/f'{host}.execution.json').read_text())
original=pre['initialFiles'][host]
changed=[name for name,h in original.items() if not (project/name).is_file() or sha((project/name).read_bytes())!=h]
inputUnchanged=hashes(root/'content')==pre['inputFiles'];stoppedUnchanged=hashes(root/'interrupted')==pre['stoppedFiles']
pkg=project/('.agents' if host=='codex' else '.claude')/'skills/content-search-audit'
r=subprocess.run(['rtk','proxy','node',str(pkg/'scripts/audit.mjs'),'validate',str(project/'recovered')],capture_output=True,text=True)
validation=json.loads(r.stdout)
result={'host':host,'execution':execution,'originalFilesChecked':len(original),'changedOriginalFiles':changed,'sharedInputsUnchanged':inputUnchanged,'originalStoppedTreeUnchanged':stoppedUnchanged,'validatorExitCode':r.returncode,'validation':validation,'stderr':r.stderr,'releaseAccepted':False}
if (project/'recovered/run.json').exists():
 d=project/'recovered';inv=lines(d/'inventory.jsonl');ev=lines(d/'evidence.jsonl');ch=lines(d/'checks.jsonl');run=json.loads((d/'run.json').read_text());old=lines(project/'interrupted/inventory.jsonl')
 result['accounting']={'cursor':run.get('cursor'),'status':run.get('status'),'inventory':len(inv),'uniqueItemIds':len({x['itemId'] for x in inv}),'sameDeclaredItemIds':{x['itemId'] for x in inv}=={x['itemId'] for x in old},'evidence':len(ev),'evidenceKinds':dict(collections.Counter(x['kind'] for x in ev)),'checks':len(ch),'checkStatuses':dict(collections.Counter(x['status'] for x in ch)),'itemStates':dict(collections.Counter(x['state'] for x in inv)),'findings':len(json.loads((d/'findings.json').read_text()))}
(root/f'{host}.independent-validation.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['validation','stderr']}))
assert not changed and inputUnchanged and stoppedUnchanged and r.returncode==0 and validation['valid']
assert result['accounting']['sameDeclaredItemIds'] and result['accounting']['inventory']==1200 and result['accounting']['checks']==31200
