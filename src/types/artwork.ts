export interface Artwork {
  id: string;
  titleChinese: string;
  titleEnglish: string;
  dynasty: string;
  dynastyEnglish: string;
  period?: string;
  date: string;
  material: string;
  materialEnglish: string;
  objectType: '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';
  objectTypeEnglish: 'Teapot' | 'Tea Bowl/Cup' | 'Tea Set' | 'Tea Caddy' | 'Ewer';
  kiln?: string;
  kilnEnglish?: string;
  dimensions?: string;
  description: string;
  sourceMuseum: string;
  sourceMuseumEnglish: string;
  accessionNumber: string;
  sourceUrl: string;
  imageUrl: string;
  imageAlt: string;
  license: string;
  creditLine?: string;
  crawlBatchId?: string;
}

export type Dynasty = '唐' | '宋' | '元' | '明' | '清' | '近现代';
export type Material = '青花瓷' | '粉彩' | '珐琅彩' | '青瓷' | '建盏' | '紫砂' | '白瓷' | '珐琅' | '其他';
export type ObjectType = '茶壶' | '杯盏' | '茶具组' | '茶罐' | '执壶';

export const dynastyOrder: Dynasty[] = ['唐', '宋', '元', '明', '清', '近现代'];
export const materialLabels: Record<Material, string> = {
  '青花瓷': '青花瓷 Blue and White',
  '粉彩': '粉彩 Famille Rose',
  '珐琅彩': '珐琅彩 Enamel',
  '青瓷': '青瓷 Celadon',
  '建盏': '建盏 Jian Ware',
  '紫砂': '紫砂 Yixing',
  '白瓷': '白瓷 White Porcelain',
  '珐琅': '珐琅 Enamel on Metal',
  '其他': '其他 Other',
};

export const objectTypeLabels: Record<ObjectType, string> = {
  '茶壶': '茶壶 Teapot',
  '杯盏': '杯盏 Tea Bowl/Cup',
  '茶具组': '茶具组 Tea Set',
  '茶罐': '茶罐 Tea Caddy',
  '执壶': '执壶 Ewer',
};
