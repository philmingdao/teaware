"""Retrieve advertised open image URLs, without authentication fallbacks."""
from pathlib import Path
import json,subprocess,time,hashlib,concurrent.futures,os
root=Path(os.environ.get('FINNA_OUTPUT','source-probe'));root.mkdir(exist_ok=True,parents=True)
rows=json.loads(Path(os.environ.get('FINNA_CANDIDATES','research/finna-hires-candidates-6000.json')).read_text())
def work(row):
 p=root/(row['id']+'.bin');time.sleep(1)
 proc=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','60','--max-filesize','24000000','--write-out','%{http_code}',row['imageSource'],'-o',str(p)],capture_output=True,text=True)
 if proc.returncode:
  p.unlink(missing_ok=True);return {**row,'status':'error','httpStatus':proc.stdout,'error':proc.stderr[-140:]}
 b=p.read_bytes();return {**row,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
out=[];transport_failures=0
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for start in range(0,len(rows),2):
  batch=list(pool.map(work,rows[start:start+2]));out.extend(batch)
  (root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
  for r in batch:
   print(len(out),r['id'],r['status'],r.get('httpStatus',''),flush=True)
   transport_failures=transport_failures+1 if r.get('httpStatus')=='000' else 0
  if any(r.get('httpStatus') in ['401','403','429','503'] for r in batch):raise RuntimeError('Server access restriction or throttling; stop this host without fallback.')
  if transport_failures>=8:raise RuntimeError('Repeated transport failures; stop this bounded run.')
