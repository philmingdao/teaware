#!/usr/bin/env python3
"""
ColBase Open Data Expansion Script - Round 3 (2026-09-23)

Target: Add ~80-150 net-new quality tea ceremony items from ColBase
Sources: Tokyo National Museum, Kyoto National Museum, Kyushu National Museum, Nara National Museum

Expanded keywords beyond prior rounds:
- 茶釜, 茶筅, 建水, 杓立, 蓋置, 棗, 薄茶器
- Other tea utensils (香合, 花入, etc.)
- Chinese/Korean ceramics held by Japanese museums (青花, 青磁, etc.)
- Raku, Shino, Oribe and other tea ceremony wares not yet imported

Key constraints:
- CC BY / CC0 / PD license (as specified by ColBase コンテンツの権利区分)
- Internet-accessible images (コンテンツの公開状況 = internet)
- Compress images to max 1400px long edge, JPEG q80
- SHA256 dedupe against existing images
- Update crawl log for deduplication
"""

import csv
import json
import os
import sys
import time
import hashlib
import requests
import re
from datetime import datetime
from pathlib import Path
from io import BytesIO
from PIL import Image
from collections import Counter, defaultdict

MAX_LONG_EDGE = 1400
JPEG_QUALITY = 80
MIN_IMAGE_SIZE = 8000
TARGET_COUNT = 150
BATCH_ID = f"colbase-round3-{int(time.time() * 1000)}"

ROOT = Path.cwd()
ARTWORKS_PATH = ROOT / 'src' / 'data' / 'artworks.json'
PUBLIC_ARTWORKS_PATH = ROOT / 'public' / 'artworks.json'
IMAGES_DIR = ROOT / 'public' / 'artworks'
CRAWL_LOG_PATH = ROOT / 'research' / 'crawl-log.jsonl'
HASH_FILE = ROOT / 'research' / 'image-hashes.json'
SOURCES_FILE = ROOT / 'research' / 'sources.json'
TSV_PATH = Path('/tmp/colbase-opendata.tsv')

TEA_KEYWORDS_PRIMARY = [
    '茶碗', '茶盌', '茶椀', '茶盞',
    '茶入', '茶壺', '棗', '薄茶器',
    '水指', '建水', '水次',
    '茶釜', '茶筅', '柄杓', '杓立', '蓋置',
    '茶杓', '香合', '花入',
    '天目', '井戸茶碗', '高麗茶碗', '御本', '刷毛目', '三島',
    '茶道具', '茶托', '風炉',
]

TEA_KEYWORDS_ENGLISH = [
    'tea bowl', 'chawan', 'tenmoku',
    'tea caddy', 'chaire', 'natsume',
    'mizusashi', 'water jar', 'fresh water jar',
    'tea scoop', 'chashaku',
    'incense container', 'incense box',
    'flower vase', 'tea kettle',
    'waste water', 'lid rest',
]

WARE_KEYWORDS = [
    '楽焼', '楽茶碗', '萩焼', '織部', '備前', '信楽', '唐津',
    '志野', '黄瀬戸', '瀬戸', '美濃', '京焼', '九谷', '伊賀',
    '青磁', '白磁', '青花', '染付',
    'raku', 'hagi', 'oribe', 'bizen', 'shigaraki', 'karatsu',
    'shino', 'seto', 'mino', 'celadon',
]

CERAMICS_TERMS = ['陶磁', '陶器', '磁器', 'ceramic', 'porcelain', 'stoneware', 'earthenware']

MUSEUM_NAMES = {
    '東京国立博物館': {'zh': '东京国立博物馆', 'en': 'Tokyo National Museum'},
    '京都国立博物館 Kyoto National Museum': {'zh': '京都国立博物馆', 'en': 'Kyoto National Museum'},
    '京都国立博物館': {'zh': '京都国立博物馆', 'en': 'Kyoto National Museum'},
    '九州国立博物館': {'zh': '九州国立博物馆', 'en': 'Kyushu National Museum'},
    '九州国立博物館（福岡県立アジア文化交流センター）': {'zh': '九州国立博物馆', 'en': 'Kyushu National Museum'},
    '奈良国立博物館': {'zh': '奈良国立博物馆', 'en': 'Nara National Museum'},
}

