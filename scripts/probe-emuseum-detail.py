import pathlib,subprocess,time
R=pathlib.Path('source-probe');R.mkdir(exist_ok=True)
for uid in ['PS0100300500101018700000','PS0100300500101016600000','PS0100100102400295700000']:
 time.sleep(1);p=R/(uid+'.html');r=subprocess.run(['curl','--fail','--location','--silent','--show-error','--max-time','40','--write-out','%{http_code}','https://www.emuseum.go.kr/detail?relicId='+uid,'-o',str(p)],capture_output=True,text=True);print(uid,r.returncode,r.stdout,r.stderr[-100:])
 if r.stdout in ['429','503']:break
