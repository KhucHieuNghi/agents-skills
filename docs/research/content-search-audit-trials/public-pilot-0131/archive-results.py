import json,hashlib,tarfile,sys,shutil
from pathlib import Path
root=Path(__file__).resolve().parent
destination=Path(sys.argv[1]);destination.mkdir(parents=True,exist_ok=False)
for host in ["codex","claude-code"]:
 assert (root/(host+".execution.json")).is_file(),"Host has not terminated"
 assert (root/(host+".independent-validation.json")).is_file(),"Host output not checked"
files={}
for p in root.rglob("*"):
 rel=p.relative_to(root)
 if any(part in ["extracted",".agents",".claude",".git","node_modules"] for part in rel.parts): continue
 if p.is_symlink():raise ValueError("Unexpected archive symlink: "+str(rel))
 if p.is_file(): files[str(rel)]=hashlib.sha256(p.read_bytes()).hexdigest()
archive=destination/"artifacts.tgz"
with tarfile.open(archive,"w:gz") as tar:
 for name in sorted(files):tar.add(root/name,arcname=name,recursive=False)
observed={}
with tarfile.open(archive,"r:gz") as tar:
 for member in tar:
  assert member.isfile()
  observed[member.name]=hashlib.sha256(tar.extractfile(member).read()).hexdigest()
assert observed==files
receipt={"archiveSha256":hashlib.sha256(archive.read_bytes()).hexdigest(),"fileCount":len(files),"allArchivedBytesMatchOriginals":True,"files":files}
(destination/"archive-validation.json").write_text(json.dumps(receipt,indent=2)+"\n")
for p in root.iterdir():
 if p.is_file() and p.suffix in [".json",".txt",".py"]:shutil.copy2(p,destination/p.name)
print(json.dumps({"destination":str(destination),"files":len(files),"archiveSha256":receipt["archiveSha256"]}))
