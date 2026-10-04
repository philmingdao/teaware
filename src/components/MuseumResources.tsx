import { museumResources, type MuseumRegion } from '../data/museum-resources';

const copy = {
  zh: { title: '博物馆资源', intro: '探索博物馆的馆藏与研究资源。本栏目由 Teaware 独立编辑；收录不代表合作、背书或已完成链接交换。' },
  en: { title: 'Museum resources', intro: 'Explore museum collections and research resources. Teaware independently curates this directory; inclusion does not imply a partnership, endorsement, or completed reciprocal link exchange.' },
  ja: { title: '博物館リソース', intro: '博物館のコレクションと研究資料をご覧ください。Teaware が独立して編集しており、掲載は提携、推薦、相互リンクの成立を意味しません。' },
  ko: { title: '박물관 자료', intro: '박물관 소장품과 연구 자료를 살펴보세요. Teaware가 독립적으로 편집하며, 수록은 제휴, 보증 또는 상호 링크 교환 완료를 의미하지 않습니다.' },
};

const regions: { id: MuseumRegion; names: Record<keyof typeof copy, string> }[] = [
  { id: 'europe', names: { zh: '欧洲', en: 'Europe', ja: 'ヨーロッパ', ko: '유럽' } },
  { id: 'americas', names: { zh: '美洲', en: 'Americas', ja: 'アメリカ大陸', ko: '아메리카' } },
  { id: 'east-asia', names: { zh: '东亚', en: 'East Asia', ja: '東アジア', ko: '동아시아' } },
  { id: 'south-southeast-asia', names: { zh: '南亚与东南亚', en: 'South & Southeast Asia', ja: '南アジア・東南アジア', ko: '남아시아·동남아시아' } },
];
const countLabels = { zh: '家博物馆', en: 'museums', ja: '館', ko: '개 박물관' };
const navigationLabels = { zh: '按地区浏览博物馆', en: 'Browse museums by region', ja: '地域別に博物館を見る', ko: '지역별 박물관 보기' };

export default function MuseumResources({ locale }: { locale: keyof typeof copy }) {
  if (!museumResources.length) return null;
  return <section id="museum-resources" aria-labelledby="museum-resources-heading" className="scroll-mt-24">
    <div className="divider-elegant !my-12" />
    <h2 id="museum-resources-heading" className="text-2xl mb-6">{copy[locale].title}</h2>
    <p className="mb-6">{copy[locale].intro}</p>
    <p className="mb-6 text-sm">{museumResources.length} {countLabels[locale]}</p>
    <nav aria-label={navigationLabels[locale]} className="flex flex-wrap gap-x-6 gap-y-3 mb-10">
      {regions.map(region => <a key={region.id} href={`#museum-region-${region.id}`} className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8956c]">{region.names[locale]}</a>)}
    </nav>
    {regions.map(region => <section key={region.id} id={`museum-region-${region.id}`} aria-labelledby={`museum-region-${region.id}-heading`} className="scroll-mt-24 mb-10">
    <h3 id={`museum-region-${region.id}-heading`} className="text-xl mb-6">{region.names[locale]}</h3>
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-6 list-none p-0">
      {museumResources.filter(resource => resource.region === region.id).map(resource => <li key={resource.id} id={`museum-${resource.id}`} className="scroll-mt-24 bg-[#f5f3ef] dark:bg-[#171614] p-6">
        <a href={resource.url} className="text-lg underline underline-offset-4 decoration-[#b8956c] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b8956c]">{resource.names[locale]}</a>
        <p className="text-xs mt-2 text-[#666] dark:text-[#9a9894]">{resource.locations[locale]}</p>
        <p className="text-sm mt-3">{resource.descriptions[locale]}</p>
      </li>)}
    </ul>
    </section>)}
  </section>;
}