PERIOD_MAP = {
    '江戸': ('江户', 'Edo Period'),
    'edo': ('江户', 'Edo Period'),
    '桃山': ('桃山', 'Momoyama Period'),
    'momoyama': ('桃山', 'Momoyama Period'),
    '室町': ('室町', 'Muromachi Period'),
    'muromachi': ('室町', 'Muromachi Period'),
    '鎌倉': ('镰仓', 'Kamakura Period'),
    'kamakura': ('镰仓', 'Kamakura Period'),
    '南北朝': ('南北朝', 'Nanbokucho Period'),
    '安土': ('安土', 'Azuchi Period'),
    '明治': ('明治', 'Meiji Period'),
    'meiji': ('明治', 'Meiji Period'),
    '大正': ('大正', 'Taisho Period'),
    '昭和': ('昭和', 'Showa Period'),
    '平安': ('平安', 'Heian Period'),
    'heian': ('平安', 'Heian Period'),
    '朝鮮': ('朝鲜', 'Joseon Dynasty (Korea)'),
    'joseon': ('朝鲜', 'Joseon Dynasty (Korea)'),
    'choson': ('朝鲜', 'Joseon Dynasty (Korea)'),
    'yi dynasty': ('朝鲜', 'Joseon Dynasty (Korea)'),
    '李朝': ('朝鲜', 'Joseon Dynasty (Korea)'),
    '高麗': ('高丽', 'Goryeo Dynasty (Korea)'),
    'goryeo': ('高丽', 'Goryeo Dynasty (Korea)'),
    'koryo': ('高丽', 'Goryeo Dynasty (Korea)'),
    '唐': ('唐', 'Tang Dynasty'),
    'tang': ('唐', 'Tang Dynasty'),
    '宋': ('宋', 'Song Dynasty'),
    'song': ('宋', 'Song Dynasty'),
    '北宋': ('北宋', 'Northern Song'),
    'northern song': ('北宋', 'Northern Song'),
    '南宋': ('南宋', 'Southern Song'),
    'southern song': ('南宋', 'Southern Song'),
    '元': ('元', 'Yuan Dynasty'),
    'yuan': ('元', 'Yuan Dynasty'),
    '明': ('明', 'Ming Dynasty'),
    'ming': ('明', 'Ming Dynasty'),
    '清': ('清', 'Qing Dynasty'),
    'qing': ('清', 'Qing Dynasty'),
}

MATERIAL_MAP = {
    '楽': ('乐烧', 'Raku Ware', '乐窑', 'Raku'),
    'raku': ('乐烧', 'Raku Ware', '乐窑', 'Raku'),
    '萩': ('萩烧', 'Hagi Ware', '萩', 'Hagi'),
    'hagi': ('萩烧', 'Hagi Ware', '萩', 'Hagi'),
    '織部': ('织部烧', 'Oribe Ware', '织部', 'Oribe'),
    'oribe': ('织部烧', 'Oribe Ware', '织部', 'Oribe'),
    '備前': ('备前烧', 'Bizen Ware', '备前', 'Bizen'),
    'bizen': ('备前烧', 'Bizen Ware', '备前', 'Bizen'),
    '信楽': ('信乐烧', 'Shigaraki Ware', '信乐', 'Shigaraki'),
    'shigaraki': ('信乐烧', 'Shigaraki Ware', '信乐', 'Shigaraki'),
    '唐津': ('唐津烧', 'Karatsu Ware', '唐津', 'Karatsu'),
    'karatsu': ('唐津烧', 'Karatsu Ware', '唐津', 'Karatsu'),
    '志野': ('志野烧', 'Shino Ware', '志野', 'Shino'),
    'shino': ('志野烧', 'Shino Ware', '志野', 'Shino'),
    '瀬戸': ('濑户烧', 'Seto Ware', '濑户', 'Seto'),
    'seto': ('濑户烧', 'Seto Ware', '濑户', 'Seto'),
    '美濃': ('美浓烧', 'Mino Ware', '美浓', 'Mino'),
    'mino': ('美浓烧', 'Mino Ware', '美浓', 'Mino'),
    '黄瀬戸': ('黄濑户', 'Ki-Seto Ware', '黄濑户', 'Ki-Seto'),
    '伊賀': ('伊贺烧', 'Iga Ware', '伊贺', 'Iga'),
    'iga': ('伊贺烧', 'Iga Ware', '伊贺', 'Iga'),
    '京': ('京烧', 'Kyoto Ware', '京烧', 'Kyoto'),
    'kyoto': ('京烧', 'Kyoto Ware', '京烧', 'Kyoto'),
    '九谷': ('九谷烧', 'Kutani Ware', '九谷', 'Kutani'),
    'kutani': ('九谷烧', 'Kutani Ware', '九谷', 'Kutani'),
    '天目': ('天目', 'Tenmoku', '建窑', 'Jian Kilns'),
    'tenmoku': ('天目', 'Tenmoku', '建窑', 'Jian Kilns'),
    '青磁': ('青瓷', 'Celadon', '', ''),
    'celadon': ('青瓷', 'Celadon', '', ''),
    '染付': ('青花瓷', 'Blue and White Porcelain', '', ''),
    '青花': ('青花瓷', 'Blue and White Porcelain', '', ''),
    'blue and white': ('青花瓷', 'Blue and White Porcelain', '', ''),
    '色絵': ('彩绘瓷', 'Overglaze Enamel', '', ''),
    '白磁': ('白瓷', 'White Porcelain', '', ''),
    '井戸': ('井户', 'Ido Ware (Korea)', '', ''),
    '御本': ('御本', 'Gohon Ware (Korea)', '', ''),
    '高麗': ('高丽瓷', 'Goryeo Celadon', '', ''),
    '刷毛目': ('刷毛目', 'Hakeme Ware', '', ''),
    '三島': ('三岛', 'Mishima Ware', '', ''),
    'mishima': ('三岛', 'Mishima Ware', '', ''),
}

