import json,re,hashlib,sys
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
class Hrefs(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]
    def handle_starttag(self, tag, attrs):
        for key,value in attrs:
            if key == "href" and value is not None: self.links.append(value)
project=Path(sys.argv[1]); result=[]
for f in sorted(project.rglob("*")):
    if not f.is_file() or f.suffix not in [".md",".html"]: continue
    rel=f.relative_to(project)
    if any(p in [".agents",".claude",".agent-skills","targets","evidence"] for p in rel.parts): continue
    text=f.read_text(); links=[]
    if f.suffix == ".html":
        parser=Hrefs(); parser.feed(text); links=parser.links
    else:
        links=[m.group(1).strip("<>") for m in re.finditer(r"(?<!!)\[[^\]\n]*\]\(([^\s)]+)\)",text)]
    checked=[]
    for link in links:
        parsed=urlsplit(link)
        if parsed.scheme or parsed.netloc or not parsed.path: continue
        target=(f.parent/unquote(parsed.path)).resolve()
        checked.append({"href":link,"target":str(target),"exists":target.exists()})
    result.append({"report":str(rel),"sha256":hashlib.sha256(f.read_bytes()).hexdigest(),"localLinkOccurrences":len(checked),"brokenOccurrences":sum(not x["exists"] for x in checked),"links":checked})
out={"schemaVersion":1,"project":str(project),"reports":result,"allLocalLinksResolve":all(x["brokenOccurrences"]==0 for x in result),"limitation":"HTML hrefs and inline Markdown file links only; code-span paths are not clickable links. External links are not fetched; anchor IDs are not verified."}
Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+"\n")
print(json.dumps({"reports":len(result),"localLinkOccurrences":sum(x["localLinkOccurrences"] for x in result),"brokenOccurrences":sum(x["brokenOccurrences"] for x in result)}))
