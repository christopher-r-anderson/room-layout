# Plan: Startup State-Machine Restructure (scheduled — §6.3 Part B)

> **Status:** scheduled, **needs its own design review** before implementation.
> This is the deepest remaining seam in the de-threading effort and a genuine
> "wrong seam," not a relocation. Branch
> `editor-surface-keyboard-architecture-refactor`.

## The finding: two startup state machines

There are **two** startup phase machines that mirror each other:

- **`features/startup/use-startup-state.ts`** — a `useReducer` owning
  `loading-manifest → loading-assets → ready/error`, plus the manifest **fetch
  lifecycle** (AbortController + timeout), `retryKey`, and `cacheInvalidationKey`
  (which forces the `Scene` remount). It also runs the **mirror effects** that
  push phase → `editor-runtime-store` and data → `scene-assets-store`.
- **`editor-state/editor-runtime-store.ts`** — `loading → ready → errored` (+
  restore tracking, floor-finish loading). This is the **app-facing** phase every
  consumer reads (`useStartupPhase`, `useEditorInteractionsEnabled`, …).

The reducer is the source; the store is the mirror. The phase is duplicated.

## Why it blocks the last threads

`use-asset-lifecycle-controller` (the remaining action controller) wraps the
scene asset-ready/error callbacks + the one-time **restore flow**, and drives the
**reducer's** dispatchers. Critically, **retry re-runs the manifest-fetch effect**
(keyed on `retryKey`) and clears the GLTF cache — mechanics tied to the React
fetch effect. So:

- `onRetryAssetLoading` (threaded to `InitializationError`) can't be cleanly
  de-threaded — its one startup-coupled piece (`retryAssetLoading`) is the
  cache-clear + re-fetch trigger.
- `onSceneAssetsReady` / `onSceneAssetError` (threaded to the scene canvas in
  `EditorBody`) likewise drive reducer transitions + the restore flow.

These are the last `EditorOverlay`/scene threads besides `share` (deferred).

## Options

- **B1 — surgical.** Give `editor-runtime-store` a `retryToken`; the startup
  fetch effect keys on it instead of an internal `retryKey`. A coordinator
  (`requestAssetRetry()`: clear GLTF cache + bump token) lets asset-ready/error/
  retry become store-driven coordinators while a **thin** startup hook keeps only
  the fetch effect. Lower risk; resolves the retry thread. The restore flow
  likely extracts to its own startup coordinator.
- **B2 — full.** Collapse the two phase machines into `editor-runtime-store` as
  the single owner, reducing `use-startup-state` to a bootstrap effect (fetch →
  store actions). Cleanest end-state; bigger and riskier — touches the manifest
  fetch, GLTF cache, restore flow, and the `cacheInvalidationKey`-driven `Scene`
  remount.

Leaning **B1** first, with B2 as a later cleanup.

## Scope to design (when picked up)

- Where the **restore flow** (`handleSceneAssetsReady`'s draft/URL → apply
  orchestration, currently in the asset-lifecycle controller + `_shared/restore-flow`)
  should live — likely a startup coordinator in `editor-state` or `features/startup`.
- How `cacheInvalidationKey` (Scene remount key) is owned once the reducer is
  thinned/removed.
- The GLTF cache clear (`clearFurnitureCollectionCache`) home — it's a scene
  concern reached from retry.
- De-threading `onSceneAssetsReady`/`onSceneAssetError`/`onRetryAssetLoading`
  to feature self-sourcing once the transitions are store actions.

## Out of scope / deferred

- `share` stays a callback (Promise-returning result; handover-deferred).
- Documentation reconciliation remains the final stage
  (`plans/documentation-reconciliation.md`).
