from pathlib import Path
import subprocess,json,time,hashlib
r=Path(__file__).resolve().parent
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
version=subprocess.check_output([chrome,"--version"],text=True).strip()
commands=[]
initialFailure=json.loads((r/"initial-failure.json").read_text())
def invoke(args,out,name):
 start=time.time()
 result=subprocess.run(args,capture_output=True,timeout=180)
 (r/out).write_bytes(result.stdout);(r/(name+".stderr.txt")).write_bytes(result.stderr)
 commands.append(dict(name=name,args=args,exitCode=result.returncode,durationSeconds=time.time()-start))
 assert result.returncode==0,(name,result.stderr[-500:])
flags=[chrome,"--headless","--no-first-run","--no-default-browser-check","--disable-background-networking","--disable-sync","--no-pdf-header-footer"]
# Reuse the completed render capture from the first execution.
assert 'data-audit-ready="true"' in (r/"rendered.html").read_text()
assert '<main id="task">Open Billing.</main>' in (r/"rendered.html").read_text()
for name in ['document','image-only']:
 if not (r/(name+".pdf")).exists():
  invoke(flags+["--user-data-dir="+str(r/("profile-"+name)),"--print-to-pdf="+str(r/(name+".pdf")),(r/("sources/"+name+".html")).as_uri()],name+".print.stdout.txt",name+"-print")
 invoke(['swift',str(r/'extract.swift'),str(r/(name+'.pdf'))],name+'.extracted.json',name+'-extract')
 d=json.loads((r/(name+'.extracted.json')).read_text())
 if name=='document':
  assert d['pageCount']==2,d
  assert '5000 records' in d['pages'][0]['text'] and '5000 bản ghi' in d['pages'][1]['text'],d
 else:assert all(not p['hasExtractableText'] for p in d['pages']),d
receipt=dict(initialFailure=initialFailure,chromeVersion=version,commands=commands,sourceHashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in (r/'sources').iterdir()},artifactHashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in r.iterdir() if f.suffix in ['.html','.pdf','.json']},limitations=['Controlled author-generated fixtures only; not customer browser acceptance.','No OCR or engine rendering/index evidence.','Browser uses new temporary profiles, not a user session; no process-level network attestation.'])
(r/'execution.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(root=str(r),chromeVersion=version,checks='real DOM, two-page English/Vietnamese PDF text, image-only empty text'),ensure_ascii=False),flush=True)
