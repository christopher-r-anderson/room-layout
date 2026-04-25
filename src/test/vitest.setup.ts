import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React requires this test flag when libraries invoke act() internally.
;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const originalConsoleWarn = console.warn.bind(console)
// These warnings are emitted by external library internals during tests.
const externalThreeWarnings = [
  'THREE.WARNING: Multiple instances of Three.js being imported.',
  'THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
]
const loggedExternalWarnings = new Set<string>()

console.warn = (...args: unknown[]) => {
  const [firstArg] = args

  if (
    typeof firstArg === 'string' &&
    externalThreeWarnings.some((warning) => firstArg.includes(warning))
  ) {
    if (loggedExternalWarnings.has(firstArg)) {
      return
    }

    loggedExternalWarnings.add(firstArg)
  }

  originalConsoleWarn(...args)
}

afterEach(() => {
  cleanup()
})
