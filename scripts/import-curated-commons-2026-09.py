"""Import a manually reviewed Commons tea-ware batch.

The page IDs below were checked against file-page metadata and a visual contact
sheet. Only CC0/public-domain files are eligible. Run with --cache-dir to reuse
already downloaded JPEGs; otherwise the script fetches 2000px thumbnails.
"""

import argparse
import hashlib
import html
import json
import re
import shutil
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARTWORKS = ROOT / "src/data/artworks.json"
OUTPUT = ROOT / "public/artworks"
LOG = ROOT / "research/crawl-log.jsonl"
BATCH = "commons-curated-2026-09-15"

# Every file was visually checked as a complete object. Bottom-only photos,
# uncertain jade bowls, and two-view collages were omitted from the shortlist.
JIAN = {
    132698839, 152159869, 153243044, 19194564, 19195344,
    27304239, 45868323, 71871845, 71871850, 76696085, 76696088,
    83184796, 83184804, 83208499, 83208562,
}
YIXING = {
    142088747, 36758587, 36889601, 36889623, 36889647, 36916660,
    36916687, 36916725, 71824936, 83211352, 83230462, 83525563,
    83525572, 83525605, 83525612, 83525622, 83525632, 83525644,
    83525661, 83525677, 179392025, 179392403,
}
GAIWAN = {144925797}
OTHER_BOWLS = {27303944, 27295172, 27336539, 27283578, 27317035, 30679450, 19201579, 19200939}
EXPORT_TEAPOTS = {108876626, 108876504}
SILVER_TEAPOTS = {64540503}
PAGE_IDS = sorted(JIAN | YIXING | GAIWAN | OTHER_BOWLS | EXPORT_TEAPOTS | SILVER_TEAPOTS)


