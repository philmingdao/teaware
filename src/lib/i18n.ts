import type { Artwork } from '@/types/artwork';
import { heroTranslations } from './hero-translations';

export const locales = ['zh', 'en', 'ja', 'ko'] as const;
export type Locale = typeof locales[number];
export const languageNames: Record<Locale, string> = { zh: '中文', en: 'English', ja: '日本語', ko: '한국어' };
export const languageTags: Record<Locale, string> = { zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko' };
export function isLocale(value: unknown): value is Locale { return locales.includes(value as Locale); }

// All interface translations are reviewed together; positional entries are zh/en/ja/ko.
export const messages = {
  brand: ['器 · 茶', 'Vessels · Tea', '器 · 茶', '기물 · 차'],
  siteTitle: ['东亚茶器艺术展', 'East Asian Teaware Art Exhibition', '東アジア茶器芸術展', '동아시아 다구 예술전'],
  exhibition: ['展览', 'Exhibition', '展覧会', '전시'],
  collection: ['藏品', 'Collection', '収蔵品', '소장품'],
  about: ['关于展览', 'About the exhibition', '展覧会について', '전시 소개'],
  home: ['首页', 'Home', 'ホーム', '홈'],
  language: ['语言', 'Language', '言語', '언어'],
  menu: ['切换菜单', 'Toggle menu', 'メニューを切り替え', '메뉴 전환'],
  heroIntro: ['从中国的建盏与紫砂，到日本的茶碗与茶入、韩国的青瓷与白瓷，茶器连接着东亚的生活、工艺与审美。本展汇集全球博物馆的开放藏品，也呈现茶文化走向世界的交流与影响，邀你近看器形、釉色与纹样。', 'From Chinese Jian bowls and Yixing teapots to Japanese tea bowls and caddies, and Korean celadon and porcelain, teaware connects everyday life, craft and aesthetics across East Asia. Explore open museum collections and the exchanges that carried tea culture around the world, through form, glaze and ornament.', '中国の建盞や宜興紫砂、日本の茶碗や茶入、韓国の青磁や白磁。茶器は東アジアの暮らし、技術、美意識を結びます。世界の博物館の公開コレクションを通して、茶文化の交流と広がりを、器の形、釉色、文様からたどります。', '중국의 건요 찻잔과 이싱 자사호, 일본의 찻사발과 차이레, 한국의 청자와 백자까지. 다구는 동아시아의 일상과 공예, 미감을 연결합니다. 세계 박물관의 공개 소장품을 통해 기형과 유약, 문양을 살피며 차 문화의 교류와 확산을 만나보세요.'],
  enter: ['进入展厅', 'Enter the gallery', '展示を見る', '전시실 입장'],
  tv: ['电视模式', 'TV mode', 'テレビモード', 'TV 모드'],
  slideshow: ['幻灯', 'Slideshow', 'スライドショー', '슬라이드 쇼'],
  startSlideshow: ['开始幻灯', 'Start slideshow', 'スライドショーを開始', '슬라이드 쇼 시작'],
  exitSlideshow: ['退出幻灯', 'Exit slideshow', 'スライドショーを終了', '슬라이드 쇼 종료'],
  pause: ['暂停', 'Pause', '一時停止', '일시 정지'],
  play: ['播放', 'Play', '再生', '재생'],
  autoplay: ['自动播放', 'Autoplay', '自動再生', '자동 재생'],
  pauseSlideshow: ['暂停幻灯', 'Pause slideshow', 'スライドショーを一時停止', '슬라이드 쇼 일시 정지'],
  playSlideshow: ['自动播放幻灯', 'Autoplay slideshow', 'スライドショーを自動再生', '슬라이드 쇼 자동 재생'],
  pauseTV: ['暂停轮播', 'Pause rotation', '自動再生を一時停止', '자동 순환 일시 정지'],
  playTV: ['自动轮播', 'Autoplay rotation', '自動再生', '자동 순환 재생'],
  prev: ['上一件藏品', 'Previous artwork', '前の収蔵品', '이전 소장품'],
  next: ['下一件藏品', 'Next artwork', '次の収蔵品', '다음 소장품'],
  prevHero: ['上一件封面作品', 'Previous cover artwork', '前のメイン作品', '이전 대표 작품'],
  nextHero: ['下一件封面作品', 'Next cover artwork', '次のメイン作品', '다음 대표 작품'],
  pauseHero: ['暂停封面轮换', 'Pause cover rotation', 'メイン作品の切り替えを一時停止', '대표 작품 순환 일시 정지'],
  playHero: ['继续封面轮换', 'Resume cover rotation', 'メイン作品の切り替えを再開', '대표 작품 순환 재개'],
  stopMusic: ['停止音乐', 'Stop music', '音楽を停止', '음악 정지'],
  playMusic: ['播放音乐', 'Play music', '音楽を再生', '음악 재생'],
  featured: ['精选藏品', 'Featured collection', '注目の収蔵品', '주요 소장품'],
  featuredIntro: ['从建盏的深沉到青瓷的温润，每一件茶器都凝聚着不同文化的审美与工艺智慧。', 'From dark Jian glazes to luminous celadon, each vessel reveals the aesthetics and craftsmanship of its culture.', '建盞の深い色から青磁の柔らかな艶まで、一つひとつの茶器に、それぞれの文化の美意識と技が息づいています。', '건요 찻잔의 깊은 빛부터 청자의 은은한 윤기까지, 다구마다 각 문화의 미감과 공예 지혜가 담겨 있습니다.'],
  browseAll: ['浏览全部藏品', 'Browse all artworks', 'すべての収蔵品を見る', '전체 소장품 보기'],
  gallery: ['藏品浏览', 'Collection gallery', '収蔵品一覧', '소장품 둘러보기'],
  galleryIntro: ['按时代与地区、材质、器型或来源筛选，探索东亚茶器与跨文化交流。', 'Explore East Asian teaware and cultural exchange by period or region, material, type and museum.', '時代・地域、材質、器形、所蔵館から、東アジアの茶器と文化交流を探ります。', '시대·지역, 재질, 기형, 소장처별로 동아시아 다구와 문화 교류를 살펴보세요.'],
  dynasty: ['时代与地区', 'Period / region', '時代・地域', '시대·지역'],
  material: ['材质', 'Material', '材質', '재질'],
  objectType: ['器型', 'Type', '器形', '기형'],
  museum: ['来源', 'Museum', '所蔵館', '소장처'],
  all: ['全部', 'All', 'すべて', '전체'],
  count: ['共 {count} 件藏品', '{count} artworks', '収蔵品 {count} 件', '소장품 {count}점'],
  page: ['第 {current}/{total} 页', 'Page {current}/{total}', '{current}/{total} ページ', '{current}/{total} 페이지'],
  prevPage: ['← 上一页', '← Previous page', '← 前のページ', '← 이전 페이지'],
  nextPage: ['下一页 →', 'Next page →', '次のページ →', '다음 페이지 →'],
  empty: ['暂无符合条件的藏品', 'No artworks match these filters', '条件に合う収蔵品はありません', '조건에 맞는 소장품이 없습니다'],
  emptyImages: ['暂无可展示的藏品图片', 'No artwork images are available', '表示できる収蔵品画像がありません', '표시할 소장품 이미지가 없습니다'],
  backGallery: ['返回藏品列表', 'Back to the collection', '収蔵品一覧に戻る', '소장품 목록으로 돌아가기'],
  loading: ['加载中…', 'Loading…', '読み込み中…', '불러오는 중…'],
  buffering: ['正在缓冲下一幅', 'Loading the next artwork', '次の作品を読み込み中', '다음 작품을 불러오는 중'],
  shortcuts: ['← → 切换　P 轮播　M 音乐　ESC 退出', '← → Navigate · P Autoplay · M Music · ESC Exit', '← → 切り替え · P 自動再生 · M 音楽 · ESC 終了', '← → 이동 · P 자동 재생 · M 음악 · ESC 종료'],
  details: ['查看详情', 'View details', '詳細を見る', '상세 보기'],
  date: ['年代', 'Date', '年代', '제작 시기'],
  kiln: ['窑口', 'Kiln', '窯', '가마'],
  dimensions: ['尺寸', 'Dimensions', '寸法', '크기'],
  collectionInfo: ['收藏信息', 'Collection information', '所蔵情報', '소장 정보'],
  accession: ['馆藏编号', 'Accession number', '収蔵番号', '소장 번호'],
  imageCredit: ['图片来源', 'Image source', '画像提供', '이미지 출처'],
  sourceTitle: ['馆方原名', 'Museum title', '所蔵館の原題', '소장처 원제'],
  viewMuseum: ['在博物馆官网查看', 'View on the museum website', '博物館の公式サイトで見る', '박물관 공식 사이트에서 보기'],
  noId: ['未指定藏品 ID', 'No artwork ID specified', '収蔵品 ID が指定されていません', '소장품 ID가 지정되지 않았습니다'],
  notFound: ['藏品未找到', 'Artwork not found', '収蔵品が見つかりません', '소장품을 찾을 수 없습니다'],
  loadError: ['无法加载藏品数据', 'Unable to load artwork data', '収蔵品データを読み込めません', '소장품 데이터를 불러올 수 없습니다'],
  removed: ['您访问的藏品不存在或已被移除。', 'This artwork does not exist or has been removed.', 'この収蔵品は存在しないか、削除されています。', '소장품이 없거나 삭제되었습니다.'],
  pageNotFound: ['页面未找到', 'Page not found', 'ページが見つかりません', '페이지를 찾을 수 없습니다'],
  pageRemoved: ['您访问的页面不存在或已被移除。', 'This page does not exist or has been removed.', 'このページは存在しないか、削除されています。', '페이지가 없거나 삭제되었습니다.'],
  backHome: ['返回首页', 'Back home', 'ホームに戻る', '홈으로 돌아가기'],
  nav: ['导览', 'Navigation', 'ご案内', '안내'],
  credits: ['数据来源与致谢', 'Sources and credits', 'データ提供・謝辞', '자료 출처 및 감사의 말'],
  tagline: ['探索跨越千年的器物之美', 'Discover centuries of beauty in teaware', '時代を超える茶器の美を探る', '시대를 잇는 다구의 아름다움'],
  licenseNote: ['藏品图片按各来源开放许可使用，具体许可见作品详情与关于展览。', 'Images are used under their source licenses. See each artwork and the exhibition information for details.', '画像は各提供元の利用条件に従って使用しています。詳細は作品ページと展覧会情報をご覧ください。', '이미지는 각 출처의 이용 허가에 따라 사용합니다. 자세한 조건은 작품 상세와 전시 소개를 확인하세요.'],
  theme: ['当前主题', 'Current theme', '現在のテーマ', '현재 테마'],
  light: ['浅色', 'Light', 'ライト', '라이트'],
  dark: ['深色', 'Dark', 'ダーク', '다크'],
  system: ['跟随系统', 'System', 'システム設定', '시스템 설정'],
  closeLook: ['器物近观', 'A closer look', '茶器を間近に', '다구 가까이 보기'],
  closeLink: ['器物近观 · {count} 件透明底试展 →', 'A closer look · {count} transparent images →', '茶器を間近に · {count} 点の透過画像 →', '다구 가까이 보기 · 투명 이미지 {count}점 →'],
  closeIntro: ['让背景退去，让器物走近。从釉色到轮廓，重新看见一件茶器的分量。', 'Let the background recede and the vessel come closer. Rediscover its glaze, silhouette and presence.', '背景を取り除き、茶器を身近に。釉色から輪郭まで、一つの器が持つ存在感を見つめ直します。', '배경을 걷어내고 다구를 가까이. 유약의 빛부터 윤곽까지, 기물의 존재감을 새롭게 살펴보세요.'],
  imageView: ['图片视图', 'Image view', '画像表示', '이미지 보기'],
  cutout: ['透明底', 'Transparent', '背景透過', '투명 배경'],
  original: ['馆藏原图', 'Original image', '所蔵館の原画像', '소장처 원본 이미지'],
  compare: ['并排对照', 'Side-by-side', '並べて比較', '나란히 비교'],
  shadow: ['顶部照明投影', 'Overhead-light shadow', '上部照明の影', '상부 조명 그림자'],
  on: ['开', 'On', 'オン', '켜짐'],
  off: ['关', 'Off', 'オフ', '꺼짐'],
  cutoutHint: ['透明图由本地分割模型提取轮廓，保留原图色彩与纹样。选择并排对照核对细节；图片可点开近看。', 'Transparent images preserve the original colors and patterns. Compare with the museum photograph, or open an image for a closer look.', '透過画像は原画像の色彩と文様を保っています。所蔵館の写真と並べて比較し、画像を開いて細部をご覧ください。', '투명 이미지는 원본의 색과 문양을 보존합니다. 소장처 사진과 나란히 비교하거나 이미지를 열어 세부를 확인하세요.'],
  curatorial: ['策展理念', 'Curatorial approach', '展示の理念', '기획 의도'],
  aboutOne: ['「器 · 茶」是一场以东亚茶器艺术为核心的数字展览，呈现中国、日本与韩国的器物传统，以及茶文化跨越地域的交流。', 'Vessels · Tea is a digital exhibition centered on the art of East Asian teaware: the vessel traditions of China, Japan and Korea, and the exchanges that carried tea culture across regions.', '「器 · 茶」は東アジアの茶器芸術を中心とするデジタル展覧会です。中国、日本、韓国の器の伝統と、地域を越える茶文化の交流を紹介します。', '「기물 · 차」는 동아시아 다구 예술을 중심으로 한 디지털 전시입니다. 중국·일본·한국의 기물 전통과 지역을 넘나드는 차 문화의 교류를 소개합니다.'],
  aboutTwo: ['建盏、龙泉青瓷与宜兴紫砂，日本的天目、乐烧与茶入，韩国的青瓷与白瓷，展现了不同饮茶方式下的材料选择与造型趣味。现有欧美茶器作为交流视角保留，作品产地与馆方年代按来源呈现。', 'Jian ware, Longquan celadon and Yixing clay; Japanese tenmoku, Raku and tea caddies; Korean celadon and white porcelain reveal how different ways of preparing tea shape vessels and materials. European and American teaware remains part of the exchange perspective, with origin and dating preserved from museum records.', '建盞、龍泉青磁、宜興紫砂、日本の天目・楽焼・茶入、韓国の青磁と白磁。茶の飲み方の違いが、素材と形に表れます。欧米の茶器も交流の視点から収録し、産地と年代は所蔵館の記録に従って表示します。', '건요, 용천 청자, 이싱 자사와 일본의 덴모쿠·라쿠·차이레, 한국의 청자·백자는 차를 마시는 방식에 따른 재료와 형태의 차이를 보여줍니다. 유럽과 미국 다구도 교류의 관점에서 유지하며, 산지와 제작 시기는 박물관 기록에 따라 표시합니다.'],
  aboutThree: ['收录以明确的茶用途和实物照片为依据，排除版画、书页、纯织物及展柜反射照片。来源、馆藏编号、原名与许可保留供核查；未核实的信息明确标注，不补写推测性历史。', 'Admission requires evidence of tea use and photographs of actual objects. Prints, book pages, textiles and display-case reflections are excluded. Sources, accession numbers, museum titles and licenses remain available for verification; unverified information is marked rather than filled with speculative history.', '収録には茶用途の根拠と実物写真を求め、版画、書籍ページ、織物、展示ケースの反射写真は除外しています。提供元、収蔵番号、原題、利用条件を残し、未確認情報を推測で補うことはしません。', '명확한 차 용도와 실물 사진을 기준으로 수록하며 판화, 책 페이지, 직물, 전시장의 반사 사진은 제외합니다. 출처, 소장 번호, 원제와 이용 조건을 보존하고, 확인되지 않은 내용은 추정으로 채우지 않습니다.'],
  highlights: ['展览视角', 'Exhibition perspectives', '展示の視点', '전시 관점'],
  china: ['中国茶器', 'Chinese teaware', '中国の茶器', '중국 다구'],
  chinaText: ['建盏、青瓷与紫砂，从点茶到泡茶的器物变迁。', 'Jian bowls, celadon and Yixing teapots trace changing tea practices.', '建盞、青磁、紫砂からたどる、点茶と泡茶の器の変化。', '건요 찻잔, 청자, 자사호로 살펴보는 점다와 포다 기물의 변화.'],
  japan: ['日本茶器', 'Japanese teaware', '日本の茶器', '일본 다구'],
  japanText: ['茶碗、茶入与水指，展现茶之汤的器物美学。', 'Tea bowls, caddies and water jars express the aesthetics of chanoyu.', '茶碗、茶入、水指に見る、茶の湯の美意識。', '찻사발, 차이레, 미즈사시로 만나는 차노유의 기물 미학.'],
  korea: ['韩国茶器', 'Korean teaware', '韓国の茶器', '한국 다구'],
  koreaText: ['青瓷与白瓷，映照半岛陶瓷传统及东亚交流。', 'Celadon and white porcelain reflect Korean ceramic traditions and regional exchange.', '青磁と白磁に映る朝鮮半島の陶磁の伝統と東アジアの交流。', '청자와 백자를 통해 비추어 보는 한반도의 도자 전통과 동아시아 교류.'],
  exchange: ['跨文化交流', 'Cultural exchange', '文化を越える交流', '문화 간 교류'],
  exchangeText: ['外销瓷与欧美茶具，呈现茶文化走向世界的轨迹。', 'Export porcelain and Western tea services reveal tea culture’s global journeys.', '輸出磁器と欧米の茶器から、世界に広がる茶文化をたどります。', '수출 도자와 서양 다구로 살펴보는 차 문화의 세계적 확산.'],
  sourcesIntro: ['以下为当前收录的馆藏来源与件数。图片和元数据遵循各来源许可，具体条件请以作品详情及馆方页面为准。', 'The current collection sources and counts are listed below. Images and metadata follow their source licenses; consult each artwork and museum page for the applicable terms.', '現在収録している提供元と件数を以下に掲載しています。画像とデータの利用条件は、各作品と所蔵館のページをご確認ください。', '현재 수록된 소장처와 작품 수입니다. 이미지와 메타데이터의 이용 조건은 각 작품 상세와 박물관 페이지를 확인하세요.'],
  presentation: ['图片与语言', 'Images and languages', '画像と言語', '이미지와 언어'],
  presentationText: ['透明图片保留原图色彩与纹样，居中裁切并留白；封面、列表和详情统一使用。本站提供中、英、日、韩四种界面语言；馆方原名、年代、尺寸和编号保留原文，翻译名称供浏览参考。', 'Transparent images preserve original colors and patterns, with centered cropping and breathing room across covers, lists and detail pages. Chinese, English, Japanese and Korean interfaces are available. Museum titles, dates, dimensions and identifiers retain their source wording; translated names serve as browsing labels.', '透過画像は原画像の色彩と文様を保ち、余白を設けて中央に配置しています。中国語、英語、日本語、韓国語に対応し、所蔵館の原題、年代、寸法、番号は原文を保持します。翻訳名は閲覧のための名称です。', '투명 이미지는 원본의 색과 문양을 보존하고 적절한 여백을 두어 중앙에 배치합니다. 중국어·영어·일본어·한국어를 제공하며 소장처의 원제, 제작 시기, 크기, 번호는 원문을 유지합니다. 번역된 명칭은 탐색을 돕기 위한 표시입니다.'],
  motto: ['一器一茶，皆有其道', 'Every vessel tells a story of tea and tradition.', '一つの器に、茶と伝統の物語。', '기물 하나에 담긴 차와 전통의 이야기.'],
  unverified: ['未核实', 'Unverified', '未確認', '미확인'],
} as const;
export type MessageKey = keyof typeof messages;
export function translate(locale: Locale, key: MessageKey, values: Record<string, string | number> = {}): string {
  return messages[key][locales.indexOf(locale)].replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}

export function localizedHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const url = new URL(href, 'https://local.invalid');
  url.searchParams.set('lang', locale);
  return `${url.pathname}${url.search}${url.hash}`;
}

