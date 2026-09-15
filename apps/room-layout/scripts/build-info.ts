import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'

export function readBuildInfo(appDirectory: string) {
  const manifest = JSON.parse(
    readFileSync(path.join(appDirectory, 'package.json'), 'utf8'),
  ) as { version: string }
  try {
    const git = (...args: string[]) =>
      execFileSync('git', args, {
        cwd: appDirectory,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    return {
      version: manifest.version,
      commit: git('rev-parse', '--verify', 'HEAD'),
      dirty: git('status', '--porcelain', '--untracked-files=normal') !== '',
    }
  } catch {
    return { version: manifest.version, commit: null, dirty: null }
  }
}
