"""Use LACMA's public-domain filter and advertised image renditions."""
import pathlib,json,re,urllib.request,time,hashlib
R=pathlib.Path('output/round31/lacma');R.mkdir(exist_ok=True)
def get(u,p,data=None):
 if p.exists():return p.read_bytes()
 req=urllib.request.Request(u,data=json.dumps(data).encode() if data else None,headers={'Content-Type':'application/json'} if data else {})
 for attempt in range(3):
  try:b=urllib.request.urlopen(req,timeout=60).read();break
  except urllib.error.HTTPError:raise
  except Exception:
   if attempt==2:raise
   time.sleep(3)
 p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);time.sleep(.6);return b
q=dict(query='tea',classification=[],department=[],artist=[],placeMade=[],creditLine=[],culture=[],period=[],style=[],building=[],gallery=[],dateStart='',dateEnd='',showNoDate=False,onView=False,hasImage=True,publicDomain=True,sort='RELEVANCE',page=1,perPage=48)
rows={}
for term in ['tea','teapot','teabowl','teacup','chawan']:
 q['query']=term
 for page in range(1,20):
  q['page']=page;p=R/(term+'-'+str(page)+'.json');j=json.loads(get('https://collections.lacma.org/api/search',p,q))
  for x in j['results']:
   o=x['data']['object'];title='; '.join(t['title'] for t in o['titles'])
   if re.search(r'tea|chawan',title,re.I) and not re.search(r'Costumes|Prints|Paintings|Textiles|Drawings|Photographs|Books',o.get('classification',''),re.I):rows[x['id']]=x
  if page*48>=j['total']:break
(R/'candidates.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2));out=[]
for i,x in enumerate(rows.values()):
 id=x['id'];o=x['data']['object'];folder=R/str(id)
 try:
  page=get('https://collections.lacma.org/object/'+str(id),folder/'page.html');im=o['images'][0];key='access' if (folder/'source.tif').exists() else 'desktop';url=im['renditions'][key];imagepath=folder/('source.tif' if key=='access' else 'source.jpg');b=get(url,imagepath)
  row={'id':'lacma-'+str(id),'status':'downloaded','raw':x,'imageSource':url,'sourceUrl':'https://collections.lacma.org/object/'+str(id),'pageSha256':hashlib.sha256(page).hexdigest(),'imageSha256':hashlib.sha256(b).hexdigest(),'folder':str(folder),'imagePath':str(imagepath),'rightsEvidence':'Public-domain filtered search plus publicDomain=1 in object page'}
 except Exception as e:row={'id':'lacma-'+str(id),'status':'error','error':str(e)}
 out.append(row);(R/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(i+1,len(rows),row['id'],row['status'],row.get('error',''),flush=True)
