"""Fetch public catalogue/IIIF evidence for manually reviewable tea candidates.
Uses only advertised public IIIF services, not CAPTCHA download endpoints.
"""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,subprocess,re,html,time,sys,os
root=Path('source-probe');root.mkdir(exist_ok=True)
rows=json.loads(Path(os.environ.get('NPM_CANDIDATES','research/npm-candidates-4000.json')).read_text()); shard=int(sys.argv[1]);rows=rows[shard::int(os.environ.get('NPM_SHARDS','3'))]
def sha(b):return hashlib.sha256(b).hexdigest()
def fetch(p,url):
 if p.exists() and p.stat().st_size:return p.read_bytes()
 r=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','40',url,'-o',str(p)],capture_output=True)
 if r.returncode:p.unlink(missing_ok=True);raise RuntimeError(r.stderr.decode()[-150:])
 return p.read_bytes()
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def work(row):
 url=row['sourceUrl'];id=re.search(r'Detail/(\d+)',url).group(1);folder=root/id;folder.mkdir(exist_ok=True)
 try:
  b=fetch(folder/'page.html',url);s=b.decode(); table=re.search(r'<table class="table">(.*?)</table>',s,re.S).group(1)
  fields={clean(k):[clean(v) for v in re.split('<br\s*/?>',v)] for k,v in re.findall(r'<tr>\s*<td>(.*?)</td>\s*<td>(.*?)</td>\s*</tr>',table,re.S)}
  title=fields['品名'][0];desc=' '.join(fields.get('說明',[]))
  # Candidate gate only: exact tea use still needs source and image review.
  if not os.environ.get('NPM_SKIP_LEAD_GATE') and not re.search(r'茶(?:壺|杯|盞|碗|盌|盃|圓|鍾|鐘|盅|罐|葉罐|盒|盤|托|筒|棗|則|杓|釜|爐|器|具)|奶茶|酥油茶|品茗|飲茶|泡茶|煮茶|煎茶|泡飲|烹茶|茗碗|茗壺',title+' '+desc):return {'id':id,'status':'no-tea-use-lead','fields':fields,'sourceUrl':url}
  raw=fetch(folder/'manifest.json',f'https://digitalarchive.npm.gov.tw/Integrate/GetJson?cid={id}&dept=U');m=json.loads(raw)
  canvases=m['sequences'][0]['canvases']; default=re.search(r"var def = '(.*?)';",s)
  chosen=next((c for c in canvases if default and c['label']==default.group(1)),canvases[0]);service=chosen['images'][0]['resource']['service']['@id']
  assert service.startswith('https://iiifod.npm.gov.tw/iiif/2/')
  info=json.loads(fetch(folder/'info.json',service+'/info.json'))
  if max(info['width'],info['height'])<1200:return {'id':id,'status':'low-resolution','fields':fields,'sourceUrl':url,'info':info}
  # The level-2 image service advertises sizeByConfinedWh. Never upscale.
  size='!2400,2400' if max(info['width'],info['height'])>2400 else 'full'
  imageurl=service+'/full/'+size+'/0/default.jpg';image=fetch(folder/'source.jpg',imageurl)
  assert image[:2]==b'\xff\xd8'
  result={'id':id,'status':'downloaded','sourceUrl':url,'fields':fields,'pageSha256':sha(b),'imageSource':imageurl,'imageSha256':sha(image),'nativeWidth':info['width'],'nativeHeight':info['height'],'selectedCanvas':chosen['label'],'retrievedAt':datetime.now(timezone.utc).isoformat()}
  (folder/'record.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));return result
 except Exception as e:return {'id':id,'status':'error','sourceUrl':url,'error':str(e)}
out=[]
with ThreadPoolExecutor(max_workers=2) as pool:
 for f in as_completed([pool.submit(work,r) for r in rows]):
  x=f.result();out.append(x);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'done':len(out),'id':x['id'],'status':x['status']},ensure_ascii=False),flush=True)
