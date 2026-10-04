"""Bounded public NPM catalogue discovery; no captcha/download endpoint used."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, subprocess, re, html, time
root=Path('source-probe');root.mkdir(exist_ok=True)
def fetch(name,url,payload=None):
 dest=root/name; dest.parent.mkdir(parents=True,exist_ok=True)
 extra=['-H','Content-Type: application/json','--data',json.dumps(payload)] if payload else []
 r=subprocess.run(['curl','--location','--silent','--show-error','--max-time','40','--output',str(dest),'--write-out','%{http_code}',url]+extra,capture_output=True,text=True)
 row={'name':name,'url':url,'status':r.stdout,'error':r.stderr[-200:],'bytes':dest.stat().st_size if dest.exists() else 0}
 if dest.exists():row['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
 if r.stdout!='200':raise RuntimeError(json.dumps(row))
 return dest
base='https://digitalarchive.npm.gov.tw'
def page(n):
 p=fetch(f'pages/{n}.html',base+'/Collection/Search',{'SearchContent':'茶','PageInfo':{'PageIndex':n,'PageSize':30}})
 s=p.read_text(); found=[]
 for url,title,body in re.findall(r'<a href="(/Collection/Detail/\d+\?dep=\w+)"[^>]*class="list-item"[^>]*title="移至 (.*?) \[另開新視窗\]">(.*?)</a>',s,re.S):
  found.append({'sourceUrl':base+html.unescape(url),'title':html.unescape(title),'body':html.unescape(re.sub('<[^>]+>',' ',body)).strip()})
 print(json.dumps({'page':n,'records':len(found)},ensure_ascii=False),flush=True)
 return found
first=page(1)
s=(root/'pages/1.html').read_text();model=json.loads(re.search(r'var serializedModel = (\{.*?\});',s).group(1))
count=model['PageInfo']['PageCount']; assert count<=100
with ThreadPoolExecutor(max_workers=3) as pool: rows=first+sum(pool.map(page,range(2,count+1)),[])
(root/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
service='https://iiifod.npm.gov.tw/iiif/2/C1E%2FC1E001471N000000000PAB'
p=fetch('sample-info.json',service+'/info.json'); info=json.loads(p.read_text())
fetch('sample.jpg',service+'/full/full/0/default.jpg')
print(json.dumps({'records':len(rows),'sample':info},ensure_ascii=False))
