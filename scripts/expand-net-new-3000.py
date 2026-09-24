#!/usr/bin/env python3
"""
Net-New Expansion Script - Add only items not already in main
Target: Reach 3000+ from current 2888
Sources: Met Museum (CC0/PD) and Cleveland Museum (CC0) only
"""

import json
import os
import sys
import time
import hashlib
import requests
import re
from datetime import datetime, timezone
from pathlib import Path
from io import BytesIO
from PIL import Image
from collections import Counter
import random

MAX_LONG_EDGE = 1400
JPEG_QUALITY = 80
MIN_IMAGE_SIZE = 5000
TARGET_TOTAL = 3000
BATCH_ID = f"net-new-expansion-{int(time.time() * 1000)}"

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
    date_lower = date_str.lower()
    for key, (zh, en) in PERIOD_MAP.items():
        if key.lower() in date_lower:
            return zh, en
    return '近现代', 'Modern'


def query_met_museum(existing_ids, existing_hashes, target):
    print("\n=== Querying Met Museum API ===")
    
    queries = [
        "tea bowl China", "tea cup China", "wine cup China porcelain",
        "Yixing teapot", "celadon bowl Song", "Jun ware bowl",
        "Ding ware bowl", "famille rose bowl", "blue white bowl Ming",
        "stoneware bowl Korea", "porcelain cup Qing", "tea caddy China",
        "ewer China", "stem cup China", "covered bowl China",
        "Longquan celadon", "Dehua porcelain cup", "Kangxi porcelain",
        "Qianlong bowl", "export porcelain China",
    ]
    
    base_url = "https://collectionapi.metmuseum.org/public/collection/v1"
    added = []
    new_hashes = set()
    
    for query in queries:
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
                continue
            
            data = search_resp.json()
            object_ids = data.get('objectIDs', []) or []
            print(f"  Found {len(object_ids)} objects")
            
            random.shuffle(object_ids)
            
            for obj_id in object_ids[:100]:
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
                    
                    relevant_terms = ['tea', 'bowl', 'cup', 'ewer', 'caddy', 'pot', 
                                     'china', 'korea', 'japan', 'asian', 'porcelain',
                                     'ceramic', 'stoneware', 'celadon', 'yixing']
                    combined_text = f"{title} {culture} {obj.get('objectName', '')} {obj.get('medium', '')}".lower()
                    if not any(term in combined_text for term in relevant_terms):
                        continue
                    
                    print(f"\n[Met {len(added)+1}/{target}] {title[:60]}")
                    
                    raw_image = download_image(image_url)
                    if not raw_image:
                        print("  ✗ Download failed")
                        continue
                    
                    if not is_valid_image(raw_image):
                        print("  ✗ Invalid image")
                        continue
                    
                    img_hash = hashlib.sha256(raw_image).hexdigest()
                    if img_hash in existing_hashes or img_hash in new_hashes:
                        print("  ✗ Duplicate image")
                        continue
                    
                    compressed = compress_image(raw_image)
                    if not compressed:
                        print("  ✗ Compression failed")
                        continue
                    
                    obj_date = obj.get('objectDate', '')
                    dynasty_zh, dynasty_en = parse_dynasty(obj_date)
                    
                    medium = obj.get('medium', '').lower()
                    material_zh, material_en = '瓷器', 'Porcelain'
                    if 'stoneware' in medium:
                        material_zh, material_en = '陶器', 'Stoneware'
                    elif 'celadon' in medium:
                        material_zh, material_en = '青瓷', 'Celadon'
                    elif 'blue' in medium and 'white' in medium:
                        material_zh, material_en = '青花瓷', 'Blue and White'
                    elif 'famille rose' in medium:
                        material_zh, material_en = '粉彩', 'Famille Rose'
                    
                    obj_name = obj.get('objectName', '').lower()
                    obj_type_zh, obj_type_en = '茶器', 'Tea Ware'
                    if 'bowl' in obj_name:
                        obj_type_zh, obj_type_en = '碗', 'Bowl'
                    elif 'cup' in obj_name:
                        obj_type_zh, obj_type_en = '杯', 'Cup'
                    elif 'teapot' in obj_name or 'pot' in obj_name:
                        obj_type_zh, obj_type_en = '茶壶', 'Teapot'
                    elif 'ewer' in obj_name:
                        obj_type_zh, obj_type_en = '执壶', 'Ewer'
                    elif 'caddy' in obj_name:
                        obj_type_zh, obj_type_en = '茶罐', 'Tea Caddy'
                    
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
                    print(f"  ✓ Added")
                    time.sleep(0.3)
                    
                except Exception as e:
                    continue
                    
        except Exception as e:
            print(f"  Error: {e}")
            continue
    
    return added, new_hashes


