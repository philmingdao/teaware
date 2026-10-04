"""Retrieve a bounded set of public museum API/page samples; never modify a source."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, subprocess
root=Path('source-probe');root.mkdir(exist_ok=True)
urls={
 'npm-search':'https://digitalarchive.npm.gov.tw/Collection',
 'npm-detail':'https://digitalarchive.npm.gov.tw/Collection/Detail/54933?dep=U',
 'npm-open':'https://digitalarchive.npm.gov.tw/opendata',
 'finna':'https://api.finna.fi/v1/search?lookfor=teekannu&type=AllFields&limit=2',
 'artic-image':'https://www.artic.edu/iiif/2/cd10a672-a993-3862-ebd2-b23bc4c97d20/full/1686,/0/default.jpg',
}
def fetch(pair):
 name,url=pair;dest=root/name
 result=subprocess.run(['curl','--location','--silent','--show-error','--max-time','45','--output',str(dest),'--write-out','%{http_code}',url],capture_output=True,text=True)
 row={'name':name,'url':url,'status':result.stdout,'error':result.stderr[-200:],'bytes':dest.stat().st_size if dest.exists() else 0}
 if dest.exists():row['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
 print(json.dumps(row,ensure_ascii=False),flush=True);return row
with ThreadPoolExecutor(max_workers=3) as pool:records=list(pool.map(fetch,urls.items()))
(root/'manifest.json').write_text(json.dumps(records,indent=2),encoding='utf8')
