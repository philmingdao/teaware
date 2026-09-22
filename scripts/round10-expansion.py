#!/usr/bin/env python3
"""
Round 10 Key-Free Expansion Script
Mine Met, CMA, and Wikimedia Commons for new Chinese/Asian teaware
"""

import json
import os
import sys
import time
import hashlib
import requests
from datetime import datetime
from pathlib import Path
from PIL import Image
from io import BytesIO

# Configuration
MAX_LONG_EDGE = 1500
JPEG_QUALITY = 80
MIN_IMAGE_SIZE = 5000  # 5KB minimum
BATCH_ID = f"round10-expansion-{int(time.time()*1000)}"
ARTWORKS_PATH = Path("src/data/artworks.json")
PUBLIC_ARTWORKS_PATH = Path("public/artworks.json")
IMAGES_DIR = Path("public/artworks")
CRAWL_LOG_PATH = Path("research/crawl-log.jsonl")
HASH_FILE = Path("research/image-hashes.json")

# Load existing data
def load_existing_ids():
    """Load existing artwork IDs to avoid duplicates"""
    with open(ARTWORKS_PATH, 'r') as f:
        data = json.load(f)
    return {a['id'] for a in data}

def load_image_hashes():
    """Load existing image SHA256 hashes"""
    if HASH_FILE.exists():
        with open(HASH_FILE, 'r') as f:
            return set(json.load(f))
    return set()

def save_image_hashes(hashes):
    """Save image hashes"""
    with open(HASH_FILE, 'w') as f:
        json.dump(sorted(list(hashes)), f, indent=2)

def load_completed_queries():
    """Load completed source:query pairs from crawl log"""
    completed = set()
    if CRAWL_LOG_PATH.exists():
        with open(CRAWL_LOG_PATH, 'r') as f:
            for line in f:
                try:
                    e = json.loads(line.strip())
                    key = f"{e.get('source', '')}:{e.get('query', '')}"
                    completed.add(key)
                except:
                    pass
    return completed

def log_crawl(source, query, total_results, accepted, duration_ms):
    """Append to crawl log"""
    entry = {
        "source": source,
        "query": query,
        "totalResults": total_results,
        "idsAccepted": accepted,
        "crawlBatchId": BATCH_ID,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "durationMs": duration_ms
    }
    with open(CRAWL_LOG_PATH, 'a') as f:
        f.write(json.dumps(entry) + "\n")

def compress_image(image_data, max_edge=MAX_LONG_EDGE, quality=JPEG_QUALITY):
    """Compress and resize image, strip EXIF"""
    try:
        img = Image.open(BytesIO(image_data))
        
        # Convert to RGB if needed (handles PNG with transparency, etc.)
        if img.mode in ('RGBA', 'P', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            if img.mode in ('RGBA', 'LA'):
                background.paste(img, mask=img.split()[-1])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if needed
        w, h = img.size
        if max(w, h) > max_edge:
            ratio = max_edge / max(w, h)
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Save as JPEG (strips EXIF by not copying exif data)
        output = BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"  Image compression error: {e}")
        return None

