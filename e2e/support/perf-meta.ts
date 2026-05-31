import { execSync } from 'node:child_process'

let perfBaselineSha: string | null = null

export function getPerfBaselineSha() {
  if (perfBaselineSha) {
    return perfBaselineSha
  }

  const envSha = process.env.PERF_BASELINE_SHA?.trim()
  if (envSha) {
    perfBaselineSha = envSha
    return perfBaselineSha
  }

  perfBaselineSha = execSync('git rev-parse --short HEAD', {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim()

  return perfBaselineSha
}
