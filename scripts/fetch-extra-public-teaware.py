"""Bounded discovery from public museum pages; no login/download challenges."""
from pathlib import Path
import subprocess,json,re,html,time,os
root=Path('source-probe');root.mkdir(exist_ok=True)
def get(url,dest,post=None):
 args=['curl','--fail','--location','--silent','--show-error','--max-time','40','--max-filesize','30000000']
 if post:args+=['-H','Content-Type: application/json','--data',json.dumps(post)]
 r=subprocess.run(args+[url,'-o',str(dest)],capture_output=True)
 if r.returncode:dest.unlink(missing_ok=True);raise RuntimeError(r.stderr.decode()[-120:])
 return dest.read_text()
# Resolve the museum's current, publicly advertised download link.
try:
 s=get('https://art.thewalters.org/object/67.251/',root/'walters-sample.html')
 links=re.findall(r'href=[\"\']([^\"\']*\?download=[^\"\']+)',s)
 if links:
  from urllib.parse import urljoin
  get(urljoin('https://art.thewalters.org/object/67.251/',html.unescape(links[0])),root/'walters-sample.jpg')
except Exception as e:print('Walters public download unavailable:',str(e),flush=True)
# Current NPM public catalogue, additional native tea-object names.
known={x['sourceUrl'] for x in json.loads(Path('research/npm-candidates-4000.json').read_text())};out={}
for term in ['茗','盞','天目','建窯','紫砂壺']:
 for page in range(1,21):
  try:
   time.sleep(.6);p=root/f'npm-{term}-{page}.html'
   s=get('https://digitalarchive.npm.gov.tw/Collection/Search',p,{'SearchContent':term,'PageInfo':{'PageIndex':page,'PageSize':30}})
   for url,title,body in re.findall(r'<a href="(/Collection/Detail/\d+\?dep=U)"[^>]*class="list-item"[^>]*title="移至 (.*?) \[另開新視窗\]">(.*?)</a>',s,re.S):
    url='https://digitalarchive.npm.gov.tw'+html.unescape(url)
    if url not in known:out[url]={'sourceUrl':url,'title':html.unescape(title),'body':html.unescape(re.sub('<[^>]+>',' ',body)).strip()}
   model=json.loads(re.search(r'var serializedModel = (\{.*?\});',s).group(1));count=model['PageInfo']['PageCount']
   print(term,page,count,'new',len(out),flush=True)
   if page>=count:break
  except Exception as e:print(term,str(e),flush=True);break
(root/'npm-extra-inventory.json').write_text(json.dumps(list(out.values()),ensure_ascii=False,indent=2))
# Download public evidence, leaving inclusion to local source and image review.
Path('research/npm-extra-candidates-4000.json').write_text(json.dumps(list(out.values()),ensure_ascii=False))
os.environ['NPM_CANDIDATES']='research/npm-extra-candidates-4000.json';os.environ['NPM_SKIP_LEAD_GATE']='1';os.environ['NPM_SHARDS']='1'
subprocess.run(['python','scripts/fetch-npm-candidates.py','0'],check=True)
