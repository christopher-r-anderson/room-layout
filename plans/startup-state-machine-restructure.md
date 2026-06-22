# Plan: Startup State-Machine Restructure (§6.3 Part B)

> **Status:** ✅ **shipped** (full collapse). The two startup phase machines are
> collapsed into `editor-runtime-store`; the reducer and its mirror effects are
> gone, and the last asset-lifecycle threads are de-threaded.
> This is the deepest remaining seam in the de-threading effort — a genuine
> "wrong seam," not a relocation. Branch
> `editor-surface-keyboard-architecture-refactor`.
> **Seam model (decided in §6.3):** cross-cutting coordinators live in
> `editor-state`; features import them from there (never sibling features); app
> keeps only composition concerns. editor-state must not import app/features.

## The finding: two startup state machines, one mirrors the other

There are **two** phase machines, and the second is a mirror of the first:

- **`features/startup/use-startup-state.ts`** — a `useReducer` owning
  `loading-manifest → loading-assets → ready/error`, plus the manifest **fetch
  lifecycle** (AbortController + 5s timeout), `retryKey`, `cacheInvalidationKey`
  (forces the `Scene` remount), and the manifest payload. It runs two **mirror
  effects** that push phase → `editor-runtime-store` and manifest →
  `scene-assets-store`.
- **`editor-state/editor-runtime-store.ts`** — `loading → ready → errored` (+
  restore tracking + floor-finish loading). This is the **app-facing** machine
  every consumer reads (`useStartupPhase`, `useEditorInteractionsEnabled`, …).

**The reducer is the source; the store is the mirror; the phase is duplicated.**

### What the reducer actually owns, and where it really belongs

| Reducer state                         | True home today                              | Verdict                                  |
| ------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `phase`                               | mirrored → `editor-runtime-store.startupPhase` | **duplicate** — store should own it      |
| `manifestCatalog/Collections/Environment` | mirrored → `scene-assets-store`          | **duplicate** — store already owns it    |
| `assetError` / `assetErrorKind`       | mirrored → `editor-runtime-store.assetError` | **duplicate**                            |
| `cacheInvalidationKey`                | reducer only → EditorBody prop → remount key | a counter; can live in the store         |
| `retryKey`                            | reducer only → re-triggers fetch effect      | a counter; can be a store token          |

So the reducer exists **only** to (a) hold state it then mirrors elsewhere, and
(b) bump two counters that drive a React remount and a React fetch effect. Both
counters are plain integers — nothing about them requires a reducer.

### What is genuinely React-coupled (and must stay an effect)

- **The manifest fetch** (`fetchCatalogManifest` + AbortController + timeout +
  cleanup, keyed today on `retryKey`). This is a real side-effecting lifecycle.
- **The `Scene` remount** — `cacheInvalidationKey` is the `SceneAssetErrorBoundary`
  `key` in `editor-body.tsx`. A render concern, but the *value* is just a counter
  a component can read from a store.

### Imperative scene seams (callable from anywhere, no React needed)

- `preloadFurnitureCollections(paths)` / `clearFurnitureCollectionCache(paths)`
  (`scene/objects/furniture-catalog.ts`, thin `useGLTF.preload/clear` wrappers).
- `sceneCommands.restoreInitialLayout`, `clearSceneServices`.

### The mirror is already the real read-model

`App` destructures the hook for `catalog`, `collections`, `environmentConfig`,
`cacheInvalidationKey`, and the three handlers — **but every phase/flag it reads
(`editorInteractionsEnabled`, `startupLoadingActive`, `assetError`, …) it reads
from `editor-runtime-store`, not from the hook.** The hook's phase/flag returns
are already dead. That confirms the direction: make the store the sole owner and
the hook collapses to a bootstrap effect.

## Why this blocks the last threads

`use-asset-lifecycle-controller` (the last action controller) wraps the scene
asset-ready/error callbacks + the one-time **restore flow**, and drives the
**reducer's** dispatchers. Retry re-runs the fetch effect (via `retryKey`) and
clears the GLTF cache. So `onRetryAssetLoading`, `onSceneAssetsReady`, and
`onSceneAssetError` (the last `EditorOverlay`/scene threads besides `share`)
can't be cleanly de-threaded while the reducer is the source of truth.

## Recommendation: full collapse (not the surgical token)

The earlier draft floated **B1 (surgical: add a `retryToken`, keep the reducer
thin)** vs **B2 (full collapse)**. **I recommend the full collapse**, because the
duplication *is* the defect: B1 resolves the retry thread but leaves two phase
machines and the mirror effects in place — the exact smell this phase exists to
remove. Valuing end quality over change size, the right end-state is:

**`editor-runtime-store` becomes the single startup state machine.** No reducer,
no mirror. `use-startup-state` collapses to a thin bootstrap hook that runs only
the fetch effect and writes to stores. The asset-ready/error/retry transitions
become **editor-state coordinators**; the scene callbacks and the retry button
call them directly, de-threading the last props.

### Does the 3-phase store lose information? No.

The reducer's `loading-manifest` vs `loading-assets` split is **never surfaced** —
`startupLoadingActive` is `manifest || assets`, and `InitializationProgress` only
reads that boolean. The store's single `loading` covers both. The two counters
(`cacheInvalidationKey`, `retryKey`) move into the store as `sceneEpoch` and
`retryToken`; they stay *two* counters because their bump rules differ (epoch
bumps on every asset-load cycle so the Scene remounts; retryToken bumps only on
retry so the fetch re-runs).

## Target architecture

