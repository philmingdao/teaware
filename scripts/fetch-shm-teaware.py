"""Collect single tea utensils through SHM's publicly advertised search API."""
import json,re,pathlib,urllib.request,urllib.error,urllib.parse,concurrent.futures,hashlib,html,threading,time
root=pathlib.Path('source-probe');root.mkdir(exist_ok=True);stop=threading.Event()
def get(url,maxbytes=30000000):
 if stop.is_set():raise RuntimeError('Access restriction encountered; stop')
 try:
  with urllib.request.urlopen(url,timeout=50) as r:
   b=r.read(maxbytes+1)
   if len(b)>maxbytes:raise ValueError('Response exceeds size cap')
   return b
 except urllib.error.HTTPError as e:
  if e.code in (401,403,429):stop.set()
  raise
clean=lambda s:re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
records={}
for q in ['tekanna','tekopp','teburk','tedosa','tesked','tesil','tefat','tekittel','tebricka']:
 for offset in range(0,1000,50):
  try:
   url='https://samlingar.shm.se/api/v1/search?'+urllib.parse.urlencode({'type':'object','query':q,'hasImage':'1','rows':50,'offset':offset});b=get(url);(root/(q+'-'+str(offset)+'.json')).write_bytes(b);j=json.loads(b)
   for x in j['items']:records[x['id']]=x
   print(q,offset,j['totalResults'],len(records),flush=True)
   if offset+len(j['items'])>=j['totalResults'] or not j['items']:break
   time.sleep(.3)
  except Exception as e:print(q,str(e),flush=True);break
(root/'index.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2))
tea=[]
for x in records.values():
 names=x['fields'].get('objectNames',{}).get('value','');title=x['title'];license=(x.get('image') or {}).get('license',{}).get('code','')
 if re.search(r'\b(?:tekanna|tekopp|teburk|tedosa|tesked|tesil|tefat|tekittel|tebricka)\b',title+' '+names,re.I) and not re.search(r'servis|leksak|dock|fragment|fodral|etui|lock till|ritning|akvarell|fotograf|textil',title,re.I) and license in ['PDM','CC BY 4.0','CC BY-SA 4.0','CC0']:tea.append(x)
print('CANDIDATES',len(tea),flush=True)
def fetch(x):
 id=x['id'];folder=root/id;folder.mkdir(exist_ok=True);url='https://samlingar.shm.se/object/'+id
 try:
  page=get(url);(folder/'page.html').write_bytes(page);s=page.decode();fields={clean(k):clean(v) for k,v in re.findall(r'<tr[^>]*>\s*<th[^>]*>(.*?)</th>\s*<td[^>]*>(.*?)</td>\s*</tr>',s,re.S)}
  caption=re.search(r'<p class="hero__caption__credit"[^>]*>(.*?)</p>',s,re.S).group(1);slug=re.search(r'license-icon-collection--([^" ]+)',caption).group(1)
  if slug not in ['cc-by-4_0','cc-by-sa-4_0','pdm','cc0']:raise ValueError('Primary image license not permissive: '+slug)
  im=html.unescape(re.search(r'class="download-button"\s+href="([^"]+)"',s).group(1));b=get(im);(folder/'source.bin').write_bytes(b)
  title=clean(re.search(r'<h1[^>]*>(.*?)</h1>',s,re.S).group(1));desc=re.search(r'<meta name="description" content="([^"]*)"',s)
  return {'id':id,'status':'downloaded','index':x,'title':title,'fields':fields,'description':html.unescape(desc.group(1)) if desc else '', 'sourceUrl':url,'imageSource':im,'imageSha256':hashlib.sha256(b).hexdigest(),'pageSha256':hashlib.sha256(page).hexdigest(),'licenseSlug':slug,'imageCredit':clean(caption)}
 except Exception as e:return {'id':id,'status':'rejected','reason':str(e)}
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
 for r in ex.map(fetch,tea[:550]):
  results.append(r);(root/'records.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
  if len(results)%10==0:print('FETCH',len(results),'/',len(tea),'downloaded',sum(x['status']=='downloaded' for x in results),flush=True)
print('DONE',len(results),sum(x['status']=='downloaded' for x in results),flush=True)