def query_cleveland_museum(existing_ids, existing_hashes, target):
    print("\n=== Querying Cleveland Museum of Art API ===")
    
    queries = [
        "tea bowl Chinese", "teapot Chinese", "cup Chinese porcelain",
        "bowl Chinese Song", "bowl Chinese Ming", "ewer Chinese",
        "celadon Chinese", "stoneware Chinese", "Yixing",
        "bowl Chinese Qing", "porcelain Chinese",
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
                continue
            
            data = resp.json()
            objects = data.get('data', [])
            print(f"  Found {len(objects)} objects")
            
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
                
                print(f"\n[Cleveland {len(added)+1}/{target}] {title[:60]}")
                
                raw_image = download_image(image_url)
                if not raw_image:
                    print("  ✗ Download failed")
                    continue
                
                if not is_valid_image(raw_image):
                    print("  ✗ Invalid image")
                    continue
                
                img_hash = hashlib.sha256(raw_image).hexdigest()
                if img_hash in existing_hashes or img_hash in new_hashes:
                    print("  ✗ Duplicate image")
                    continue
                
                compressed = compress_image(raw_image)
                if not compressed:
                    print("  ✗ Compression failed")
                    continue
                
                creation_date = obj.get('creation_date', '')
                dynasty_zh, dynasty_en = parse_dynasty(creation_date)
                
                technique = (obj.get('technique', '') or '').lower()
                material_zh, material_en = '瓷器', 'Porcelain'
                if 'stoneware' in technique:
                    material_zh, material_en = '陶器', 'Stoneware'
                elif 'celadon' in technique:
                    material_zh, material_en = '青瓷', 'Celadon'
                
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
                print(f"  ✓ Added")
                time.sleep(0.2)
                
        except Exception as e:
            print(f"  Error: {e}")
            continue
    
    return added, new_hashes


def main():
    print("=" * 60)
    print("Net-New Teaware Expansion (Met + CMA only)")
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
    needed = max(0, TARGET_TOTAL - current_count + 20)
    
    print(f"\nCurrent artworks: {current_count}")
    print(f"Target: {TARGET_TOTAL}+")
    print(f"Need to add: ~{needed}")
    
    if current_count >= TARGET_TOTAL:
        print(f"\n✓ Already at {current_count} artworks!")
        return 0
    
    all_new = []
    all_new_hashes = set()
    
    met_target = min(80, needed)
    met_added, met_hashes = query_met_museum(existing_ids, existing_hashes | all_new_hashes, met_target)
    all_new.extend(met_added)
    all_new_hashes.update(met_hashes)
    print(f"\nMet added: {len(met_added)}")
    
    remaining = needed - len(met_added)
    if remaining > 0:
        cma_target = min(60, remaining)
        cma_added, cma_hashes = query_cleveland_museum(existing_ids, existing_hashes | all_new_hashes, cma_target)
        all_new.extend(cma_added)
        all_new_hashes.update(cma_hashes)
        print(f"\nCleveland added: {len(cma_added)}")
    
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
        '元': 5, '明': 6, '清': 7,
        '高丽': 8, '朝鲜': 9,
        '镰仓': 10, '室町': 11, '桃山': 12,
        '江户': 13, '明治': 14, '大正': 15, '昭和': 16,
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
    
    log_entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "met+cma",
        "query": "net-new-expansion-to-3000",
        "totalResults": len(all_new),
        "idsAccepted": len(all_new),
        "idsRejected": 0,
        "crawlBatchId": BATCH_ID,
        "breakdown": {"met": met_count, "cma": cma_count},
        "note": "Net-new expansion after rebasing on main (2888 items)",
    }
    with open(CRAWL_LOG_PATH, 'a') as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    
    final_count = len(artworks)
    print(f"\n✓ Total artworks now: {final_count}")
    print(f"✓ New artworks added: {len(all_new)}")
    print(f"  - Met Museum: {met_count}")
    print(f"  - Cleveland: {cma_count}")
    
    return 0 if final_count >= TARGET_TOTAL else 1


if __name__ == "__main__":
    sys.exit(main())