type Term = readonly [string, string, string];
const terms: Record<string, Term> = {};
function add(rows: string) {
  for (const row of rows.trim().split('\n')) {
    const [zh, en, ja, ko] = row.split('|');
    terms[zh] = [en, ja, ko];
  }
}
add(`全部|All|すべて|전체
近现代|Modern|近現代|근현대
唐|Tang|唐|당
五代|Five Dynasties|五代|오대
北宋|Northern Song|北宋|북송
南宋|Southern Song|南宋|남송
宋|Song|宋|송
金|Jin|金|금
元|Yuan|元|원
明|Ming|明|명
明宣德|Ming, Xuande|明・宣徳|명 선덕
清|Qing|清|청
清乾隆|Qing, Qianlong|清・乾隆|청 건륭
朝鮮|Joseon|朝鮮|조선
朝鲜|Joseon|朝鮮|조선
室町|Muromachi|室町|무로마치
桃山|Momoyama|桃山|모모야마
江戸|Edo|江戸|에도
江户|Edo|江戸|에도
江户中期|Middle Edo|江戸中期|에도 중기
江户后期|Late Edo|江戸後期|에도 후기
江户前期|Early Edo|江戸前期|에도 전기
明治|Meiji|明治|메이지
大正|Taishō|大正|다이쇼
昭和|Shōwa|昭和|쇼와
日本|Japan|日本|일본
韩国|Korea|韓国|한국
越南|Vietnam|ベトナム|베트남
荷兰|Netherlands|オランダ|네덜란드
中国|China|中国|중국
东亚|East Asia|東アジア|동아시아
欧洲|Europe|ヨーロッパ|유럽
美国|United States|アメリカ|미국
明清|Ming / Qing|明・清|명·청
宋／金|Song / Jin|宋・金|송·금
未知|Unknown|不明|미상
未详|Unspecified|未詳|미상
其他|Other|その他|기타
未核实|Unverified|未確認|미확인
茶壶|Teapot|茶壺|차 주전자
杯盏|Tea bowl / cup|茶碗・茶杯|찻사발·찻잔
茶碗|Tea bowl|茶碗|찻사발
碗|Bowl|碗|발
茶杯|Tea cup|茶杯|찻잔
杯|Cup|杯|잔
高足杯|Stem cup|高足杯|굽 높은 잔
茶罐|Tea caddy|茶葉容器|차 보관함
罐|Jar|壺|항아리
茶入|Tea caddy (chaire)|茶入|차이레
茶具组|Tea service|茶器セット|다구 세트
茶具组合|Tea service|茶器セット|다구 세트
茶具套装|Tea service|茶器セット|다구 세트
茶器|Teaware|茶器|다구
器物|Vessel|器|기물
执壶|Ewer|注壺|주전자
水壶|Water kettle|湯沸かし|물 주전자
茶釜|Tea kettle|茶釜|차 솥
茶杓|Tea scoop|茶杓|차샤쿠
茶筅|Tea whisk|茶筅|차선
水指|Water jar (mizusashi)|水指|미즈사시
茶道水指|Water jar (mizusashi)|水指|미즈사시
茶托|Cup stand|茶托|잔 받침
茶盘|Tea tray|茶盆|차 쟁반
碟|Dish|皿|접시
茶碟|Tea saucer|受皿|찻잔 받침
茶水器|Tea urn|茶用湯沸かし器|차 온수기
茶箱|Tea chest|茶箱|차 상자
茶具糖碗|Tea-service sugar bowl|茶器の砂糖入れ|다구 설탕 그릇
茶具乳壶|Tea-service creamer|茶器のミルク入れ|다구 우유 주전자
茶匙|Teaspoon|ティースプーン|차 숟가락
茶具碗|Tea-service bowl|茶器の碗|다구 그릇
茶具热水壶|Tea-service hot-water pot|茶器の湯沸かし|다구 온수 주전자
茶具渣碗|Tea-service waste bowl|茶器の茶殻入れ|다구 찻잎 찌꺼기 그릇
茶杯与杯托|Tea cup and stand|茶杯と茶托|찻잔과 받침
茶盏托|Tea bowl stand|茶碗の台|찻사발 받침
茶碗与盏托|Tea bowl and stand|茶碗と台|찻사발과 받침
茶壶与壶托|Teapot and stand|茶壺と台|차 주전자와 받침
茶具盘|Tea-service dish|茶器の皿|다구 접시
茶具托盘|Tea-service tray|茶器の盆|다구 쟁반
茶与咖啡用具组合|Tea and coffee service|茶・コーヒー器セット|차·커피 도구 세트
茶壶托|Teapot stand|茶壺の台|차 주전자 받침
煮茶壶|Tea kettle|茶用湯沸かし|차 끓이는 주전자
茶具盒|Teaware box|茶器の箱|다구 상자
茶滤|Tea strainer|茶こし|차 거름망
茶碗与茶碟|Tea bowl and saucer|茶碗と受皿|찻사발과 받침
茶筅架|Tea whisk holder|茶筅立て|차선 받침
茶具保温炉|Tea-service warmer|茶器の保温器|다구 보온기
茶具篮|Teaware basket|茶器の籠|다구 바구니
银器|Silver|銀|은
银|Silver|銀|은
鎏金银|Gilt silver|金鍍金の銀|금도금 은
镀金银|Gold-plated silver|金鍍金の銀|금도금 은
镀银|Silver plate|銀鍍金|은도금
金器|Gold|金|금
金|Gold|金|금
铜器|Copper|銅|동
铜|Copper|銅|동
黄铜|Brass|真鍮|황동
锡器|Pewter|錫|주석
锡|Pewter|錫|주석
铁器|Iron|鉄|철
木|Wood|木|나무
漆|Lacquer|漆|옻칠
玻璃|Glass|ガラス|유리
竹|Bamboo|竹|대나무
陶|Earthenware|陶器|토기
陶器|Earthenware|陶器|도기
炻器|Stoneware|炻器|석기
陶瓷|Ceramic|陶磁器|도자기
瓷器|Porcelain|磁器|자기
瓷|Porcelain|磁器|자기
建盏|Jian ware|建盞|건요
定窑|Ding ware|定窯|정요
定瓷|Ding porcelain|定窯磁器|정요 자기
青瓷|Celadon|青磁|청자
吉州窑|Jizhou ware|吉州窯|길주요
天目|Tenmoku|天目|덴모쿠
德化白瓷|Dehua white porcelain|徳化白磁|덕화 백자
漆器|Lacquerware|漆器|칠기
宜兴紫砂|Yixing zisha|宜興紫砂|이싱 자사
紫砂|Zisha clay|紫砂|자사
外销瓷|Export porcelain|輸出磁器|수출 도자
粉彩|Famille rose|粉彩|분채
濑户烧|Seto ware|瀬戸焼|세토야키
美浓烧|Mino ware|美濃焼|미노야키
丹波烧|Tamba ware|丹波焼|단바야키
唐津烧|Karatsu ware|唐津焼|가라쓰야키
志野烧|Shino ware|志野焼|시노야키
备前烧|Bizen ware|備前焼|비젠야키
信乐烧|Shigaraki ware|信楽焼|시가라키야키
织部烧|Oribe ware|織部焼|오리베야키
伊万里烧|Imari ware|伊万里焼|이마리야키
汝窑|Ru ware|汝窯|여요
高取烧|Takatori ware|高取焼|다카토리야키
哥窑|Ge ware|哥窯|가요
珐琅|Enamel|琺瑯|에나멜
萩烧|Hagi ware|萩焼|하기야키
乐烧|Raku ware|楽焼|라쿠야키
彩绘瓷|Painted porcelain|彩絵磁器|채색 자기
青花瓷|Blue-and-white porcelain|染付磁器|청화백자
京烧|Kyoto ware|京焼|교야키
伊贺烧|Iga ware|伊賀焼|이가야키
萨摩烧|Satsuma ware|薩摩焼|사쓰마야키
井户|Ido ware|井戸茶碗|이도 찻사발
酱釉|Brown glaze|褐釉|갈유
景泰蓝|Cloisonné|七宝|칠보
珐琅/景泰蓝|Enamel / cloisonné|琺瑯・七宝|에나멜·칠보
五彩瓷|Wucai porcelain|五彩磁器|오채 자기
五彩|Wucai|五彩|오채
茄皮紫|Aubergine glaze|茄子紫釉|가지빛 자유
珐琅彩|Painted enamels|琺瑯彩|법랑채
白瓷|White porcelain|白磁|백자
建窑|Jian kiln|建窯|건요
龙泉窑|Longquan kiln|龍泉窯|용천요
宜兴窑|Yixing kiln|宜興窯|이싱요
宜兴|Yixing|宜興|이싱
织部|Oribe|織部|오리베
唐津|Karatsu|唐津|가라쓰
志野|Shino|志野|시노
乐窑|Raku kiln|楽窯|라쿠요
瀬戸|Seto|瀬戸|세토
濑户|Seto|瀬戸|세토
磁州窑|Cizhou kiln|磁州窯|자주요
景德镇窑|Jingdezhen kiln|景徳鎮窯|경덕진요`);

