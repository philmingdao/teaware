"""Retain only public pages that explicitly assign KOGL Type 1 to an actual tea object."""
import json,pathlib,re,html,hashlib,sys
root=pathlib.Path(sys.argv[1]);out=[];excluded=[]
def clean(x):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',x))).strip()
for p in sorted((root/'details').glob('*.html')):
 b=p.read_bytes();s=b.decode();uid=p.stem;reject=lambda reason:excluded.append({'id':uid,'reason':reason})
 if not re.search(r'https?://www\.kogl\.or\.kr/info/licenseType1\.do',s):reject('not-KOGL-Type-1');continue
 title=re.search(r'<p[^>]*id="relicTitle"[^>]*>(.*?)</p>',s,re.S)
 museum=re.search(r'id="relicTitle"[^>]*>.*?</p>\s*<p class="text">(.*?)</p>',s,re.S)
 image=next((tag for tag in re.findall(r'<img\b[^>]+>',s) if re.search(r'\bid="img_0"',tag)),None)
 fields={}
 for key,value in re.findall(r'<li>\s*<em>(.*?)</em>\s*<span>(.*?)</span>\s*</li>',s,re.S):fields.setdefault(clean(key),clean(value))
 title=clean(title[1]) if title else ''
 if not title or not museum or not image or not fields.get('소장품번호'):reject('incomplete-identity-or-image');continue
 if not re.search('다완|찻잔|다관|찻주전자|찻통|차호|다호|다기|차통|찻숟가락|茶碗|茶盌|茶壺|茶器|茶罐',title+' '+fields.get('다른명칭','')):reject('unverified-tea-use');continue
 if re.search('편$|도편|파편|뚜껑|그림|사진|명세서|도록|茶碗圖',title):reject('fragment-or-non-object');continue
 dim=re.search(r'id="txt_bt">\s*원본 해상도\s*(\d+)\s*\*\s*(\d+)',s);src=re.search(r'\bsrc="([^"]+)"',image)
 if not dim or max(map(int,dim.groups()))<1200 or not src or not src[1].startswith('/IMG/'):reject('native-resolution-unverified');continue
 out.append({'id':'emuseum-'+uid,'relicId':uid,'title':title,'museum':clean(museum[1]),'fields':fields,'sourceUrl':'https://www.emuseum.go.kr/detail?relicId='+uid,'imageSource':'https://www.emuseum.go.kr'+html.unescape(src[1]),'licenseUrl':'https://www.kogl.or.kr/info/licenseType1.do','pageSha256':hashlib.sha256(b).hexdigest(),'nativeDimensions':list(map(int,dim.groups()))})
pathlib.Path('research/emuseum-candidates-6000.json').write_text(json.dumps(out,ensure_ascii=False,indent=2));(root/'excluded.json').write_text(json.dumps(excluded,ensure_ascii=False,indent=2));print('KOGL1 candidates',len(out),'excluded',len(excluded))
