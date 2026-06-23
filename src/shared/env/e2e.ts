// True when this bundle was built (or served) for end-to-end tests. The e2e
// Playwright webServer sets VITE_E2E=true at build time; real production builds
// never set it.
//
// Test-only instrumentation (the scene-state bridge, the perf counters) gates on
// this so it works in the e2e production preview build — where
// import.meta.env.DEV is false — while still being fully tree-shaken out of real
// production bundles. Render quality is a separate concern
// (VITE_E2E_RENDER_QUALITY); the two are kept independent so an e2e build is not
// forced to a particular rendering path.
export const IS_E2E_BUILD = import.meta.env.VITE_E2E === 'true'
