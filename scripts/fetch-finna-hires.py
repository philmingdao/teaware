"""Retrieve advertised open image URLs. Two workers, bounded downloads, no auth fallback."""
from pathlib import Path
import json,subprocess,time,hashlib,concurrent.futures
root=Path('source-probe');root.mkdir(exist_ok=True)
rows=json.loads(Path('research/finna-hires-candidates-6000.json').read_text())
def work(row):
 p=root/(row['id']+'.bin');time.sleep(1)
 proc=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','45','--max-filesize','24000000','--write-out','%{http_code}',row['imageSource'],'-o',str(p)],capture_output=True,text=True)
 if proc.stdout in ['429','503']:raise RuntimeError('Host throttled; stop this bounded run.')
 if proc.returncode:
  p.unlink(missing_ok=True);return {**row,'status':'error','httpStatus':proc.stdout,'error':proc.stderr[-140:]}
 b=p.read_bytes();return {**row,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for r in pool.map(work,rows):
  out.append(r);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),r['id'],r['status'],flush=True)
