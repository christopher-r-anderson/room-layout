import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  symlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const scripts = path.dirname(fileURLToPath(import.meta.url))
const wood = 'polyhaven-dimitrios-savva-wood-floor'
const laminate = 'polyhaven-charlotte-baglioni-laminate-floor-02'

function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'asset export-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const source = path.join(root, 'sources')
  const output = path.join(root, 'output')
  const bin = path.join(root, 'bin')
  mkdirSync(bin)
  mkdirSync(path.join(source, 'models'), { recursive: true })
  mkdirSync(path.join(source, 'environment/textures'), { recursive: true })
  const stub = readFileSync(path.join(scripts, 'fixtures/export-tool.sh'))
  // A private PATH prevents accidental execution of installed export tools.
  for (const tool of ['blender', 'gltf-transform', 'toktx', 'magick']) {
    const file = path.join(bin, tool)
    writeFileSync(file, stub)
    chmodSync(file, 0o755)
  }
  function input(relative) {
    const file = path.join(source, relative)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, 'disposable source')
    return file
  }
  for (const folder of [
    wood,
    laminate,
    'polyhaven-amal-kumar-granite-tile-04',
    'polyhaven-rob-tuytel-painted-concrete-02',
  ]) {
    input(`environment/textures/${folder}/surface_diff_2k.png`)
    input(`environment/textures/${folder}/surface_nor_gl_2k.png`)
  }
  return {
    source,
    output,
    input,
    texture(folder) {
      input(`environment/textures/${folder}/surface_diff_2k.png`)
      input(`environment/textures/${folder}/surface_nor_gl_2k.png`)
    },
    run(kind, extra = {}) {
      const result = spawnSync(
        process.execPath,
        [path.join(scripts, `export-${kind}.mjs`)],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: bin,
            BLENDER: '',
            ASSET_SOURCE_DIR: source,
            ASSET_OUTPUT_DIR: output,
            FAIL_TOOL: '',
            OMIT_TOOL: '',
            OMIT_OUTPUT: '',
            ...extra,
          },
        },
      )
      assert.ifError(result.error)
      return { status: result.status, log: result.stdout + result.stderr }
    },
  }
}

for (const tool of ['blender', 'gltf-transform']) {
  test(`models report ${tool} failure and continue`, (t) => {
    const f = fixture(t)
    const failed = f.input('models/a-failed/item.blend')
    f.input('models/z-success/success.blend')
    const result = f.run('models', { FAIL_TOOL: tool, FAIL_INPUT: 'a-failed' })
    assert.equal(result.status, 1)
    assert.match(result.log, /fixture access denied/)
    assert.ok(result.log.includes(path.dirname(failed)))
    assert.ok(existsSync(path.join(f.output, 'models/success.glb')))
    assert.match(result.log, /1 failure\(s\)/)
    assert.doesNotMatch(result.log, /✨ Done/)
  })
}

for (const tool of ['blender', 'gltf-transform']) {
  test(`models fail when ${tool} omits output`, (t) => {
    const f = fixture(t)
    f.input('models/model/item.blend')
    const result = f.run('models', { OMIT_TOOL: tool })
    assert.equal(result.status, 1)
    assert.match(
      result.log,
      tool === 'blender' ? /No \.tmp\.glb produced/ : /item\.glb/,
    )
  })
}

test('models succeed and distinguish folders without blend sources', (t) => {
  const f = fixture(t)
  const blend = f.input('models/model/item.blend')
  f.input('models/notes/readme.md')
  const result = f.run('models')
  assert.equal(result.status, 0, result.log)
  assert.match(result.log, /Skipping .*notes: no \.blend source/)
  assert.ok(existsSync(path.join(f.output, 'models/item.glb')))
  assert.equal(existsSync(blend.replace('.blend', '.tmp.glb')), false)
  assert.equal(readFileSync(blend, 'utf8'), 'disposable source')
})

