import { execFileSync } from 'node:child_process'
import { readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireOutput, sourceFolders, withStaging } from './export-utils.mjs'

// Compress furniture models for the runtime: for each model .blend under
// assets-source/models/<folder>/, run its configured Blender collection exporter
// to a //<name>.tmp.glb, then compress the textures to KTX2 and write the result
// to public/models/<name>.glb. The intermediate .tmp.glb is removed.
//
// Compression recipe (tunable): ETC1S on all textures - ~7x smaller with no
// resolution loss, and lossless geometry (no Meshopt; these meshes are tiny). To
// revisit quality later, split normal/data slots to `uastc` (higher quality,
// larger) via --slots, add a `gltf-transform resize` pass, or tune ETC1S
// --quality. See docs/exporting.md.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOT = process.env.ASSET_SOURCE_DIR
  ? path.resolve(process.env.ASSET_SOURCE_DIR)
  : path.join(ROOT, 'assets-source')
const PUBLIC_ROOT = process.env.ASSET_OUTPUT_DIR
  ? path.resolve(process.env.ASSET_OUTPUT_DIR)
  : path.resolve(ROOT, '../../apps/room-layout/public')
const MODELS_SRC = path.join(SOURCE_ROOT, 'models')
const OUT_DIR = path.join(PUBLIC_ROOT, 'models')
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
  fail(
    'gltf-transform not found. Install with: pnpm add -g @gltf-transform/cli',
  )
}
if (!works('toktx', ['--version'])) {
  fail('toktx not found (KTX2 texture encoding). Install KTX-Software (v4.0+).')
}

function kb(bytes) {
  return `${String(Math.round(bytes / 1024))} KB`
}

const folders = sourceFolders(MODELS_SRC, [OUT_DIR])

console.log('🚀 Compressing furniture models...')
console.log('------------------------------------------------')

let failures = 0
const destinations = new Map()

for (const folder of folders) {
  try {
    const dir = path.join(MODELS_SRC, folder.name)
    const blend = readdirSync(dir).find((file) => file.endsWith('.blend'))
    if (!blend) {
      console.log(`Skipping ${dir}: no .blend source.`)
      continue
    }

    // Retained intermediates must not count as output from this invocation.
    for (const file of readdirSync(dir).filter((file) =>
      file.endsWith('.tmp.glb'),
    )) {
      rmSync(path.join(dir, file))
    }

    execFileSync(
      blender[0],
      [
        ...blender.slice(1),
        '--background',
        path.join(dir, blend),
        '--python-exit-code',
        '1',
        '--python',
        EXPORT_PY,
      ],
      { stdio: 'inherit' },
    )

    const exports = readdirSync(dir).filter((file) => file.endsWith('.tmp.glb'))
    if (exports.length === 0) {
      throw new Error(
        `No .tmp.glb produced in ${dir} (check the blend's collection exporter).`,
      )
    }

    for (const tmp of exports) {
      const tmpPath = path.join(dir, tmp)
      const name = tmp.replace(/\.tmp\.glb$/, '')
      const outPath = path.join(OUT_DIR, `${name}.glb`)
      try {
        const before = statSync(tmpPath).size
        if (destinations.has(outPath)) {
          throw new Error(
            `Duplicate output ${outPath}: ${destinations.get(outPath)} and ${tmpPath}`,
          )
        }
        destinations.set(outPath, tmpPath)
        const after = withStaging(OUT_DIR, (stage) => {
          const staged = path.join(stage, `${name}.glb`)
          execFileSync('gltf-transform', ['etc1s', tmpPath, staged], {
            stdio: 'inherit',
          })
          const size = requireOutput(staged)
          renameSync(staged, outPath)
          return size
        })
        rmSync(tmpPath)
        console.log(
          `  📦 ${folder.name} -> models/${name}.glb   ${kb(before)} -> ${kb(after)}`,
        )
      } catch (error) {
        failures++
        console.error(`❌ ${tmpPath} -> ${outPath}: ${error.message}`)
      }
    }
  } catch (error) {
    failures++
    console.error(`❌ ${path.join(MODELS_SRC, folder.name)}: ${error.message}`)
  }
}

console.log('------------------------------------------------')
if (failures > 0) {
  console.error(
    `Export finished with ${failures} failure(s). Output: ${OUT_DIR}`,
  )
  process.exitCode = 1
} else {
  console.log(`✨ Done. Compressed models in: ${OUT_DIR}`)
}
