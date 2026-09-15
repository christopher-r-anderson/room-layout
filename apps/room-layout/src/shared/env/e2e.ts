/**
 * Set by the e2e Playwright webServer at build time, never by real production
 * builds. Test-only instrumentation gates on this so it works in the e2e
 * production preview (where import.meta.env.DEV is false) while tree-shaking
 * out of real bundles. Render quality is a separate flag
 * (VITE_E2E_RENDER_QUALITY).
 */
export const IS_E2E_BUILD = import.meta.env.VITE_E2E === 'true'
