# Startup and Asset Loading

How the app goes from a cold load to an interactive editor, and how furniture
collections stream in. The organizing principle is **environment-first**: the
room, lighting, and camera are interactive within seconds, and furniture models
load independently rather than blocking first paint.

## Bundle split

First paint depends only on a small shell; the heavy 3D engine and the editor
chrome are code-split out and load lazily. Budgets are regression-gated by
`scripts/check-bundle-budget.mjs`.

| Chunk                          | Contents                                                                         | Loads                                         |
| ------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------- |
| shell (`index-*.js`)           | app skeleton, the loading UI, the engine-free byte source, placement geometry   | eagerly (first paint)                         |
| engine (`scene-canvas-*.js`)   | three / r3f / drei / postprocessing                                              | lazily, in parallel with the shell's fetches  |
| chrome (`editor-overlay-*.js`) | editor panels, toolbars, icon deps                                               | lazily, once the editor is interactive        |

Two consequences worth knowing:

- **The collection byte source is deliberately engine-free** (`core/operations/collection-bytes.ts`
  deals only in `ArrayBuffer`s, no three import). Because it ships in the shell, a
  restored scene's furniture bytes download _in parallel_ with the larger engine
  chunk instead of waiting for it.
- **`index.html` renders an `#app-skeleton` loader that mirrors the React loader**
  (`InitializationProgress`) element-for-element, so the handoff from static HTML
  to the mounted app has no layout shift.

## Startup phases

`core/stores/editor-lifecycle-store.ts` holds `startupPhase: 'loading' | 'ready' | 'errored'`:

- `loading` - the opaque loader overlay covers the (already-mounting) canvas; editor
  interactions are disabled.
- `ready` - overlay gone, editor interactive.
- `errored` - the startup error overlay with a retry.

Two supporting signals:

- `sceneEpoch` / `retryToken` bump on load/retry and re-key the scene subtree, so a
  retry remounts a fresh scene and loader.
- `sceneMounted` - a reactive flag the `Scene` sets on mount/unmount (through
  `scene-contracts`). Readiness gates on it so the overlay never lifts before the
  canvas has mounted (an empty scene has no furniture to wait on, so without this
  the overlay could clear before first paint).

## The loading pipeline

```mermaid
flowchart LR
  boot["bootstrap\n(fetch manifest,\ncompute gated set)"] --> bytes["byte source\n(shell, engine-free)"]
  bytes --> pipeline["load pipeline\n(core, reconciler-kicked)"]
  pipeline --> parse["parse in scene\n(service; KTX2 needs the renderer)"]
  parse --> registry["scene registry\n(Object3D)"]
  pipeline --> store["core loading store\n(loaded / failed)"]
  store --> ready["readiness observer\n-> ready / errored"]
```

- **Bootstrap** (`features/startup/use-startup-bootstrap.ts`): fetches and validates
  the catalog manifest into `assets-store`, resolves the **gated set** - the
  collections the restored URL/draft actually references
  (`core/persistence/referenced-collections.ts`) - into the loading store, and
  warms the byte source for it. The gated set is `null` until resolved (and again
  after a retry resets it), so readiness can never complete against a stale or
  unknown gate.