export function term(value: string | undefined, locale: Locale, source = ''): string {
  if (!value) return translate(locale, 'unverified');
  if (locale === 'zh') return value;
  if (terms[value]) return terms[value][locales.indexOf(locale) - 1];
  if (/[、，]/.test(value)) return value.split(/[、，]/).map(v => term(v, locale)).join(' / ');
  return source || value;
}

// 金 is both a dynasty and a material; keep these namespaces distinct.
export function periodName(value: string | undefined, locale: Locale, source = ''): string {
  if (value === '金') return ({zh: '金', en: 'Jin', ja: '金', ko: '금나라'})[locale];
  return term(value, locale, source);
}

function sourceObjectType(artwork: Artwork): string {
  if (['器物', '碗', '茶器', '茶具组', '茶具组合', '茶具套装'].includes(artwork.objectType)) {
    const name = artwork.titleEnglish;
    if (/tea\s*bowl/i.test(name) && !/tea.*(?:set|service)/i.test(name)) return '茶碗';
    if (/mizusashi/i.test(name)) return '水指';
    if (/tea.*(?:set|service)/i.test(name) && artwork.objectType === '器物') return '茶具组合';
  }
  return artwork.objectType;
}
export function artworkType(artwork: Artwork, locale: Locale): string {
  return term(sourceObjectType(artwork), locale, artwork.objectTypeEnglish);
}

