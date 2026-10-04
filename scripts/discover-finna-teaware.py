"""Read public, openly reusable museum tea-object metadata. No images published."""
import json,subprocess,urllib.parse,time
from pathlib import Path
root=Path('source-probe');root.mkdir(exist_ok=True)
fields=['id','title','alternativeTitles','identifierString','buildings','institutions','imagesExtended','imageRights','events','year','creationDateRange','physicalDescriptions','summary','subjects','fullRecord','recordPage','accessRestrictions']
allrows={};summaries=[]
for term in ['teesiivilä','teelusikka','teekulho','teepurkki','teeastia','teekalusto','tekopp','teburk']:
 for page in range(1,31):
  params=[('lookfor',term),('type','AllFields'),('limit','100'),('page',str(page)),('lng','en-gb'),('filter[]','format:"0/PhysicalObject/"')]+[('field[]',x) for x in fields]
  url='https://api.finna.fi/v1/search?'+urllib.parse.urlencode(params)
  p=root/f'{term}-{page}.json';r=subprocess.run(['curl','--fail','--silent','--show-error','--max-time','45',url,'-o',str(p)],capture_output=True)
  if r.returncode:print(r.stderr.decode(),flush=True);break
  data=json.loads(p.read_text());rs=data.get('records',[])
  for row in rs:allrows[row['id']]=row
  print(json.dumps({'term':term,'page':page,'total':data.get('resultCount'),'unique':len(allrows)}),flush=True)
  (root/'records.json').write_text(json.dumps(list(allrows.values()),ensure_ascii=False,indent=2))
  if page*100>=data.get('resultCount',0):break
  time.sleep(.5)
