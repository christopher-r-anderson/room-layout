# Phase 1 — State Foundation (Plan)

This plan implements **Item A** (introduce editor stores) and **Item B** (collapse the scene `SceneRef` + read-model duality) from `architecture-refactor-outline.md`. After Phase 1, cross-cutting editor state lives in stores, the scene is store-driven, and `App.tsx` no longer pushes scene state up only to pass it back down.

This is a behavior-preserving refactor. Visual output, keyboard shortcuts, accessibility semantics, focus order, persistence, URL restore, and announcements must all be unchanged.

## Outcome

- Zustand is the chosen store library. It is added as a runtime dependency.
- A new `src/editor-state/` directory contains four narrowly-scoped stores. Each store has a vanilla store (`createStore`) + React hooks (`useStore`) so non-React consumers (scene internals, test harness, URL restore) can read and subscribe without React.
- `Scene` no longer accepts callback props for selection, history, drag, or read-model changes. It writes to the scene state store internally. App-shell components subscribe to the store.
- `SceneRef` is reduced to genuinely imperative operations only.
- `useOverlayState`, `useSceneSync`, `useDialogState`, and `usePreviewState` are deleted; `usePreviewController` shrinks to a thin coordinator.
- `App.tsx` no longer holds local `selectedToolbarGeometry` / `isSceneDragging` / dialog state, no longer passes scene callback props, and no longer imports `useOverlayState`. (No line-count target — the file is done when those things are true.)
- All existing unit and e2e tests continue to pass. New tests cover store actions, identity stability under no-op updates, and the scene-services registration boundary.

## Out of scope for Phase 1

These belong to later phases. Do not do them now even if they are tempting:

