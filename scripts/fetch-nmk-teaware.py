"""Read NMK's public catalogue and page-advertised full images, KOGL type 1 only."""
from pathlib import Path
import json,subprocess,urllib.parse,re,html,time,hashlib,concurrent.futures,os
root=Path(os.environ.get('NMK_OUTPUT','output/round30/nmk'));root.mkdir(exist_ok=True,parents=True);(root/'pages').mkdir(exist_ok=True);(root/'images').mkdir(exist_ok=True)
base='https://www.museum.go.kr';entry=base+'/MUSEUM/contents/M0502000000.do'
def fetch(url,p):
 if p.exists() and p.stat().st_size:return p.read_bytes()
 time.sleep(.8);r=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','90','--max-filesize','25000000',url,'-o',str(p)],capture_output=True)
 if r.returncode:p.unlink(missing_ok=True);raise RuntimeError(r.stderr.decode()[-140:])
 return p.read_bytes()
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
ids=set()
for term in ['다완','찻잔','茶碗','茶壺','차주전자','다기','차통','찻종','다관','찻숟가락','차솥']:
 offset=0
 while offset<1000:
  try:
   u=entry+'?'+urllib.parse.urlencode({'query':term,'searchId':'search','startCount':offset,'pageSize':100,'collectionViewCount':100});s=fetch(u,root/f'search-{term}-{offset}.html').decode();found=list(dict.fromkeys(re.findall(r'relicId=(\d+)',s)));ids.update(found)
   total=int(re.search(r'var totalCount = (\d+)',s)[1]);print(term,offset,total,'unique',len(ids),flush=True)
   if not found or offset+len(found)>=total:break
   offset+=len(found)
  except Exception as e:print(term,str(e),flush=True);break
(root/'inventory.json').write_text(json.dumps(sorted(ids)))
def work(id):
 try:
  url=entry+'?relicId='+id+'&schM=view&searchId=search';b=fetch(url,root/'pages'/(id+'.html'));s=b.decode()
  fields={clean(k):clean(v) for k,v in re.findall(r'<li><strong>(.*?)</strong>\s*<p>(.*?)</p></li>',s,re.S)}
  m=re.search(r'<strong class="outveiw-tit">(.*?)</strong>',s,re.S);title=clean(m[1]) if m else ''
  if 'new_img_opencode1.jpg' not in s:return {'id':id,'status':'license-unverified','title':title,'fields':fields,'sourceUrl':url}
  if not re.search('茶碗|茶盌|茶壺|茶罐|茶匙|茶杓|茶筅|茶器|다완|찻잔|차주전자|다기|차통|찻종|다관|찻숟가락|차솥',title+' '+fields.get('다른명칭','')):return {'id':id,'status':'tea-use-unverified','title':title,'fields':fields,'sourceUrl':url}
  imagepaths=list(dict.fromkeys(re.findall(r'<img src="(/relic_image/[^" ]+)" alt="[^" ]*[^"]* 이미지 \d+"',s)))
  imagepaths=[p for p in imagepaths if '/700/' not in p]
  if not imagepaths:return {'id':id,'status':'no-image','title':title,'fields':fields}
  imageurl=base+imagepaths[0];im=fetch(imageurl,root/'images'/(id+'.jpg'))
  desc=re.search(r'<div class="view-info-cont view-info-cont2">\s*<p>(.*?)</p>',s,re.S)
  return {'id':id,'status':'downloaded','title':title,'fields':fields,'description':clean(desc[1]) if desc else '', 'sourceUrl':url,'pageSha256':hashlib.sha256(b).hexdigest(),'imageSource':imageurl,'imageSha256':hashlib.sha256(im).hexdigest(),'licenseUrl':'https://www.kogl.or.kr/info/licenseType1.do','imagePaths':imagepaths}
 except Exception as e:return {'id':id,'status':'error','error':str(e)}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for r in pool.map(work,sorted(ids)):
  out.append(r);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),r['id'],r['status'],flush=True)