- **Byte source** (`core/operations/collection-bytes.ts`): one fetch per
  collection per cycle, shared by every consumer - bootstrap warms the gated set,
  on-demand paths start on first request. Buffers are released once parsed (the
  registry's parsed scene supersedes them); a failed fetch forgets its entry so a
  re-request retries.
- **Stream-fetch** (`core/operations/stream-fetch.ts`): a streaming fetch with a
  _stall_ timeout (aborts if no bytes arrive for ~15s, rather than a total-duration
  cap, so slow connections are not failed) that reports byte progress and throws
  `AssetHttpError` on a non-ok response.
- **Load pipeline** (`core/operations/collection-loader.ts`): core drives each
  load end-to-end - fetch the bytes, have the scene parse and register them
  (`sceneCommands.loadCollectionScene`, backed by
  `scene/internal/furniture/collection-scene-loader.ts`, which needs the live
  `WebGLRenderer` for KTX2), then mark the outcome in the loading store. A
  standing reconciler kicks pending loads whenever their inputs change (scene
  mounts, gate resolves, an item appears, an on-demand request arrives), so the
  chain never depends on React render timing. Loads are keyed to the scene epoch;
  a stale cycle's result is discarded rather than written into a fresh one.
- **Readiness** (`features/startup/use-startup-readiness.ts`, run from `App`): once
  startup is loading, the scene has mounted, and the manifest is present, it resolves
  the gated collections - every one loaded -> `completeAssetLoad`; any one failed ->
  `notifyAssetError`. It fires once per cycle because firing flips the phase off
  `loading`.

The split of state is intentional: the parsed `Object3D`s are a scene render
artifact (`collection-scene-registry`, scene-internal), while the three-free
loading lifecycle - the gate, progress, which collections are wanted, loaded, or
failed - lives in `core/stores/collection-loading-store.ts` next to the byte
source and gating it coordinates with. The scene contributes exactly one
capability, parse-and-register, through scene services; registration happens
inside it, before core marks the collection loaded, so consumers may read the
registry on the strength of the core flag.

## Gated vs on-demand

- **Gated** collections gate the unlock. A fresh or empty scene references none, so
  it becomes interactive as soon as the scene mounts and the manifest is present -
  it never waits on furniture.
- **On-demand** collections are catalog adds. Selecting an item warms it
  (prefetch-on-select) and the add awaits its parse (`ensureCollectionLoaded`), so a
  not-yet-loaded model resolves before it is placed rather than popping in. The
  wanted set lives in the loading store and keeps an added item's collection
  available for the session.

Both paths run through the same pipeline and the same byte source; the only
difference is when the download starts (bootstrap warms the gated set, an
on-demand path starts on first request).

## Failure model

Failures are classified (`collection-loading-store.ts`) as:

- **`unavailable`** - a non-ok HTTP response (`AssetHttpError`) or a
  post-download failure such as a GLB parse error: the model is missing or
  broken. Permanent; never auto-retried.
- **`connection`** - a network error or stall abort. Transient; a re-request retries.

How each surfaces:

| Failure                                         | Surface                                            | Recovery                           |
| ----------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| Manifest fetch fails                            | startup error overlay                              | retry                              |
| A **gated** collection fails                    | startup error overlay                              | retry (re-downloads)               |
| An **on-demand** add fails                      | toast (the open drawer aria-hides the status line) | re-add retries a transient failure |
| A permanently `unavailable` catalog item        | shown non-selectable in the catalog                | -                                  |
| A loaded GLB missing a manifest-referenced node | startup error (via the scene error boundary)       | fix the asset/manifest             |

The add flow never hangs: `ensureCollectionLoaded` rejects on failure so the drawer
can message by cause instead of waiting forever.

## Retry

`requestAssetRetry` (`core/operations/startup-coordinator.ts`) resets the core
loading lifecycle and the scene registry, clears the byte source, and bumps the
epoch so the remounting Scene re-kicks the loads and re-downloads; a load still
in flight from the stale epoch discards its result. Reset happens **only** on an
explicit retry - on the error path a gated failure's mark survives, so the
pipeline does not immediately re-attempt and loop.

## Pointers

- Phases / signals: `core/stores/editor-lifecycle-store.ts`
- Gating: `core/persistence/referenced-collections.ts`
- Fetch: `core/operations/stream-fetch.ts`, `core/operations/collection-bytes.ts`
- Loading state: `core/stores/collection-loading-store.ts`
- Load pipeline: `core/operations/collection-loader.ts`
- Parse / registry: `scene/internal/furniture/collection-scene-loader.ts`, `collection-scene-registry.ts`
- Orchestration: `features/startup/use-startup-bootstrap.ts`, `use-startup-readiness.ts`, `core/operations/startup-coordinator.ts`
- Bundle budgets: `scripts/check-bundle-budget.mjs`

## Related docs

- `docs/architecture/architecture.md`
- `docs/architecture/scene-and-core.md`
- `docs/architecture/catalog-and-assets.md`
- `docs/reference/catalog-manifest-schema.md`