for (const missing of ['diff_2k', 'nor_gl_2k']) {
  test(`textures fail for missing ${missing} and continue`, (t) => {
    const f = fixture(t)
    f.texture(laminate)
    rmSync(
      path.join(
        f.source,
        `environment/textures/${laminate}/surface_${missing}.png`,
      ),
    )
    f.texture(wood)
    const result = f.run('textures')
    assert.equal(result.status, 1)
    assert.ok(result.log.includes(`*_${missing}.png`))
    assert.ok(
      result.log.includes(
        path.join(f.source, 'environment/textures', laminate),
      ),
    )
    assert.ok(
      existsSync(path.join(f.output, 'environment/previews/wood-floor.webp')),
    )
    assert.doesNotMatch(result.log, /✨ Export Complete/)
  })
}

for (const tool of ['magick', 'toktx']) {
  test(`textures report ${tool} errors and continue`, (t) => {
    const f = fixture(t)
    f.texture(laminate)
    f.texture(wood)
    const result = f.run('textures', {
      FAIL_TOOL: tool,
      FAIL_INPUT: 'laminate',
    })
    assert.equal(result.status, 1)
    assert.match(result.log, /fixture access denied/)
    assert.ok(result.log.includes(laminate))
    assert.ok(
      existsSync(path.join(f.output, 'environment/previews/wood-floor.webp')),
    )
  })
}

test('textures fail for missing final output', (t) => {
  const f = fixture(t)
  f.texture(wood)
  const result = f.run('textures', { OMIT_TOOL: 'toktx' })
  assert.equal(result.status, 1)
  assert.match(result.log, /wood-floor_diff_2k\.ktx2/)
})

test('textures succeed and unknown folders are intentional skips', (t) => {
  const f = fixture(t)
  f.texture(wood)
  f.input('environment/textures/unknown/readme.md')
  const result = f.run('textures')
  assert.equal(result.status, 0, result.log)
  assert.match(result.log, /Skipping unknown folder: unknown/)
  for (const file of [
    'textures/wood-floor_diff_2k.ktx2',
    'textures/wood-floor_nor_gl_1k.ktx2',
    'previews/wood-floor.webp',
  ]) {
    assert.ok(existsSync(path.join(f.output, 'environment', file)))
  }
})

for (const kind of ['models', 'textures']) {
  test(`${kind} fail for a missing source root`, (t) => {
    const f = fixture(t)
    const missing = path.join(f.source, 'missing')
    const result = f.run(kind, { ASSET_SOURCE_DIR: missing })
    assert.equal(result.status, 1)
    assert.ok(result.log.includes(missing))
    assert.match(result.log, /Error:/)
    assert.doesNotMatch(result.log, /at readdirSync|Node.js v/)
    assert.equal(existsSync(f.output), false)
  })
  test(`${kind} fail for an inaccessible output root`, (t) => {
    const f = fixture(t)
    writeFileSync(f.output, 'not a directory')
    const result = f.run(kind)
    assert.equal(result.status, 1)
    assert.ok(result.log.includes(f.output))
    assert.match(result.log, /Error:/)
    assert.doesNotMatch(result.log, /at mkdirSync|Node.js v/)
  })
}

for (const tool of ['blender', 'gltf-transform']) {
  test(`models reject stale output when ${tool} emits nothing`, (t) => {
    const f = fixture(t)
    f.input('models/model/item.blend')
    mkdirSync(path.join(f.output, 'models'), { recursive: true })
    writeFileSync(path.join(f.output, 'models/item.glb'), 'old prepared model')
    f.input('models/model/item.tmp.glb')
    const result = f.run('models', { OMIT_TOOL: tool })
    assert.equal(result.status, 1, result.log)
    assert.match(
      result.log,
      tool === 'blender' ? /No \.tmp\.glb produced/ : /item\.glb/,
    )
    assert.doesNotMatch(result.log, /✨ Done/)
    assert.equal(
      readFileSync(path.join(f.output, 'models/item.glb'), 'utf8'),
      'old prepared model',
    )
    if (tool === 'gltf-transform') {
      assert.ok(existsSync(path.join(f.source, 'models/model/item.tmp.glb')))
    }
  })
}

