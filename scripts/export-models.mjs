import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Compress furniture models for the runtime: for each model .blend under
// assets-source/models/<folder>/, run its configured Blender collection exporter
// to a //<name>.tmp.glb, then compress the textures to KTX2 and write the result
// to public/models/<name>.glb. The intermediate .tmp.glb is removed.
//
// Compression recipe (tunable): ETC1S on all textures — ~7x smaller with no
// resolution loss, and lossless geometry (no Meshopt; these meshes are tiny). To
// revisit quality later, split normal/data slots to `uastc` (higher quality,
// larger) via --slots, add a `gltf-transform resize` pass, or tune ETC1S
// --quality. See docs/architecture/catalog-and-assets.md.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MODELS_SRC = path.join(ROOT, 'assets-source/models')
const OUT_DIR = path.join(ROOT, 'public/models')
const EXPORT_PY = path.join(ROOT, 'scripts/blender/export.py')

function works(command, args) {
  try {
    execFileSync(command, args, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function resolveBlender() {
  if (process.env.BLENDER) {
    return process.env.BLENDER.split(' ')
  }
  if (works('blender', ['--version'])) {
    return ['blender']
  }
  if (works('flatpak', ['info', 'org.blender.Blender'])) {
    return ['flatpak', 'run', '--filesystem=host', 'org.blender.Blender']
  }
  return null
}

function fail(message) {
  console.error(`Error: ${message}`)
  process.exit(1)
}

const blender = resolveBlender()
if (!blender) {
  fail(
    'Blender not found. Install Blender, set BLENDER=/path/to/blender, or install the org.blender.Blender flatpak.',
  )
}
if (!works('gltf-transform', ['--version'])) {
  fail('gltf-transform not found. Install with: pnpm add -g @gltf-transform/cli')
}
if (!works('toktx', ['--version'])) {
  fail('toktx not found (KTX2 texture encoding). Install KTX-Software (v4.0+).')
}

function kb(bytes) {
  return `${String(Math.round(bytes / 1024))} KB`
}

mkdirSync(OUT_DIR, { recursive: true })

console.log('🚀 Compressing furniture models...')
console.log('------------------------------------------------')

const folders = readdirSync(MODELS_SRC, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
)

for (const folder of folders) {
  const dir = path.join(MODELS_SRC, folder.name)
  const blend = readdirSync(dir).find((file) => file.endsWith('.blend'))
  if (!blend) {
    continue
  }

  try {
    execFileSync(
      blender[0],
      [...blender.slice(1), '--background', path.join(dir, blend), '--python', EXPORT_PY],
      { stdio: 'ignore' },
    )
  } catch {
    console.error(`  ❌ ${folder.name}: Blender export failed.`)
    continue
  }

  const exports = readdirSync(dir).filter((file) => file.endsWith('.tmp.glb'))
  if (exports.length === 0) {
    console.error(`  ❌ ${folder.name}: no .tmp.glb produced (check the blend's collection exporter).`)
    continue
  }

  for (const tmp of exports) {
    const tmpPath = path.join(dir, tmp)
    const name = tmp.replace(/\.tmp\.glb$/, '')
    const outPath = path.join(OUT_DIR, `${name}.glb`)
    const before = statSync(tmpPath).size
    execFileSync('gltf-transform', ['etc1s', tmpPath, outPath], {
      stdio: 'ignore',
    })
    rmSync(tmpPath)
    console.log(
      `  📦 ${folder.name} -> models/${name}.glb   ${kb(before)} -> ${kb(statSync(outPath).size)}`,
    )
  }
}

console.log('------------------------------------------------')
console.log(`✨ Done. Compressed models in: ${OUT_DIR}`)
