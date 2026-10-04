"""Public historical object images. Keep record and image rights independently.
Skip any restrictive image override; conserve exact license codes (no invented version).
"""
import json,pathlib,urllib.request,urllib.error,time,hashlib,concurrent.futures,re,os
R=pathlib.Path(os.environ.get('DIMU_OUTPUT','output/round30/dimu'));R.mkdir(exist_ok=True,parents=True);(R/'details').mkdir(exist_ok=True);(R/'images').mkdir(exist_ok=True)
records={r['artifact.uniqueId']:r for r in json.loads(pathlib.Path(os.environ['DIMU_CANDIDATES']).read_text())} if os.environ.get('DIMU_CANDIDATES') else {r['artifact.uniqueId']:r for f in sorted(R.glob('index-*.json')) for r in json.loads(f.read_text())['response']['docs']}
allowed={'by','by-sa','CC0 1.0','pdm','zero'}
def fetch(u,p):
 if p.exists() and p.stat().st_size:return p.read_bytes()
 for attempt in range(3):
  try:
   time.sleep(.7);b=urllib.request.urlopen(u,timeout=45).read();p.write_bytes(b);return b
  except urllib.error.HTTPError:raise
  except Exception:
   if attempt==2:raise
   time.sleep(3)
def work(r):
 uid=r['artifact.uniqueId']
 try:
  x=json.loads(fetch('https://api.dimu.org/artifact/uuid/'+r['artifact.uuid'],R/'details'/(uid+'.json')))
  licenses=x.get('licenses',[])
  if not licenses or any(l.get('system')!='CC' or l.get('code') not in allowed for l in licenses):return {'id':uid,'status':'record-rights-excluded'}
  pics=x.get('media',{}).get('pictures',[]);im=next((p for p in pics if p.get('identifier')==r.get('artifact.defaultMediaIdentifier')),None)
  if not im or max(im.get('width',0),im.get('height',0))<1200:return {'id':uid,'status':'image-missing-or-low-resolution'}
  override=im.get('licenses',[])
  if override and any(l.get('system')!='CC' or l.get('code') not in allowed for l in override):return {'id':uid,'status':'image-rights-excluded'}
  u='https://ems.dimu.org/image/'+im['identifier']+'?dimension=1200x1200'
  b=fetch(u,R/'images'/(uid+'.jpg'))
  return {'id':uid,'status':'downloaded','index':r,'raw':x,'image':im,'imageSource':u,'sha256':hashlib.sha256(b).hexdigest(),'effectiveImageLicenses':override or licenses,'licenseOrigin':'image-override' if override else 'record-license'}
 except urllib.error.HTTPError as e:
  if e.code in [429,503]:raise
  return {'id':uid,'status':'error','error':str(e)}
 except Exception as e:return {'id':uid,'status':'error','error':str(e)}
candidates=[]
for r in records.values():
 if r.get('artifact.ingress.license') not in [['CC by'],['CC by-sa'],['CC CC0 1.0']]:continue
 if max(map(int,r.get('artifact.defaultPictureDimension','0x0').split('x')))<1200:continue
 candidates.append(r)
# Prefer explicitly Chinese/Japanese-origin vessels before auxiliary tools.
candidates.sort(key=lambda r:(not bool(re.search('Kina|Japan|Korea',str(r),re.I)),not bool(re.search('tekanna|tekanne|tekopp|tedosa|teburk',str(r.get('artifact.ingress.names')),re.I)),r['artifact.uniqueId']))
(R/'candidates.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2));print('CANDIDATES',len(candidates),flush=True)
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as p:
 for v in p.map(work,candidates):
  out.append(v);(R/'downloaded.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),v['id'],v['status'],flush=True)
