"""Public National Museum of Denmark pages and their advertised licensed downloads."""
import pathlib,json,re,html,urllib.request,urllib.parse,time,hashlib,os,urllib.error
R=pathlib.Path(os.environ.get('NATMUS_SOURCE_ROOT','output/round31/natmus'));R.mkdir(parents=True,exist_ok=True)
def get(url,p):
 if p.exists():return p.read_bytes()
 b=urllib.request.urlopen(url,timeout=60).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);time.sleep(.5);return b
rows={}
for q in os.environ.get('NATMUS_TERMS','tekande,tekop,teskål,tedåse,teske,tesi,tepotte,te-dåse,te-si,téskål,tekedel').split(','):
 for start in range(0,400,100):
  p=R/(q+('' if start==0 else str(start))+'.json')
  try:j=json.loads(get('https://samlinger.natmus.dk/api/objectbrowse?media=image,rotation&keyword='+urllib.parse.quote(q)+'&size=100&from='+str(start),p))
  except urllib.error.HTTPError as e:
   if e.code in [401,403,429]:raise
   print(q,str(e),flush=True);break
  except Exception as e:print(q,str(e),flush=True);break
  for x in j.get('hits',[]):
   if re.search(r'te[- ]?(?:kande|kop|skål|dåse|ske|si|potte|kedel)|thepotte|thekande|samovar|tebakke|tebeholder|tekasse|tekrus|thekedel|thekop|thedåse',x['title'],re.I):rows[x['url']]=x
  if start+100>=j.get('total',0):break
(R/'candidates.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2));out=[]
for i,x in enumerate(rows.values()):
 ident=x['url'].strip('/').replace('/object/','-');folder=R/'objects'/ident
 try:
  page=get('https://samlinger.natmus.dk'+x['url'],folder/'page.html').decode();raw=json.loads(html.unescape(re.search(r'<pre[^>]*>(.*?)</pre>',page,re.S).group(1)))
  if re.search(r'legetøj|fragment|dukke|skår|låggreb',raw['betegnelse'],re.I):continue
  aid=x['img'].rsplit('/',1)[-1];download=re.search(r'<div id="content-download-[^>]*'+re.escape(aid)+r'"(.*?)(?=<div class="download-headline">Alle|</div>\s*</div>\s*</div>)',page,re.S)
  if not download:raise ValueError('No advertised image download')
  sec=download.group(1);lic=re.search(r'https://creativecommons.org/(?:licenses/by(?:-sa)?/4.0/|publicdomain/(?:zero|mark)/1.0/)',sec);url=re.search(r'<a href="([^"]+\.jpg\?[^"]+)" id="download-jpeg-button"',sec);dims=re.search(r'(\d+)x(\d+) pixels',sec)
  if not lic or not url or not dims or max(map(int,dims.groups()))<1200:raise ValueError('Rights or resolution gate')
  imageurl='https://samlinger.natmus.dk'+html.unescape(url.group(1)).split('?')[0];b=get(imageurl,folder/'source.jpg')
  if b[:2]!=b'\xff\xd8':raise ValueError('Expected JPEG')
  row={'id':'natmus-'+ident,'status':'downloaded','raw':raw,'sourceUrl':'https://samlinger.natmus.dk'+x['url'],'imageSource':imageurl,'licenseUrl':lic.group(),'nativeWidth':int(dims[1]),'nativeHeight':int(dims[2]),'pageSha256':hashlib.sha256(page.encode()).hexdigest(),'imageSha256':hashlib.sha256(b).hexdigest(),'folder':str(folder)}
 except urllib.error.HTTPError as e:
  if e.code in [401,403,429]:raise
  row={'id':'natmus-'+ident,'status':'error','error':str(e)}
 except Exception as e:row={'id':'natmus-'+ident,'status':'error','error':str(e)}
 out.append(row);(R/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(i+1,len(rows),row['id'],row['status'],row.get('error',''),flush=True)
