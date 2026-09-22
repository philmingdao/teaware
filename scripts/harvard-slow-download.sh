#!/bin/bash
# Slow Harvard image download script
# Attempts to download images with very long delays to avoid rate limiting

cd /workspace

IMAGES=(
  "harvard-182450|https://nrs.harvard.edu/urn-3:HUAM:DDC105887_dynmc"
  "harvard-70472|https://nrs.harvard.edu/urn-3:HUAM:INV013110_dynmc"
  "harvard-315465|https://nrs.harvard.edu/urn-3:HUAM:INV227562_dynmc"
  "harvard-315464|https://nrs.harvard.edu/urn-3:HUAM:INV227561_dynmc"
  "harvard-200978|https://nrs.harvard.edu/urn-3:HUAM:VRS81848_dynmc"
  "harvard-5108|https://nrs.harvard.edu/urn-3:HUAM:INV036143_dynmc"
  "harvard-54271|https://nrs.harvard.edu/urn-3:HUAM:INV013119_dynmc"
  "harvard-195548|https://nrs.harvard.edu/urn-3:HUAM:VRS10307_dynmc"
  "harvard-169493|https://nrs.harvard.edu/urn-3:huam:VRS95654_dynmc"
  "harvard-200867|https://nrs.harvard.edu/urn-3:HUAM:818886"
  "harvard-319066|https://nrs.harvard.edu/urn-3:huam:VRS95672_dynmc"
  "harvard-201474|https://nrs.harvard.edu/urn-3:HUAM:VRS12574_dynmc"
  "harvard-205526|https://nrs.harvard.edu/urn-3:HUAM:VRS39406_dynmc"
  "harvard-209335|https://nrs.harvard.edu/urn-3:HUAM:824218"
  "harvard-210346|https://nrs.harvard.edu/urn-3:HUAM:824220"
  "harvard-54272|https://nrs.harvard.edu/urn-3:HUAM:INV013101_dynmc"
  "harvard-230781|https://nrs.harvard.edu/urn-3:HUAM:INV142416_dynmc"
  "harvard-202381|https://nrs.harvard.edu/urn-3:HUAM:CARP03667_dynmc"
  "harvard-200864|https://nrs.harvard.edu/urn-3:HUAM:CARP03665_dynmc"
  "harvard-186554|https://nrs.harvard.edu/urn-3:HUAM:CARP03456_dynmc"
)

DOWNLOADED=0
FAILED=0

echo "Starting slow Harvard download at $(date)"
echo "Waiting 10 minutes before first attempt..."
sleep 600

for item in "${IMAGES[@]}"; do
  IFS='|' read -r id url <<< "$item"
  
  echo ""
  echo "$(date): Attempting $id"
  
  # Download with curl
  HTTP_CODE=$(curl -s -o "/tmp/${id}-raw.jpg" -w "%{http_code}" \
    -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
    -H "Referer: https://harvardartmuseums.org/" \
    "$url" 2>&1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    # Check if it's a valid image
    FILE_TYPE=$(file "/tmp/${id}-raw.jpg" 2>/dev/null)
    if [[ "$FILE_TYPE" == *"JPEG"* ]] || [[ "$FILE_TYPE" == *"PNG"* ]]; then
      # Compress and save
      convert "/tmp/${id}-raw.jpg" -resize "1400x1400>" -strip -quality 80 -sampling-factor 4:2:0 -interlace JPEG "public/artworks/${id}.jpg" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "  SUCCESS: Downloaded and compressed $id"
        DOWNLOADED=$((DOWNLOADED + 1))
      else
        echo "  FAIL: Compression failed for $id"
        FAILED=$((FAILED + 1))
      fi
    else
      echo "  FAIL: Invalid image format for $id ($FILE_TYPE)"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "  FAIL: HTTP $HTTP_CODE for $id"
    FAILED=$((FAILED + 1))
  fi
  
  rm -f "/tmp/${id}-raw.jpg" 2>/dev/null
  
  # Wait 3 minutes between attempts
  if [ $DOWNLOADED -lt ${#IMAGES[@]} ]; then
    echo "  Waiting 3 minutes before next attempt..."
    sleep 180
  fi
done

echo ""
echo "=========================================="
echo "Download complete at $(date)"
echo "Downloaded: $DOWNLOADED / ${#IMAGES[@]}"
echo "Failed: $FAILED"
echo "=========================================="
