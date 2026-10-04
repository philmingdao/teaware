"""Read public search/result HTML at its advertised 36-item page size.
No API key, login, or private endpoints. Stop on throttling; retain source evidence.
"""
import pathlib,urllib.parse,subprocess,time,re,json,concurrent.futures,html
R=pathlib.Path('source-probe');R.mkdir(exist_ok=True)
for sub in ['search','details']:(R/sub).mkdir(exist_ok=True)
terms=['다완','찻잔','다관','찻주전자','찻통','차호','다호','다기','차통','찻숟가락']
def get(url,p):
 if p.exists() and p.stat().st_size:return p.read_text()
 time.sleep(.9);a=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','40','--write-out','%{http_code}',url,'-o',str(p)],capture_output=True,text=True)
 if a.returncode:
  p.unlink(missing_ok=True)
  if a.stdout in ['429','503']:raise RuntimeError('rate limit; stopping')
  raise ValueError(a.stdout+' '+a.stderr[-100:])
 return p.read_text()
records={}
for term in terms:
 page=1
 while page<=40:
  u='https://www.emuseum.go.kr/headerSearch?'+urllib.parse.urlencode({'category':'','keyword':term,'keywordHistory':term,'pageNum':page,'rows':36})
  s=get(u,R/'search'/f'{term}-{page}.html');total=int(re.search(r"var total = parseInt\('([0-9]+)'",s)[1]);print(term,page,total,flush=True)
  if total>1440:print('broad-query-skipped',term,flush=True);break
  for chunk in s.split('<div class="item">')[1:]:
   idm=re.search(r'id="linkI_([^"]+)"',chunk);title=re.search(r'<div class="title ellipsis">(.*?)</div>',chunk,re.S)
   if not idm or not title:continue
   name=html.unescape(re.sub('<[^>]+>','',title[1])).strip()
   if not re.search('다완|찻잔|다관|찻주전자|찻통|차호|다호|다기|차통|찻숟가락|茶碗|茶壺|茶器|茶罐',name):continue
   if re.search('편$|도편|파편|뚜껑|그림|사진|명세서|도록|茶碗圖',name):continue
   uid=idm[1];records[uid]={'id':uid,'title':name,'sourceUrl':'https://www.emuseum.go.kr/detail?relicId='+uid,'searchUrl':u}
  if page*36>=total:break
  page+=1
 (R/'candidates.json').write_text(json.dumps(list(records.values()),ensure_ascii=False,indent=2))
print('DISTINCT',len(records),flush=True)
def detail(r):
 try:
  s=get(r['sourceUrl'],R/'details'/(r['id']+'.html'));return {**r,'status':'downloaded','bytes':len(s)}
 except RuntimeError:raise
 except Exception as e:return {**r,'status':'error','error':str(e)}
out=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2)as pool:
 for x in pool.map(detail,list(records.values())[:1500]):
  out.append(x);(R/'records.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));print(len(out),x['id'],x['status'],flush=True)
