export type MuseumResource = {
  id: string;
  url: string;
  names: Record<'zh' | 'en' | 'ja' | 'ko', string>;
  descriptions: Record<'zh' | 'en' | 'ja' | 'ko', string>;
};

// Verified official museum URLs. Contact and outreach records stay private.
// Original official names are retained across locales to avoid invented localized names.
export const museumResources: MuseumResource[] = [
  {
    "id": "spode",
    "url": "https://spodemuseumtrust.org/",
    "names": {
      "zh": "Spode Museum",
      "en": "Spode Museum",
      "ja": "Spode Museum",
      "ko": "Spode Museum"
    },
    "descriptions": {
      "zh": "斯波德瓷器与跨文化青花陶瓷。",
      "en": "Spode porcelain and cross-cultural blue-and-white ceramics.",
      "ja": "スポード磁器と文化をつなぐ青花陶磁器。",
      "ko": "스포드 도자기와 문화 간 청화백자."
    }
  },
  {
    "id": "clay-denmark",
    "url": "https://claymuseum.dk/en/",
    "names": {
      "zh": "CLAY Museum of Ceramic Art Denmark",
      "en": "CLAY Museum of Ceramic Art Denmark",
      "ja": "CLAY Museum of Ceramic Art Denmark",
      "ko": "CLAY Museum of Ceramic Art Denmark"
    },
    "descriptions": {
      "zh": "陶瓷艺术与历史悠久的皇家哥本哈根瓷器。",
      "en": "Ceramic art and historic Royal Copenhagen porcelain.",
      "ja": "陶芸と歴史あるロイヤル コペンハーゲン磁器。",
      "ko": "도예와 역사적인 로열 코펜하겐 자기."
    }
  },
  {
    "id": "amoca",
    "url": "https://www.amoca.org/",
    "names": {
      "zh": "American Museum of Ceramic Art",
      "en": "American Museum of Ceramic Art",
      "ja": "American Museum of Ceramic Art",
      "ko": "American Museum of Ceramic Art"
    },
    "descriptions": {
      "zh": "陶瓷艺术教育与中美陶瓷比较资源。",
      "en": "Ceramic art education and Chinese-American ceramics resources.",
      "ja": "陶芸教育と中国・アメリカの陶磁器に関する資料。",
      "ko": "도예 교육과 중국·미국 도자기 자료."
    }
  },
  {
    "id": "alfred",
    "url": "https://ceramicsmuseum.alfred.edu/",
    "names": {
      "zh": "Alfred Ceramic Art Museum",
      "en": "Alfred Ceramic Art Museum",
      "ja": "Alfred Ceramic Art Museum",
      "ko": "Alfred Ceramic Art Museum"
    },
    "descriptions": {
      "zh": "包含日本茶壶与当代茶碗的陶瓷馆藏。",
      "en": "Ceramic collections including Japanese teapots and contemporary tea bowls.",
      "ja": "日本の急須や現代の茶碗を含む陶磁器コレクション。",
      "ko": "일본 찻주전자와 현대 찻사발을 포함한 도자기 소장품."
    }
  },
  {
    "id": "princessehof",
    "url": "https://www.princessehof.nl/en/",
    "names": {
      "zh": "Keramiekmuseum Princessehof",
      "en": "Keramiekmuseum Princessehof",
      "ja": "Keramiekmuseum Princessehof",
      "ko": "Keramiekmuseum Princessehof"
    },
    "descriptions": {
      "zh": "亚洲与欧洲陶瓷，包括中国瓷器与茶壶。",
      "en": "Asian and European ceramics, including Chinese porcelain and teapots.",
      "ja": "中国磁器や急須を含むアジアとヨーロッパの陶磁器。",
      "ko": "중국 자기와 찻주전자를 포함한 아시아·유럽 도자기."
    }
  },
  {
    "id": "royal-worcester",
    "url": "https://www.museumofroyalworcester.org/",
    "names": {
      "zh": "Museum of Royal Worcester",
      "en": "Museum of Royal Worcester",
      "ja": "Museum of Royal Worcester",
      "ko": "Museum of Royal Worcester"
    },
    "descriptions": {
      "zh": "伍斯特瓷器、历史餐具与教育活动。",
      "en": "Worcester porcelain, historic tablewares, and educational activities.",
      "ja": "ウースター磁器、歴史的な食器、教育プログラム。",
      "ko": "우스터 자기, 역사적인 식기와 교육 프로그램."
    }
  },
  {
    "id": "everson",
    "url": "https://everson.org/",
    "names": {
      "zh": "Everson Museum of Art",
      "en": "Everson Museum of Art",
      "ja": "Everson Museum of Art",
      "ko": "Everson Museum of Art"
    },
    "descriptions": {
      "zh": "陶瓷馆藏与在线陶瓷研究数据库。",
      "en": "Ceramics collections and an online ceramics research database.",
      "ja": "陶磁器コレクションとオンライン研究データベース。",
      "ko": "도자기 소장품과 온라인 도자기 연구 데이터베이스."
    }
  },
  {
    "id": "flagstaff-house",
    "url": "https://hk.art.museum/en/web/ma/tea-ware.html",
    "names": {
      "zh": "Flagstaff House Museum of Tea Ware",
      "en": "Flagstaff House Museum of Tea Ware",
      "ja": "Flagstaff House Museum of Tea Ware",
      "ko": "Flagstaff House Museum of Tea Ware"
    },
    "descriptions": {
      "zh": "中国、日本及欧洲茶器的专题博物馆。",
      "en": "A specialist museum of Chinese, Japanese, and European tea wares.",
      "ja": "中国、日本、ヨーロッパの茶器を扱う専門博物館。",
      "ko": "중국·일본·유럽 차 도구를 다루는 전문 박물관."
    }
  },
  {
    "id": "vam",
    "url": "https://www.vam.ac.uk/",
    "names": {
      "zh": "Victoria and Albert Museum",
      "en": "Victoria and Albert Museum",
      "ja": "Victoria and Albert Museum",
      "ko": "Victoria and Albert Museum"
    },
    "descriptions": {
      "zh": "世界陶瓷与玻璃，以及韦奇伍德茶瓷制造历史。",
      "en": "Global ceramics and glass, with Wedgwood tea-porcelain manufacturing history.",
      "ja": "世界の陶磁器とガラス、ウェッジウッドの茶器製造史。",
      "ko": "세계 도자기와 유리, 웨지우드 차 도자기 제작 역사."
    }
  },
  {
    "id": "gladstone",
    "url": "https://www.stokemuseums.org.uk/gpm/",
    "names": {
      "zh": "Gladstone Pottery Museum",
      "en": "Gladstone Pottery Museum",
      "ja": "Gladstone Pottery Museum",
      "ko": "Gladstone Pottery Museum"
    },
    "descriptions": {
      "zh": "历史陶器工厂与精细骨瓷生产传统。",
      "en": "Historic pottery works and fine bone-china production heritage.",
      "ja": "歴史的な陶器工場とボーンチャイナ製造の伝統。",
      "ko": "역사적인 도자기 공장과 본차이나 제작 전통."
    }
  }
];