OBJECT_TYPE_MAP = {
    '茶碗': ('茶碗', 'Tea Bowl'),
    '茶盌': ('茶碗', 'Tea Bowl'),
    '茶椀': ('茶碗', 'Tea Bowl'),
    '茶盞': ('茶碗', 'Tea Bowl'),
    'tea bowl': ('茶碗', 'Tea Bowl'),
    'chawan': ('茶碗', 'Tea Bowl'),
    '茶入': ('茶入', 'Tea Caddy (Chaire)'),
    'tea caddy': ('茶入', 'Tea Caddy'),
    'chaire': ('茶入', 'Tea Caddy (Chaire)'),
    '茶壺': ('茶壶', 'Tea Jar'),
    'tea jar': ('茶壶', 'Tea Jar'),
    '水指': ('水指', 'Water Jar (Mizusashi)'),
    'water jar': ('水指', 'Water Jar'),
    'mizusashi': ('水指', 'Water Jar (Mizusashi)'),
    'fresh water jar': ('水指', 'Fresh Water Jar'),
    '茶杓': ('茶杓', 'Tea Scoop (Chashaku)'),
    'tea scoop': ('茶杓', 'Tea Scoop'),
    'chashaku': ('茶杓', 'Tea Scoop (Chashaku)'),
    '蓋置': ('盖置', 'Lid Rest'),
    'lid rest': ('盖置', 'Lid Rest'),
    '建水': ('建水', 'Waste Water Container (Kensui)'),
    'waste water': ('建水', 'Waste Water Container'),
    '香合': ('香合', 'Incense Container'),
    'incense container': ('香合', 'Incense Container'),
    'incense box': ('香合', 'Incense Box'),
    '花入': ('花入', 'Flower Vase'),
    'flower vase': ('花入', 'Flower Vase'),
    '天目台': ('天目台', 'Tea Bowl Stand'),
    '天目': ('天目茶碗', 'Tenmoku Tea Bowl'),
    'tenmoku': ('天目茶碗', 'Tenmoku Tea Bowl'),
    '茶釜': ('茶釜', 'Tea Kettle (Chagama)'),
    'tea kettle': ('茶釜', 'Tea Kettle'),
    '棗': ('枣', 'Tea Caddy (Natsume)'),
    'natsume': ('枣', 'Tea Caddy (Natsume)'),
    '薄茶器': ('薄茶器', 'Thin Tea Container'),
    '柄杓': ('柄杓', 'Ladle (Hishaku)'),
    '杓立': ('杓立', 'Ladle Stand'),
    '風炉': ('风炉', 'Portable Brazier (Furo)'),
    '茶筅': ('茶筅', 'Tea Whisk (Chasen)'),
    '茶托': ('茶托', 'Tea Cup Saucer'),
}


