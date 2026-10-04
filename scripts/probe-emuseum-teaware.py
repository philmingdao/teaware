"""Bounded read-only probe of the Korean museum catalogue's public search pages."""
import pathlib,urllib.parse,subprocess,time
R=pathlib.Path('source-probe');R.mkdir(exist_ok=True)
urls={'main':'https://www.emuseum.go.kr/main','search-form':'https://www.emuseum.go.kr/detailSearch','copyright':'https://www.emuseum.go.kr/copyright'}
for term in ['다완','찻잔','茶碗','다관','茶壺']:
 urls[term]='https://www.emuseum.go.kr/headerSearch?'+urllib.parse.urlencode({'category':'','keyword':term,'keywordHistory':term,'pageNum':1,'rows':36})
for name,url in urls.items():
 time.sleep(1);p=R/(name+'.html');r=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','40','--write-out','%{http_code}',url,'-o',str(p)],capture_output=True,text=True)
 print(name,r.returncode,r.stdout,r.stderr[-140:],flush=True)
 if r.stdout in ['429','503']:break
