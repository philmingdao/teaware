#!/bin/bash

# Compress images for GitHub Pages deployment
# Target: max 1400px longest edge, quality 80%, strip EXIF

set -e

ARTWORKS_DIR="public/artworks"
MAX_SIZE=1400
QUALITY=80
TEMP_DIR="/tmp/compressed-artworks"

echo "Starting image compression..."
echo "Source: $ARTWORKS_DIR"
echo "Max size: ${MAX_SIZE}px, Quality: ${QUALITY}%"

mkdir -p "$TEMP_DIR"

# Count total files
TOTAL=$(find "$ARTWORKS_DIR" -name "*.jpg" -type f | wc -l)
echo "Total images to process: $TOTAL"

# Process images in parallel
PROCESSED=0
FAILED=0

process_image() {
    local src="$1"
    local filename=$(basename "$src")
    local dest="$TEMP_DIR/$filename"
    
    # Resize (only if larger than MAX_SIZE) and compress
    if convert "$src" \
        -resize "${MAX_SIZE}x${MAX_SIZE}>" \
        -strip \
        -quality $QUALITY \
        -sampling-factor 4:2:0 \
        -interlace JPEG \
        "$dest" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

export -f process_image
export MAX_SIZE QUALITY TEMP_DIR

# Use parallel processing if available, otherwise sequential
if command -v parallel &> /dev/null; then
    echo "Using GNU parallel for processing..."
    find "$ARTWORKS_DIR" -name "*.jpg" -type f | \
        parallel --bar --jobs 8 process_image {}
else
    echo "Processing sequentially (install GNU parallel for faster processing)..."
    for img in "$ARTWORKS_DIR"/*.jpg; do
        [ -f "$img" ] || continue
        process_image "$img"
        PROCESSED=$((PROCESSED + 1))
        if [ $((PROCESSED % 100)) -eq 0 ]; then
            echo "Processed $PROCESSED/$TOTAL images..."
        fi
    done
fi

# Get sizes before and after
ORIGINAL_SIZE=$(du -sb "$ARTWORKS_DIR" | cut -f1)
COMPRESSED_SIZE=$(du -sb "$TEMP_DIR" | cut -f1)

echo ""
echo "=== Compression Results ==="
echo "Original size: $(numfmt --to=iec $ORIGINAL_SIZE)"
echo "Compressed size: $(numfmt --to=iec $COMPRESSED_SIZE)"
echo "Reduction: $(echo "scale=1; (1 - $COMPRESSED_SIZE / $ORIGINAL_SIZE) * 100" | bc)%"

# Move compressed files back
echo ""
echo "Replacing original files..."
rm -rf "$ARTWORKS_DIR"/*
mv "$TEMP_DIR"/* "$ARTWORKS_DIR"/
rmdir "$TEMP_DIR"

# Final verification
FINAL_SIZE=$(du -sh "$ARTWORKS_DIR" | cut -f1)
FINAL_COUNT=$(find "$ARTWORKS_DIR" -name "*.jpg" | wc -l)
echo ""
echo "=== Final Status ==="
echo "Directory size: $FINAL_SIZE"
echo "Image count: $FINAL_COUNT"
echo "Done!"
