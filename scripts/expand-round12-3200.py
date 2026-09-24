#!/usr/bin/env python3
"""
Round 12 Expansion Script - Fresh queries to reach 3200+ items
Baseline: 3020 items
Target: 3200+ (80-200 net-new)
Sources: Met Museum (CC0), Cleveland Museum (CC0), ColBase (CC BY)
"""

import json
import os
import sys
import time
import hashlib
import requests
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO
from PIL import Image
from collections import Counter

MAX_LONG_EDGE = 1400
JPEG_QUALITY = 80
MIN_IMAGE_SIZE = 5000
BATCH_ID = f"round12-expansion-{int(time.time() * 1000)}"

ROOT = Path(__file__).parent.parent
ARTWORKS_PATH = ROOT / 'src' / 'data' / 'artworks.json'
PUBLIC_ARTWORKS_PATH = ROOT / 'public' / 'artworks.json'
IMAGES_DIR = ROOT / 'public' / 'artworks'
CRAWL_LOG_PATH = ROOT / 'research' / 'crawl-log.jsonl'
HASH_FILE = ROOT / 'research' / 'image-hashes.json'

PERIOD_MAP = {
    '江戸': ('江户', 'Edo Period'),
    'edo': ('江户', 'Edo Period'),
    '桃山': ('桃山', 'Momoyama Period'),
    '室町': ('室町', 'Muromachi Period'),
    '鎌倉': ('镰仓', 'Kamakura Period'),
    '明治': ('明治', 'Meiji Period'),
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
    'joseon': ('朝鲜', 'Joseon Dynasty'),
    'goryeo': ('高丽', 'Goryeo Dynasty'),
    '康熙': ('清康熙', 'Kangxi Period'),
    'kangxi': ('清康熙', 'Kangxi Period'),
    '雍正': ('清雍正', 'Yongzheng Period'),
    'yongzheng': ('清雍正', 'Yongzheng Period'),
    '乾隆': ('清乾隆', 'Qianlong Period'),
    'qianlong': ('清乾隆', 'Qianlong Period'),
    'vietnam': ('越南', 'Vietnam'),
    'thai': ('泰国', 'Thailand'),
}


def download_image(url, timeout=60):
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; TeawareGalleryBot/1.0)'}
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
            if resp.status_code == 200:
                return resp.content
        except Exception:
            time.sleep(2 ** attempt)
    return None


def compress_image(image_data):
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
        if max(w, h) > MAX_LONG_EDGE:
            ratio = MAX_LONG_EDGE / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        output = BytesIO()
        img.save(output, format='JPEG', quality=JPEG_QUALITY, optimize=True)
        return output.getvalue()
    except Exception:
        return None


def is_valid_image(buffer):
    if len(buffer) < MIN_IMAGE_SIZE:
        return False
    return buffer[0:3] == b'\xff\xd8\xff' or buffer[0:8] == b'\x89PNG\r\n\x1a\n'


def parse_dynasty(date_str):
    if not date_str:
        return '近现代', 'Modern'
    date_lower = date_str.lower()
    for key, (zh, en) in PERIOD_MAP.items():
        if key.lower() in date_lower:
            return zh, en
    return '近现代', 'Modern'


