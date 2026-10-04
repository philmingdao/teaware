"""Download only advertised, reusable primary images from the public Finna UI."""
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
import json,hashlib,subprocess,sys
root=Path('source-probe');root.mkdir(exist_ok=True)
rows=json.loads(Path('research/finna-candidates-4000.json').read_text());shard=int(sys.argv[1]);rows=rows[shard::3]
def run(row):
 p=root/(row['id']+'.bin')
 r=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','50','--max-filesize','16000000',row['imageSource'],'-o',str(p)],capture_output=True)
 if r.returncode:p.unlink(missing_ok=True);return {**row,'status':'error','error':r.stderr.decode()[-160:]}
 b=p.read_bytes();return {**row,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
out=[]
with ThreadPoolExecutor(max_workers=2) as pool:
 for f in as_completed([pool.submit(run,r) for r in rows]):
  x=f.result();out.append(x);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'done':len(out),'id':x['id'],'status':x['status']}),flush=True)
