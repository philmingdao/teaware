"""Retrieve a bounded set of public museum API/page samples; never modify a source."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, subprocess
root=Path('source-probe');root.mkdir(exist_ok=True)
urls={
 'npm-query':('https://digitalarchive.npm.gov.tw/Collection/Search', {'SearchContent':'茶'}),
 'npm-manifest':'https://digitalarchive.npm.gov.tw/Integrate/GetJson?cid=54933&dept=U',
 'npm-open-query':('https://digitalarchive.npm.gov.tw/opendata/Pub/Search',{'SearchContent':'茶','PageInfo':{'PageIndex':1,'PageSize':100}}),
 'finna':'https://api.finna.fi/v1/record?id=tmk.161006645225300',
}
def fetch(pair):
 name,spec=pair;dest=root/name
 url,payload=spec if isinstance(spec,tuple) else (spec,None)
 extra=['-H','Content-Type: application/json','--data',json.dumps(payload)] if payload else []
 result=subprocess.run(['curl','--location','--silent','--show-error','--max-time','45','--output',str(dest),'--write-out','%{http_code}',url]+extra,capture_output=True,text=True)
 row={'name':name,'url':url,'status':result.stdout,'error':result.stderr[-200:],'bytes':dest.stat().st_size if dest.exists() else 0}
 if dest.exists():row['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
 print(json.dumps(row,ensure_ascii=False),flush=True);return row
with ThreadPoolExecutor(max_workers=3) as pool:records=list(pool.map(fetch,urls.items()))
(root/'manifest.json').write_text(json.dumps(records,indent=2),encoding='utf8')
