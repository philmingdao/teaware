"""Resolve the public main-image page instead of mistaking its preview for the original."""
from pathlib import Path
import json,subprocess,time,hashlib,concurrent.futures,re,html,urllib.parse
root=Path('output/round31/museum-digital');root.mkdir(parents=True,exist_ok=True)
for sub in ['pages','images','image-pages']:(root/sub).mkdir(exist_ok=True)
rows=json.load(open('output/round30/museum-digital/records.json'))
allowed={'CC BY','CC BY-SA','CC0','Public Domain Mark'}
rows=[r for r in rows if re.search(r'Teekann|Teetass|Teeschal|Teedose|Teeb.chse|Teel.ffel|Teesieb|Chawan',r['object_name']+' '+r.get('object_type',''),re.I) and not re.search('Fragment|Puppen|Spielzeug|Deckel|Tülle|Henkel|Scherbe|Postkarte|Fotograf|Gemälde|Zeichnung',r['object_name'],re.I) and any(i.get('is_main')=='j'and i.get('rights')in allowed for i in r.get('object_images',[]))]
def get(url,p):
 if p.exists()and p.stat().st_size:return p.read_bytes()
 time.sleep(.8);proc=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','40','--max-filesize','24000000','--write-out','%{http_code}',url,'-o',str(p)],capture_output=True,text=True)
 if proc.returncode:
  p.unlink(missing_ok=True)
  if proc.stdout in ['429','503']:raise RuntimeError('rate-limited-stop')
  raise ValueError(proc.stdout+' '+proc.stderr[-160:])
 return p.read_bytes()
def work(raw):
 id=str(raw['object_id']);source='https://global.museum-digital.org/object/'+id
 try:
  page=get(source,root/'pages'/(id+'.html'));s=page.decode(errors="replace");match=re.search(r'<a href="(/singleimage\?(?:resourcenr|imagenr)=\d+)"',s)
  if not match:return {'id':id,'status':'no-original-link'}
  imagepage='https://global.museum-digital.org'+match[1];b=get(imagepage,root/'image-pages'/(id+'.html'));ss=b.decode(errors="replace")
  im=next(i for i in raw['object_images']if i.get('is_main')=='j');url=html.unescape(re.search(r'<figure id="singleMainImage"><a href="([^"]+)"',ss)[1]);url=urllib.parse.urljoin(imagepage,url)
  if not url.startswith('https://'):raise ValueError('non-https-original')
  licenses=re.findall(r'https?://creativecommons.org/(?:licenses|publicdomain)/[^"<> ]+',ss)
  licenses=[html.unescape(x) for x in licenses if '/by-nc' not in x and '/by-nd'not in x]
  if not licenses:raise ValueError('no-explicit-license-link')
  image=get(url,root/'images'/(id+'.jpg'))
  return {'id':id,'status':'downloaded','raw':raw,'image':im,'sourceUrl':source,'imageSource':url,'imagePage':imagepage,'licenseUrl':licenses[0],'pageSha256':hashlib.sha256(page).hexdigest(),'imagePageSha256':hashlib.sha256(b).hexdigest(),'sha256':hashlib.sha256(image).hexdigest()}
 except RuntimeError:raise
 except Exception as e:return {'id':id,'status':'error','error':str(e)}
print('candidates',len(rows),flush=True);out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for r in pool.map(work,rows):
  out.append(r);(root/'downloaded.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),r['id'],r['status'],r.get('error',''),flush=True)