def log_crawl(source, query, total_results, ids_accepted, note=""):
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "query": query,
        "totalResults": total_results,
        "idsAccepted": ids_accepted,
        "crawlBatchId": BATCH_ID,
    }
    if note:
        entry["note"] = note
    with open(CRAWL_LOG_PATH, 'a') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def query_met_museum(existing_ids, existing_hashes, target):
    """Query Met Museum with fresh niche queries."""
    print("\n=== Querying Met Museum API (Fresh Queries) ===")
    
    fresh_queries = [
        "famille verte teapot",
        "famille verte cup",
        "wucai cup China",
        "wucai bowl China",
        "doucai cup China",
        "peachbloom bowl China",
        "tea tray China",
        "tea table China porcelain",
        "mizusashi",
        "kensui",
        "futaoki",
        "natsume tea caddy",
        "cha-ire",
        "Seto chawan",
        "Shino tea bowl",
        "Oribe chawan",
        "Ido tea bowl Korea",
        "Kohiki bowl",
        "Vietnamese tea bowl",
        "Vietnamese celadon",
        "Thai celadon bowl",
        "Thai ceramics",
        "Kangxi teapot",
        "Kangxi cup",
        "Yongzheng cup",
        "Yongzheng bowl",
        "Qianlong teapot",
        "Qianlong cup",
        "wine cup blue white China",
        "stem cup blue white",
        "covered box tea China",
        "tea jar Shigaraki",
        "tea jar Seto",
        "incense container Japan",
        "kogo incense",
        "flower vase tea ceremony",
        "hanaire",
        "tea kettle Japan",
        "furo brazier",
        "chagama",
        "Longquan tea bowl",
        "celadon tea caddy",
        "Guan ware cup",
        "Ru ware bowl",
        "Jizhou ware",
        "Cizhou ware tea",
        "Ding ware cup",
        "Jun ware cup",
        "lacquer tea caddy",
        "lacquer natsume",
    ]
    
    base_url = "https://collectionapi.metmuseum.org/public/collection/v1"
    added = []
    new_hashes = set()
    
    for query in fresh_queries:
        if len(added) >= target:
            break
        
        print(f"\nSearching: '{query}'")
        
        try:
            search_resp = requests.get(
                f"{base_url}/search",
                params={"q": query, "hasImages": "true", "isPublicDomain": "true"},
                timeout=30
            )
            if search_resp.status_code != 200:
                log_crawl("met", query, 0, 0, f"HTTP {search_resp.status_code}")
                continue
            
            data = search_resp.json()
            object_ids = data.get('objectIDs', []) or []
            print(f"  Found {len(object_ids)} objects")
            
            query_added = 0
            for obj_id in object_ids[:50]:
                if len(added) >= target:
                    break
                
                artwork_id = f"met-{obj_id}"
                if artwork_id in existing_ids:
                    continue
                
                try:
                    obj_resp = requests.get(f"{base_url}/objects/{obj_id}", timeout=15)
                    if obj_resp.status_code != 200:
                        continue
                    
                    obj = obj_resp.json()
                    
                    if not obj.get('isPublicDomain'):
                        continue
                    
                    image_url = obj.get('primaryImage', '')
                    if not image_url:
                        continue
                    
                    title = obj.get('title', '') or obj.get('objectName', '')
                    culture = obj.get('culture', '')
                    
                    relevant_terms = ['tea', 'bowl', 'cup', 'ewer', 'caddy', 'pot', 'jar',
                                     'china', 'korea', 'japan', 'vietnam', 'thai', 'asian',
                                     'porcelain', 'ceramic', 'stoneware', 'celadon', 'yixing',
                                     'incense', 'lacquer', 'brazier', 'kettle', 'natsume',
                                     'chawan', 'mizusashi', 'kensui', 'futaoki', 'kogo',
                                     'vase', 'flower', 'famille', 'wucai', 'doucai']
                    combined_text = f"{title} {culture} {obj.get('objectName', '')} {obj.get('medium', '')}".lower()
                    if not any(term in combined_text for term in relevant_terms):
                        continue
                    
                    print(f"  [{len(added)+1}/{target}] {title[:50]}")
                    
                    raw_image = download_image(image_url)
                    if not raw_image:
                        print("    ✗ Download failed")
                        continue
                    
                    if not is_valid_image(raw_image):
                        print("    ✗ Invalid image")
                        continue
                    
                    img_hash = hashlib.sha256(raw_image).hexdigest()
                    if img_hash in existing_hashes or img_hash in new_hashes:
                        print("    ✗ Duplicate image")
                        continue
                    
                    compressed = compress_image(raw_image)
                    if not compressed:
                        print("    ✗ Compression failed")
                        continue
                    
                    obj_date = obj.get('objectDate', '')
                    dynasty_zh, dynasty_en = parse_dynasty(obj_date)
                    
                    medium = obj.get('medium', '').lower()
                    material_zh, material_en = '瓷器', 'Porcelain'
                    if 'stoneware' in medium:
                        material_zh, material_en = '陶器', 'Stoneware'
                    elif 'celadon' in medium:
                        material_zh, material_en = '青瓷', 'Celadon'
                    elif 'lacquer' in medium:
                        material_zh, material_en = '漆器', 'Lacquer'
                    elif 'iron' in medium:
                        material_zh, material_en = '铁器', 'Iron'
                    elif 'blue' in medium and 'white' in medium:
                        material_zh, material_en = '青花瓷', 'Blue and White'
                    elif 'famille' in medium:
                        if 'rose' in medium:
                            material_zh, material_en = '粉彩', 'Famille Rose'
                        elif 'verte' in medium:
                            material_zh, material_en = '五彩', 'Famille Verte'
                    elif 'wucai' in medium:
                        material_zh, material_en = '五彩', 'Wucai'
                    elif 'doucai' in medium:
                        material_zh, material_en = '斗彩', 'Doucai'
                    
                    obj_name = obj.get('objectName', '').lower()
                    obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                    if 'bowl' in obj_name or 'chawan' in obj_name:
                        obj_type_zh, obj_type_en = '茶碗', 'Tea Bowl'
                    elif 'cup' in obj_name:
                        obj_type_zh, obj_type_en = '杯', 'Cup'
                    elif 'teapot' in obj_name or 'pot' in obj_name:
                        obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                    elif 'ewer' in obj_name:
                        obj_type_zh, obj_type_en = '执壶', 'Ewer'
                    elif 'caddy' in obj_name or 'natsume' in obj_name or 'chaire' in obj_name:
                        obj_type_zh, obj_type_en = '茶入', 'Tea Caddy'
                    elif 'jar' in obj_name:
                        obj_type_zh, obj_type_en = '茶罐', 'Tea Jar'
                    elif 'incense' in obj_name or 'kogo' in obj_name:
                        obj_type_zh, obj_type_en = '香合', 'Incense Container'
                    elif 'vase' in obj_name:
                        obj_type_zh, obj_type_en = '花入', 'Flower Vase'
                    elif 'kettle' in obj_name:
                        obj_type_zh, obj_type_en = '茶釜', 'Tea Kettle'
                    elif 'brazier' in obj_name:
                        obj_type_zh, obj_type_en = '风炉', 'Brazier'
                    elif 'water' in obj_name and 'jar' in obj_name:
                        obj_type_zh, obj_type_en = '水指', 'Water Jar'
                    elif 'tray' in obj_name:
                        obj_type_zh, obj_type_en = '茶盘', 'Tea Tray'
                    elif 'box' in obj_name:
                        obj_type_zh, obj_type_en = '茶盒', 'Tea Box'
                    
                    artwork = {
                        "id": artwork_id,
                        "titleChinese": f"{dynasty_zh}{material_zh}{obj_type_zh}",
                        "titleEnglish": title,
                        "dynasty": dynasty_zh,
                        "dynastyEnglish": dynasty_en,
                        "period": obj_date,
                        "date": obj_date,
                        "material": material_zh,
                        "materialEnglish": obj.get('medium', material_en),
                        "objectType": obj_type_zh,
                        "objectTypeEnglish": obj.get('objectName', obj_type_en),
                        "dimensions": obj.get('dimensions', ''),
                        "description": f"{title}。{obj_date}时期作品。{obj.get('medium', '')}。现藏于大都会艺术博物馆。",
                        "sourceMuseum": "大都会艺术博物馆",
                        "sourceMuseumEnglish": "The Metropolitan Museum of Art",
                        "accessionNumber": obj.get('accessionNumber', ''),
                        "sourceUrl": obj.get('objectURL', ''),
                        "imageUrl": f"/artworks/{artwork_id}.jpg",
                        "imageAlt": f"{title} - Met Museum",
                        "license": "CC0 / Public Domain",
                        "creditLine": obj.get('creditLine', ''),
                        "crawlBatchId": BATCH_ID,
                    }
                    
                    added.append((artwork, compressed))
                    existing_ids.add(artwork_id)
                    new_hashes.add(img_hash)
                    query_added += 1
                    print(f"    ✓ Added")
                    time.sleep(0.3)
                    
                except Exception as e:
                    continue
            
            log_crawl("met", query, len(object_ids), query_added)
                    
        except Exception as e:
            print(f"  Error: {e}")
            log_crawl("met", query, 0, 0, str(e))
            continue
    
    return added, new_hashes