- Splitting `useSceneHandlers` (Item C / Phase 2).
- Replacing `useOverlayProps` (Item D / Phase 2). It will continue to exist in Phase 1, but its argument list shrinks naturally as values move into stores.
- Touching `SelectedItemControls` placement (Item E / Phase 3). Toolbar geometry moves into a store, but the component continues to consume it the same way.
- Reorganizing folders into `editor-state` / `editor-shell` / `editor-ui` (Item F / Phase 4). Phase 1 introduces `src/editor-state/` because there is no good alternative home for the new stores; it does not move existing files.
- Sweeping consumers of `SceneReadModel` (currently used in `App.tsx`, `useSceneHandlers`, `useOverlayProps`, `Outliner`, and `useOverlayState`'s test). The type is kept as a back-compat re-export from the scene state store; the full sweep happens in Phase 2 when `useOverlayProps` is removed.

---

## Cross-cutting design decisions (lock these before implementing)

These five decisions are called out up front because they affect every store and every action signature. They must not drift during implementation.

### D1. Undo/redo history lives in the scene state store

The full `HistoryState<FurnitureItem[]>` stack moves into `scene-state-store`. `items` is a derived view of `history.present`, so the store exposes both a primitive `history` field (for the undo/redo actions and the dragging commit path) and a `useItems()` selector that returns `history.present` with stable identity. Today's `useSceneDrag` mid-drag `setHistory` call becomes a `sceneStateActions.commitDragHistory(nextItems)` action call.

Rationale: any other split (history in scene, present mirrored to store) leaves us with the same two-sources-of-truth problem this phase exists to delete. The mid-drag commit path is the one case to validate against perf traces (see watch-out), but the store update happens at most once per drag commit, not per frame.

### D2. The `instanceIdRef` counter moves with `addFurniture`

The scene's `instanceIdRef` becomes a private field on `scene-state-store` (or a module-level counter in `scene-state-store.ts`, seeded by `restoreInitialLayout`). The `addFurniture` action owns id generation. `restoreInitialLayout` advances the counter past the highest restored suffix, matching today's behavior.

### D3. Action signature contract: actions return results; callers announce

Actions are side-effect-free with respect to announcements, toasts, and DOM focus. They return the same discriminated-union results in use today (`SelectByIdResult`, `MoveSelectionResult`, `UpdateSelectionTransformResult`). `useSceneHandlers` (and its eventual Phase 2 replacements) inspect the result and call the announcer / toast / focus APIs.

Rationale: keeps `editor-state/` free of `sonner`, `useAnnouncements`, and any React-DOM coupling. Makes actions trivially testable in isolation.

### D4. Cross-store actions take their cross-store inputs explicitly

Selection state is split: `selectedId` is in `scene-state-store`, `selectedSource` is in `selection-meta-store`. Rather than have one store subscribe to the other, action signatures that span both stores take both inputs explicitly. Concretely:

- `sceneStateActions.selectById(id, { source })` writes `selectedId` to scene-state-store AND writes `source` to selection-meta-store in a single action body. The action lives in a small `editor-state/cross-store-actions.ts` module that imports both stores' vanilla handles. Same pattern for `clearSelection({ source })`.
- The reverse pattern is forbidden: stores do not subscribe to each other. The only coupling is via the cross-store action layer.

Rationale: subscription-based coupling makes the data flow opaque and hard to test; explicit action composition keeps the call graph readable.

### D5. Draft persistence becomes a store subscriber

The `saveSceneDraft` / `clearSceneDraft` effect currently in `App.tsx` moves to a new `src/app/use-draft-persistence.ts` hook that subscribes to `scene-state-store` for `items`, `isDragging`, `floorFinishId`, `wallFinishId`, and to `editor-runtime-store` for `startupPhase`. The gating logic (skip during startup loading, skip during drag, clear vs. save based on `isFreshSceneState`) is unchanged. Mounted once from `App.tsx`.

Rationale: persistence is editor-shell concern, not a store concern; keeping it in the app layer means `editor-state/` has no awareness of localStorage or the draft schema.

---

## Stores (final shape)

Create the following four stores under `src/editor-state/`. Each store gets its own file. Use the `create` factory pattern combined with `createStore` for vanilla access.

### 1. `editor-runtime-store.ts`

State:

- `startupPhase: 'loading' | 'ready' | 'errored'`
- `assetError: { kind: StartupErrorKind; message: string } | null`
- `restoreOutcome: RestoreOutcome | null`
- `restoreAttemptCount: number`

Derived selectors (exported as hook helpers):

- `useEditorInteractionsEnabled()` — `startupPhase === 'ready'`
- `useStartupOverlayActive()` — `startupPhase !== 'ready'`
- `useStartupLoadingActive()` — current logic from `useStartupLifecycle`

Actions:

- `markAssetsReady()`
- `setAssetError(error)`
- `clearAssetError()`
- `recordRestoreOutcome(outcome)`
- `incrementRestoreAttempt()`
- `resetEditorRuntime()`

Migration source: `useStartupLifecycle`, the asset-error refs in `App.tsx`, the restore-outcome refs in `useSceneHandlers`.

### 2. `scene-state-store.ts`

State:

- `history: HistoryState<FurnitureItem[]>` — full undo/redo stack (see D1).
- `instanceIdCounter: number` — id seed for `addFurniture` (see D2). Implemented as private module state if Zustand serialization concerns it.
- `selectedId: string | null`
- `previewedIdRaw: string | null` — the unfiltered preview id. The gating layer (see below) derives the visible `previewedId` from this plus runtime state. Stored separately so the gates can be applied in selectors without losing user intent.
- `historyAvailability: { canUndo: boolean; canRedo: boolean }` — derived and cached on history mutation to preserve identity stability for downstream consumers.
- `isDragging: boolean`
- `floorFinishId: string`
- `wallFinishId: string`
- `editorMessage: string | null`

Derived selectors:

- `useItems()` — returns `history.present`. Stable identity unless history mutates.
- `useSelectedFurniture()` — finds the selected item from `items` + `selectedId`. Memoized.
- `useItemIds()` — returns the array of `items[*].id`. Stable identity unless the id list changes.
- `usePreviewedId({ isBlockingOverlayOpen, editorInteractionsEnabled })` — applies the gates from today's `usePreviewState` (`isDragging` from this store, `isBlockingOverlayOpen` + `editorInteractionsEnabled` passed in, membership in `itemIds`) and returns the visible preview id. The membership-reconciliation effect (set raw to null when the previewed item disappears) becomes an internal store subscription: the store watches its own `history.present` and clears `previewedIdRaw` when it leaves the id set.
- `useSceneReadModel()` — back-compat selector returning `{ selectedId, items }`. Will be swept and removed in Phase 2.

Actions:

- `setItems(items)` — convenience for restore paths; writes a fresh single-state history.
- `setSelectedId(id)` — also clears `previewedIdRaw` when transitioning to a different selection (mirrors current `usePreviewController` behavior).
- `setPreviewedId(id)` — writes `previewedIdRaw`. Gating happens at read time.
- `commitDragHistory(items)` — used by `useSceneDrag` mid-drag; pushes a history entry from a drag commit.
- `applyMove(...)`, `applyRotation(...)`, `applyTransform(...)` — internal action implementations behind the public `moveSelection` / `rotateSelection` / `setSelectionTransform` exports. They consult `scene-services` (see B.4) for collision and bounds; they return today's discriminated-union results.
- `addFurniture(catalogId)` — generates the next id, places via `scene-services`, returns `{ ok, id } | { ok: false, reason }`.
- `deleteSelection()` — returns `boolean`.
- `undo()` / `redo()` — return `boolean`.
- `restoreInitialLayout(instances)` — replaces the history baseline, advances `instanceIdCounter`, clears selection/preview.
- `setDragging(isDragging)`
- `setFloorFinishId(id)` / `setWallFinishId(id)`
- `setEditorMessage(message)` / `clearEditorMessage()`
- `resetSceneState()` — used by `resetEditorShellState`.

Migration sources: `useOverlayState` (most fields), the scene's internal React state for `history` / selection / `instanceIdRef`, `usePreviewState` (gating logic moves into the selector), `usePreviewController` (the lifecycle around `previewedIdRaw` membership).

### 3. `selection-meta-store.ts`

State:

- `selectedSource: InteractionSource`
- `toolbarGeometry: SelectedToolbarGeometry`
- `outlinerFocusRequest: SceneOutlinerFocusRequest | null`

Actions:

- `setSelectedSource(source)`
- `setToolbarGeometry(geometry)` — internal equality check (same logic as `areSelectedToolbarGeometriesEqual` in `App.tsx`; lift the helper into the store file).
- `requestOutlinerFocus(request)` / `clearOutlinerFocusRequest()`

Migration source: `useOverlayState` (selectedSource), App-local `selectedToolbarGeometry` `useState`, `useSceneSync` (outliner focus request).

This is split from the scene state store because changes here should not invalidate scene rendering subscriptions.

**Toolbar geometry write discipline.** The scene's `useFrame` toolbar-geometry computation already runs a deadband short-circuit (`TOOLBAR_GEOMETRY_DEADBAND_PX`) before deciding whether to emit. That deadband **must remain in the scene, before the store action is called.** The store's `setToolbarGeometry` equality check is a backstop, not the primary gate. Without this, idle camera tracking would fan out a store notification every frame to every subscriber even when the value hasn't meaningfully changed.

### 4. `dialog-store.ts`

State and actions: a near-direct port of today's `useDialogState`. The shape is already correct; convert the React-internal state into a Zustand store and replace `useDialogState` with `useDialogStore` selectors.

Migration source: `src/app/overlay/use-dialog-state.ts`.

### Store conventions

All four stores must:

- Export a typed `useXStore` hook that takes a selector and an optional equality function.
- Export individual scoped selector hooks (e.g. `useSelectedId`, `useItems`) that wrap `useXStore`. Components prefer these over passing inline selectors so the call sites stay clean.
- Export an `xStore` vanilla store object (the `StoreApi`) for non-React access.
- Export an `xActions` object (or named functions) bound to the vanilla store. Actions never accept the store as an argument; they close over it.
- Live as plain `.ts` files, not `.tsx`. No JSX, no React-component imports.
- Use `subscribeWithSelector` middleware. The scene needs selector-scoped non-React subscriptions (`selectedId` change → mesh resolution), and the draft-persistence hook benefits from the same. Standardizing on this middleware up front avoids retrofitting later.
- Add an ESLint rule that bans imports of React-component modules (`.tsx`, anything under `src/app/`, `src/scene/scene.tsx`) from `src/editor-state/**`. Phase 4 / Item F will broaden this; Phase 1 enforces it locally so drift cannot start.

---

## Item A — Migration steps

Do these in order. Each step ends with a green test run.

### A.1 — Add Zustand and scaffold `src/editor-state/`

- `pnpm add zustand`
- Create `src/editor-state/` with `index.ts` re-exporting the four stores once they exist.
- Add a single placeholder `src/editor-state/store-types.ts` for shared types (e.g. equality helpers).
- Update `tsconfig` paths if needed (the `@/` alias should already cover this).

### A.2 — Stand up `dialog-store.ts` and migrate `useDialogState`

This is the smallest, most isolated migration; do it first to validate the pattern.

- Port state/actions from `src/app/overlay/use-dialog-state.ts`.
- Replace `useDialogState()` call sites in `App.tsx` (and anywhere else; check `useSceneHandlers`, `useOverlayProps`, `EditorOverlay`) with selector hooks.
- Delete `use-dialog-state.ts` and its tests; add equivalent tests under `src/editor-state/dialog-store.test.ts` covering open/close, dialog stack, return-focus targets, room-surface layout transitions.

### A.3 — Stand up `editor-runtime-store.ts` and migrate startup state

- Port state/actions, keeping the existing `runStartupAssetErrorTransition` / `runStartupRetryTransition` functions but making them accept the store actions instead of the React setters.
- Replace `useStartupLifecycle` consumers in `App.tsx` and `useSceneHandlers`. Keep `useStartupLifecycle` as a thin compatibility shim during this step if it makes the diff smaller; delete it at the end.
- Move `assetsReadyRef`, `assetErrorRef`, `restoreOutcomeRef`, `restoreAttemptCountRef` reads in the test harness to `editorRuntimeStore.getState()` calls.
- Add `src/editor-state/editor-runtime-store.test.ts`.

### A.4 — Stand up `selection-meta-store.ts`

- Port `selectedSource`, `toolbarGeometry` (with the equality helper), and `outlinerFocusRequest`.
- Replace the App-local `selectedToolbarGeometry` `useState` and the `handleSelectedToolbarGeometryChange` callback with a direct store action.
- For `outlinerFocusRequest`: **defer the migration to B.5** rather than leaving `useSceneSync` half-migrated across steps. In A.4, the store field exists and is tested in isolation, but `useSceneSync` continues to own focus-request state until B.5 deletes it. This keeps each commit's behavior unambiguous.
- Add `src/editor-state/selection-meta-store.test.ts`.

### A.5 — Stand up `scene-state-store.ts` (writers still in old places)

- Port all fields with their current update semantics. Crucially: keep the equality checks from `useOverlayState.handleSceneReadModelChange` so we do not regress identity stability.
- During this step, `useOverlayState` becomes a thin adapter that writes to the store. The scene still pushes via `onReadModelChange` etc.; the adapter forwards.
- Update `App.tsx` to read items/selectedId/historyAvailability/etc. from selectors; `useOverlayState` returns nothing meaningful by the end of this step.
- Add `src/editor-state/scene-state-store.test.ts` covering action behavior including the "selecting a new id clears preview" rule.

After A.5 the stores exist and are populated; the scene still owns its own React state and pushes via callbacks. Item B removes that duplication.

---

## Item B — Migration steps

### B.1 — Scene/store boundary (locked by D1–D5)

- The undo/redo history stack lives in the store (D1). `useSceneDrag`'s mid-drag `setHistory` becomes a call to `sceneStateActions.commitDragHistory(...)`.
- The `instanceIdRef` counter moves with `addFurniture` (D2).
- Three.js meshes remain the rendering source of truth for in-progress drag positions; the store is updated once per drag commit, not per frame.
- The `pointerTarget` transient field on items keeps its existing emission cadence; only the destination (store action vs. ref callback) changes.
- `selectedObject` and the `objectRefs` `registerObject` map stay scene-internal — they hold `Object3D` instances and have no business in React state. The inversion is: when `selectedId` changes (in the store), the scene subscribes via `subscribeWithSelector` and resolves the corresponding mesh on its side. The outline-layer assignment and focus animations run from that subscription, not from a React render.

### B.2 — Replace `useSceneSelection`'s React state with the store

- `useSceneSelection` currently owns `selectedFurniture` React state, the `objectRefs` map, the resolved `selectedObject`, and emits `onSelectionChange`. After B.2:
  - The hook no longer holds `selectedFurniture`. `selectedId` lives in `sceneStateStore`. App-shell consumers use `useSelectedFurniture()`.
  - The `objectRefs` map and `registerObject` callback stay scene-internal — they hold `Object3D` instances.
  - `selectedObject` is computed inside the scene by subscribing to `sceneStateStore`'s `selectedId` via `subscribeWithSelector` and looking up the registered ref.
  - Drop the `onSelectionChange` prop.
- Migrate the full undo/redo history (per D1) into the store: the scene drops its `useState`-held `history` and reads `useHistory()` / `useItems()` from the store; mutating paths (`useSceneDrag`, `selectById`, etc.) call store actions.
- Migrate `isDragging` and `pointerTarget` items emission — write into store on change, drop `onDragStateChange`.
- Migrate `selectedToolbarGeometry` — write into `selectionMetaStore` (after the in-scene deadband check, per the toolbar geometry write-discipline note), drop `onSelectedToolbarGeometryChange`.

### B.3 — Migrate scene commands to actions

`SceneRef` commands fall into three buckets:

**Buckets that become store actions (no longer on `SceneRef`):**

- `selectById`, `clearSelection`
- `moveSelection`, `setSelectionTransform`, `rotateSelection`
- `addFurniture`
- `deleteSelection`
- `undo`, `redo`
- `restoreInitialLayout`
- `getSnapshot` / `getReadModel` — replaced by store selectors / `getState()`

For each: implement the action as a function in `scene-state-store.ts` (or a sibling `scene-actions.ts` if the action needs access to internals like collision detection). Where actions need access to three.js geometry (collision check, bounds, mesh resolution), the scene component registers a "scene services" object on a small internal registry (see B.4); actions consult that registry.

**Buckets that stay imperative on a slimmed `SceneRef`:**

- `setCameraPreset`
- `focusSelected`
- `setCameraKeyState`

These are tied to the camera controls instance and do not benefit from being in a store.

### B.4 — Internal scene services registry

Some actions (`moveSelection`, `addFurniture`, drag commits) need access to live three.js data: meshes, bounds, collision tests. Today this is closures inside the scene component.

Introduce a private module `src/scene/internal/scene-services.ts` that exposes:

- `registerSceneServices(services)` / `clearSceneServices()` — called by the scene on mount/unmount.
- `getSceneServices()` — used by store actions; throws with a clear message if called before registration.
- `whenSceneServicesReady(): Promise<SceneServices>` — async accessor for startup-path callers that must wait for mount (see lifecycle ordering below).

`services` includes: collision check function, bounds resolver, mesh resolver, room-bounds constants — only what actions actually call. Keep this surface as small as possible; do not let it become a back door.

**Lifecycle ordering.** `registerSceneServices` is called in a `useLayoutEffect` on `Scene` mount, before any startup action that needs it. Restore actions run from `useSceneHandlers` on the `assetsReady` transition, which can fire from a Suspense fallback unwind in the same render cycle as Scene's first mount. To avoid an ordering hazard, restore actions go through `whenSceneServicesReady()` (or equivalent: services available synchronously when registered, otherwise queued to fire on next registration). The test in `scene-services.test.ts` covers both the synchronous-after-register path and the queued-before-register path. The startup flow test (`use-scene-handlers.startup.test.ts`) asserts that restore actions never throw due to ordering.

**Singleton constraint.** The registry is a module-level singleton. This bakes "exactly one Scene instance per app" into the architecture. That is consistent with current behavior and acceptable; a future split-view or multi-scene feature would need to convert this to an instance-scoped context. Document this constraint in `docs/editor-state-architecture.md`.

### B.5 — Trim `SceneRef` and update consumers

- New `SceneRef` shape: `{ setCameraPreset, focusSelected, setCameraKeyState, getCameraPosition }`. Consider renaming to `SceneCameraRef`.
- `getCameraPosition()` is added because the test harness currently exposes `cameraPosition` and that value comes from the live camera-controls instance, not state. Keep that read going through the ref (or equivalently through scene-services if the ref is fully retired); do not synthesize it from store state.
- Update all `sceneRef.current.X` call sites. Most disappear; the camera ones remain.
- Migrate `outlinerFocusRequest` from `useSceneSync` to `selectionMetaStore` (the field was scaffolded in A.4); delete `useSceneSync`.
- Delete `useSceneCommands` if all callers have moved to store actions; otherwise document the residual caller and why.
- The test harness (`window.__ROOM_LAYOUT_TEST__`) reads from `sceneStateStore.getState()` and `editorRuntimeStore.getState()` for state fields, and from `sceneRef.current?.getCameraPosition()` for `cameraPosition`. The public snapshot shape is unchanged.

### B.6 — Wire `useSceneHandlers` to use store actions

`useSceneHandlers` does not get split in Phase 1. But because its `Commands` slice now points at store actions and its `OverlayState`/`Sync` slices read from stores, the parameter list shrinks substantially.

Per D3, actions return discriminated-union results; `useSceneHandlers` continues to own the announcer / toast / focus side effects keyed off those results. The wrapping shape is preserved — only the function being wrapped changes (ref method → store action).

Update the option type and the `App.tsx` call site. Tests for `useSceneHandlers` need parameter-shape updates only (mock store actions instead of ref methods); assertions on announcements/toasts stay.

### B.7 — Collapse `usePreviewController` and delete `usePreviewState`

After A.5 + B.2, `previewedIdRaw` lives in `sceneStateStore` and the gating logic lives in the `usePreviewedId` selector (per D1's store description). `usePreviewState` is deleted. `usePreviewController` reduces to:

- The handler functions (`handleScenePreviewChange`, `handleOutlinerPreviewChange`, `handleCanvasKeyboardPreviewChange`, `handleDragStateChange`, `clearPreviewOnCanvasMiss`) that decide whether to call `setPreviewedId(...)` based on source and context.
- The keyboard-preview synchronous-read invariant — keyboard preview reads in `handleCanvasSelectPreviewed` call `sceneStateStore.getState().previewedIdRaw` (or a passthrough selector) rather than a React-rendered value.

### B.8 — Move draft persistence into a dedicated hook (D5)

- Create `src/app/use-draft-persistence.ts`. It subscribes to `scene-state-store` (`items`, `isDragging`, `floorFinishId`, `wallFinishId`) and `editor-runtime-store` (`startupPhase`), and runs the same save/clear logic that lives in `App.tsx` today.
- `App.tsx` mounts the hook once. The corresponding `useEffect` block in `App.tsx` is deleted.

---

## Files that change

Created:

- `src/editor-state/index.ts`
- `src/editor-state/dialog-store.ts` (+ test)
- `src/editor-state/editor-runtime-store.ts` (+ test)
- `src/editor-state/selection-meta-store.ts` (+ test)
- `src/editor-state/scene-state-store.ts` (+ test)
- `src/editor-state/cross-store-actions.ts` (+ test) — `selectById({ id, source })` and friends per D4.
- `src/editor-state/store-types.ts`
- `src/scene/internal/scene-services.ts` (+ test)
- `src/app/use-draft-persistence.ts` (+ test) — owns `saveSceneDraft`/`clearSceneDraft` per D5.

Deleted:

- `src/app/overlay/use-overlay-state.ts` (+ test)
- `src/app/overlay/use-dialog-state.ts` (+ test)
- `src/app/overlay/use-preview-state.ts` (+ test) — gating logic moves into `sceneStateStore`'s `usePreviewedId` selector per D1.
- `src/app/hooks/use-scene-sync.ts` (+ test)
- `src/app/hooks/use-scene-commands.ts` (+ test, if all callers go away — verify)
- `src/app/use-startup-lifecycle.ts` (logic absorbed into editor-runtime-store actions; thin lifecycle effects move to a small hook in `App.tsx` or a replacement `src/app/use-editor-runtime-effects.ts`)

Substantially modified:

- `src/App.tsx` — removes most local state and all read-model wiring; consumes stores via selectors; the `<Scene />` invocation drops the callback props; the draft-save effect is replaced by mounting `useDraftPersistence`.
- `src/scene/scene.tsx` — drops callback props; reads `useItems`/`useHistory` from the store; calls store actions; registers scene-services on mount; trims `SceneRef`. The `useState`-held `history` and `instanceIdRef` are removed from this file (D1, D2).
- `src/scene/scene.types.ts` — `SceneRef` shrinks; `SceneReadModel` becomes a back-compat type alias re-exported from `scene-state-store` (sweep deferred to Phase 2).
- `src/scene/internal/use-scene-selection.ts` — drops `selectedFurniture` React state and `onSelectionChange`; resolves `selectedObject` from a store subscription; keeps `objectRefs`/`registerObject` scene-internal.
- `src/scene/internal/use-scene-drag.ts` — calls `commitDragHistory` instead of `setHistory`.
- `src/scene/internal/use-scene-imperative-api.ts` — implements the trimmed `SceneRef` (+ `getCameraPosition`).
- `src/app/use-scene-handlers.ts` — option-shape updates; commands point at store actions; announcer/toast wrapping unchanged.
- `src/app/use-preview-controller.ts` — shrunk to handler functions; backing state lives in `sceneStateStore`.
- `src/app/overlay/use-overlay-props.ts` — argument list shrinks (does not get deleted in this phase).
- `src/app/overlay/editor-overlay.tsx` — leaf components that need state read it from selectors (e.g. `Outliner` reads `previewedId` from store directly). Kept minimal in Phase 1; full prop-flattening happens in Phase 2.

---

## Watch-outs

- **Drag performance.** Do NOT push every frame's mesh position into the store during drag. The store gets one update on commit. The scene's three.js meshes update freely each frame as today. Verify with `pnpm test:browser:perf` after the migration.
- **Toolbar geometry frame-rate fanout.** The deadband short-circuit must run inside the scene's `useFrame` _before_ calling `selectionMetaActions.setToolbarGeometry`. Confirm with a perf trace covering idle camera tracking on a selected item (not just drag) — see Performance verification below.
- **Equality and identity stability.** The current `useOverlayState` carefully preserves identity for `items`, `historyAvailability`, and `selectedFurniture` to avoid downstream re-renders. Reproduce this in the store: actions that produce equal-by-value results must short-circuit and not update state. The test suite explicitly asserts that updating `items` with the same value does not notify subscribers.
- **Order-of-effects sensitivity.** `App.tsx` has comments calling out cases where keyboard preview reads must be synchronous so a quick browse+select sequence does not observe a stale ref. Preserve this: keyboard preview writes use `setPreviewedId` synchronously, and reads in `handleCanvasSelectPreviewed` use `sceneStateStore.getState().previewedId` rather than a snapshotted React value.
- **`window.__ROOM_LAYOUT_TEST__`.** Multiple e2e tests depend on `getState()` returning the snapshot shape. Keep the public shape identical even though the internals change.
- **Dialog return-focus targets.** These are DOM refs / functions; they must not be serialized into Zustand devtools. Mark the dialog store as not subject to devtools persistence, or store a getter.
- **URL/draft restore ordering.** `useSceneHandlers` runs the restore flow during startup. After Phase 1, the restore flow calls store actions instead of `sceneRef.current.restoreInitialLayout(...)`. The order of operations (set finishes → restore items → record outcome → mark assets ready) must be unchanged. Cover with tests in `use-scene-handlers.startup.test.ts` (existing) — they should already exercise this; update the test doubles to spy on store actions instead of ref methods.
- **Scene services registry lifecycle.** `getSceneServices()` must throw with a clear message if called before mount. Actions invoked at startup (restore) must wait until services are registered — match today's `sceneRef.current` non-null assertion timing. The cleanest approach: scene calls `registerSceneServices` during a `useLayoutEffect`, before any startup action that needs it. Verify by reading the existing startup ordering before implementing.
- **Don't leak Zustand into pure UI.** Anything intended for `editor-ui` later (Phase 4) should not pick up store imports now. Concretely: keep `SelectedItemActions`, `SelectedItemDetails`, `Outliner` view, `TopHeader` view as prop-driven. Wire stores in their container/parents during Phase 2/3 — for Phase 1, leave existing prop wiring intact.
- **No new context providers** in Phase 1 unless absolutely required. Stores replace context for state. Existing contexts (e.g. `TooltipProvider`) remain.
- **Cross-store actions must not turn into cross-store subscriptions.** Per D4, the only coupling between stores is via the `cross-store-actions.ts` action layer. If during implementation it feels tempting to add `selectionMetaStore.subscribe(() => sceneStateStore.setState(...))`, stop and reconsider — that's exactly the opacity D4 exists to prevent.

---

## Tests

### New tests

- `src/editor-state/dialog-store.test.ts` — open/close, dialog stack precedence, return-focus targets, room-surface layout, blocking-overlay derivation.
- `src/editor-state/editor-runtime-store.test.ts` — startup transitions, asset error/clear/retry, restore outcome recording.
- `src/editor-state/selection-meta-store.test.ts` — selection-source transitions, toolbar-geometry equality short-circuit, outliner focus request lifecycle.
- `src/editor-state/scene-state-store.test.ts` — items/selection/history mutations, identity stability, `setSelectedId` clearing `previewedIdRaw`, dragging flag transitions, finish-id changes, `usePreviewedId` gating (returns null while dragging, blocking overlay open, interactions disabled, or previewed item not in `itemIds`), undo/redo through `history`, `addFurniture` id generation continuity across restores, `commitDragHistory` push semantics.
- `src/editor-state/scene-state-store.identity.test.ts` (or a section in the main store test) — subscriber notification fires only when state actually changes; setting `items` to the same array reference is a no-op; `historyAvailability` keeps identity across no-op history mutations.
- `src/editor-state/cross-store-actions.test.ts` — `selectById({ id, source })` writes both stores; result discriminated union matches today's `SelectByIdResult`.
- `src/scene/internal/scene-services.test.ts` — register/clear lifecycle, throws when `getSceneServices()` is called before registration, `whenSceneServicesReady()` resolves synchronously when already registered and asynchronously when registration follows the call, only one registration may be active at a time.
- `src/app/use-draft-persistence.test.ts` — save fires on `items`/finish changes when not loading and not dragging, skips during drag, clears when scene is at defaults, no-op during startup loading.

### Tests to update

- `src/app/use-scene-handlers.test.ts` and the `.share`, `.source`, `.startup` siblings — replace ref-based mocks with store action spies. The test names and assertions stay; only the doubles change.
- `src/app/use-preview-controller.test.ts` — assert against store state instead of returned hook value where the hook's return value shrinks.
- `src/scene/internal/use-scene-imperative-api.test.ts` — covers the slimmed `SceneRef`. Remove assertions for removed methods; keep camera-related ones.
- Any test that imports `useOverlayState` or `useDialogState` directly — point at the new stores. (`src/app/overlay/use-overlay-state.test.ts`, `use-dialog-state.test.ts` are deleted.)
- `src/app/hooks/use-scene-sync.test.ts` — deleted.

### Tests that must continue to pass unchanged

- All `e2e/` Playwright suites. Pay particular attention to:
  - `e2e/url-restore.spec.ts`
  - `e2e/editor-history.spec.ts`
  - `e2e/drag-collision.spec.ts`
  - `e2e/drag-bounds.spec.ts`
  - `e2e/editor-accessibility-flows.spec.ts`
  - `e2e/editor-a11y-audits.spec.ts`
  - `e2e/startup-loading.spec.ts` and `e2e/startup-load-error.spec.ts`
- All RTTR component tests under `src/scene/internal/`.

### Performance verification

- Capture `pnpm test:browser:perf` traces **before** starting Phase 1 work and **after** completion. Diff manually — the Playwright perf harness does not have an automatic baseline-comparison gate the way `pnpm bench:compare` does for Vitest microbenchmarks.
- Cover at minimum: (1) drag interaction (existing scenario), (2) idle camera tracking with a selection (validates the toolbar-geometry deadband-before-store-write invariant).
- Run `pnpm bench` for any utility changes that ended up touching hot paths (unlikely in this phase, but verify).

---

## Documentation

Update:

- `AGENTS.md` — add a new section "Editor State" describing `src/editor-state/`, the four stores, and the rule that pure UI components do not import stores. Update the "Architecture" section's structural-invariants block to note that scene state lives in `editor-state` rather than being pushed via callbacks.
- `README.md` — add `src/editor-state/` to any directory map that exists.
- `PLAN.md` — append a Phase 1 completion entry once done.

Create:

- `docs/editor-state-architecture.md` — short reference doc describing each store, when to read vs. dispatch, and the scene-services registry pattern. Link from `AGENTS.md`.

No other documentation needs to change in Phase 1.

---

## Done definition

- All four stores exist, are tested, and are the source of truth for their state.
- `Scene` accepts no callback props for selection / history / drag / read-model / toolbar-geometry. It accepts only catalog, finish options, and the slimmed `ref`. The scene's previously-local `history` `useState` and `instanceIdRef` are gone.
- `SceneRef` exposes only camera-related imperative methods (plus `getCameraPosition` for the test harness).
- `useOverlayState`, `useSceneSync`, `useDialogState`, and `usePreviewState` no longer exist. `useSceneCommands` no longer exists if all callers were migrated; otherwise documented why a thin wrapper survives.
- `App.tsx` no longer holds `selectedToolbarGeometry`, `isSceneDragging`, or dialog state in local React state; no longer marshals scene callbacks; no longer imports `useOverlayState`; the draft-save `useEffect` is replaced by mounting `useDraftPersistence`.
- Cross-store actions live in `cross-store-actions.ts`; no store subscribes to another store.
- The `editor-state/**` ESLint rule banning React-component imports is in place and passing.
- `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm test:e2e` all pass.
- `pnpm test:browser:perf` traces (drag + idle camera tracking with selection) show no regression vs. the captured pre-phase baseline.
- `AGENTS.md`, `docs/editor-state-architecture.md`, and any directory references are updated. The doc includes the singleton-scene-services constraint.
