"""Small-scale tea query and public-domain images; single worker, <=1 request/second."""
import pathlib,json,urllib.parse,subprocess,time,re,hashlib
R=pathlib.Path('output/round31/aic');R.mkdir(parents=True,exist_ok=True)
for sub in ['pages','images','info']:(R/sub).mkdir(exist_ok=True)
def get(u,p):
 if p.exists() and p.stat().st_size:return p.read_bytes()
 time.sleep(1.1);a=subprocess.run(['curl','--fail','--silent','--show-error','--location','--max-time','40','--max-filesize','20000000','--write-out','%{http_code}',u,'-o',str(p)],capture_output=True,text=True)
 if a.returncode:
  p.unlink(missing_ok=True)
  if a.stdout in ['401','403','429','503']:raise RuntimeError('Source access unavailable '+a.stdout)
  raise ValueError(a.stderr[-150:])
 b=p.read_bytes()
 if b'<title>Block' in b or b'captcha' in b[:500].lower():raise RuntimeError('blocked')
 return b
terms=['teapot','tea bowl','teacup','tea cup','tea caddy','tea strainer','tea spoon','tea urn','tea kettle','tea scoop','tea whisk','tea tray','tea saucer','chawan','chaire','mizusashi','yunomi','kyusu','natsume']
query={'bool':{'must':[{'term':{'is_public_domain':True}},{'bool':{'should':[{'match_phrase':{'title':t}} for t in terms],'minimum_should_match':1}}]}}
fields='id,title,is_public_domain,image_id,date_display,date_start,date_end,medium_display,main_reference_number,artist_display,dimensions,credit_line,place_of_origin,artwork_type_title,classification_titles,description,thumbnail,copyright_notice'
page=1;rows=[]
while page<=20:
 params={'query':query,'limit':100,'page':page,'fields':fields.split(',')};u='https://api.artic.edu/api/v1/artworks/search?'+urllib.parse.urlencode({'params':json.dumps(params,separators=(',',':'))});x=json.loads(get(u,R/'pages'/f'{page}.json'));rows+=x['data'];print('metadata',page,x['pagination']['total'],flush=True)
 if page>=x['pagination']['total_pages']:break
 page+=1
(R/'records-metadata.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));out=[]
for x in rows:
 if not x.get('image_id') or not x.get('is_public_domain') or re.search(r'fragment|\blid\b(?!.*with)|\bprint\b|drawing|textile|painting|photograph',x.get('artwork_type_title') or '',re.I):continue
 try:
  base='https://www.artic.edu/iiif/2/'+x['image_id'];info=json.loads(get(base+'/info.json',R/'info'/(str(x['id'])+'.json')))
  if max(info.get('width',0),info.get('height',0))<1200:continue
  size='1600,' if info['width']>=info['height'] else ',1600';u=base+'/full/'+size+'/0/default.jpg';b=get(u,R/'images'/(str(x['id'])+'.jpg'));r={'id':'aic-'+str(x['id']),'raw':x,'iiif':info,'imageSource':u,'sha256':hashlib.sha256(b).hexdigest(),'status':'downloaded'}
 except RuntimeError:raise
 except Exception as e:r={'id':'aic-'+str(x['id']),'status':'error','error':str(e)}
 out.append(r);(R/'downloaded.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),r['id'],r['status'],flush=True)
