"""Download licensed Finna images slowly and honor server rate limits."""
from pathlib import Path
import json,hashlib,subprocess,time,email.utils,datetime
root=Path('source-probe');root.mkdir(exist_ok=True)
rows=json.loads(Path('research/finna-candidates-4000.json').read_text());out=[]
for row in rows:
 p=root/(row['id']+'.bin');headers=root/'last-response-headers.txt';status='';error=''
 for attempt in range(2):
  time.sleep(2.2)
  r=subprocess.run(['curl','--location','--silent','--show-error','--max-time','50','--max-filesize','16000000','--dump-header',str(headers),'--write-out','%{http_code}',row['imageSource'],'-o',str(p)],capture_output=True,text=True)
  status=r.stdout;error=r.stderr[-160:]
  if status!='429':break
  retry=next((s.split(':',1)[1].strip() for s in headers.read_text().splitlines() if s.lower().startswith('retry-after:')), '65')
  try:delay=int(retry)
  except ValueError:delay=max(65,int((email.utils.parsedate_to_datetime(retry)-datetime.datetime.now(datetime.timezone.utc)).total_seconds()))
  if attempt or delay>180:break
  print(json.dumps({'rateLimited':True,'retryAfter':delay,'done':len(out)}),flush=True);time.sleep(max(delay,65))
 if status=='200' and not r.returncode:
  b=p.read_bytes();x={**row,'status':'downloaded','sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)}
 else:
  p.unlink(missing_ok=True);x={**row,'status':'error','httpStatus':status,'error':error}
 out.append(x);(root/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps({'done':len(out),'id':x['id'],'status':x['status'],'httpStatus':status}),flush=True)
 if status=='429':
  print('Rate limit remains; stopping requests and preserving partial progress.',flush=True);break
