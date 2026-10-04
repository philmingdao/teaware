"""Download only the public main image URLs advertised on KOGL Type 1 object pages."""
import json,pathlib,subprocess,time,hashlib,concurrent.futures
R=pathlib.Path('source-probe');R.mkdir(exist_ok=True)
rows=json.loads(pathlib.Path('research/emuseum-candidates-6000.json').read_text())
def work(row):
 time.sleep(.9);p=R/(row['id']+'.bin');a=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','45','--max-filesize','24000000','--write-out','%{http_code}',row['imageSource'],'-o',str(p)],capture_output=True,text=True)
 if a.stdout in ['429','503']:raise RuntimeError('throttled: stopping')
 if a.returncode:
  p.unlink(missing_ok=True);return {**row,'status':'error','error':a.stdout+' '+a.stderr[-120:]}
 b=p.read_bytes();return {**row,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for r in pool.map(work,rows):
  out.append(r);(R/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),r['id'],r['status'],flush=True)