def request(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TeawareGallery/1.0 (https://github.com/philmingdao/teaware)"},
    )
    with urllib.request.urlopen(req, timeout=90) as response:
        return response.read()


def clean(value: str) -> str:
    value = re.sub(r"<div[^>]*display\s*:\s*none[^>]*>.*?</div>", "", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip()


def source(title: str, artist: str, page_id: int) -> tuple[str, str]:
    text = f"{title} {artist}"
    if "Rijksmuseum" in text or re.search(r"AK-(?:NM|MAK|RBK)-", text):
        return "荷兰国立博物馆", "Rijksmuseum"
    if "Hallwylska" in text:
        return "哈留斯卡博物馆", "Hallwylska Museum"
    if "Portland Art Museum" in text:
        return "波特兰艺术博物馆", "Portland Art Museum"
    if "Freer Gallery of Art" in text:
        return "弗利尔美术馆", "Freer Gallery of Art"
    if "Victoria and Albert Museum" in text:
        return "维多利亚与阿尔伯特博物馆", "Victoria and Albert Museum"
    if "Los Angeles County Museum" in text or "LACMA" in text:
        return "洛杉矶县艺术博物馆", "Los Angeles County Museum of Art"
    if "Chazen Museum" in text:
        return "查森艺术博物馆", "Chazen Museum of Art"
    if "British Museum" in text:
        return "大英博物馆", "British Museum"
    if page_id in {179392025, 179392403}:
        return "雷恩美术馆", "Musée des Beaux-Arts de Rennes"
    if page_id == 64540503:
        return "库珀·休伊特史密森设计博物馆", "Cooper Hewitt, Smithsonian Design Museum"
    if "Musée Saint Pierre" in text:
        return "圣皮埃尔博物馆", "Musée Saint-Pierre"
    if "Musée Labit" in text:
        return "乔治·拉比博物馆", "Musée Georges-Labit"
    if "Musée Mariemont" in text:
        return "马里蒙皇家博物馆", "Royal Museum of Mariemont"
    if page_id == 132698839:
        return "赛努奇博物馆", "Musée Cernuschi"
    return "维基共享资源", "Wikimedia Commons"


def accession(title: str, page_id: int) -> str:
    for pattern in (r"AK-(?:NM|MAK|RBK)-[\w-]+", r"M\.C\.\s*\d+", r"LACMA\s+(?:M\.)?[\d.]+", r"CH\s+\d+"):
        match = re.search(pattern, title, re.I)
        if match:
            return match.group().removeprefix("LACMA ")
    hallwylska = re.search(r"Hallwylska museet\s*-\s*(\d+)", title, re.I)
    return hallwylska.group(1) if hallwylska else f"Commons:{page_id}"


def object_date(raw_date: str, title: str) -> str:
    value = clean(raw_date).split(" date QS:", 1)[0]
    value = re.sub(r"(\d+)\s+th\s+century", r"\1th century", value, flags=re.I)
    if re.match(r"^\d{4}-\d{2}-\d{2}", value):
        value = ""
    if value and re.search(r"century|circa|ca\.|between|\b1[0-9]{3}s\b|\d{3,4}\s*[-–]\s*\d{2,4}", value, re.I):
        return value[:100]
    title = clean(title)
    for pattern in (r"(?:Northern|Southern) Song dynasty", r"Song dynasty", r"late 1700s AD", r"\b1[0-9]{3}s[-–]1[0-9]{3}s AD", r"\b1[0-9]{3}\s*[-–]\s*\d{2,4}", r"\bc\.\s*1[0-9]{3}"):
        match = re.search(pattern, title, re.I)
        if match:
            return match.group()
    return "Date not documented"


def dynasty(title: str, date: str) -> tuple[str, str]:
    text = f"{title} {date}".lower()
    if "northern song" in text:
        return "北宋", "Northern Song Dynasty"
    if "southern song" in text:
        return "南宋", "Southern Song Dynasty"
    if "song dynasty" in text:
        return "宋", "Song Dynasty"
    if "qing" in text:
        return "清", "Qing Dynasty"
    if re.search(r"\bjin dynasty\b", text):
        return "金", "Jin Dynasty"
    return "未详", "Not documented"


def english_title(title: str, page_id: int, category: str, number: str) -> str:
    if category == "Gaiwan":
        return "Blue-and-white gaiwan"
    if page_id in YIXING:
        return f"Yixing teapot ({number})" if page_id != 83525612 else f"Yixing tea caddy ({number})"
    if category == "Yixing_ware" and re.search(r"Theebus", title, re.I):
        return f"Yixing tea caddy ({number})"
    if category == "Yixing_ware" and re.search(r"Theepot|Tekanna|Kalebasvormige|Zeshoekige|Vierkante", title, re.I):
        return f"Yixing teapot ({number})"
    if page_id in {152159869, 71871850}:
        return f"Glazed stoneware tea bowl ({number})"
    if category == "Jian_ware" and re.search(r"Theekom|Bol à thé", title, re.I):
        return f"Jian tea bowl ({number})"
    short = re.sub(r"\s+-\s+DSC\d+.*$", "", title)
    return short[:150]


def description(title: str, title_zh: str, date: str, museum_zh: str, number: str) -> str:
    motifs = (
        (r"hare.?s fur|hazenvel|fourrure de lièvre", "兔毫釉"),
        (r"oil spot", "油滴斑釉"),
        (r"partridge.feather", "鹧鸪斑釉"),
        (r"leaf", "叶纹"),
        (r"prunus", "梅枝纹"),
        (r"dragon|draken", "龙纹"),
        (r"coat of arms", "纹章装饰"),
    )
    feature = next((label for pattern, label in motifs if re.search(pattern, title, re.I)), "")
    parts = [f"此件为{title_zh}。"]
    if feature:
        parts.append(f"器物可见{feature}。")
    if date != "Date not documented" and not re.search(r"dynasty", date, re.I):
        period = re.sub(r"between(?: circa)? (\d{3,4}) and(?: circa)? (\d{3,4})", r"约\1—\2年", date, flags=re.I)
        period = re.sub(r"ca\.?\s*(\d{3,4})\s*[-–]\s*ca\.?\s*(\d{3,4})", r"约\1—\2年", period, flags=re.I)
        period = re.sub(r"(?:circa|c\.)\s*(\d{3,4})", r"约\1年", period, flags=re.I)
        period = re.sub(r"(\d{1,2})th century", r"\1世纪", period, flags=re.I)
        if re.fullmatch(r"\d{3,4}\s*[-–]\s*\d{2,4}", period):
            period += "年"
        if re.fullmatch(r"late 1700s AD", period, flags=re.I):
            period = "18世纪末"
        parts.append(f"年代记录为{period}。")
    if museum_zh != "维基共享资源":
        parts.append(f"馆藏机构：{museum_zh}。")
    if not number.startswith("Commons:"):
        parts.append(f"馆藏号：{number}。")
    return "".join(parts)


def make_artwork(page: dict, image_hash: str) -> dict:
    page_id = page["pageid"]
    info = page["imageinfo"][0]
    metadata = info.get("extmetadata") or {}
    value = lambda key: metadata.get(key, {}).get("value", "")
    filename = re.sub(r"^File:", "", page["title"], flags=re.I)
    title = re.sub(r"\.[^.]+$", "", filename)
    category = "Jian_ware" if page_id in JIAN else "Yixing_ware" if page_id in YIXING else "Gaiwan" if page_id in GAIWAN else "Other"
    number = accession(title, page_id)
    date = object_date(value("DateTimeOriginal"), title)
    dynasty_zh, dynasty_en = dynasty(title + " " + clean(value("ImageDescription"))[:240], date)
    documented = {
        132698839: ("1127–1279", "南宋", "Southern Song Dynasty"),
        153243044: ("12th century", "北宋", "Northern Song Dynasty"),
        19194564: ("1127–1279", "南宋", "Southern Song Dynasty"),
        19195344: ("1127–1279", "南宋", "Southern Song Dynasty"),
        19200939: ("1000–1100", "北宋", "Northern Song Dynasty"),
        19201579: ("1000–1127", "北宋", "Northern Song Dynasty"),
    }
    if page_id in documented:
        date, dynasty_zh, dynasty_en = documented[page_id]
    artist = clean(value("Artist"))
    if artist.lower().startswith(("unknown author", "unknown artist")):
        artist = ""
    if artist.startswith("Ismoon"):
        artist = "Ismoon"
    artist = artist[:180]
    museum_zh, museum_en = source(title, artist, page_id)
    is_caddy = page_id == 83525612
    if category == "Jian_ware":
        object_type, object_type_en = "杯盏", "Tea Bowl/Cup"
        generic_stoneware = page_id in {152159869, 71871850}
        material, material_en = ("炻器", "Glazed stoneware") if generic_stoneware else ("建盏", "Jian ware")
        title_zh = "茶盏" if generic_stoneware else "建盏"
    elif category == "Gaiwan":
        object_type, object_type_en = "杯盏", "Tea Bowl/Cup"
        material, material_en, title_zh = "青花瓷", "Blue-and-white porcelain", "青花盖碗"
    elif is_caddy:
        object_type, object_type_en = "茶罐", "Tea Caddy"
        material, material_en, title_zh = "宜兴紫砂", "Yixing stoneware", "宜兴紫砂茶罐"
    elif page_id in YIXING:
        object_type, object_type_en = "茶壶", "Teapot"
        material, material_en, title_zh = "宜兴紫砂", "Yixing stoneware", "宜兴紫砂茶壶"
    elif page_id in EXPORT_TEAPOTS:
        object_type, object_type_en = "茶壶", "Teapot"
        material, material_en, title_zh = "外销瓷", "Chinese export porcelain", "外销瓷茶壶"
    elif page_id in SILVER_TEAPOTS:
        object_type, object_type_en = "茶壶", "Teapot"
        material, material_en, title_zh = "银器", "Silver", "银茶壶"
    else:
        object_type, object_type_en = "杯盏", "Tea Bowl/Cup"
        if page_id in {27303944, 27295172, 27336539, 27317035}:
            material, material_en, title_zh = "吉州窑", "Jizhou ware", "吉州窑茶盏"
        elif page_id == 19201579:
            material, material_en, title_zh = "定窑", "Ding ware", "定窑茶盏"
        else:
            material, material_en, title_zh = "炻器", "Glazed stoneware", "茶盏"
    if dynasty_zh != "未详":
        title_zh = dynasty_zh + title_zh
    license_name = clean(value("LicenseShortName"))
    source_url = "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(page["title"].replace(" ", "_"), safe=":/()-,")
    caption = english_title(title, page_id, category, number)
    if page_id == 19201579:
        caption = "Ding-ware tea bowl, Northern Song dynasty"
    return {
        "id": f"wiki-{page_id}", "titleChinese": title_zh, "titleEnglish": caption,
        "dynasty": dynasty_zh, "dynastyEnglish": dynasty_en, "date": date,
        "material": material, "materialEnglish": material_en,
        "objectType": object_type, "objectTypeEnglish": object_type_en,
        "description": description(title, title_zh, date, museum_zh, number),
        "sourceMuseum": museum_zh, "sourceMuseumEnglish": museum_en,
        "accessionNumber": number, "sourceUrl": source_url,
        "imageUrl": f"/artworks/wiki-{page_id}.jpg", "imageAlt": caption,
        "license": license_name, "creditLine": artist or museum_en,
        "crawlBatchId": BATCH, "imageSha256": image_hash,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    artworks = json.loads(ARTWORKS.read_text())
    existing_ids = {item["id"] for item in artworks}
    existing_accessions = {item.get("accessionNumber") for item in artworks if item.get("accessionNumber")}
    existing_hashes = {
        hashlib.sha256((ROOT / "public" / item["imageUrl"].lstrip("/")).read_bytes()).hexdigest()
        for item in artworks if (ROOT / "public" / item["imageUrl"].lstrip("/")).exists()
    }
    params = urllib.parse.urlencode({
        "action": "query", "pageids": "|".join(map(str, PAGE_IDS)), "prop": "imageinfo",
        "iiprop": "url|size|extmetadata", "iiurlwidth": "2000", "format": "json", "formatversion": "2",
    })
    response = json.loads(request("https://commons.wikimedia.org/w/api.php?" + params))
    pages = {page["pageid"]: page for page in response.get("query", {}).get("pages", [])}
    if set(pages) != set(PAGE_IDS):
        raise RuntimeError(f"Commons returned {len(pages)}/{len(PAGE_IDS)} reviewed pages")
    prepared = []
    for page_id in PAGE_IDS:
        if f"wiki-{page_id}" in existing_ids:
            continue
        page = pages[page_id]
        info = page["imageinfo"][0]
        meta = info.get("extmetadata") or {}
        license_name = clean(meta.get("LicenseShortName", {}).get("value", ""))
        if license_name not in {"CC0", "Public domain"}:
            raise RuntimeError(f"License changed for {page_id}: {license_name}")
        if min(info.get("thumbwidth", 0), info.get("thumbheight", 0)) < 1000:
            raise RuntimeError(f"Image below 1000px on short side: {page_id}")
        cached = args.cache_dir / f"wiki-{page_id}.jpg" if args.cache_dir else None
        if cached and cached.exists():
            image = cached.read_bytes()
        else:
            image = request(info["thumburl"])
            if cached:
                cached.parent.mkdir(parents=True, exist_ok=True)
                cached.write_bytes(image)
        if len(image) < 30_000 or not image.startswith(b"\xff\xd8\xff") or not image.endswith(b"\xff\xd9"):
            raise RuntimeError(f"Invalid JPEG for {page_id}")
        digest = hashlib.sha256(image).hexdigest()
        if digest in existing_hashes:
            raise RuntimeError(f"Duplicate image for {page_id}")
        existing_hashes.add(digest)
        artwork = make_artwork(page, digest)
        number = artwork["accessionNumber"]
        if not number.startswith("Commons:") and number in existing_accessions:
            raise RuntimeError(f"Duplicate accession for {page_id}: {number}")
        existing_accessions.add(number)
        prepared.append((artwork, image))
    print(f"Reviewed {len(PAGE_IDS)} pages; {len(prepared)} net new artworks")
    if args.dry_run or not prepared:
        return
    for artwork, image in prepared:
        destination = OUTPUT / f"{artwork['id']}.jpg"
        if destination.exists():
            raise RuntimeError(f"Destination already exists: {destination}")
        destination.write_bytes(image)
    # Hashes live in the research log, not the display data schema.
    log_rows = []
    for artwork, _ in prepared:
        log_rows.append({"id": artwork["id"], "sha256": artwork.pop("imageSha256"), "license": artwork["license"]})
    ARTWORKS.write_text(json.dumps(artworks + [item for item, _ in prepared], ensure_ascii=False, indent=2) + "\n")
    with LOG.open("a") as stream:
        stream.write(json.dumps({
            "timestamp": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            "source": "wikimedia", "query": "manual-review:Yixing_ware,Jian_ware,Gaiwan",
            "totalResults": len(PAGE_IDS), "idsAccepted": len(prepared), "idsRejected": 0,
            "status": "completed", "crawlBatchId": BATCH, "artworks": log_rows,
        }, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
