#!/bin/bash

# Compress hand-exported furniture GLBs from assets-source/ into public/models/.
# - Geometry: Meshopt (structure-preserving, so the catalog nodeName selection
#   still resolves; drei's useGLTF auto-decodes it at runtime)
# - Textures (KTX2): UASTC+Zstd for normal/metal-rough/occlusion (data fidelity),
#   ETC1S for base color/emissive (smallest download) — mirroring the texture
#   pipeline's per-slot choices.
#
# Source layout: each assets-source/<folder>/ holds the .blend (true source) plus
# the hand-exported .glb (the input here). Only the compressed result ships in
# public/models/; the uncompressed export stays out of public (and out of dist).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

SOURCE_DIR="$REPO_ROOT/assets-source"
OUTPUT_DIR="$REPO_ROOT/public/models"

# Tool validation
if ! command -v gltf-transform &> /dev/null; then
  echo "Error: gltf-transform not found. Install with: pnpm add -g @gltf-transform/cli"
  exit 1
fi

if ! command -v toktx &> /dev/null; then
  echo "Error: toktx not found (KTX2 texture encoding). Install KTX-Software (v4.0+) and add to PATH."
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Map each source folder to its public/models output name (the names the catalog
# manifest references). The folder names are third-party attributions; the output
# names are the clean runtime names.
declare -A MODEL_MAP=(
  ["cirax-we-end-table"]="end-table"
  ["leather-couch"]="leather-collection"
  ["machine-meza-coffee-table-living-room"]="coffee-table-living-room"
  ["zeerkad-coffee-table"]="coffee-table"
)

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "🚀 Compressing furniture models..."
echo "------------------------------------------------"

for folder in "${!MODEL_MAP[@]}"; do
  output_name="${MODEL_MAP[$folder]}"
  source_folder="$SOURCE_DIR/$folder"

  if [[ ! -d "$source_folder" ]]; then
    echo "⚠️  Missing source folder: $folder. Skipping."
    continue
  fi

  glb_count=$(find "$source_folder" -maxdepth 1 -name "*.glb" | wc -l)
  if [[ "$glb_count" -eq 0 ]]; then
    echo "❌ No exported .glb in assets-source/$folder. Skipping."
    continue
  fi
  if [[ "$glb_count" -gt 1 ]]; then
    echo "⚠️  Multiple .glb files in assets-source/$folder; using the first found."
  fi
  source_glb="$(find "$source_folder" -maxdepth 1 -name "*.glb" | head -1)"

  output="$OUTPUT_DIR/${output_name}.glb"
  tmp_geo="$TMP_DIR/${output_name}.geo.glb"
  tmp_tex="$TMP_DIR/${output_name}.tex.glb"
  tmp_out="$TMP_DIR/${output_name}.out.glb"

  echo "📦 $folder -> models/${output_name}.glb"

  # 1. Geometry: Meshopt (structure-preserving).
  gltf-transform meshopt "$source_glb" "$tmp_geo" > /dev/null

  # 2. Data maps: UASTC + Zstd supercompression (keeps normal-map fidelity).
  gltf-transform uastc "$tmp_geo" "$tmp_tex" \
    --slots "{normalTexture,metallicRoughnessTexture,occlusionTexture}" \
    --zstd 18 > /dev/null

  # 3. Color maps: ETC1S (smallest download for base color / emissive).
  gltf-transform etc1s "$tmp_tex" "$tmp_out" \
    --slots "{baseColorTexture,emissiveTexture}" > /dev/null

  # Only replace the shipped file once every pass succeeded.
  mv "$tmp_out" "$output"

  before="$(du -h "$source_glb" | cut -f1)"
  after="$(du -h "$output" | cut -f1)"
  echo "  ✅ ${before} -> ${after}"
done

echo "------------------------------------------------"
echo "✨ Done. Compressed models in: $OUTPUT_DIR"