def query_cleveland_museum(existing_ids, existing_hashes, target):
    """Query Cleveland Museum with complementary queries."""
    print("\n=== Querying Cleveland Museum of Art API ===")
    
    queries = [
        "famille verte Chinese",
        "wucai Chinese porcelain",
        "doucai Chinese",
        "Vietnamese ceramics",
        "Thai ceramics",
        "Kangxi porcelain",
        "Yongzheng porcelain",
        "Qianlong porcelain",
        "incense box Asian",
        "lacquer tea",
        "Jizhou ware",
        "Cizhou ware",
        "Korean tea bowl",
        "Japanese tea bowl",
        "tea jar Chinese",
        "covered box Chinese",
    ]
    
    base_url = "https://openaccess-api.clevelandart.org/api/artworks/"
    added = []
    new_hashes = set()
    
    for query in queries:
        if len(added) >= target:
            break
        
        print(f"\nSearching: '{query}'")
        
        try:
            resp = requests.get(
                base_url,
                params={"q": query, "has_image": 1, "cc0": 1, "limit": 100},
                timeout=30
            )
            if resp.status_code != 200:
                log_crawl("cma", query, 0, 0, f"HTTP {resp.status_code}")
                continue
            
            data = resp.json()
            objects = data.get('data', [])
            print(f"  Found {len(objects)} objects")
            
            query_added = 0
            for obj in objects:
                if len(added) >= target:
                    break
                
                share_license = obj.get('share_license_status', '')
                if share_license != 'CC0':
                    continue
                
                images = obj.get('images', {})
                if not images:
                    continue
                web_img = images.get('web', {})
                image_url = web_img.get('url', '')
                if not image_url:
                    continue
                
                artwork_id = f"cma-{obj.get('id', '')}"
                if artwork_id in existing_ids:
                    continue
                
                title = obj.get('title', '')
                
                print(f"  [{len(added)+1}/{target}] {title[:50]}")
                
                raw_image = download_image(image_url)
                if not raw_image:
                    print("    ✗ Download failed")
                    continue
                
                if not is_valid_image(raw_image):
                    print("    ✗ Invalid image")
                    continue
                
                img_hash = hashlib.sha256(raw_image).hexdigest()
                if img_hash in existing_hashes or img_hash in new_hashes:
                    print("    ✗ Duplicate image")
                    continue
                
                compressed = compress_image(raw_image)
                if not compressed:
                    print("    ✗ Compression failed")
                    continue
                
                creation_date = obj.get('creation_date', '')
                dynasty_zh, dynasty_en = parse_dynasty(creation_date)
                
                technique = (obj.get('technique', '') or '').lower()
                material_zh, material_en = '瓷器', 'Porcelain'
                if 'stoneware' in technique:
                    material_zh, material_en = '陶器', 'Stoneware'
                elif 'celadon' in technique:
                    material_zh, material_en = '青瓷', 'Celadon'
                elif 'lacquer' in technique:
                    material_zh, material_en = '漆器', 'Lacquer'
                
                obj_type = (obj.get('type', '') or '').lower()
                obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                if 'bowl' in obj_type:
                    obj_type_zh, obj_type_en = '碗', 'Bowl'
                elif 'cup' in obj_type:
                    obj_type_zh, obj_type_en = '杯', 'Cup'
                elif 'teapot' in obj_type:
                    obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                elif 'ewer' in obj_type:
                    obj_type_zh, obj_type_en = '执壶', 'Ewer'
                elif 'jar' in obj_type:
                    obj_type_zh, obj_type_en = '罐', 'Jar'
                elif 'box' in obj_type:
                    obj_type_zh, obj_type_en = '盒', 'Box'
                
                artwork = {
                    "id": artwork_id,
                    "titleChinese": f"{dynasty_zh}{material_zh}{obj_type_zh}",
                    "titleEnglish": title,
                    "dynasty": dynasty_zh,
                    "dynastyEnglish": dynasty_en,
                    "period": creation_date,
                    "date": creation_date,
                    "material": material_zh,
                    "materialEnglish": obj.get('technique', material_en),
                    "objectType": obj_type_zh,
                    "objectTypeEnglish": obj.get('type', obj_type_en),
                    "dimensions": obj.get('measurements', ''),
                    "description": f"{title}。{creation_date}。现藏于克利夫兰艺术博物馆。",
                    "sourceMuseum": "克利夫兰艺术博物馆",
                    "sourceMuseumEnglish": "Cleveland Museum of Art",
                    "accessionNumber": obj.get('accession_number', ''),
                    "sourceUrl": obj.get('url', ''),
                    "imageUrl": f"/artworks/{artwork_id}.jpg",
                    "imageAlt": f"{title} - Cleveland Museum",
                    "license": "CC0 / Public Domain",
                    "creditLine": obj.get('creditline', ''),
                    "crawlBatchId": BATCH_ID,
                }
                
                added.append((artwork, compressed))
                existing_ids.add(artwork_id)
                new_hashes.add(img_hash)
                query_added += 1
                print(f"    ✓ Added")
                time.sleep(0.2)
            
            log_crawl("cma", query, len(objects), query_added)
                
        except Exception as e:
            print(f"  Error: {e}")
            log_crawl("cma", query, 0, 0, str(e))
            continue
    
    return added, new_hashes