def download_image(url, timeout=30):
    """Download image with retries"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; TeawareGalleryBot/1.0; +https://philmingdao.github.io/teaware/)'
    }
    for attempt in range(3):
        try:
            resp = requests.get(url, headers=headers, timeout=timeout)
            if resp.status_code == 200:
                return resp.content
            print(f"  HTTP {resp.status_code} for {url[:80]}...")
        except Exception as e:
            print(f"  Download error (attempt {attempt+1}): {e}")
            time.sleep(2 ** attempt)
    return None

# ============ MET MUSEUM ============

def search_met(query):
    """Search Met Museum API"""
    url = f"https://collectionapi.metmuseum.org/public/collection/v1/search?q={requests.utils.quote(query)}"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return data.get('objectIDs', []) or []
    except Exception as e:
        print(f"  Met search error: {e}")
    return []

def get_met_object(object_id):
    """Get Met Museum object details"""
    url = f"https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except:
        pass
    return None

def is_tea_related(obj):
    """Check if object is tea-related"""
    title = (obj.get('title') or '').lower()
    obj_name = (obj.get('objectName') or '').lower()
    culture = (obj.get('culture') or '').lower()
    
    tea_keywords = ['tea', 'teapot', 'teabowl', 'gaiwan', 'chawan', 'tenmoku', 
                   'yixing', 'matcha', 'kettle', 'tea ceremony', 'chadao',
                   'caddy', 'canister', 'infuser']
    vessel_keywords = ['bowl', 'cup', 'pot', 'jar', 'ewer', 'jug', 'saucer',
                      'vessel', 'beaker', 'goblet', 'stem cup', 'wine']
    
    # Check if explicitly tea-related
    text = f"{title} {obj_name}".lower()
    if any(kw in text for kw in tea_keywords):
        return True
    
    # Check if it's a vessel from relevant cultures
    if any(kw in text for kw in vessel_keywords):
        if any(c in culture for c in ['china', 'chinese', 'japan', 'korea', 'asian', 'vietnam']):
            return True
        if any(c in (obj.get('country') or '').lower() for c in ['china', 'japan', 'korea', 'vietnam']):
            return True
    
    return False

def parse_dynasty(obj):
    """Parse dynasty from Met object"""
    period = obj.get('objectDate', '') or ''
    culture = obj.get('culture', '') or ''
    
    dynasty_map = {
        'tang': ('唐', 'Tang Dynasty'),
        'song': ('宋', 'Song Dynasty'),
        'northern song': ('北宋', 'Northern Song'),
        'southern song': ('南宋', 'Southern Song'),
        'yuan': ('元', 'Yuan Dynasty'),
        'ming': ('明', 'Ming Dynasty'),
        'qing': ('清', 'Qing Dynasty'),
        'kangxi': ('清康熙', 'Qing Kangxi'),
        'yongzheng': ('清雍正', 'Qing Yongzheng'),
        'qianlong': ('清乾隆', 'Qing Qianlong'),
        'jiajing': ('明嘉靖', 'Ming Jiajing'),
        'wanli': ('明万历', 'Ming Wanli'),
        'edo': ('江户', 'Edo Period'),
        'momoyama': ('桃山', 'Momoyama Period'),
        'meiji': ('明治', 'Meiji Period'),
        'joseon': ('朝鲜', 'Joseon Dynasty'),
        'goryeo': ('高丽', 'Goryeo Dynasty'),
    }
    
    text = f"{period} {culture}".lower()
    for key, (zh, en) in dynasty_map.items():
        if key in text:
            return zh, en
    
    return '', 'Unknown Period'

def parse_material(obj):
    """Parse material from Met object"""
    medium = (obj.get('medium') or '').lower()
    obj_name = (obj.get('objectName') or '').lower()
    
    material_map = {
        'porcelain': ('瓷器', 'Porcelain'),
        'stoneware': ('炻器', 'Stoneware'),
        'earthenware': ('陶器', 'Earthenware'),
        'ceramic': ('陶瓷', 'Ceramics'),
        'yixing': ('紫砂', 'Yixing Clay'),
        'purple clay': ('紫砂', 'Yixing Clay'),
        'zisha': ('紫砂', 'Yixing Clay'),
        'celadon': ('青瓷', 'Celadon'),
        'jade': ('玉器', 'Jade'),
        'silver': ('银器', 'Silver'),
        'bronze': ('青铜', 'Bronze'),
        'iron': ('铁器', 'Iron'),
        'lacquer': ('漆器', 'Lacquerware'),
        'cloisonne': ('景泰蓝', 'Cloisonné'),
        'enamel': ('珐琅', 'Enamel'),
        'glass': ('玻璃', 'Glass'),
    }
    
    text = f"{medium} {obj_name}"
    for key, (zh, en) in material_map.items():
        if key in text:
            return zh, en
    
    if 'porcelain' in text or 'china' in text.lower():
        return '瓷器', 'Porcelain'
    
    return '陶瓷', 'Ceramics'

def parse_object_type(obj):
    """Parse object type"""
    obj_name = (obj.get('objectName') or '').lower()
    title = (obj.get('title') or '').lower()
    text = f"{obj_name} {title}"
    
    type_map = {
        'teapot': ('茶壶', 'Teapot'),
        'tea pot': ('茶壶', 'Teapot'),
        'kettle': ('水壶', 'Kettle'),
        'gaiwan': ('盖碗', 'Gaiwan'),
        'covered bowl': ('盖碗', 'Gaiwan'),
        'covered cup': ('盖杯', 'Covered Cup'),
        'tea bowl': ('茶碗', 'Tea Bowl'),
        'teabowl': ('茶碗', 'Tea Bowl'),
        'chawan': ('茶碗', 'Chawan'),
        'tea cup': ('茶杯', 'Tea Cup'),
        'cup': ('杯盏', 'Tea Bowl/Cup'),
        'bowl': ('碗', 'Bowl'),
        'saucer': ('茶托', 'Saucer'),
        'tea caddy': ('茶叶罐', 'Tea Caddy'),
        'caddy': ('茶叶罐', 'Tea Caddy'),
        'tea jar': ('茶叶罐', 'Tea Caddy'),
        'canister': ('茶叶罐', 'Tea Caddy'),
        'ewer': ('执壶', 'Ewer'),
        'wine pot': ('酒壶', 'Wine Pot'),
        'jar': ('罐', 'Jar'),
        'jug': ('壶', 'Jug'),
        'stand': ('托', 'Stand'),
        'tray': ('托盘', 'Tray'),
    }
    
    for key, (zh, en) in type_map.items():
        if key in text:
            return zh, en
    
    return '杯盏', 'Tea Bowl/Cup'

def process_met_object(obj, existing_ids, image_hashes):
    """Process a Met Museum object and return artwork dict if valid"""
    object_id = obj.get('objectID')
    artwork_id = f"met-{object_id}"
    
    # Skip if already exists
    if artwork_id in existing_ids:
        return None, "duplicate_id"
    
    # Check public domain
    if not obj.get('isPublicDomain'):
        return None, "not_public_domain"
    
    # Check has image
    image_url = obj.get('primaryImage')
    if not image_url:
        return None, "no_image"
    
    # Check tea-related
    if not is_tea_related(obj):
        return None, "not_tea_related"
    
    # Download and process image
    print(f"  Downloading {artwork_id}...")
    raw_image = download_image(image_url)
    if not raw_image:
        return None, "download_failed"
    
    # Check hash for duplicate
    img_hash = hashlib.sha256(raw_image).hexdigest()
    if img_hash in image_hashes:
        return None, "duplicate_image"
    
    # Compress image
    compressed = compress_image(raw_image)
    if not compressed or len(compressed) < MIN_IMAGE_SIZE:
        return None, "image_too_small"
    
    # Parse metadata
    dynasty_zh, dynasty_en = parse_dynasty(obj)
    material_zh, material_en = parse_material(obj)
    obj_type_zh, obj_type_en = parse_object_type(obj)
    
    title_en = obj.get('title') or obj.get('objectName') or 'Untitled'
    
    # Generate Chinese title
    title_zh = f"{dynasty_zh}{material_zh}{obj_type_zh}" if dynasty_zh else f"{material_zh}{obj_type_zh}"
    
    artwork = {
        "id": artwork_id,
        "titleChinese": title_zh,
        "titleEnglish": title_en,
        "dynasty": dynasty_zh,
        "dynastyEnglish": dynasty_en,
        "period": obj.get('objectDate', ''),
        "date": obj.get('objectDate', ''),
        "material": material_zh,
        "materialEnglish": material_en,
        "objectType": obj_type_zh,
        "objectTypeEnglish": obj_type_en,
        "kiln": "",
        "kilnEnglish": "",
        "dimensions": obj.get('dimensions', ''),
        "description": f"此件{obj_type_zh}为{dynasty_en if dynasty_en != 'Unknown Period' else ''}时期之作品。器身采用{material_zh}工艺制成。尺寸：{obj.get('dimensions', '未知')}。现藏于大都会艺术博物馆。",
        "sourceMuseum": "大都会艺术博物馆",
        "sourceMuseumEnglish": "The Metropolitan Museum of Art",
        "accessionNumber": obj.get('accessionNumber', ''),
        "sourceUrl": f"https://www.metmuseum.org/art/collection/search/{object_id}",
        "imageUrl": f"/artworks/{artwork_id}.jpg",
        "imageAlt": f"{title_en} - {obj.get('objectDate', '')}",
        "license": "CC0 / Public Domain",
        "creditLine": obj.get('creditLine', ''),
        "crawlBatchId": BATCH_ID
    }
    
    return (artwork, compressed, img_hash), "accepted"

# ============ CMA MUSEUM ============

def search_cma(query, limit=100):
    """Search Cleveland Museum of Art API"""
    url = f"https://openaccess-api.clevelandart.org/api/artworks/?q={requests.utils.quote(query)}&limit={limit}&has_image=1"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return data.get('data', [])
    except Exception as e:
        print(f"  CMA search error: {e}")
    return []

def process_cma_object(obj, existing_ids, image_hashes):
    """Process a CMA object"""
    object_id = obj.get('id')
    artwork_id = f"cma-{object_id}"
    
    if artwork_id in existing_ids:
        return None, "duplicate_id"
    
    # Check CC0 license
    if obj.get('share_license_status') != 'CC0':
        return None, "not_cc0"
    
    # Get image URL
    images = obj.get('images', {})
    if isinstance(images, dict):
        image_url = images.get('web', {}).get('url')
    else:
        image_url = None
    
    if not image_url:
        return None, "no_image"
    
    # Check culture (prefer Asian)
    culture = obj.get('culture', '')
    if isinstance(culture, list):
        culture = ' '.join(culture)
    culture = culture.lower() if culture else ''
    
    department = (obj.get('department') or '').lower()
    
    asian_check = any(c in culture for c in ['china', 'japan', 'korea', 'vietnam', 'asian']) or \
                  any(c in department for c in ['asian', 'chinese', 'japanese', 'korean'])
    
    if not asian_check:
        return None, "not_asian"
    
    # Download image
    print(f"  Downloading {artwork_id}...")
    raw_image = download_image(image_url)
    if not raw_image:
        return None, "download_failed"
    
    img_hash = hashlib.sha256(raw_image).hexdigest()
    if img_hash in image_hashes:
        return None, "duplicate_image"
    
    compressed = compress_image(raw_image)
    if not compressed or len(compressed) < MIN_IMAGE_SIZE:
        return None, "image_too_small"
    
    # Parse metadata
    creation_date = obj.get('creation_date', '') or ''
    dynasty_zh, dynasty_en = '', 'Unknown Period'
    
    date_lower = creation_date.lower()
    if 'song' in date_lower:
        dynasty_zh, dynasty_en = '宋', 'Song Dynasty'
    elif 'ming' in date_lower:
        dynasty_zh, dynasty_en = '明', 'Ming Dynasty'
    elif 'qing' in date_lower:
        dynasty_zh, dynasty_en = '清', 'Qing Dynasty'
    elif 'yuan' in date_lower:
        dynasty_zh, dynasty_en = '元', 'Yuan Dynasty'
    elif 'tang' in date_lower:
        dynasty_zh, dynasty_en = '唐', 'Tang Dynasty'
    elif 'edo' in date_lower:
        dynasty_zh, dynasty_en = '江户', 'Edo Period'
    elif 'joseon' in date_lower:
        dynasty_zh, dynasty_en = '朝鲜', 'Joseon Dynasty'
    elif 'goryeo' in date_lower or 'koryo' in date_lower:
        dynasty_zh, dynasty_en = '高丽', 'Goryeo Dynasty'
    
    # Material
    technique = (obj.get('technique') or '').lower()
    material_zh, material_en = '陶瓷', 'Ceramics'
    if 'porcelain' in technique:
        material_zh, material_en = '瓷器', 'Porcelain'
    elif 'stoneware' in technique:
        material_zh, material_en = '炻器', 'Stoneware'
    elif 'celadon' in technique:
        material_zh, material_en = '青瓷', 'Celadon'
    
    # Object type
    obj_type = (obj.get('type') or '').lower()
    title = (obj.get('title') or '').lower()
    type_zh, type_en = '杯盏', 'Tea Bowl/Cup'
    
    if 'teapot' in title or 'teapot' in obj_type:
        type_zh, type_en = '茶壶', 'Teapot'
    elif 'bowl' in title or 'bowl' in obj_type:
        type_zh, type_en = '碗', 'Bowl'
    elif 'cup' in title:
        type_zh, type_en = '杯', 'Cup'
    elif 'ewer' in title:
        type_zh, type_en = '执壶', 'Ewer'
    elif 'jar' in title:
        type_zh, type_en = '罐', 'Jar'
    
    title_en = obj.get('title') or 'Untitled'
    title_zh = f"{dynasty_zh}{material_zh}{type_zh}" if dynasty_zh else f"{material_zh}{type_zh}"
    
    source_name = "克利夫兰艺术博物馆"
    source_name_en = "Cleveland Museum of Art"
    
    artwork = {
        "id": artwork_id,
        "titleChinese": title_zh,
        "titleEnglish": title_en,
        "dynasty": dynasty_zh,
        "dynastyEnglish": dynasty_en,
        "period": creation_date,
        "date": creation_date,
        "material": material_zh,
        "materialEnglish": material_en,
        "objectType": type_zh,
        "objectTypeEnglish": type_en,
        "kiln": "",
        "kilnEnglish": "",
        "dimensions": obj.get('dimensions', ''),
        "description": f"此件{type_zh}为{dynasty_en if dynasty_en != 'Unknown Period' else ''}时期之作品。现藏于{source_name}。",
        "sourceMuseum": source_name,
        "sourceMuseumEnglish": source_name_en,
        "accessionNumber": obj.get('accession_number', ''),
        "sourceUrl": obj.get('url', f"https://www.clevelandart.org/art/{object_id}"),
        "imageUrl": f"/artworks/{artwork_id}.jpg",
        "imageAlt": f"{title_en} - {creation_date}",
        "license": "CC0 / Public Domain",
        "creditLine": obj.get('creditline', ''),
        "crawlBatchId": BATCH_ID
    }
    
    return (artwork, compressed, img_hash), "accepted"

# ============ WIKIMEDIA COMMONS ============

def search_wikimedia_category(category, limit=50):
    """Search Wikimedia Commons category for CC0/PD images"""
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        'action': 'query',
        'list': 'categorymembers',
        'cmtitle': category,
        'cmtype': 'file',
        'cmlimit': limit,
        'format': 'json'
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            members = data.get('query', {}).get('categorymembers', [])
            return [m['title'] for m in members if m['title'].startswith('File:')]
    except Exception as e:
        print(f"  Wikimedia category error: {e}")
    return []

def get_wikimedia_file_info(filename):
    """Get file info including license and image URL"""
    url = "https://commons.wikimedia.org/w/api.php"
    params = {
        'action': 'query',
        'titles': filename,
        'prop': 'imageinfo',
        'iiprop': 'url|extmetadata|size',
        'iiurlwidth': 1600,
        'format': 'json'
    }
    
    try:
        resp = requests.get(url, params=params, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            pages = data.get('query', {}).get('pages', {})
            for page_id, page in pages.items():
                if page_id != '-1':
                    return page.get('imageinfo', [{}])[0]
    except Exception as e:
        print(f"  Wikimedia file info error: {e}")
    return None

def is_public_domain_license(info):
    """Check if the file has a CC0 or public domain license"""
    ext = info.get('extmetadata', {})
    license_short = ext.get('LicenseShortName', {}).get('value', '').lower()
    license_url = ext.get('LicenseUrl', {}).get('value', '').lower()
    
    pd_keywords = ['cc0', 'public domain', 'pd-', 'pd_', 'cc-zero', 'cc zero']
    
    if any(kw in license_short for kw in pd_keywords):
        return True
    if any(kw in license_url for kw in pd_keywords):
        return True
    
    return False

def process_wikimedia_file(filename, existing_ids, image_hashes):
    """Process a Wikimedia Commons file"""
    # Create ID from filename
    clean_name = filename.replace('File:', '').replace(' ', '_')
    artwork_id = f"commons-{hashlib.md5(clean_name.encode()).hexdigest()[:12]}"
    
    if artwork_id in existing_ids:
        return None, "duplicate_id"
    
    info = get_wikimedia_file_info(filename)
    if not info:
        return None, "no_info"
    
    # Check license
    if not is_public_domain_license(info):
        return None, "not_pd"
    
    # Get image URL (prefer thumbnail at 1600px)
    image_url = info.get('thumburl') or info.get('url')
    if not image_url:
        return None, "no_image"
    
    # Download
    print(f"  Downloading {artwork_id} ({clean_name[:40]}...)...")
    raw_image = download_image(image_url)
    if not raw_image:
        return None, "download_failed"
    
    img_hash = hashlib.sha256(raw_image).hexdigest()
    if img_hash in image_hashes:
        return None, "duplicate_image"
    
    compressed = compress_image(raw_image)
    if not compressed or len(compressed) < MIN_IMAGE_SIZE:
        return None, "image_too_small"
    
    # Extract metadata
    ext = info.get('extmetadata', {})
    description = ext.get('ImageDescription', {}).get('value', '')
    artist = ext.get('Artist', {}).get('value', '')
    date_original = ext.get('DateTimeOriginal', {}).get('value', '')
    license_short = ext.get('LicenseShortName', {}).get('value', 'Public Domain')
    
    # Try to extract title from filename
    title_en = clean_name.replace('.jpg', '').replace('.png', '').replace('.jpeg', '')
    title_en = title_en.replace('_', ' ')[:100]
    
    artwork = {
        "id": artwork_id,
        "titleChinese": "茶器",
        "titleEnglish": title_en,
        "dynasty": "",
        "dynastyEnglish": "Unknown Period",
        "period": date_original,
        "date": date_original,
        "material": "陶瓷",
        "materialEnglish": "Ceramics",
        "objectType": "茶器",
        "objectTypeEnglish": "Teaware",
        "kiln": "",
        "kilnEnglish": "",
        "dimensions": "",
        "description": description[:500] if description else f"来自维基共享资源的茶器图片。",
        "sourceMuseum": "维基共享资源",
        "sourceMuseumEnglish": "Wikimedia Commons",
        "accessionNumber": "",
        "sourceUrl": f"https://commons.wikimedia.org/wiki/{filename.replace(' ', '_')}",
        "imageUrl": f"/artworks/{artwork_id}.jpg",
        "imageAlt": title_en,
        "license": license_short.upper() if 'cc0' in license_short.lower() else "Public Domain",
        "creditLine": artist[:200] if artist else "",
        "crawlBatchId": BATCH_ID
    }
    
    return (artwork, compressed, img_hash), "accepted"

# ============ MAIN ============

def main():
    print("=" * 60)
    print("Round 10 Key-Free Expansion")
    print(f"Batch ID: {BATCH_ID}")
    print("=" * 60)
    
    # Load existing data
    existing_ids = load_existing_ids()
    image_hashes = load_image_hashes()
    completed_queries = load_completed_queries()
    
    print(f"\nExisting artworks: {len(existing_ids)}")
    print(f"Existing image hashes: {len(image_hashes)}")
    print(f"Completed queries: {len(completed_queries)}")
    
    new_artworks = []
    new_images = []  # (artwork_id, compressed_data)
    
    # Fresh Met queries (not heavily mined)
    met_queries = [
        # Specific ware types
        "moonflask China porcelain",
        "monk's cap ewer China",
        "garlic head vase China",
        "meiping vase China",
        "ritual vessel China bronze",
        # Specific glazes
        "flambe glaze bowl",
        "robin's egg glaze",
        "tea dust glaze",
        "mirror black glaze",
        "clair de lune glaze",
        # Export wares
        "Chinese export cream jug",
        "Chinese export slop bowl",
        "Chinese Imari bowl",
        "armorial porcelain bowl",
        "European market teapot China",
        # Japanese tea
        "Nabeshima bowl",
        "Arita porcelain bowl",
        "Imari porcelain cup",
        "Hirado porcelain",
        "Kakiemon cup",
        # Korean
        "Buncheong tea bowl",
        "Korean white porcelain bowl",
        "Korean celadon ewer",
        # Chinese regional
        "Fujian tea cup",
        "Jingdezhen tea bowl",
        "Shiwan pottery",
        # By decoration
        "dragon pattern tea bowl",
        "lotus pattern bowl China",
        "peony design cup China",
        "bamboo design teapot",
        "landscape painting cup China",
    ]
    
    # CMA queries
    cma_queries = [
        "Japanese stoneware bowl",
        "Korean inlaid celadon",
        "Chinese blanc de chine",
        "Asian iron glaze",
        "celadon incised",
        "punch'ong ware",
        "mishima ware",
        "porcelain tea ware",
        "Asian lacquer",
        "bamboo tea",
    ]
    
    # Wikimedia categories
    wiki_categories = [
        "Category:Chinese_ceramics_in_the_Metropolitan_Museum_of_Art",
        "Category:Chinese_porcelain",
        "Category:Song_dynasty_ceramics",
        "Category:Ming_dynasty_ceramics",
        "Category:Qing_dynasty_ceramics",
        "Category:Japanese_tea_bowls",
        "Category:Korean_ceramics",
        "Category:Celadon",
        "Category:Blue_and_white_porcelain",
        "Category:Ewers",
    ]
    
    target_new = 20  # Target 20 new artworks minimum
    
    # Met Museum queries
    print("\n--- Met Museum ---")
    for query in met_queries:
        if len(new_artworks) >= target_new:
            break
            
        key = f"met:{query}"
        if key in completed_queries:
            print(f"Skipping completed: {query}")
            continue
        
        print(f"\nSearching Met: {query}")
        start_time = time.time()
        
        object_ids = search_met(query)
        print(f"  Found {len(object_ids)} results")
        
        accepted = 0
        for obj_id in object_ids[:30]:  # Limit per query
            if len(new_artworks) >= target_new:
                break
            
            obj = get_met_object(obj_id)
            if not obj:
                continue
            
            result, reason = process_met_object(obj, existing_ids, image_hashes)
            if result:
                artwork, img_data, img_hash = result
                new_artworks.append(artwork)
                new_images.append((artwork['id'], img_data))
                image_hashes.add(img_hash)
                existing_ids.add(artwork['id'])
                accepted += 1
                print(f"    ✓ {artwork['id']}: {artwork['titleEnglish'][:50]}")
            
            time.sleep(0.3)  # Rate limiting
        
        duration_ms = int((time.time() - start_time) * 1000)
        log_crawl("met", query, len(object_ids), accepted, duration_ms)
        completed_queries.add(key)
    
    # CMA queries
    print("\n--- Cleveland Museum ---")
    for query in cma_queries:
        if len(new_artworks) >= target_new:
            break
            
        key = f"cma:{query}"
        if key in completed_queries:
            print(f"Skipping completed: {query}")
            continue
        
        print(f"\nSearching CMA: {query}")
        start_time = time.time()
        
        objects = search_cma(query)
        print(f"  Found {len(objects)} results")
        
        accepted = 0
        for obj in objects[:20]:
            if len(new_artworks) >= target_new:
                break
            
            result, reason = process_cma_object(obj, existing_ids, image_hashes)
            if result:
                artwork, img_data, img_hash = result
                new_artworks.append(artwork)
                new_images.append((artwork['id'], img_data))
                image_hashes.add(img_hash)
                existing_ids.add(artwork['id'])
                accepted += 1
                print(f"    ✓ {artwork['id']}: {artwork['titleEnglish'][:50]}")
            
            time.sleep(0.2)
        
        duration_ms = int((time.time() - start_time) * 1000)
        log_crawl("cma", query, len(objects), accepted, duration_ms)
        completed_queries.add(key)
    
    # Wikimedia Commons
    print("\n--- Wikimedia Commons ---")
    for category in wiki_categories:
        if len(new_artworks) >= target_new:
            break
            
        key = f"wikimedia:{category}"
        if key in completed_queries:
            print(f"Skipping completed: {category}")
            continue
        
        print(f"\nSearching Commons: {category}")
        start_time = time.time()
        
        files = search_wikimedia_category(category)
        print(f"  Found {len(files)} files")
        
        accepted = 0
        for filename in files[:15]:
            if len(new_artworks) >= target_new:
                break
            
            result, reason = process_wikimedia_file(filename, existing_ids, image_hashes)
            if result:
                artwork, img_data, img_hash = result
                new_artworks.append(artwork)
                new_images.append((artwork['id'], img_data))
                image_hashes.add(img_hash)
                existing_ids.add(artwork['id'])
                accepted += 1
                print(f"    ✓ {artwork['id']}: {artwork['titleEnglish'][:50]}")
            
            time.sleep(0.5)
        
        duration_ms = int((time.time() - start_time) * 1000)
        log_crawl("wikimedia", category, len(files), accepted, duration_ms)
        completed_queries.add(key)
    
    # Save results
    print("\n" + "=" * 60)
    print(f"RESULTS: {len(new_artworks)} new artworks")
    print("=" * 60)
    
    if len(new_artworks) < 15:
        print(f"\n⚠️  Only {len(new_artworks)} new artworks found (below 15 threshold)")
        print("Updating crawl-log but not creating PR.")
        save_image_hashes(image_hashes)
        return len(new_artworks)
    
    # Save images
    print("\nSaving images...")
    for artwork_id, img_data in new_images:
        img_path = IMAGES_DIR / f"{artwork_id}.jpg"
        with open(img_path, 'wb') as f:
            f.write(img_data)
        print(f"  Saved {img_path}")
    
    # Update artworks.json
    print("\nUpdating artworks.json...")
    with open(ARTWORKS_PATH, 'r') as f:
        artworks = json.load(f)
    
    artworks.extend(new_artworks)
    
    with open(ARTWORKS_PATH, 'w') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    # Sync to public/artworks.json
    with open(PUBLIC_ARTWORKS_PATH, 'w') as f:
        json.dump(artworks, f, ensure_ascii=False, indent=2)
    
    # Save hashes
    save_image_hashes(image_hashes)
    
    print(f"\n✓ Total artworks now: {len(artworks)}")
    print(f"✓ New images saved: {len(new_images)}")
    
    return len(new_artworks)

if __name__ == "__main__":
    result = main()
    sys.exit(0 if result >= 15 else 1)
