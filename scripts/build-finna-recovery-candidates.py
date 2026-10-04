"""Preflight native pixels before fetching explicitly advertised Finna images."""
import pathlib,json,re,hashlib,urllib.parse,collections
root=pathlib.Path('.');blocked=set()
for f in ['src/data/artworks.json','research/teaware-exclusions.json','research/teaware-duplicate-aliases.json']:
 j=json.load(open(f));j=j if isinstance(j,list) else j['entries'];blocked.update(x['id'] for x in j)
for f in root.glob('output/round3*/cutouts/approvals.json'):
 blocked.update(x['id'] for x in json.loads(f.read_text()))
for f in root.glob('output/round31-*/downloaded.json'):
 j=json.loads(f.read_text());blocked.update(x['artwork']['id'] for x in j.get('selected',[]))
allowed={'museo.disec.fi','kirsti.profium.com','kontti.profium.com','data-mip.turku.fi'};out=[]
for raw in json.load(open('output/round30/finna-all-raw.json')):
 id='finna-'+hashlib.sha256(raw['id'].encode()).hexdigest()[:14]
 if id in blocked or not raw.get('identifierString') or not re.search(r'teekannu|teepannu|tekanna|teekulho|teekuppi|tekopp|teerasia|teepurkki|teburk|teesiivilä|teelusikka|teekeitin|teevati',raw.get('title',''),re.I) or re.search(r'nukke|nuken|dockservis|leikki|lelu|kansi$|kangas|myssy|patalappu|valokuva|piirustus',raw.get('title',''),re.I):continue
 im=(raw.get('imagesExtended') or [{}])[0];hi=im.get('highResolution',{});rights=im.get('rights',{})
 if not isinstance(hi,dict) or not isinstance(rights,dict) or rights.get('copyright') not in ['CC BY 4.0','CC BY 3.0','CC BY 2.0','CC0','PDM','Public Domain']:continue
 variants=[]
 for label in ['master','original']:
  v=hi.get(label,[]);v=v if isinstance(v,list) else [v]
  for x in v:
   if not isinstance(x,dict):continue
   data=x.get('data',{})
   if not isinstance(data,dict):continue
   w=int(data.get('width',{}).get('value',0));h=int(data.get('height',{}).get('value',0));size=int(data.get('size',{}).get('value',0));url=x.get('url','')
   if urllib.parse.urlparse(url).netloc in allowed and max(w,h)>=1200 and size<24000000:variants.append((x.get('format','').lower() not in ['jpg','jpeg'],label!='master',size,url,w,h))
 if not variants:continue
 _,_,size,url,w,h=sorted(variants)[0]
 out.append({'id':id,'recordId':raw['id'],'sourceUrl':'https://www.finna.fi/Record/'+raw['id'],'imageSource':url,'advertisedWidth':w,'advertisedHeight':h,'advertisedBytes':size})
out.sort(key=lambda x: (urllib.parse.urlparse(x['imageSource']).netloc!='museo.disec.fi',x['recordId']))
pathlib.Path('research/finna-recovery-candidates-6000.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),collections.Counter(urllib.parse.urlparse(x['imageSource']).netloc for x in out))