def query_colbase(existing_ids, existing_hashes, target):
    """Query ColBase TSV for Japanese tea ceramics - Round 4."""
    print("\n=== Querying ColBase (Round 4) ===")
    
    tsv_url = "https://colbase.nich.go.jp/opendata.tsv"
    
    print("Downloading ColBase TSV...")
    try:
        resp = requests.get(tsv_url, timeout=120)
        if resp.status_code != 200:
            print(f"  Failed to download TSV: HTTP {resp.status_code}")
            return [], set()
        
        lines = resp.text.split('\n')
        print(f"  Total lines: {len(lines)}")
    except Exception as e:
        print(f"  Error downloading TSV: {e}")
        return [], set()
    
    keywords_round4 = [
        '茶碗', '茶入', '棗', '茶釜', '釜', '風炉', '水指', '建水',
        '蓋置', '茶杓', '茶筅', '香合', '天目', '楽', '萩', '織部',
        '志野', '備前', '信楽', '唐津', '青磁', '染付', '白磁',
        '井戸', '粉引', '刷毛目', '三島',
    ]
    
    added = []
    new_hashes = set()
    museum_counts = Counter()
    
    header = lines[0].split('\t') if lines else []
    col_map = {name: idx for idx, name in enumerate(header)}
    
    for line in lines[1:]:
        if len(added) >= target:
            break
        
        if not line.strip():
            continue
        
        cols = line.split('\t')
        if len(cols) < 10:
            continue
        
        try:
            item_id = cols[col_map.get('識別番号', 0)] if col_map.get('識別番号') else cols[0]
            title = cols[col_map.get('名称', 1)] if col_map.get('名称') else cols[1]
            
            if not any(kw in title for kw in keywords_round4):
                continue
            
            artwork_id = f"colbase-{item_id.replace('/', '-')}"
            if artwork_id in existing_ids:
                continue
            
            img_idx = col_map.get('画像', -1)
            if img_idx < 0 or img_idx >= len(cols):
                continue
            
            thumb_url = cols[img_idx].strip()
            if not thumb_url or not thumb_url.startswith('http'):
                continue
            
            full_url = thumb_url.replace('/slideshow_s/', '/full/')
            if full_url == thumb_url:
                full_url = thumb_url.replace('/thumb/', '/full/')
            
            museum_idx = col_map.get('所蔵館', -1)
            museum = cols[museum_idx].strip() if museum_idx >= 0 and museum_idx < len(cols) else "ColBase"
            
            print(f"  [{len(added)+1}/{target}] {title[:40]} ({museum[:20]})")
            
            raw_image = download_image(full_url)
            if not raw_image:
                raw_image = download_image(thumb_url)
            
            if not raw_image:
                print("    ✗ Download failed")
                continue
            
            if not is_valid_image(raw_image):
                print("    ✗ Invalid image")
                continue
            
            img_hash = hashlib.sha256(raw_image).hexdigest()
            if img_hash in existing_hashes or img_hash in new_hashes:
                print("    ✗ Duplicate image")
                continue
            
            compressed = compress_image(raw_image)
            if not compressed:
                print("    ✗ Compression failed")
                continue
            
            dynasty_zh, dynasty_en = '日本', 'Japan'
            if '江戸' in title:
                dynasty_zh, dynasty_en = '江户', 'Edo Period'
            elif '桃山' in title:
                dynasty_zh, dynasty_en = '桃山', 'Momoyama Period'
            elif '室町' in title:
                dynasty_zh, dynasty_en = '室町', 'Muromachi Period'
            elif '明治' in title:
                dynasty_zh, dynasty_en = '明治', 'Meiji Period'
            
            material_zh, material_en = '陶器', 'Ceramics'
            if '磁' in title:
                material_zh, material_en = '瓷器', 'Porcelain'
            elif '漆' in title:
                material_zh, material_en = '漆器', 'Lacquer'
            elif '鉄' in title or '釜' in title:
                material_zh, material_en = '铁器', 'Iron'
            elif '竹' in title:
                material_zh, material_en = '竹器', 'Bamboo'
            
            obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
            if '茶碗' in title:
                obj_type_zh, obj_type_en = '茶碗', 'Tea Bowl'
            elif '茶入' in title:
                obj_type_zh, obj_type_en = '茶入', 'Tea Caddy'
            elif '棗' in title:
                obj_type_zh, obj_type_en = '棗', 'Natsume'
            elif '茶釜' in title or '釜' in title:
                obj_type_zh, obj_type_en = '茶釜', 'Tea Kettle'
            elif '水指' in title:
                obj_type_zh, obj_type_en = '水指', 'Water Jar'
            elif '建水' in title:
                obj_type_zh, obj_type_en = '建水', 'Waste Water Container'
            elif '蓋置' in title:
                obj_type_zh, obj_type_en = '蓋置', 'Lid Rest'
            elif '茶杓' in title:
                obj_type_zh, obj_type_en = '茶杓', 'Tea Scoop'
            elif '香合' in title:
                obj_type_zh, obj_type_en = '香合', 'Incense Container'
            elif '花入' in title:
                obj_type_zh, obj_type_en = '花入', 'Flower Vase'
            elif '風炉' in title:
                obj_type_zh, obj_type_en = '風炉', 'Portable Brazier'
            
            museum_zh = museum
            museum_en = museum
            if '東京' in museum or 'tokyo' in museum.lower():
                museum_zh = '东京国立博物馆'
                museum_en = 'Tokyo National Museum'
            elif '京都' in museum or 'kyoto' in museum.lower():
                museum_zh = '京都国立博物馆'
                museum_en = 'Kyoto National Museum'
            elif '九州' in museum or 'kyushu' in museum.lower():
                museum_zh = '九州国立博物馆'
                museum_en = 'Kyushu National Museum'
            elif '奈良' in museum or 'nara' in museum.lower():
                museum_zh = '奈良国立博物馆'
                museum_en = 'Nara National Museum'
            
            artwork = {
                "id": artwork_id,
                "titleChinese": f"{dynasty_zh}{material_zh}{obj_type_zh}",
                "titleEnglish": title,
                "dynasty": dynasty_zh,
                "dynastyEnglish": dynasty_en,
                "period": "",
                "date": "",
                "material": material_zh,
                "materialEnglish": material_en,
                "objectType": obj_type_zh,
                "objectTypeEnglish": obj_type_en,
                "dimensions": "",
                "description": f"{title}。日本茶道器具。现藏于{museum_zh}。",
                "sourceMuseum": museum_zh,
                "sourceMuseumEnglish": museum_en,
                "accessionNumber": item_id,
                "sourceUrl": f"https://colbase.nich.go.jp/collection_items/{item_id}",
                "imageUrl": f"/artworks/{artwork_id}.jpg",
                "imageAlt": f"{title} - {museum_en}",
                "license": "CC BY (ColBase)",
                "creditLine": f"ColBase - {museum}",
                "crawlBatchId": BATCH_ID,
            }
            
            added.append((artwork, compressed))
            existing_ids.add(artwork_id)
            new_hashes.add(img_hash)
            museum_counts[museum_zh] += 1
            print(f"    ✓ Added")
            time.sleep(0.1)
            
        except Exception as e:
            continue
    
    log_crawl("colbase", "Round 4: " + "/".join(keywords_round4[:5]) + "...", len(lines), len(added), 
              f"Museums: {dict(museum_counts)}")
    
    return added, new_hashes


