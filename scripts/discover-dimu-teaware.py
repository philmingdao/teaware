"""One-off bounded discovery through DigitaltMuseum's documented public API.
Uses advertised demo page size; respects HTTP throttling and checkpoints pages.
"""
import json,time,urllib.parse,urllib.request,pathlib,urllib.error,os
ROOT=pathlib.Path(os.environ.get('DIMU_DISCOVERY_OUTPUT','output/round30/dimu'));ROOT.mkdir(parents=True,exist_ok=True)
q=os.environ.get('DIMU_QUERY','artifact.name:(Tekanna OR Tekopp OR Tekanne OR Teskje OR Tesked OR Teburk OR Tedosa OR Tesil OR Teesieb OR Teedose OR Teeschale OR Teetasse OR Chawan)')
rows={};start=0
while start<int(os.environ.get('DIMU_DISCOVERY_LIMIT','2000')):
 path=ROOT/f'index-{start:04}.json'
 if path.exists(): x=json.loads(path.read_text())
 else:
  u='https://api.dimu.org/api/solr/select?'+urllib.parse.urlencode({'q':q,'fq':os.environ.get('DIMU_FILTER','artifact.type:Thing AND artifact.hasPictures:true AND artifact.ingress.production.toYear:[* TO 1920]'),'sort':'artifact.uniqueId asc','wt':'json','rows':10,'start':start,'api.key':'demo'})
  try:
   for attempt in range(3):
    try:
     x=json.load(urllib.request.urlopen(u,timeout=45));break
    except urllib.error.HTTPError:raise
    except Exception:
     if attempt==2:raise
     time.sleep(3)
   path.write_text(json.dumps(x,ensure_ascii=False))
  except urllib.error.HTTPError as e:
   print('HTTP',e.code,'Stopped; resume later without bypass.',flush=True);break
  except Exception as e:print('Error',str(e),flush=True);break
  time.sleep(.6)
 response=x['response'];docs=response['docs']
 for r in docs:rows[r['artifact.uniqueId']]=r
 print(start,response['numFound'],len(rows),flush=True)
 if not docs or start+len(docs)>=response['numFound']:break
 start+=len(docs)
(ROOT/'index.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False,indent=2))
print('FINISHED',len(rows),flush=True)
