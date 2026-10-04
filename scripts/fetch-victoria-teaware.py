"""Museum-documented public JSON and image URLs; image-specific permissive licences only."""
import json,pathlib,urllib.request,urllib.parse,urllib.error,time,re,hashlib,concurrent.futures
R=pathlib.Path('source-probe');R.mkdir(exist_ok=True)
for sub in ['search','images']:(R/sub).mkdir(exist_ok=True)
def get(u,p):
 if p.exists():return p.read_bytes()
 time.sleep(.8)
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'TeawareGallery collection research (public CC images)'})
  b=urllib.request.urlopen(req,timeout=35).read();p.write_bytes(b);return b
 except urllib.error.HTTPError as e:
  if e.code in [429,503]:raise RuntimeError('Throttled; stop run')
  raise
rows={}
for term in ['teapot','tea cup','tea bowl','tea caddy','tea strainer','tea spoon','tea set']:
 for page in range(1,11):
  u='https://collections.museumsvictoria.com.au/api/search?'+urllib.parse.urlencode({'query':term,'itemtype':'object','hasimages':'yes','perpage':100,'page':page})
  a=json.loads(get(u,R/'search'/f'{term}-{page}.json'));print(term,page,len(a),flush=True)
  if not isinstance(a,list):raise ValueError('Unexpected search schema')
  for x in a:
   if x.get('recordType')!='item' or not re.search(r'\btea\s?(?:pot|cup|bowl|caddy|strainer|spoon|set)',x.get('title',''),re.I):continue
   if re.search(r'fragment|sherd|drawing|photograph|toy|doll|tea towel',x.get('title',''),re.I):continue
   rows[x['id']]=x
  if len(a)<100:break
(R/'candidates.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2))
def work(x):
 id=x['id'].split('/')[-1]
 try:
  ims=[m for m in x.get('media',[])if m.get('type')=='image' and m.get('licence',{}).get('shortName')in ['CC BY','CC BY-SA','Public Domain','CC0'] and m.get('large')and max(m['large']['width'],m['large']['height'])>=1200]
  if not ims:return {'id':id,'status':'no-qualified-image','raw':x}
  im=ims[0];u=im['large']['uri'];b=get(u,R/'images'/(id+'.jpg'))
  return {'id':id,'status':'downloaded','raw':x,'image':im,'imageSource':u,'sourceUrl':'https://collections.museumsvictoria.com.au/'+x['id'],'sha256':hashlib.sha256(b).hexdigest()}
 except RuntimeError:raise
 except Exception as e:return {'id':id,'status':'error','error':str(e),'raw':x}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for x in pool.map(work,rows.values()):
  out.append(x);(R/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),x['id'],x['status'],flush=True)