def main():
    print("=" * 60)
    print("Round 12 Teaware Expansion")
    print(f"Batch ID: {BATCH_ID}")
    print("=" * 60)
    
    with open(ARTWORKS_PATH, 'r', encoding='utf-8') as f:
        artworks = json.load(f)
    
    existing_ids = {a['id'] for a in artworks}
    
    if HASH_FILE.exists():
        with open(HASH_FILE, 'r') as f:
            existing_hashes = set(json.load(f))
    else:
        existing_hashes = set()
    
    current_count = len(artworks)
    print(f"\nBaseline: {current_count} artworks")
    print(f"Target: 80-200 net-new items")
    
    all_new = []
    all_new_hashes = set()
    
    met_added, met_hashes = query_met_museum(existing_ids, existing_hashes | all_new_hashes, 80)
    all_new.extend(met_added)
    all_new_hashes.update(met_hashes)
    print(f"\nMet added: {len(met_added)}")
    
    cma_added, cma_hashes = query_cleveland_museum(existing_ids, existing_hashes | all_new_hashes, 50)
    all_new.extend(cma_added)
    all_new_hashes.update(cma_hashes)
    print(f"\nCleveland added: {len(cma_added)}")
    
    if len(all_new) < 100:
        colbase_added, colbase_hashes = query_colbase(existing_ids, existing_hashes | all_new_hashes, 80)
        all_new.extend(colbase_added)
        all_new_hashes.update(colbase_hashes)
        print(f"\nColBase added: {len(colbase_added)}")
    
    print("\n" + "=" * 60)
    print("SAVING RESULTS")
    print("=" * 60)
    
    if not all_new:
        print("No new artworks to add.")
        return 1
    
    print(f"\nSaving {len(all_new)} images...")
    for artwork, img_data in all_new:
        img_path = IMAGES_DIR / f"{artwork['id']}.jpg"
        with open(img_path, 'wb') as f:
            f.write(img_data)
    
    for artwork, _ in all_new:
        artworks.append(artwork)
    
    dynasty_order = {
        '唐': 1, '五代': 2, '北宋': 3, '南宋': 4, '宋': 3,
        '元': 5, '明': 6, '清': 7, '清康熙': 7, '清雍正': 7, '清乾隆': 7,
        '高丽': 8, '朝鲜': 9,
        '镰仓': 10, '室町': 11, '桃山': 12,
        '江户': 13, '明治': 14, '大正': 15, '昭和': 16,
        '越南': 17, '泰国': 18,
        '日本': 20, '近现代': 30,
    }
    artworks.sort(key=lambda a: dynasty_order.get(a.get('dynasty', ''), 99))
    
    print("Saving artworks.json...")
    with open(ARTWORKS_PATH, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    with open(PUBLIC_ARTWORKS_PATH, 'w', encoding='utf-8') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    print("Saving image hashes...")
    all_hashes = existing_hashes | all_new_hashes
    with open(HASH_FILE, 'w') as f:
        json.dump(sorted(list(all_hashes)), f, indent=2)
    
    met_count = sum(1 for a, _ in all_new if a['id'].startswith('met-'))
    cma_count = sum(1 for a, _ in all_new if a['id'].startswith('cma-'))
    colbase_count = sum(1 for a, _ in all_new if a['id'].startswith('colbase-'))
    
    final_count = len(artworks)
    print(f"\n{'=' * 60}")
    print(f"RESULTS")
    print(f"{'=' * 60}")
    print(f"Baseline: {current_count}")
    print(f"Net-new: {len(all_new)}")
    print(f"  - Met Museum: {met_count}")
    print(f"  - Cleveland: {cma_count}")
    print(f"  - ColBase: {colbase_count}")
    print(f"Final total: {final_count}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
