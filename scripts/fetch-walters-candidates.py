from pathlib import Path
import json,hashlib,subprocess,time,concurrent.futures
root=Path('source-probe');root.mkdir(exist_ok=True)
rows=json.loads(Path('research/walters-candidates-4000.json').read_text())
def work(r):
 id=r['object']['ObjectID'];p=root/(id+'.jpg');time.sleep(1)
 run=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','45','--max-filesize','30000000',r['media']['ImageURL'],'-o',str(p)],capture_output=True)
 if run.returncode:p.unlink(missing_ok=True);return {**r,'status':'error','error':run.stderr.decode()[-120:]}
 b=p.read_bytes();return {**r,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for x in pool.map(work,rows):
  out.append(x);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(x['object']['ObjectID'],x['status'],flush=True)
# Public source discovery only; no authenticated or protected endpoints.
for name,url in [('emuseum','https://www.emuseum.go.kr/'),('victoria','https://collections.museumsvictoria.com.au/api/search?query=teapot&itemtype=object&perpage=100')]:
 subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','35',url,'-o',str(root/(name+'.txt'))])