```
editor-runtime-store (editor-state)         ← SINGLE source of truth
  startupPhase: loading | ready | errored
  assetError, restoreOutcome, restoreAttemptCount, floorFinishLoading
  sceneEpoch   (was cacheInvalidationKey)   bump: beginAssetLoad + requestRetry
  retryToken   (was retryKey)               bump: requestRetry
  actions: markAssetsReady, setAssetError, beginAssetLoad(), requestRetry(), …

scene-assets-store (editor-state)           ← manifest payload (already exists)
  catalog, collections, environmentConfig   + useCollections() selector (new)

startup-coordinator (editor-state)          ← the transitions (was the controller)
  completeAssetLoad()   restore-once + markAssetsReady
  notifyAssetError(err) setAssetError + closeDialogs + resetStartupShell
  requestAssetRetry()   clearFurnitureCollectionCache + requestRetry() + reset
  resetStartupShell()   scene-state + selection-meta reset + clearSceneServices
  (imports: stores, sceneCommands, scene-draft, scene-url, restore-flow, toast)

scene-url (editor-state)                    ← MOVED out of features/url-scene
restore-flow (editor-state)                 ← MOVED out of app/controllers/_shared

use-startup-bootstrap (features/startup)    ← thin; only React-coupled work
  effect keyed on useRetryToken():
    fetchCatalogManifest → on ok:  sceneAssetsActions.setSceneAssets(...)
                                   runtimeActions.beginAssetLoad()
                                   preloadFurnitureCollections(...)
                           on err: runtimeActions.setAssetError(classified)
  (keeps catalog-manifest fetch + error classification — genuinely startup+effect)

EditorBody self-sources catalog / collections / sceneEpoch from the stores;
Scene onAssetsReady → completeAssetLoad; error boundary → notifyAssetError;
InitializationError retry → requestAssetRetry. No startup props threaded.
```

### Dependency-direction check

- `startup-coordinator` lives in editor-state, so it **cannot** import
  `features/url-scene` (scene-url) or `features/startup` (catalog-manifest).
  - scene-url is **relocated** to editor-state (see Decision D2) — it is
    scene-state↔URL serialization, not feature UI.
  - the coordinator does **not** need `fetchCatalogManifest`: retry just bumps
    `retryToken` (the bootstrap effect re-fetches) and clears the GLTF cache.
- `use-startup-bootstrap` (features/startup) imports editor-state actions +
  `catalog-manifest` (own feature) + `preloadFurnitureCollections` (scene). All
  allowed (feature → editor-state/scene/own-feature).
- `restore-flow.types` already imports `editor-runtime-store` (a type) — same
  layer once moved. ✓

## Decisions (confirmed)

- **D1 — Approach: full collapse.** Remove the second phase machine and the
  mirror; `editor-runtime-store` becomes the single owner. (Rejected: surgical
  retry-token, which would leave both phase machines in place.)
- **D2 — `scene-url` home: `editor-state/scene-url`.** Relocated out of
  `features/url-scene`, co-located with `scene-draft` and the restore
  coordinator; the three app importers + url-scene repoint there. (Rejected:
  `shared/lib/three`, which would split scene-persistence across two layers.)
- **D3 — EditorBody scene-data: self-source now.** EditorBody reads
  `catalog`/`collections`/`sceneEpoch` from the stores; the three props are
  removed in the flip slice rather than deferred.

## Slice plan (each: full validation gate + a11y/hotkeys/startup e2e)

All five slices shipped; each landed green (typecheck/lint, unit, knip at
baseline) with the startup/retry/restore + a11y/hotkeys/dialogs e2e flows.

1. ✅ **Store becomes capable.** Added `sceneEpoch`, `retryToken`,
   `beginAssetLoad()`, `requestRetry()` (+ `useSceneEpoch`, `useRetryToken`) to
   `editor-runtime-store`. Pure addition, nothing wired.
2. ✅ **Relocate `scene-url`** (D2) out of `features/url-scene`; repointed the
   share-controller, restore-flow, and asset-lifecycle importers.
3. ✅ **Build the coordinator.** Moved `restore-flow` + `restore-flow.types`
   into editor-state; added `editor-state/startup-coordinator.ts`
   (`completeAssetLoad`, `notifyAssetError`, `requestAssetRetry`) sourcing
   catalog/finishes/collections from scene-assets-store. Tested but dormant
   (controller still wired) so the slice kept the mirror intact.
4. ✅ **Flip the source of truth.** Replaced the `use-startup-state` reducer with
   `use-startup-bootstrap` (fetch effect keyed on `useRetryToken()` → store
   writes); EditorBody self-sources catalog/collections/sceneEpoch (D3); Scene
   asset-ready/error + retry wired to the coordinator; deleted
   `use-startup-state`, `use-asset-lifecycle-controller`, `startup-transitions`,
   `reset-startup-state`, and the unused `whenSceneServicesReady` facade.
5. ✅ **De-thread the last props.** EditorBody/EditorOverlay import the
   coordinator directly; removed the `onSceneAssetsReady`/`onSceneAssetError`/
   `onRetryAssetLoading` props. App's `editorOverlay` is now just
   `{ topHeader: { onShareSceneUrl } }`.

## Risk

Startup, retry, restore-from-URL, restore-from-draft, and asset-error recovery
are the highest-stakes flows in the app and are e2e-guarded. The flip (slice 4)
is the one substantive change; slices 1–3 are additive/relocations that keep the
mirror intact, so the flip is mechanical once they land. The Scene-remount key
moving from a prop to a store read is the subtlest part — verify a retry still
remounts the canvas and reloads GLTFs.

## Out of scope / deferred

- `share` stays a callback (Promise-returning result; handover-deferred).
- `use-draft-persistence` (features/url-scene) stays put — it is a scene-state
  subscription reconciler, not part of the startup machine. (Its eventual home
  is a separate question once url-scene is otherwise emptied.)
- Documentation reconciliation remains the final stage
  (`plans/documentation-reconciliation.md`).
