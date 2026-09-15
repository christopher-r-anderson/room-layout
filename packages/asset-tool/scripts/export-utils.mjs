import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import path from 'node:path'

export function requireOutput(file) {
  if (!existsSync(file) || !statSync(file).isFile()) {
    throw new Error(`Expected output file: ${file}`)
  }
  return statSync(file).size
}

export function sourceFolders(source, outputs) {
  try {
    // Follow directory symlinks, including operator-managed external sources.
    const folders = readdirSync(source, { withFileTypes: true }).filter(
      (entry) =>
        entry.isDirectory() ||
        (entry.isSymbolicLink() &&
          statSync(path.join(source, entry.name)).isDirectory()),
    )
    for (const output of outputs) mkdirSync(output, { recursive: true })
    return folders
  } catch (error) {
    console.error(`Error: ${error.message}`)
    process.exit(1)
  }
}

export function withStaging(output, produce) {
  // Stay under the supplied output root; never choose a fallback location.
  const stage = mkdtempSync(path.join(output, '.export-'))
  try {
    return produce(stage)
  } finally {
    rmSync(stage, { recursive: true, force: true })
  }
}