def load_existing_data():
    """Load existing artwork IDs, accessions, and source URLs"""
    with open(ARTWORKS_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    ids = {a['id'] for a in data}
    accessions = {a.get('accessionNumber', '').lower() for a in data if a.get('accessionNumber')}
    source_urls = {a.get('sourceUrl', '').lower() for a in data if a.get('sourceUrl')}
    return ids, accessions, source_urls, data


def load_image_hashes():
    """Load existing image SHA256 hashes"""
    if HASH_FILE.exists():
        try:
            with open(HASH_FILE, 'r') as f:
                return set(json.load(f))
        except Exception:
            pass
    return set()


def save_image_hashes(hashes):
    """Save image hashes"""
    with open(HASH_FILE, 'w') as f:
        json.dump(sorted(list(hashes)), f, indent=2)


def get_full_res_image_url(thumbnail_url):
    """Convert thumbnail URL to full-res URL by removing slideshow_s/"""
    return thumbnail_url.replace('/slideshow_s/', '/')


def download_image(url, timeout=60):
    """Download image with retries"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; TeawareGalleryBot/1.0; +https://philmingdao.github.io/teaware/)'
    }
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            if resp.status_code == 200:
                return resp.content
            print(f"    HTTP {resp.status_code}")
        except Exception as e:
            print(f"    Download error (attempt {attempt + 1}): {e}")
            time.sleep(2 ** attempt)
    return None


def compress_image(image_data, max_edge=MAX_LONG_EDGE, quality=JPEG_QUALITY):
    """Compress and resize image, strip EXIF"""
    try:
        img = Image.open(BytesIO(image_data))
        
        if img.mode in ('RGBA', 'P', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode in ('RGBA', 'LA'):
                alpha = img.split()[-1]
                background.paste(img, mask=alpha)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        w, h = img.size
        if max(w, h) > max_edge:
            ratio = max_edge / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"    Image compression error: {e}")
        return None


def is_valid_image(buffer):
    """Check if buffer is a valid JPEG or PNG image"""
    if len(buffer) < MIN_IMAGE_SIZE:
        return False
    is_jpeg = buffer[0:3] == b'\xff\xd8\xff'
    is_png = buffer[0:8] == b'\x89PNG\r\n\x1a\n'
    return is_jpeg or is_png


def parse_period(period_ja, period_en=''):
    """Parse period/dynasty from Japanese/English text"""
    combined = f"{period_ja} {period_en}".lower()
    
    for key, (zh, en) in PERIOD_MAP.items():
        if key.lower() in combined:
            return zh, en, period_ja or period_en
    
    return '日本', 'Japan', period_ja or period_en


def parse_material(title_ja, material_ja, material_en=''):
    """Parse material/kiln from title and material fields"""
    combined = f"{title_ja} {material_ja} {material_en}".lower()
    
    for key, values in MATERIAL_MAP.items():
        if key.lower() in combined:
            if len(values) == 4:
                return values[0], values[1], values[2], values[3]
            return values[0], values[1], '', ''
    
    if '陶器' in combined or 'stoneware' in combined or 'earthenware' in combined:
        return '陶器', 'Stoneware', '', ''
    if '磁器' in combined or 'porcelain' in combined:
        return '瓷器', 'Porcelain', '', ''
    
    return '陶瓷', 'Ceramics', '', ''


def parse_object_type(title_ja, title_en=''):
    """Parse object type from title"""
    combined = f"{title_ja} {title_en}".lower()
    
    for key, (zh, en) in OBJECT_TYPE_MAP.items():
        if key.lower() in combined:
            return zh, en
    
    return '茶器', 'Tea Utensil'


def matches_tea_keywords(title_ja, title_en, genre, genre_en, description=''):
    """Check if item matches tea-related keywords - prioritize specific tea terms"""
    search_text = f"{title_ja} {title_en} {genre} {genre_en} {description}".lower()
    
    for kw in TEA_KEYWORDS_PRIMARY:
        if kw.lower() in search_text:
            return True, kw
    
    for kw in TEA_KEYWORDS_ENGLISH:
        if kw.lower() in search_text:
            return True, kw
    
    for kw in WARE_KEYWORDS:
        if kw.lower() in search_text:
            has_ceramic = any(ct.lower() in search_text for ct in CERAMICS_TERMS)
            if has_ceramic:
                return True, kw
    
    return False, None


def parse_tsv():
    """Parse ColBase TSV and return filtered candidates"""
    candidates = []
    
    with open(TSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')
        header = next(reader)
        idx = {h: i for i, h in enumerate(header)}
        
        for row in reader:
            if len(row) < 29:
                continue
            
            content_status = row[idx.get('コンテンツの公開状況', 27)] if len(row) > idx.get('コンテンツの公開状況', 27) else ''
            content_rights = row[idx.get('コンテンツの権利区分', 28)] if len(row) > idx.get('コンテンツの権利区分', 28) else ''
            image_url = row[idx.get('代表画像URL', 18)] if len(row) > idx.get('代表画像URL', 18) else ''
            
            if content_status != 'internet':
                continue
            if content_rights not in ('ccby', 'cc0', 'pd'):
                continue
            if not image_url:
                continue
            
            title_ja = row[idx.get('作品名', 5)] if len(row) > idx.get('作品名', 5) else ''
            title_en = row[idx.get('Title of work', 32)] if len(row) > idx.get('Title of work', 32) else ''
            genre = row[idx.get('分類', 4)] if len(row) > idx.get('分類', 4) else ''
            genre_en = row[idx.get('Genre', 31)] if len(row) > idx.get('Genre', 31) else ''
            description = row[idx.get('解説', 17)] if len(row) > idx.get('解説', 17) else ''
            
            matched, matched_kw = matches_tea_keywords(title_ja, title_en, genre, genre_en, description)
            if not matched:
                continue
            
            candidate = {
                'jps_id': row[idx.get('JPS_ID', 0)],
                'source_url': row[idx.get('URL', 1)],
                'accession': row[idx.get('機関管理番号', 2)],
                'genre': genre,
                'genre_en': genre_en,
                'title_ja': title_ja,
                'period_ja': row[idx.get('時代世紀', 11)] if len(row) > idx.get('時代世紀', 11) else '',
                'material_ja': row[idx.get('品質形状', 12)] if len(row) > idx.get('品質形状', 12) else '',
                'size_ja': row[idx.get('法量', 13)] if len(row) > idx.get('法量', 13) else '',
                'holder': row[idx.get('所蔵者', 16)] if len(row) > idx.get('所蔵者', 16) else '',
                'description': description,
                'image_url': image_url,
                'museum_id': row[idx.get('機関識別子', 19)] if len(row) > idx.get('機関識別子', 19) else '',
                'rights': content_rights,
                'title_en': title_en,
                'period_en': row[idx.get('Period/Century', 37)] if len(row) > idx.get('Period/Century', 37) else '',
                'material_en': row[idx.get('Material', 38)] if len(row) > idx.get('Material', 38) else '',
                'size_en': row[idx.get('Size', 39)] if len(row) > idx.get('Size', 39) else '',
                'holder_en': row[idx.get('Holder', 42)] if len(row) > idx.get('Holder', 42) else '',
                'description_en': row[idx.get('Description', 43)] if len(row) > idx.get('Description', 43) else '',
                'matched_kw': matched_kw,
            }
            
            candidates.append(candidate)
    
    return candidates


def main():
    print("=" * 60)
    print("ColBase Open Data Teaware Expansion - Round 3 (2026-09-23)")
    print(f"Batch ID: {BATCH_ID}")
    print("=" * 60)
    
    existing_ids, existing_accessions, existing_source_urls, existing_artworks = load_existing_data()
    existing_hashes = load_image_hashes()
    
    print(f"\nExisting artworks: {len(existing_artworks)}")
    print(f"Existing image hashes: {len(existing_hashes)}")
    
    print("\nParsing ColBase TSV...")
    all_candidates = parse_tsv()
    print(f"Total tea-related candidates with open rights: {len(all_candidates)}")
    
    candidates = []
    for c in all_candidates:
        artwork_id = f"colbase-{c['museum_id']}-{c['accession'].replace('/', '-').replace(' ', '-')}"
        
        if artwork_id in existing_ids:
            continue
        if c['accession'].lower() in existing_accessions:
            continue
        if c['source_url'].lower() in existing_source_urls:
            continue
        
        c['artwork_id'] = artwork_id
        candidates.append(c)
    
    print(f"Net-new candidates after dedupe: {len(candidates)}")
    
    if len(candidates) < 20:
        print(f"\n⚠️ Only {len(candidates)} candidates available. Minimum is 20.")
        if len(candidates) == 0:
            print("No new items to add. Exiting.")
            return 0
    
    by_museum = defaultdict(list)
    for c in candidates:
        by_museum[c['holder']].append(c)
    
    print("\nCandidates by museum:")
    for museum, items in sorted(by_museum.items(), key=lambda x: -len(x[1])):
        print(f"  {museum}: {len(items)}")
    
    by_kw = Counter(c['matched_kw'] for c in candidates)
    print("\nCandidates by matched keyword (top 15):")
    for kw, count in by_kw.most_common(15):
        print(f"  {kw}: {count}")
    
    print(f"\nProcessing (target: {TARGET_COUNT} items)...")
    
    new_artworks = []
    new_images = []
    processed_urls = set()
    
    import random
    random.shuffle(candidates)
    
    for c in candidates:
        if len(new_artworks) >= TARGET_COUNT:
            break
        
        if c['image_url'] in processed_urls:
            continue
        processed_urls.add(c['image_url'])
        
        artwork_id = c['artwork_id']
        
        try:
            full_res_url = get_full_res_image_url(c['image_url'])
            
            print(f"\n[{len(new_artworks) + 1}/{TARGET_COUNT}] {c['title_ja'] or c['title_en'] or c['matched_kw']}")
            print(f"  ID: {artwork_id}")
            
            raw_image = download_image(full_res_url)
            if not raw_image:
                print("  ❌ Download failed")
                continue
            
            if not is_valid_image(raw_image):
                print("  ❌ Invalid image format/size")
                continue
            
            img_hash = hashlib.sha256(raw_image).hexdigest()
            if img_hash in existing_hashes:
                print("  ❌ Duplicate image (hash)")
                continue
            
            compressed = compress_image(raw_image)
            if not compressed or len(compressed) < 5000:
                print("  ❌ Compression failed or too small")
                continue
            
            dynasty_zh, dynasty_en, period = parse_period(c['period_ja'], c['period_en'])
            material_zh, material_en, kiln_zh, kiln_en = parse_material(
                c['title_ja'], c['material_ja'], c['material_en']
            )
            obj_type_zh, obj_type_en = parse_object_type(c['title_ja'], c['title_en'])
            
            museum_info = MUSEUM_NAMES.get(c['holder'], {'zh': c['holder'], 'en': c['holder_en'] or c['holder']})
            
            desc = c['description'] or c['description_en'] or ''
            if desc:
                desc = re.sub(r'<[^>]+>', '', desc).strip()
            if not desc:
                desc = f"此件{obj_type_zh}为{dynasty_en}时期之作品。{f'采用{material_zh}工艺制成。' if material_zh != '陶瓷' else ''}{f'尺寸：{c['size_ja'] or c['size_en']}。' if c['size_ja'] or c['size_en'] else ''}现藏于{museum_info['zh']}。"
            
            title_zh = f"{dynasty_zh}{material_zh}{obj_type_zh}" if dynasty_zh else f"{material_zh}{obj_type_zh}"
            title_en = c['title_en'] or c['title_ja']
            
            rights_label = {
                'ccby': 'CC BY (ColBase)',
                'cc0': 'CC0 (ColBase)',
                'pd': 'Public Domain (ColBase)',
            }.get(c['rights'], 'CC BY (ColBase)')
            
            artwork = {
                "id": artwork_id,
                "titleChinese": title_zh,
                "titleEnglish": title_en,
                "dynasty": dynasty_zh,
                "dynastyEnglish": dynasty_en,
                "period": period,
                "date": c['period_ja'] or c['period_en'] or period,
                "material": material_zh,
                "materialEnglish": c['material_en'] or material_en,
                "objectType": obj_type_zh,
                "objectTypeEnglish": obj_type_en,
                "kiln": kiln_zh,
                "kilnEnglish": kiln_en,
                "dimensions": c['size_ja'] or c['size_en'] or '',
                "description": desc[:500],
                "sourceMuseum": museum_info['zh'],
                "sourceMuseumEnglish": museum_info['en'],
                "accessionNumber": c['accession'],
                "sourceUrl": c['source_url'],
                "imageUrl": f"/artworks/{artwork_id}.jpg",
                "imageAlt": f"{title_en} - {period or dynasty_en}",
                "license": rights_label,
                "creditLine": f"Source: ColBase ({c['holder']}). Licensed under {rights_label.split(' (')[0]}.",
                "crawlBatchId": BATCH_ID,
            }
            
            new_artworks.append(artwork)
            new_images.append((artwork_id, compressed))
            existing_ids.add(artwork_id)
            existing_accessions.add(c['accession'].lower())
            existing_hashes.add(img_hash)
            
            print(f"  ✓ Added: {title_en}")
            
            time.sleep(0.3)
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            continue
    
    print("\n" + "=" * 60)
    print(f"RESULTS: {len(new_artworks)} new artworks")
    print("=" * 60)
    
    if len(new_artworks) < 20:
        print(f"\n⚠️ Only {len(new_artworks)} new artworks (below 20 threshold)")
        print("Continuing anyway to save what we have.")
    
    if len(new_artworks) == 0:
        print("No new artworks to save.")
        return 0
    
    print("\nSaving images...")
    for artwork_id, img_data in new_images:
        img_path = IMAGES_DIR / f"{artwork_id}.jpg"
        with open(img_path, 'wb') as f:
            f.write(img_data)
    print(f"  Saved {len(new_images)} images")
    
    print("\nUpdating artworks.json...")
    existing_artworks.extend(new_artworks)
    
    dynasty_order = {
        '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 3, '遼': 3, '金': 4,
        '元': 5, '明': 6, '清': 7,
        '高丽': 8, '高麗': 8, '朝鲜': 9, '朝鮮': 9,
        '平安': 10, '镰仓': 11, '鎌倉': 11, '室町': 12, '桃山': 13,
        '江户': 14, '江戸': 14, '江戸前期': 14, '江戸中期': 14, '江戸後期': 14,
        '明治': 15, '大正': 16, '昭和': 17,
        '日本': 20, '韩国': 21, '中国': 22, '东亚': 30,
    }
    existing_artworks.sort(key=lambda a: dynasty_order.get(a.get('dynasty', ''), 99))
    
    with open(ARTWORKS_PATH, 'w', encoding='utf-8') as f:
        json.dump(existing_artworks, f, ensure_ascii=False, indent=2)
    
    with open(PUBLIC_ARTWORKS_PATH, 'w', encoding='utf-8') as f:
        json.dump(existing_artworks, f, ensure_ascii=False, indent=2)
    
    save_image_hashes(existing_hashes)
    
    museum_counts = Counter(a['sourceMuseum'] for a in new_artworks)
    
    log_entry = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "source": "colbase",
        "query": "Expanded tea ceremony items: 茶釜/茶筅/建水/蓋置/棗/香合/花入 + ware types (Raku/Shino/Oribe/celadon/blue-white) - Round 3",
        "totalResults": len(all_candidates),
        "idsAccepted": len(new_artworks),
        "idsRejected": len(candidates) - len(new_artworks),
        "crawlBatchId": BATCH_ID,
        "museums": dict(museum_counts),
        "note": f"ColBase opendata.tsv expansion Round 3 - Japanese national museum teaware (2026-09-23 batch). Before: {len(existing_artworks) - len(new_artworks)}, After: {len(existing_artworks)}",
    }
    with open(CRAWL_LOG_PATH, 'a') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    
    print(f"\n✓ Total artworks now: {len(existing_artworks)}")
    print(f"✓ New images saved: {len(new_images)}")
    
    print("\nNew artworks by museum:")
    for museum, count in museum_counts.most_common():
        print(f"  {museum}: {count}")
    
    print("\nSample additions:")
    for a in new_artworks[:10]:
        print(f"  • {a['titleEnglish']}")
        print(f"    {a['dynasty']} / {a['material']} / {a['sourceMuseumEnglish']}")
    
    return len(new_artworks)


if __name__ == "__main__":
    result = main()
    sys.exit(0 if result >= 20 else 1)
