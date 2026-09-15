import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { readBuildInfo } from './build-info.ts'

await test('build identity distinguishes clean, modified, and unavailable revisions', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'room-layout-build-info-'))
  try {
    writeFileSync(path.join(directory, 'package.json'), '{"version":"0.2.0"}')
    assert.deepEqual(readBuildInfo(directory), {
      version: '0.2.0',
      commit: null,
      dirty: null,
    })
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: directory,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    git('init')
    git('add', 'package.json')
    git(
      '-c',
      'user.name=Build test',
      '-c',
      'user.email=build@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'test fixture',
    )
    const commit = git('rev-parse', 'HEAD')
    assert.deepEqual(readBuildInfo(directory), {
      version: '0.2.0',
      commit,
      dirty: false,
    })
    writeFileSync(path.join(directory, 'package.json'), '{"version":"0.3.0"}')
    assert.deepEqual(readBuildInfo(directory), {
      version: '0.3.0',
      commit,
      dirty: true,
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
