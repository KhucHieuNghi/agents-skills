import os,signal,time,json,hashlib,subprocess,tarfile,shutil
from pathlib import Path
root=Path(__file__).resolve().parent
repo=Path('/Users/nk/Documents/per/agents-skills')
archive=repo/'build/agent-skills-solution-content-search-audit-0.1.32.tgz'
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(archive.read_bytes())=='2578ef08ff8a45105e1547a9173a840da40baa1ff1f336c73e1da1a895865730'
def hashes(d):return {str(f.relative_to(d)):sha(f.read_bytes()) for f in d.rglob('*') if f.is_file()}
def command(args):
 r=subprocess.run(['rtk','proxy',*map(str,args)],capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr+r.stdout)
 return r.stdout
ex=root/'extracted';ex.mkdir()
with tarfile.open(archive) as t:t.extractall(ex,filter='data')
package=ex/'package';content=root/'content';content.mkdir();inputs=[]
for i in range(1200):
 f=content/f'{i:04}.md';f.write_text(f'# Unique record {i}\nSynthetic local record for collection recovery; not a verified product claim.\n');inputs.append({'path':str(f),'source':'process-interruption-0131'})
config={'inputs':inputs,'localRoots':[str(content)],'inventoryComplete':True}
(root/'config.json').write_text(json.dumps(config,indent=2)+'\n')
stopped=root/'interrupted';helper=package/'skills/content-search-audit/scripts/audit.mjs';args=['rtk','proxy','node',str(helper),'start',str(root/'config.json'),str(stopped)]
start=time.time()
with (root/'interruption.stdout.txt').open('w') as out,(root/'interruption.stderr.txt').open('w') as err:
 child=subprocess.Popen(args,stdout=out,stderr=err,start_new_session=True)
 observed=None
 while child.poll() is None and time.time()-start<30:
  try:
   state=json.loads((stopped/'run.json').read_text())
   if state.get('status')=='collecting' and 500<=state.get('cursor',0)<1200:
    observed={'pid':child.pid,'cursor':state['cursor'],'status':state['status'],'observedAt':time.time(),'command':args}
    os.killpg(child.pid,signal.SIGKILL);break
  except (FileNotFoundError,json.JSONDecodeError):pass
  time.sleep(.002)
 if observed is None:
  if child.poll() is None:os.killpg(child.pid,signal.SIGKILL)
  child.wait();raise RuntimeError('No committed checkpoint observed; do not fabricate interruption')
 code=child.wait();assert code==-9
 observed.update({'exitCode':code,'durationSeconds':time.time()-start,'signal':'SIGKILL'})
(root/'interruption.json').write_text(json.dumps(observed,indent=2)+'\n')
validation=json.loads(command(['node',helper,'validate',stopped]));assert validation['valid']
(root/'stopped-validation.json').write_text(json.dumps(validation,indent=2)+'\n')
initial={};installs={}
for host in ['codex','claude-code']:
 project=root/host;project.mkdir()
 installs[host]=json.loads(command(['node',repo/'dist/cli.js','install-solution','--release',package,'--digest','8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc','--project',project,'--target',host]))
 shutil.copytree(stopped,project/'interrupted');shutil.copy2(root/'config.json',project/'config.json')
 initial[host]=hashes(project)
 prompt=(repo/'docs/research/content-search-audit-trials/interrupted-process-016'/f'{host}.prompt.txt').read_text()
 prompt+='\nEvery shell command and every shell subcommand must begin with rtk (for example rtk proxy node). Do not hide unprefixed commands inside a shell wrapper. Do not read unrelated home files.\n'
 (root/f'{host}.prompt.txt').write_text(prompt)
preflight={'candidateVersion':'0.1.32','archiveSha256':sha(archive.read_bytes()),'releaseDigest':'8d816f8779a8ae4df394d4d526764b555c4ff6a54a4e80aa7a673d971f38c7cc','componentDigest':'3a38d900b80989939c27581cecda17a70b94a8082808e09dfcf50524abbbaf5e','versions':{x:command([x,'--version']).strip() for x in ['codex','claude','node']},'initialFiles':initial,'inputFiles':hashes(content),'stoppedFiles':hashes(stopped),'configSha256':sha((root/'config.json').read_bytes()),'installResults':installs}
(root/'preflight.json').write_text(json.dumps(preflight,indent=2)+'\n')
print(json.dumps({'root':str(root),'cursor':observed['cursor'],'exitCode':code,'inputs':len(inputs),'stoppedFiles':len(preflight['stoppedFiles']),'originalFiles':{h:len(x) for h,x in initial.items()},'stoppedValid':validation['valid']}))