// Proper names follow the museum's own English name when no local name is supplied.
const museumTerms: Record<string, Term> = {
  'The Metropolitan Museum of Art': ['The Metropolitan Museum of Art', 'メトロポリタン美術館', '메트로폴리탄 미술관'],
  'Cleveland Museum of Art': ['Cleveland Museum of Art', 'クリーブランド美術館', '클리블랜드 미술관'],
  'Minneapolis Institute of Art': ['Minneapolis Institute of Art', 'ミネアポリス美術館', '미니애폴리스 미술관'],
  'Victoria and Albert Museum': ['Victoria and Albert Museum', 'ヴィクトリア＆アルバート博物館', '빅토리아 앨버트 박물관'],
  'Rijksmuseum': ['Rijksmuseum', 'アムステルダム国立美術館', '네덜란드 국립 미술관'],
  'Tokyo National Museum': ['Tokyo National Museum', '東京国立博物館', '도쿄 국립박물관'],
  'Kyoto National Museum': ['Kyoto National Museum', '京都国立博物館', '교토 국립박물관'],
  'Nara National Museum': ['Nara National Museum', '奈良国立博物館', '나라 국립박물관'],
  'Kyushu National Museum': ['Kyushu National Museum', '九州国立博物館', '규슈 국립박물관'],
  'Cooper Hewitt, Smithsonian Design Museum': ['Cooper Hewitt, Smithsonian Design Museum', 'クーパー・ヒューイット・スミソニアン・デザイン博物館', '쿠퍼 휴잇 스미스소니언 디자인 박물관'],
  'National Museum of American History': ['National Museum of American History', '国立アメリカ歴史博物館', '미국 국립 역사박물관'],
  'Walters Art Museum': ['Walters Art Museum', 'ウォルターズ美術館', '월터스 미술관'],
};
export function museumName(artwork: Pick<Artwork, 'sourceMuseum' | 'sourceMuseumEnglish'>, locale: Locale): string {
  if (locale === 'zh') return artwork.sourceMuseum;
  return museumTerms[artwork.sourceMuseumEnglish]?.[locales.indexOf(locale) - 1] || artwork.sourceMuseumEnglish || artwork.sourceMuseum;
}

