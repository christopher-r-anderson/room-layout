import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = resolve(
  scriptDir,
  '../node_modules/three/examples/jsm/libs/basis',
)
const destinationDir = resolve(scriptDir, '../public/basis')

const sourceJs = resolve(sourceDir, 'basis_transcoder.js')
const sourceWasm = resolve(sourceDir, 'basis_transcoder.wasm')

if (!existsSync(sourceJs) || !existsSync(sourceWasm)) {
  console.error(
    'Basis transcoder files were not found in three/examples/jsm/libs/basis',
  )
  process.exit(1)
}

mkdirSync(destinationDir, { recursive: true })
copyFileSync(sourceJs, resolve(destinationDir, 'basis_transcoder.js'))
copyFileSync(sourceWasm, resolve(destinationDir, 'basis_transcoder.wasm'))
