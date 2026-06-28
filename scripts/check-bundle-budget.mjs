import { readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'

// Per-chunk gzipped-size budgets (KB). These are regression gates set at current
// sizes plus modest headroom, NOT aspirational targets — lower them whenever the
// bundle shrinks. The shell is the critical first-paint chunk; the engine chunk
// (three/r3f/drei/postprocessing) is lazy-loaded behind it and downloads in
// parallel, so it carries a looser budget.
const BUDGETS = [
  { label: 'shell (entry)', pattern: /^index-.*\.js$/, maxGzipKB: 215 },
  { label: 'engine (lazy)', pattern: /^scene-canvas-.*\.js$/, maxGzipKB: 350 },
]

const ASSETS_DIR = path.resolve('dist/assets')

function gzipKB(file) {
  return Math.round(gzipSync(readFileSync(file)).length / 1024)
}

const files = readdirSync(ASSETS_DIR).filter((file) => file.endsWith('.js'))
const failures = []
const rows = []

for (const file of files) {
  const sizeKB = gzipKB(path.join(ASSETS_DIR, file))
  const budget = BUDGETS.find((entry) => entry.pattern.test(file))

  if (!budget) {
    failures.push(
      `Unbudgeted JS chunk: ${file} (${sizeKB} KB gzip). Add a budget in scripts/check-bundle-budget.mjs.`,
    )
    rows.push({ label: 'UNBUDGETED', sizeKB, budget: '—', file })
    continue
  }

  const over = sizeKB > budget.maxGzipKB
  if (over) {
    failures.push(
      `${budget.label} chunk over budget: ${file} is ${sizeKB} KB gzip, budget ${budget.maxGzipKB} KB.`,
    )
  }
  rows.push({
    label: `${budget.label}${over ? ' FAIL' : ' ok'}`,
    sizeKB,
    budget: `${budget.maxGzipKB} KB`,
    file,
  })
}

for (const entry of BUDGETS) {
  if (!files.some((file) => entry.pattern.test(file))) {
    failures.push(
      `No chunk matched budget "${entry.label}" (${entry.pattern}). The chunk may have been renamed; update scripts/check-bundle-budget.mjs.`,
    )
  }
}

console.log('Bundle budget (gzip):')
for (const row of rows) {
  console.log(
    `  ${row.label.padEnd(18)} ${String(row.sizeKB).padStart(5)} KB / ${row.budget.padStart(7)}  ${row.file}`,
  )
}

if (failures.length > 0) {
  console.error('\nBundle budget check failed:')
  for (const failure of failures) {
    console.error(`  - ${failure}`)
  }
  process.exit(1)
}

console.log('\nAll chunks within budget.')
