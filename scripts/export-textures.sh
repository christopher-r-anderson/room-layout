#!/bin/bash

# Export floor textures from assets-source/ to public/environment/textures/
# - Diffuse (albedo): ETC1S, 2K, sRGB, 8-bit forced
# - Normal: UASTC + Zstd (high compression), 1K, linear, 8-bit forced

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_DIR="$REPO_ROOT/assets-source/environment/textures"
OUTPUT_DIR="$REPO_ROOT/public/environment/textures"

# Tool Validation
if ! command -v toktx &> /dev/null; then
  echo "Error: toktx not found. Install KTX-Software (v4.0+) and add to PATH."
  exit 1
fi

if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
  echo "Error: ImageMagick not found. Please install it."
  exit 1
fi

CONVERT_CMD=$(command -v magick || command -v convert)
mkdir -p "$OUTPUT_DIR"

# Mapping of Polyhaven source folders to clean output names
declare -A TEXTURE_MAP=(
  ["polyhaven-dimitrios-savva-wood-floor"]="wood-floor"
  ["polyhaven-charlotte-baglioni-laminate-floor-02"]="laminate-floor"
  ["polyhaven-amal-kumar-granite-tile-04"]="granite-tile"
  ["polyhaven-rob-tuytel-painted-concrete-02"]="concrete-floor"
)

echo "🚀 Starting Texture Export..."
echo "------------------------------------------------"

for folder in "$SOURCE_DIR"/*/; do
  folder_name=$(basename "$folder")
  output_name="${TEXTURE_MAP[$folder_name]:-}"
  
  if [[ -z "$output_name" ]]; then
    echo "⚠️  Skipping unknown folder: $folder_name"
    continue
  fi
  
  # Search for source files
  diffuse_png=$(find "$folder" -name "*_diff_2k.png" | head -1)
  normal_png=$(find "$folder" -name "*_nor_gl_2k.png" | head -1)
  
  if [[ -z "$diffuse_png" ]] || [[ -z "$normal_png" ]]; then
    echo "❌ Missing files in $folder_name. Skipping."
    continue
  fi
  
  # Define target paths
  diffuse_ktx2="$OUTPUT_DIR/${output_name}_diff_2k.ktx2"
  normal_ktx2="$OUTPUT_DIR/${output_name}_nor_gl_1k.ktx2"
  
  # Temporary files for 8-bit conversion and scaling
  diff_tmp="$OUTPUT_DIR/.${output_name}_diff_8bit.tmp.png"
  norm_tmp="$OUTPUT_DIR/.${output_name}_norm_8bit_1k.tmp.png"

  echo "📦 Processing: $output_name"

  # 1. DIFFUSE: Force 8-bit depth to resolve toktx warnings & reduce bloat
  $CONVERT_CMD "$diffuse_png" -depth 8 "$diff_tmp"
  
  # Encode with ETC1S (optimized for web download size)
  toktx --t2 --encode etc1s --clevel 5 --qlevel 128 --genmipmap \
    --assign_oetf srgb --assign_primaries srgb \
    "$diffuse_ktx2" "$diff_tmp"

  # 2. NORMAL: Downscale to 1K and force 8-bit depth
  $CONVERT_CMD "$normal_png" -resize 1024x1024 -depth 8 "$norm_tmp"
  
  # Encode with UASTC + High Zstd compression (optimized for normal map fidelity)
  # --zcmp 18 provides high disk compression without affecting GPU quality.
  toktx --t2 --encode uastc --uastc_quality 2 --uastc_rdo_l 1.0 \
    --zcmp 18 --genmipmap --normal_mode \
    --assign_oetf linear --assign_primaries none \
    "$normal_ktx2" "$norm_tmp"

  # Clean up temp files
  rm -f "$diff_tmp" "$norm_tmp"

  echo "  ✅ Diffuse: $(du -h "$diffuse_ktx2" | cut -f1)"
  echo "  ✅ Normal:  $(du -h "$normal_ktx2" | cut -f1)"
done

echo "------------------------------------------------"
echo "✨ Export Complete! Files located in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR" | grep ".ktx2"
