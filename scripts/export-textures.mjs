import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Export floor textures from assets-source/ to public/environment/.
// - Diffuse (albedo): ETC1S, 2K, sRGB, 8-bit forced
// - Normal: UASTC + Zstd (high compression), 1K, linear, 8-bit forced
// - Previews: tiled diffuse WebP renders at 640x480 for the catalog UI

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_DIR = path.join(ROOT, 'assets-source/environment/textures')
const OUTPUT_DIR = path.join(ROOT, 'public/environment/textures')
const PREVIEW_DIR = path.join(ROOT, 'public/environment/previews')

const PREVIEW_WIDTH = 640
const PREVIEW_HEIGHT = 480
const PREVIEW_OVERSAMPLE = 3
const PREVIEW_TILE_SCALE = '35%'
const PREVIEW_QUALITY = 82
const CANVAS_W = PREVIEW_WIDTH * PREVIEW_OVERSAMPLE
const CANVAS_H = PREVIEW_HEIGHT * PREVIEW_OVERSAMPLE

// Polyhaven source folder -> clean output name.
const TEXTURE_MAP = {
  'polyhaven-dimitrios-savva-wood-floor': 'wood-floor',
  'polyhaven-charlotte-baglioni-laminate-floor-02': 'laminate-floor',
  'polyhaven-amal-kumar-granite-tile-04': 'granite-tile',
  'polyhaven-rob-tuytel-painted-concrete-02': 'concrete-floor',
}

function works(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

if (!works('toktx', ['--version'])) {
  fail('toktx not found. Install KTX-Software (v4.0+) and add to PATH.')
}
const magick = works('magick', ['--version'])
  ? 'magick'
  : works('convert', ['--version'])
    ? 'convert'
    : null
if (!magick) {
  fail('ImageMagick not found. Please install it.')
}

const run = (command, args) => execFileSync(command, args, { stdio: 'ignore' })
const kb = (file) => `${String(Math.round(statSync(file).size / 1024))} KB`

mkdirSync(OUTPUT_DIR, { recursive: true })
mkdirSync(PREVIEW_DIR, { recursive: true })

console.log('🚀 Starting Texture Export...')
console.log('------------------------------------------------')

const folders = readdirSync(SOURCE_DIR, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
)

for (const folder of folders) {
  const outputName = TEXTURE_MAP[folder.name]
  if (!outputName) {
    console.log(`⚠️  Skipping unknown folder: ${folder.name}`)
    continue
  }

  const dir = path.join(SOURCE_DIR, folder.name)
  const files = readdirSync(dir)
  const diffusePng = files.find((file) => file.endsWith('_diff_2k.png'))
  const normalPng = files.find((file) => file.endsWith('_nor_gl_2k.png'))
  if (!diffusePng || !normalPng) {
    console.error(`❌ Missing files in ${folder.name}. Skipping.`)
    continue
  }
  const diffuse = path.join(dir, diffusePng)
  const normal = path.join(dir, normalPng)

  const diffuseKtx2 = path.join(OUTPUT_DIR, `${outputName}_diff_2k.ktx2`)
  const normalKtx2 = path.join(OUTPUT_DIR, `${outputName}_nor_gl_1k.ktx2`)
  const previewWebp = path.join(PREVIEW_DIR, `${outputName}.webp`)
  const diffTmp = path.join(OUTPUT_DIR, `.${outputName}_diff_8bit.tmp.png`)
  const normTmp = path.join(OUTPUT_DIR, `.${outputName}_norm_8bit_1k.tmp.png`)
  const previewTileTmp = path.join(PREVIEW_DIR, `.${outputName}_preview_tile.tmp.png`)

  console.log(`📦 Processing: ${outputName}`)

  // 1. Diffuse: force 8-bit, then ETC1S (web download size).
  run(magick, [diffuse, '-depth', '8', diffTmp])
  run('toktx', [
    '--t2', '--encode', 'etc1s', '--clevel', '5', '--qlevel', '128',
    '--genmipmap', '--assign_oetf', 'srgb', '--assign_primaries', 'srgb',
    diffuseKtx2, diffTmp,
  ])

  // 2. Normal: downscale to 1K + 8-bit, then UASTC + Zstd (normal-map fidelity).
  run(magick, [normal, '-resize', '1024x1024', '-depth', '8', normTmp])
  run('toktx', [
    '--t2', '--encode', 'uastc', '--uastc_quality', '2', '--uastc_rdo_l', '1.0',
    '--zcmp', '18', '--genmipmap', '--normal_mode', '--assign_oetf', 'linear',
    '--assign_primaries', 'none', normalKtx2, normTmp,
  ])

  // 3. Preview: tile a downscaled diffuse into an oversampled 4:3 frame, scaled
  // down so it reads as a material swatch rather than a single crop.
  run(magick, [diffuse, '-resize', PREVIEW_TILE_SCALE, '-depth', '8', previewTileTmp])
  run(magick, [
    '-size', `${String(CANVAS_W)}x${String(CANVAS_H)}`, `tile:${previewTileTmp}`,
    '-filter', 'Lanczos', '-resize', `${String(PREVIEW_WIDTH)}x${String(PREVIEW_HEIGHT)}!`,
    '-strip', '-quality', String(PREVIEW_QUALITY), '-define', 'webp:method=6',
    previewWebp,
  ])

  rmSync(diffTmp)
  rmSync(normTmp)
  rmSync(previewTileTmp)
  console.log(
    `  ✅ ${outputName}: diffuse ${kb(diffuseKtx2)}, normal ${kb(normalKtx2)}, preview ${kb(previewWebp)}`,
  )
}

console.log('------------------------------------------------')
console.log(`✨ Export Complete! Files in: ${OUTPUT_DIR} and ${PREVIEW_DIR}`)
