#!/usr/bin/env python3
"""
Round 13 Expansion Script - Fresh queries for underrepresented glazes and types
Baseline: 3,150 items
Target: 80-150 net-new high-quality tea objects
Sources: Met Museum (CC0), Cleveland Museum (CC0), Wikimedia Commons (CC0/PD), Smithsonian (CC0 if key available)
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
BATCH_ID = f"round13-expansion-{int(time.time() * 1000)}"

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
    """Query Met Museum with Round 13 fresh queries - underrepresented glazes and types."""
    print("\n=== Querying Met Museum API (Round 13 Fresh Queries) ===")
    
    fresh_queries = [
        # Underrepresented Chinese glazes
        "sang de boeuf vase",
        "sang de boeuf China",
        "coral red glaze China",
        "aubergine glaze China",
        "cafe au lait glaze",
        "crackle glaze bowl China",
        "yellow glaze bowl China",
        "turquoise glaze China porcelain",
        "iron red teapot China",
        "iron red cup China",
        # Song/Yuan wares
        "Ge ware",
        "Ru ware",
        "Guan ware",
        "Ge ware cup",
        # Metal and other tea wares
        "pewter teapot",
        "silver teapot China",
        "silver cup China",
        "bamboo tea caddy",
        "bamboo tea scoop",
        # Wine pots (often used for tea)
        "wine pot China porcelain",
        "wine ewer China",
        # Covered tea bowls
        "covered tea bowl China",
        "lidded tea bowl",
        # Japanese tea ceremony
        "tea scoop Japan",
        "chasen tea whisk",
        "kogo incense container",
        "Oribe dish",
        "Bizen chawan",
        "Hagi chawan",
        "Karatsu chawan",
        "Ido chawan",
        "Raku black tea bowl",
        "Raku red tea bowl",
        # Export ware
        "Flemish tea",
        "Dutch market teapot",
        "export tea service China",
        # Additional niche queries
        "sake cup Japan ceramics",
        "guinomi Japan",
        "tokkuri sake",
        "Shigaraki water jar",
        "Iga ware tea",
        "Tamba ware",
        "Echizen ware",
        "Tokoname teapot",
        "Banko ware teapot",
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
            for obj_id in object_ids[:60]:
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
                                     'vase', 'flower', 'famille', 'wucai', 'doucai',
                                     'glaze', 'sang', 'boeuf', 'coral', 'aubergine',
                                     'silver', 'pewter', 'bamboo', 'wine', 'sake',
                                     'guinomi', 'tokkuri', 'scoop', 'whisk', 'raku',
                                     'oribe', 'bizen', 'hagi', 'karatsu', 'ido',
                                     'shigaraki', 'iga', 'tamba', 'echizen', 'tokoname', 'banko']
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
                    elif 'iron' in medium and 'glaze' not in medium:
                        material_zh, material_en = '铁器', 'Iron'
                    elif 'silver' in medium:
                        material_zh, material_en = '银器', 'Silver'
                    elif 'pewter' in medium:
                        material_zh, material_en = '锡器', 'Pewter'
                    elif 'bamboo' in medium:
                        material_zh, material_en = '竹器', 'Bamboo'
                    elif 'blue' in medium and 'white' in medium:
                        material_zh, material_en = '青花瓷', 'Blue and White'
                    elif 'famille' in medium:
                        if 'rose' in medium:
                            material_zh, material_en = '粉彩', 'Famille Rose'
                        elif 'verte' in medium:
                            material_zh, material_en = '五彩', 'Famille Verte'
                    elif 'sang de boeuf' in medium or 'oxblood' in medium:
                        material_zh, material_en = '郎窑红', 'Sang de Boeuf'
                    elif 'coral' in medium and 'red' in medium:
                        material_zh, material_en = '珊瑚红', 'Coral Red'
                    elif 'aubergine' in medium:
                        material_zh, material_en = '茄皮紫', 'Aubergine Glaze'
                    elif 'turquoise' in medium:
                        material_zh, material_en = '松石绿', 'Turquoise Glaze'
                    elif 'yellow' in medium and 'glaze' in medium:
                        material_zh, material_en = '黄釉', 'Yellow Glaze'
                    elif 'crackle' in medium:
                        material_zh, material_en = '开片釉', 'Crackle Glaze'
                    
                    obj_name = obj.get('objectName', '').lower()
                    obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                    if 'bowl' in obj_name or 'chawan' in obj_name:
                        obj_type_zh, obj_type_en = '茶碗', 'Tea Bowl'
                    elif 'cup' in obj_name or 'guinomi' in obj_name:
                        obj_type_zh, obj_type_en = '杯', 'Cup'
                    elif 'teapot' in obj_name or ('pot' in obj_name and 'tea' in combined_text):
                        obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                    elif 'ewer' in obj_name or 'wine pot' in obj_name:
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
                    elif 'scoop' in obj_name or 'chashaku' in obj_name:
                        obj_type_zh, obj_type_en = '茶杓', 'Tea Scoop'
                    elif 'whisk' in obj_name or 'chasen' in obj_name:
                        obj_type_zh, obj_type_en = '茶筅', 'Tea Whisk'
                    elif 'water' in obj_name and 'jar' in obj_name:
                        obj_type_zh, obj_type_en = '水指', 'Water Jar'
                    elif 'tray' in obj_name:
                        obj_type_zh, obj_type_en = '茶盘', 'Tea Tray'
                    elif 'dish' in obj_name:
                        obj_type_zh, obj_type_en = '茶盘', 'Dish'
                    elif 'sake' in obj_name or 'tokkuri' in obj_name:
                        obj_type_zh, obj_type_en = '酒器', 'Sake Ware'
                    
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
    """Query Cleveland Museum with Round 13 complementary queries."""
    print("\n=== Querying Cleveland Museum of Art API (Round 13) ===")
    
    queries = [
        "sang de boeuf",
        "coral red Chinese",
        "aubergine glaze",
        "Ge ware",
        "Ru ware",
        "Guan ware",
        "crackle glaze Chinese",
        "tea caddy Japanese",
        "chawan tea bowl",
        "export tea service",
        "silver teapot Asian",
        "pewter Asian",
        "bamboo tea",
        "Raku ware",
        "Oribe ware",
        "Bizen ware",
        "Hagi ware",
        "Karatsu ware",
        "Shigaraki ware",
        "Iga ware",
        "sake cup Japan",
        "wine pot Chinese",
        "covered bowl Chinese",
        "yellow glaze Chinese",
        "turquoise Chinese",
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
                elif 'silver' in technique:
                    material_zh, material_en = '银器', 'Silver'
                elif 'bamboo' in technique:
                    material_zh, material_en = '竹器', 'Bamboo'
                
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
                elif 'vase' in obj_type:
                    obj_type_zh, obj_type_en = '瓶', 'Vase'
                
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


def query_smithsonian(existing_ids, existing_hashes, target):
    """Query Smithsonian Open Access API for Asian tea ware."""
    api_key = os.environ.get('SMITHSONIAN_API_KEY')
    if not api_key:
        print("\n=== Smithsonian API: No key available, skipping ===")
        return [], set()
    
    print("\n=== Querying Smithsonian Open Access API ===")
    
    queries = [
        "tea bowl ceramics",
        "chawan Japanese",
        "tea caddy Asian",
        "teapot Chinese porcelain",
        "celadon tea",
        "Raku tea bowl",
        "Oribe ceramics",
        "Bizen ceramics",
        "Hagi ceramics",
        "Korean celadon bowl",
        "sang de boeuf",
        "oxblood glaze",
        "Jun ware",
        "Ding ware bowl",
        "Longquan celadon",
        "blue white porcelain tea",
        "famille rose tea",
        "Edo period tea",
        "Momoyama tea ceramics",
        "incense container kogo",
    ]
    
    base_url = "https://api.si.edu/openaccess/api/v1.0/search"
    added = []
    new_hashes = set()
    
    for query in queries:
        if len(added) >= target:
            break
        
        print(f"\nSearching: '{query}'")
        
        try:
            search_query = f"online_media_type:Images AND topic:Ceramics AND ({query})"
            params = {
                "api_key": api_key,
                "q": search_query,
                "rows": 50,
                "start": 0,
            }
            
            resp = requests.get(base_url, params=params, timeout=30)
            if resp.status_code != 200:
                log_crawl("smithsonian", query, 0, 0, f"HTTP {resp.status_code}")
                continue
            
            data = resp.json()
            rows = data.get('response', {}).get('rows', [])
            print(f"  Found {len(rows)} objects")
            
            query_added = 0
            for row in rows:
                if len(added) >= target:
                    break
                
                content = row.get('content', {})
                desc_data = content.get('descriptiveNonRepeating', {})
                freetext = content.get('freetext', {})
                indexed = content.get('indexedStructured', {})
                
                obj_id = row.get('id', '')
                artwork_id = f"si-{obj_id}"
                if artwork_id in existing_ids:
                    continue
                
                title = desc_data.get('title', {}).get('content', '')
                if not title:
                    continue
                
                online_media = desc_data.get('online_media', {})
                media_list = online_media.get('media', [])
                
                image_url = None
                for media in media_list:
                    if media.get('type', '') == 'Images':
                        resources = media.get('resources', [])
                        for res in resources:
                            if res.get('label', '') in ['High-resolution', 'Screen Image', 'Large']:
                                image_url = res.get('url', '')
                                break
                        if not image_url and resources:
                            image_url = resources[0].get('url', '')
                        if image_url:
                            break
                
                if not image_url:
                    guid = desc_data.get('guid', '')
                    if guid:
                        obj_number = desc_data.get('record_ID', obj_id)
                        image_url = f"https://ids.si.edu/ids/deliveryService?id={obj_number}"
                
                if not image_url:
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
                
                date_str = ''
                date_info = freetext.get('date', [])
                if date_info and isinstance(date_info, list):
                    date_str = date_info[0].get('content', '')
                dynasty_zh, dynasty_en = parse_dynasty(date_str)
                
                place = indexed.get('place', [])
                culture = indexed.get('culture', [])
                
                material_zh, material_en = '瓷器', 'Porcelain'
                obj_materials = indexed.get('object_type', [])
                mat_lower = ' '.join(obj_materials).lower() if obj_materials else ''
                if 'stoneware' in mat_lower:
                    material_zh, material_en = '陶器', 'Stoneware'
                elif 'celadon' in mat_lower:
                    material_zh, material_en = '青瓷', 'Celadon'
                
                obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                title_lower = title.lower()
                if 'bowl' in title_lower or 'chawan' in title_lower:
                    obj_type_zh, obj_type_en = '茶碗', 'Tea Bowl'
                elif 'cup' in title_lower:
                    obj_type_zh, obj_type_en = '杯', 'Cup'
                elif 'teapot' in title_lower:
                    obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                elif 'caddy' in title_lower:
                    obj_type_zh, obj_type_en = '茶入', 'Tea Caddy'
                elif 'ewer' in title_lower:
                    obj_type_zh, obj_type_en = '执壶', 'Ewer'
                elif 'vase' in title_lower:
                    obj_type_zh, obj_type_en = '花入', 'Vase'
                elif 'incense' in title_lower or 'kogo' in title_lower:
                    obj_type_zh, obj_type_en = '香合', 'Incense Container'
                
                unit_code = desc_data.get('unit_code', '')
                museum_name = "史密森尼学会"
                museum_name_en = "Smithsonian Institution"
                if 'FSG' in unit_code or 'Freer' in unit_code:
                    museum_name = "弗利尔美术馆"
                    museum_name_en = "Freer Gallery of Art"
                elif 'SAAM' in unit_code or 'Sackler' in unit_code:
                    museum_name = "赛克勒美术馆"
                    museum_name_en = "Arthur M. Sackler Gallery"
                
                record_link = desc_data.get('record_link', '')
                
                artwork = {
                    "id": artwork_id,
                    "titleChinese": f"{dynasty_zh}{material_zh}{obj_type_zh}",
                    "titleEnglish": title,
                    "dynasty": dynasty_zh,
                    "dynastyEnglish": dynasty_en,
                    "period": date_str,
                    "date": date_str,
                    "material": material_zh,
                    "materialEnglish": material_en,
                    "objectType": obj_type_zh,
                    "objectTypeEnglish": obj_type_en,
                    "dimensions": "",
                    "description": f"{title}。{date_str}。现藏于{museum_name}。",
                    "sourceMuseum": museum_name,
                    "sourceMuseumEnglish": museum_name_en,
                    "accessionNumber": desc_data.get('record_ID', ''),
                    "sourceUrl": record_link,
                    "imageUrl": f"/artworks/{artwork_id}.jpg",
                    "imageAlt": f"{title} - {museum_name_en}",
                    "license": "CC0 / Public Domain",
                    "creditLine": f"{museum_name_en}, Smithsonian Institution",
                    "crawlBatchId": BATCH_ID,
                }
                
                added.append((artwork, compressed))
                existing_ids.add(artwork_id)
                new_hashes.add(img_hash)
                query_added += 1
                print(f"    ✓ Added")
                time.sleep(0.3)
            
            log_crawl("smithsonian", query, len(rows), query_added)
                
        except Exception as e:
            print(f"  Error: {e}")
            log_crawl("smithsonian", query, 0, 0, str(e))
            continue
    
    return added, new_hashes


def query_wikimedia_commons(existing_ids, existing_hashes, target):
    """Query Wikimedia Commons for CC0/PD tea ware images."""
    print("\n=== Querying Wikimedia Commons (Round 13) ===")
    
    categories = [
        "Category:Tea_trays",
        "Category:Tetsubin",
        "Category:Natsume_(tea_caddy)",
        "Category:Chashaku",
        "Category:Chasen",
        "Category:Kogo",
        "Category:Mizusashi",
        "Category:Ge_ware",
        "Category:Guan_ware",
        "Category:Sang_de_boeuf_glaze",
        "Category:Aubergine_glaze",
        "Category:Yellow_glaze_Chinese_ceramics",
        "Category:Turquoise_glaze_Chinese_ceramics",
        "Category:Crackle_glaze",
    ]
    
    base_url = "https://commons.wikimedia.org/w/api.php"
    added = []
    new_hashes = set()
    
    for category in categories:
        if len(added) >= target:
            break
        
        print(f"\nSearching: '{category}'")
        
        try:
            params = {
                "action": "query",
                "format": "json",
                "generator": "categorymembers",
                "gcmtitle": category,
                "gcmtype": "file",
                "gcmlimit": 50,
                "prop": "imageinfo",
                "iiprop": "url|extmetadata|size",
            }
            
            resp = requests.get(base_url, params=params, timeout=30)
            if resp.status_code != 200:
                log_crawl("wikimedia", category, 0, 0, f"HTTP {resp.status_code}")
                continue
            
            data = resp.json()
            pages = data.get('query', {}).get('pages', {})
            print(f"  Found {len(pages)} files")
            
            query_added = 0
            for page_id, page in pages.items():
                if len(added) >= target:
                    break
                
                title = page.get('title', '')
                imageinfo = page.get('imageinfo', [{}])[0]
                
                extmetadata = imageinfo.get('extmetadata', {})
                license_short = extmetadata.get('LicenseShortName', {}).get('value', '')
                
                if not any(lic in license_short.lower() for lic in ['cc0', 'public domain', 'pd']):
                    continue
                
                image_url = imageinfo.get('url', '')
                if not image_url:
                    continue
                
                width = imageinfo.get('width', 0)
                height = imageinfo.get('height', 0)
                if max(width, height) < 400:
                    continue
                
                file_title = title.replace('File:', '').replace(' ', '_')
                artwork_id = f"wiki-{hashlib.md5(file_title.encode()).hexdigest()[:12]}"
                if artwork_id in existing_ids:
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
                
                description = extmetadata.get('ImageDescription', {}).get('value', '')
                date_str = extmetadata.get('DateTimeOriginal', {}).get('value', '')
                author = extmetadata.get('Artist', {}).get('value', '')
                
                dynasty_zh, dynasty_en = parse_dynasty(description + ' ' + date_str)
                
                material_zh, material_en = '瓷器', 'Porcelain'
                title_lower = title.lower()
                if 'stoneware' in title_lower:
                    material_zh, material_en = '陶器', 'Stoneware'
                elif 'iron' in title_lower or 'tetsubin' in title_lower:
                    material_zh, material_en = '铁器', 'Iron'
                elif 'bamboo' in title_lower:
                    material_zh, material_en = '竹器', 'Bamboo'
                elif 'lacquer' in title_lower:
                    material_zh, material_en = '漆器', 'Lacquer'
                
                obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                if 'bowl' in title_lower or 'chawan' in title_lower:
                    obj_type_zh, obj_type_en = '茶碗', 'Tea Bowl'
                elif 'teapot' in title_lower or 'tetsubin' in title_lower:
                    obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                elif 'caddy' in title_lower or 'natsume' in title_lower:
                    obj_type_zh, obj_type_en = '茶入', 'Tea Caddy'
                elif 'scoop' in title_lower or 'chashaku' in title_lower:
                    obj_type_zh, obj_type_en = '茶杓', 'Tea Scoop'
                elif 'whisk' in title_lower or 'chasen' in title_lower:
                    obj_type_zh, obj_type_en = '茶筅', 'Tea Whisk'
                elif 'tray' in title_lower:
                    obj_type_zh, obj_type_en = '茶盘', 'Tea Tray'
                elif 'incense' in title_lower or 'kogo' in title_lower:
                    obj_type_zh, obj_type_en = '香合', 'Incense Container'
                elif 'water' in title_lower or 'mizusashi' in title_lower:
                    obj_type_zh, obj_type_en = '水指', 'Water Jar'
                
                display_title = file_title.replace('_', ' ').rsplit('.', 1)[0]
                
                artwork = {
                    "id": artwork_id,
                    "titleChinese": f"{dynasty_zh}{material_zh}{obj_type_zh}",
                    "titleEnglish": display_title,
                    "dynasty": dynasty_zh,
                    "dynastyEnglish": dynasty_en,
                    "period": date_str,
                    "date": date_str,
                    "material": material_zh,
                    "materialEnglish": material_en,
                    "objectType": obj_type_zh,
                    "objectTypeEnglish": obj_type_en,
                    "dimensions": f"{width}x{height}px",
                    "description": description[:500] if description else display_title,
                    "sourceMuseum": "维基共享资源",
                    "sourceMuseumEnglish": "Wikimedia Commons",
                    "accessionNumber": "",
                    "sourceUrl": f"https://commons.wikimedia.org/wiki/{title.replace(' ', '_')}",
                    "imageUrl": f"/artworks/{artwork_id}.jpg",
                    "imageAlt": f"{display_title} - Wikimedia Commons",
                    "license": license_short,
                    "creditLine": author[:200] if author else "Wikimedia Commons",
                    "crawlBatchId": BATCH_ID,
                }
                
                added.append((artwork, compressed))
                existing_ids.add(artwork_id)
                new_hashes.add(img_hash)
                query_added += 1
                print(f"    ✓ Added")
                time.sleep(0.3)
            
            log_crawl("wikimedia", category, len(pages), query_added)
                
        except Exception as e:
            print(f"  Error: {e}")
            log_crawl("wikimedia", category, 0, 0, str(e))
            continue
    
    return added, new_hashes


def main():
    print("=" * 60)
    print("Round 13 Teaware Expansion")
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
    print(f"Target: 80-150 net-new items")
    
    all_new = []
    all_new_hashes = set()
    
    met_added, met_hashes = query_met_museum(existing_ids, existing_hashes | all_new_hashes, 70)
    all_new.extend(met_added)
    all_new_hashes.update(met_hashes)
    print(f"\nMet added: {len(met_added)}")
    
    cma_added, cma_hashes = query_cleveland_museum(existing_ids, existing_hashes | all_new_hashes, 40)
    all_new.extend(cma_added)
    all_new_hashes.update(cma_hashes)
    print(f"\nCleveland added: {len(cma_added)}")
    
    si_added, si_hashes = query_smithsonian(existing_ids, existing_hashes | all_new_hashes, 30)
    all_new.extend(si_added)
    all_new_hashes.update(si_hashes)
    print(f"\nSmithsonian added: {len(si_added)}")
    
    if len(all_new) < 100:
        wiki_added, wiki_hashes = query_wikimedia_commons(existing_ids, existing_hashes | all_new_hashes, 30)
        all_new.extend(wiki_added)
        all_new_hashes.update(wiki_hashes)
        print(f"\nWikimedia added: {len(wiki_added)}")
    
    print("\n" + "=" * 60)
    print("SAVING RESULTS")
    print("=" * 60)
    
    if len(all_new) < 15:
        print(f"Only {len(all_new)} items found - below minimum threshold of 15.")
        print("No meaningful batch to add.")
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
    si_count = sum(1 for a, _ in all_new if a['id'].startswith('si-'))
    wiki_count = sum(1 for a, _ in all_new if a['id'].startswith('wiki-'))
    
    final_count = len(artworks)
    print(f"\n{'=' * 60}")
    print(f"RESULTS")
    print(f"{'=' * 60}")
    print(f"Baseline: {current_count}")
    print(f"Net-new: {len(all_new)}")
    print(f"  - Met Museum: {met_count}")
    print(f"  - Cleveland: {cma_count}")
    print(f"  - Smithsonian: {si_count}")
    print(f"  - Wikimedia: {wiki_count}")
    print(f"Final total: {final_count}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