export function artworkTitle(artwork: Artwork, locale: Locale): string {
  if (locale === 'zh') return artwork.titleChinese;
  if (heroTranslations[artwork.id]) return heroTranslations[artwork.id].title[locales.indexOf(locale) - 1];
  if (locale === 'en' && artwork.titleEnglish && !/thee|porselein|deksel|kom en|kop en|schotel|melkkan|suikerpot|茶|碗|壺/i.test(artwork.titleEnglish)) return artwork.titleEnglish;
  if (sourceObjectType(artwork) === artwork.objectType && terms[artwork.titleChinese]) return term(artwork.titleChinese, locale);
  const material = term(artwork.material, locale, artwork.materialEnglish);
  const type = artworkType(artwork, locale);
  return material === translate(locale, 'unverified') ? type : `${material} · ${type}`;
}
export function artworkDescription(artwork: Artwork, locale: Locale): string {
  if (locale === 'zh') return artwork.description;
  if (heroTranslations[artwork.id]) return heroTranslations[artwork.id].description[locales.indexOf(locale) - 1];
  const title = artworkTitle(artwork, locale);
  const period = periodName(artwork.dynasty, locale, artwork.dynastyEnglish);
  const museum = museumName(artwork, locale);
  const medium = term(artwork.material, locale, artwork.materialEnglish);
  if (locale === 'en') return `${title}. ${artwork.date || 'Date unverified'} · ${period}. Material: ${artwork.materialEnglish || medium}. Collection: ${museum}.`;
  if (locale === 'ja') return `${title}。年代：${artwork.date || '未確認'}。時代・地域：${period}。材質：${medium}。所蔵：${museum}。`;
  return `${title}. 제작 시기: ${artwork.date || '미확인'}. 시대·지역: ${period}. 재질: ${medium}. 소장처: ${museum}.`;
}

export const siteDescription = (locale: Locale) => translate(locale, 'heroIntro');