for (const [tool, artifact] of [
  ['magick', 'textures/.wood-floor_diff_8bit.tmp.png'],
  ['toktx', 'textures/wood-floor_diff_2k.ktx2'],
  ['magick', 'textures/.wood-floor_norm_8bit_1k.tmp.png'],
  ['toktx', 'textures/wood-floor_nor_gl_1k.ktx2'],
  ['magick', 'previews/.wood-floor_preview_tile.tmp.png'],
  ['magick', 'previews/wood-floor.webp'],
]) {
  test(`textures reject stale ${artifact}`, (t) => {
    const f = fixture(t)
    const target = path.join(f.output, 'environment', artifact)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, 'stale artifact')
    const result = f.run('textures', {
      OMIT_TOOL: tool,
      OMIT_OUTPUT: path.basename(artifact),
    })
    assert.equal(result.status, 1, result.log)
    assert.ok(result.log.includes(path.basename(target)))
    assert.equal(readFileSync(target, 'utf8'), 'stale artifact')
    assert.match(result.log, /1 failure\(s\)/)
    assert.doesNotMatch(result.log, /✨ Export Complete/)
  })
}

for (const empty of [false, true]) {
  test(`textures fail for ${empty ? 'an empty source directory' : 'a missing mapped directory'}`, (t) => {
    const f = fixture(t)
    const dir = path.join(f.source, 'environment/textures')
    rmSync(empty ? dir : path.join(dir, wood), { recursive: true })
    mkdirSync(dir, { recursive: true })
    const result = f.run('textures')
    assert.equal(result.status, 1, result.log)
    assert.ok(result.log.includes(path.join(dir, wood)))
    assert.match(result.log, empty ? /4 failure\(s\)/ : /1 failure\(s\)/)
    if (!empty)
      assert.ok(
        existsSync(
          path.join(f.output, 'environment/previews/laminate-floor.webp'),
        ),
      )
  })
}

for (const kind of ['models', 'textures']) {
  test(`${kind} follow symlinked source folders`, (t) => {
    const f = fixture(t)
    const folder =
      kind === 'models' ? 'models/model' : `environment/textures/${wood}`
    if (kind === 'models') f.input(`${folder}/item.blend`)
    const original = path.join(f.source, folder)
    const external = path.join(f.source, 'external')
    renameSync(original, external)
    symlinkSync(external, original, 'dir')
    const result = f.run(kind)
    assert.equal(result.status, 0, result.log)
    assert.ok(
      existsSync(
        path.join(
          f.output,
          kind === 'models'
            ? 'models/item.glb'
            : 'environment/previews/wood-floor.webp',
        ),
      ),
    )
  })
}

test('models reject duplicate destinations and preserve the first output', (t) => {
  const f = fixture(t)
  f.input('models/a-first/item.blend')
  f.input('models/z-second/item.blend')
  const result = f.run('models')
  assert.equal(result.status, 1, result.log)
  assert.match(result.log, /Duplicate output.*a-first.*z-second/)
  assert.equal(
    readFileSync(path.join(f.output, 'models/item.glb'), 'utf8'),
    'stub export',
  )
})

for (const [tool, kind] of [
  ['gltf-transform', 'models'],
  ['toktx', 'textures'],
  ['magick', 'textures'],
]) {
  test(`${tool} failure preserves prepared files and removes staging`, (t) => {
    const f = fixture(t)
    f.input('models/model/item.blend')
    const files =
      kind === 'models'
        ? ['models/item.glb']
        : [
            'environment/textures/wood-floor_diff_2k.ktx2',
            'environment/textures/wood-floor_nor_gl_1k.ktx2',
            'environment/previews/wood-floor.webp',
          ]
    for (const file of files) {
      const target = path.join(f.output, file)
      mkdirSync(path.dirname(target), { recursive: true })
      writeFileSync(target, 'old prepared asset')
    }
    const result = f.run(kind, {
      FAIL_TOOL: tool,
      FAIL_INPUT:
        kind === 'models'
          ? 'item'
          : tool === 'magick'
            ? 'wood-floor/surface_nor'
            : 'wood-floor_nor',
    })
    assert.equal(result.status, 1, result.log)
    for (const file of files)
      assert.equal(
        readFileSync(path.join(f.output, file), 'utf8'),
        'old prepared asset',
      )
    assert.equal(
      readdirSync(f.output, { recursive: true }).some((file) =>
        /\.export-|\.tmp\.png$/.test(file),
      ),
      false,
    )
  })
}
