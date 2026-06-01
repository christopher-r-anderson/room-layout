# Phase 2 — Decomposition (Plan)

This plan implements **Item C** (decompose `useSceneHandlers` into focused controllers) and **Item D** (replace `useOverlayProps` with direct store consumption and scoped contexts) from `architecture-refactor-outline.md`. After Phase 2, `App.tsx` is a thin composition root, the giant coordinator hook is gone, and overlay leaves read state directly from stores instead of receiving everything through one prop bag.

This is a **behavior-preserving refactor**. Visual output, keyboard shortcuts, accessibility semantics, focus order, persistence, URL restore, and announcements must all be unchanged. The implementor is expected to run `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and the relevant `pnpm test:e2e` lanes after each step and at the end.

The implementor should read this plan front to back before starting and should not introduce additional refactors not described here.

---

## Outcome (definition of done)

- `src/app/use-scene-handlers.ts` is deleted. Its `share`, `source`, `startup`, and main test files are deleted. The functionality is split across eight controller hooks, `useSceneSelectionEffects`, and shared helper modules.
- `src/app/overlay/use-overlay-props.ts` is deleted along with its test.
- Two new React contexts exist (`EditorRefsContext`, `OverlayLayoutContext`) and are mounted once at the top of `App.tsx`. No other contexts are introduced in this phase.
- `App.tsx` no longer imports `useSceneHandlers`, `useOverlayProps`, `useSceneReadModel`, or the deleted prop bundle helpers. It imports the controller hooks, the contexts, and the small set of selectors/actions it still needs for composition-root state, startup, preview/test bridge, and scene shell wiring.
- `EditorOverlay` reads state from stores in its leaves (`Outliner`, `TopHeader`, dialog wrappers, `CameraTools`). Container-level props are reduced to layout structure (refs, anchor heights, room-surface layout flags, header layout-mode callback) and a small set of derived booleans that cannot be cleanly derived inside a leaf.
- The `EditorSceneProps`, `EditorCatalogProps`, `EditorDialogsProps`, `EditorPreviewProps`, `EditorHistoryProps`, `EditorCameraProps`, `EditorStartupProps` shape exports (in `editor-overlay.tsx`) are removed.
- `SceneReadModel` is removed from `src/scene/scene.types.ts`. Consumers either read `useItems()` + `useSelectedId()` from `scene-state-store` or take `{ items, selectedId }` as a narrow prop.
- All 542+ existing Vitest tests, all RTTR tests, and all Playwright suites under `e2e/` pass without product changes.
- No new behavior is added. No visual or interaction changes. No performance regressions in the drag and idle-camera-tracking perf scenarios.
- `AGENTS.md` and `docs/editor-state-architecture.md` are updated to reflect the controller layout and context surface.

## Out of scope

Do not do these even if tempting:

- **Item E (placement decomposition).** Toolbar geometry continues to be consumed by `SelectedItemControls` exactly as today. Do not change its placement logic.
- **Item F (folder reorganization into `editor-state` / `editor-shell` / `editor-ui`).** Do not move files between those layers. Do not introduce `src/editor-shell/` or `src/editor-ui/`.
- **Splitting any store further.** The four stores from Phase 1 stay as-is.
- **Touching the scene module.** No edits under `src/scene/**` except the surgical `SceneReadModel` removal in `scene.types.ts`. The scene already drives stores; nothing in Phase 2 should change scene internals.
- **Changing announcement copy, toast wording, dialog flow, or keyboard shortcut behavior.**
- **Removing `flushSync` in `App.tsx` focus handlers, `useDraftPersistence`, `useStartupState`, or any of the existing scene-services / scene-commands modules.**
- **Adding new dependencies.** Phase 2 uses only what is already in `package.json`.

---

## Cross-cutting decisions (lock these before implementing)

These must not drift during implementation. If implementation friction suggests changing one of these, stop and re-read this section.

### D1. Controllers are React hooks; each lives in its own file under `src/app/controllers/`

- All seven controllers are hooks named `useXController` returning a stable object of handlers.
- Each lives at `src/app/controllers/use-<name>-controller.ts` with a co-located `.test.ts` file.
- Controllers may not return JSX. They may not export components.
- Controllers read state from stores via the established hooks (`useSelectedFurniture`, etc.). They do not receive store-backed values via parameters except where listed below in the "Cross-controller refs" decision (D4).

### D2. Controllers take a small, explicit options object

- An options object always groups: store/cross-store actions the controller mutates, the announcement bus, anything not in a store.
- Controllers do **not** take "everything they need" as parameters. If a controller wants `selectedFurniture`, it calls `useSelectedFurniture()` itself.
- The exception is the **announcement bus** (`useAnnouncements()`) and the **dialog state snapshot** (`useDialogStateSnapshot(...)`). Both are produced once in `App.tsx` and threaded through. Reasoning: `useDialogStateSnapshot` takes parameters that depend on app-shell composition (`canStartOver`, `editorInteractionsEnabled`, `selectedFurniture`, `startupOverlayActive`); calling it once at the top is the cleanest seam. `useAnnouncements` is referenced for both polite/assertive announcers and for cleanup; calling it twice would create two announcement queues.
- Each controller documents its options interface inline. Keep these interfaces narrow.

### D3. Controllers do not coordinate with each other through return values

The current `useSceneHandlers` exposes 21 handlers in one bundle. Multiple call sites use those handlers in combination (e.g., `App.tsx` calls `handlers.handleSelectById` from inside `handleCanvasSelectPreviewed`). After Phase 2:

- Each controller exposes its own handlers.
- When a controller needs to invoke another controller's handler, both controllers are called from `App.tsx` and the wiring is done at the call site.
- The two cases that exist today are:
  1. `handleCanvasSelectPreviewed` (currently in `App.tsx`) calls `handlers.handleSelectById`. This stays in `App.tsx` and calls `selection.selectById` directly.
  2. The keyboard shortcut wiring already lives in `App.tsx`. It continues to read handlers from each controller.

There is **no controller-of-controllers** facade module. If two controllers need to share helpers, those helpers go to `src/app/controllers/_shared/` (see D5).

### D4. Cross-controller refs and shared mutable state live in `useSceneSelectionEffects`

The current `useSceneHandlers` holds five refs:

- `restoreAttemptedRef` (asset lifecycle)
- `pendingSelectionSourceRef`
- `previousReconciledSelectedIdRef`
- `previousSelectionSideEffectSelectedIdRef`
- `pendingPostDeleteOutlinerFocusIndexRef`
- `pendingSelectionChangeBehaviorRef`
- `pendingDeleteFocusTargetRef`

These refs implement the "selection change announcer" state machine that runs in three `useEffect` blocks at the bottom of `useSceneHandlers`. After Phase 2:

- A single hook `useSceneSelectionEffects({ announcePolite, editorInteractionsEnabled })` owns all of these refs and the three effects.
- The hook exposes a small imperative API (returned object, not refs) that other controllers call to set pending behavior:

  ```ts
  interface SelectionEffectsApi {
    notePendingSelection(behavior: PendingSelectionChangeBehavior | null): void
    notePendingSource(source: InteractionSource | null): void
    notePostDeleteOutlinerFocusIndex(index: number | null): void
    notePostDeleteFocusTarget(target: 'room-view' | 'outliner' | null): void
  }
  ```

- `restoreAttemptedRef` does **not** live here — it belongs to the asset-lifecycle controller (only that controller reads it) and stays scoped there.
- Selection, deletion, history, asset-lifecycle, and catalog-add controllers all accept a `selectionEffects: SelectionEffectsApi` option. They call methods on it rather than holding their own refs. Today these controllers each set those refs directly; after Phase 2 they go through the API.
- `useSceneSelectionEffects` is called once in `App.tsx`. The returned `selectionEffects` is passed into the controllers that need it.

This decision is locked because every controller currently mutates these refs. Rather than make each controller hold a ref slice, centralize the state machine; it is the simplest seam.

### D5. Pure helpers live in `src/app/controllers/_shared/`

The current `use-scene-handlers.ts` contains pure helpers:

- `tryRestoreDraft`
- `reportInvalidRestore`
- `reportRecoveredDraftAfterInvalidLink`
- `restoreFromInvalidLinkWithDraftFallback`
- `runStartupRestoreFlow`
- `formatCoordinate`
- `normalizeDegreesRadians`
- `formatMoveBlockedMessage`
- `formatSelectedItemDetailsBlockedMessage`
- `formatSelectedItemDetailsInvalidValueMessage`

After Phase 2:

- `runStartupRestoreFlow` and its four private helpers move to `src/app/controllers/_shared/restore-flow.ts`. The function is exported. The four helpers stay private to that module.
- `formatCoordinate`, `normalizeDegreesRadians`, `formatMoveBlockedMessage`, `formatSelectedItemDetailsBlockedMessage`, `formatSelectedItemDetailsInvalidValueMessage` move to `src/app/controllers/_shared/format-messages.ts`. All exported.
- The shared `RestorableState`, `DraftRestoreAttempt`, `RestoreFlowNotifications`, `InvalidRestoreCase`, `SelectionAnnouncementMode`, `PendingSelectionChangeBehavior` types move to `src/app/controllers/_shared/types.ts`. All exported.
- The current `use-scene-handlers.share.test.ts` and `use-scene-handlers.source.test.ts` test the URL/share helpers and the selection-source state machine. After Phase 2:
  - The URL/share tests for `runStartupRestoreFlow` move to `src/app/controllers/_shared/restore-flow.test.ts`. They no longer mount the hook; they call the function directly with a notifications double. Most of the existing assertions transfer unchanged.
  - The selection-source tests are reframed against `useSceneSelectionEffects` and the controllers that drive it (selection, deletion, history). Tests live alongside their respective controllers in `src/app/controllers/use-*.test.ts`.

### D6. Contexts hold refs and layout values, not state

Two contexts exist after Phase 2:

#### `EditorRefsContext`

```ts
interface EditorRefs {
  roomViewRef: RefObject<HTMLElement | null>
  selectedItemControlsRef: RefObject<HTMLDivElement | null>
}
```

Holds DOM refs that multiple consumers need to access (e.g. `focusRoomView` in the deletion controller; `findFirstFocusableControl(selectedItemControlsRef.current)` in the outliner-back navigation handler). The provider wraps `<TooltipProvider>`'s children inside `App.tsx`'s render output.

#### `OverlayLayoutContext`

```ts
interface OverlayLayout {
  exclusionRects: ReadonlyArray<DOMRect>
  registerExclusionElement: (
    key:
      | 'top-header'
      | 'outliner'
      | 'camera-tools'
      | 'desktop-room-sidebar'
      | 'mobile-room-drawer'
      | 'selected-details',
  ) => (element: HTMLElement | null) => void
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}
```

Wraps the values currently produced by `useOverlayExclusionRects()` and `dialogState.syncLayoutMode`. The provider lives at the same place as `EditorRefsContext`.

These are the **only** two new contexts in Phase 2. Do not introduce additional contexts. Per-leaf state is read from stores; per-leaf callbacks come from the controllers via direct prop passing (the leaves are not numerous and direct passing is fine).

### D7. `EditorOverlay` becomes a layout shell with three composed sections

After Phase 2, `EditorOverlay` accepts:

```ts
interface EditorOverlayProps {
  // Refs for the existing exclusion-rect registrations are read from
  // OverlayLayoutContext, not passed in.
  // No `camera`, `startup`, `history`, `scene`, `catalog`, `dialogs`, `preview`
  // bundles. Each section reads what it needs.
  topHeaderProps: TopHeaderShellProps
  outlinerProps: OutlinerShellProps
  cameraToolsProps: CameraToolsShellProps
  selectedItemControlsAnchorRef: RefObject<HTMLDivElement | null>
}
```

`TopHeaderShellProps`, `OutlinerShellProps`, `CameraToolsShellProps` are each minimal interfaces holding only the callbacks the leaf cannot derive from a store (e.g. `onShareSceneUrl`, `onRetryAssetLoading`, `onAddFurniture`, `onSelectById`, `onPreviewChange`). Booleans like `editorInteractionsEnabled`, `startupOverlayActive`, `startupLoadingActive`, `assetError`, `historyAvailability`, `pendingDeleteFurniture`, `roomSurfaceLayout`, `previewedId`, `floorFinishId`, `wallFinishId`, `floorFinishes`, `wallFinishes`, `floorFinishLoading`, `statusMessage`, `selectedId` are read inside the leaves from stores or `useStartupState()`.

The dialogs (`DeleteConfirmationDialog`, `StartOverConfirmationDialog`, `InitializationProgress`, `InitializationError`) currently rendered inside `EditorOverlay` move out into a new `EditorOverlayDialogs` sub-component that lives in the same file. It reads dialog state from a single `useDialogStateSnapshot()` call and store actions/subscriptions for `assetError`, `startupLoadingActive`, etc. — see step C.4 for the reasoning.

---

## Item C — Controllers (final shape)

Each section below specifies one controller's file path, exported hook name, options interface, returned handlers, list of handlers it owns (taken from `useSceneHandlers`), and any non-obvious wiring rules.

### C.1 `useSelectionController` — `src/app/controllers/use-selection-controller.ts`

Owns selection, clear-selection, panel/canvas keyboard navigation handoff, and "select-by-id" with source attribution.

```ts
interface SelectionControllerOptions {
  announcements: AnnouncementsApi
  selectionEffects: SelectionEffectsApi
  editorInteractionsEnabled: boolean
}

interface SelectionController {
  handleCanvasPointerSelection: (id: string) => void
  handleSelectById: (
    id: string | null,
    source?: InteractionSource,
  ) => SelectByIdResult
  handleClearSelection: () => void
}
```

- `handleCanvasPointerSelection` and `handleSelectById` move verbatim from `useSceneHandlers`. Replace each `pendingSelectionSourceRef.current = ...` / `pendingSelectionChangeBehaviorRef.current = ...` write with `selectionEffects.notePendingSource(...)` / `selectionEffects.notePendingSelection(...)`.
- `InteractionSource` is `'canvas-keyboard' | 'canvas-pointer' | 'panel-keyboard' | 'panel-pointer' | 'toolbar' | null`. The `handleSelectById` announce-mode switch already only special-cases `'panel-keyboard'` and `'canvas-keyboard'`, falling through to `'default'` for the rest; preserve that exact behavior. Tests should cover all six values, including `'panel-pointer'`.
- The hook reads `useSceneStateStore((s) => s.selectedId)` directly to compute "selection will change" comparisons.
- `setSelectedSource` calls become `selectionMetaActions.setSelectedSource(...)`.
- `selectById` becomes `sceneCommands.selectById(...)`.
- `clearEditorMessage` becomes `sceneStateActions.clearEditorMessage()`.
- `clearSelection` becomes `sceneCommands.clearSelection()`.
- `handleClearSelection` no longer takes the `clearPreviewOnCanvasMiss` step; that wiring stays in `App.tsx`'s pointer-missed handler (see C.10).

### C.2 `useMovementController` — `src/app/controllers/use-movement-controller.ts`

Owns move, rotate, and details-edit (`setSelectionTransform`) flows.

```ts
interface MovementControllerOptions {
  announcements: AnnouncementsApi
  rotationStepRadians: number
}

interface MovementController {
  handleMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  handleRotateSelection: (direction: -1 | 1) => void
  handleInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  handleUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}
```

- Reads `useSelectedFurniture()` from `scene-state-store`.
- Calls `sceneCommands.moveSelection`, `sceneCommands.rotateSelection`, `sceneCommands.setSelectionTransform`.
- Calls `sceneStateActions.clearEditorMessage()`.
- Calls `selectionMetaActions.setSelectedSource('panel-keyboard')` after a successful details update.
- Uses `formatCoordinate`, `formatMoveBlockedMessage`, `formatSelectedItemDetailsBlockedMessage`, `formatSelectedItemDetailsInvalidValueMessage`, `normalizeDegreesRadians` from `_shared/format-messages.ts`.
- Uses `resolvePositionFromWallClearances` from `@/lib/three/wall-clearance` (already imported today).
- `rotationStepRadians` is currently passed into `createSceneCommandActions` and consumed by `sceneCommands.rotateSelection`. Today it lives as `ROTATION_STEP_RADIANS` in `App.tsx`. After C.2:
  - The constant moves to `src/app/controllers/_shared/constants.ts` (`export const ROTATION_STEP_RADIANS = Math.PI / 12`).
  - `App.tsx` imports it from `_shared/constants.ts` for `createSceneCommandActions`. The movement controller imports it from the same module for option default; **the option remains required** so tests can override it without monkey-patching.
- The movement controller does not call `setSelectionTransform` if `sceneCommands` has not exposed the function. Currently `useSceneHandlers` defaults `setSelectionTransform = () => ({ ok: false, reason: 'no-selection' })`. Replicate that: `sceneCommands.setSelectionTransform` is non-optional in the new architecture (it already exists in `scene-commands.ts`); the defensive default is removed.

### C.3 `useHistoryController` — `src/app/controllers/use-history-controller.ts`

Owns undo and redo plus their announcements.

```ts
interface HistoryControllerOptions {
  announcements: AnnouncementsApi
  selectionEffects: SelectionEffectsApi
}

interface HistoryController {
  handleUndo: () => void
  handleRedo: () => void
}
```

- Calls `sceneCommands.undo()` / `sceneCommands.redo()`.
- Calls `sceneStateActions.clearEditorMessage()`.
- Sets `selectionEffects.notePendingSelection({ announceMode: 'suppress', requestOutlinerFocus: true })` after a successful undo/redo.
- Announces `Undo complete.` / `Redo complete.` exactly as today.

### C.4 `useDeletionController` — `src/app/controllers/use-deletion-controller.ts`

Owns the delete dialog open paths, delete confirmation, and post-delete focus management.

```ts
interface DeletionControllerOptions {
  announcements: AnnouncementsApi
  dialogState: DialogStateSnapshot
  selectionEffects: SelectionEffectsApi
  refs: EditorRefs // from EditorRefsContext (fetched via useEditorRefs())
}

interface DeletionController {
  handleConfirmDeleteSelection: () => SceneReadModel | null
  handleOpenDeleteDialog: () => void
  handleOpenDeleteDialogFromRoomView: () => void
}
```

- Reads `useSelectedSource()` from `selection-meta-store` directly.
- Reads `useItems()` and `useSceneStateStore((s) => s.selectedId)` for the deletedIndex computation.
- Calls `sceneCommands.deleteSelection()` for the actual deletion (renamed from `confirmDeleteSelection` — the underlying `sceneCommands` exposes `deleteSelection`; today the prop in `useSceneHandlers.commands` is `confirmDeleteSelection` because the legacy `useSceneCommands` named it that way; clean up the naming inline).
- Calls `dialogState.closeDialog()`.
- Sets `selectionEffects.notePostDeleteOutlinerFocusIndex(...)` and `selectionEffects.notePostDeleteFocusTarget(null)` to mirror today's ref writes.
- Calls `refs.roomViewRef.current?.focus()` indirectly via a small `focusRoomView` callback. Because `focusRoomView` requires the cancellable RAF logic, it stays in `App.tsx` and is passed in (see option below).
- **Option correction:** Add `focusRoomView: () => void` to `DeletionControllerOptions`. The hook does not own the RAF cancellation; it just calls the callback when `shouldFocusRoomView` is true. `EditorRefs` is still provided so `selectedItemControlsRef` is reachable, but for delete it isn't needed; remove `refs` from this controller's options if no other use materializes during implementation.
- The function still returns `SceneReadModel | null` (always `null`) to preserve the signature consumed by `EditorOverlay` today via `EditorDialogsProps.onConfirmDeleteSelection`. After D's `EditorOverlay` rewrite, `onConfirmDeleteSelection: () => void` is sufficient. Update the signature to `() => void` and return nothing. Verify that no caller uses the return value (the existing dialog wrapper does not).
- `handleOpenDeleteDialog` and `handleOpenDeleteDialogFromRoomView` mirror today: write `pendingDeleteFocusTarget` via `selectionEffects.notePostDeleteFocusTarget('outliner' | 'room-view')` after a successful `dialogState.openDelete()`.

### C.5 `useCatalogController` — `src/app/controllers/use-catalog-controller.ts`

Owns add-furniture and the catalog drawer open coordination.

```ts
interface CatalogControllerOptions {
  announcements: AnnouncementsApi // currently unused; remove if not needed
  dialogState: DialogStateSnapshot
  selectionEffects: SelectionEffectsApi
}

interface CatalogController {
  handleAddFurniture: () => boolean
  handleCatalogDrawerOpenChange: (open: boolean) => void
}
```

- Calls `sceneCommands.addFurniture()`.
- Calls `selectionMetaActions.setSelectedSource('toolbar')` on success.
- Calls `selectionEffects.notePendingSource('toolbar')` and `selectionEffects.notePendingSelection({ announceMode: 'added', requestOutlinerFocus: false })` on success.
- Calls `dialogState.setCatalogOpen(open)` and `sceneStateActions.clearEditorMessage()` on `open && changed`.
- `announcements` is unused for these handlers; do not include it in options.

### C.6 `useStartOverController` — `src/app/controllers/use-start-over-controller.ts`

Owns the start-over dialog open and confirmation flow. App.tsx passes `clearPreview: clearPreviewOnCanvasMiss` from `usePreviewController` so the controller's preview reset goes through the same path as a canvas miss.

```ts
interface StartOverControllerOptions {
  announcements: AnnouncementsApi
  dialogState: DialogStateSnapshot
  selectionEffects: SelectionEffectsApi
  clearPreview: () => void // pass `clearPreviewOnCanvasMiss` from usePreviewController
  defaults: {
    floorFinishId: string
    wallFinishId: string
  }
}

interface StartOverController {
  handleOpenStartOverDialog: (options?: DialogOpenOptions) => void
  handleConfirmStartOver: () => void
}
```

- `handleConfirmStartOver` calls (in order, matching today exactly):
  1. `dialogState.closeDialog()`
  2. `clearPreview()` — the option threaded through from `App.tsx`'s `usePreviewController().clearPreviewOnCanvasMiss`. This preserves today's behavior: it cancels any pending scene-preview-clear timer, resets the internal `previewSourceRef`, and calls `setPreviewedId(null)`. **Locked decision:** the start-over controller does not call `setPreviewedId` directly; it goes through the preview controller's clear function so the controller's internal source-tracking ref stays consistent.
  3. `sceneStateActions.clearEditorMessage()`
  4. `sceneCommands.restoreInitialLayout([])`
  5. `sceneStateActions.setFloorFinishId(defaults.floorFinishId)` / `setWallFinishId(defaults.wallFinishId)`
  6. `sceneCommands.setCameraPreset('corner')`
  7. `clearSceneDraft()` — imported from `@/app/url-scene/scene-draft`
  8. `selectionEffects.notePendingSelection({ announceMode: 'suppress', requestOutlinerFocus: false })`
  9. `announcePolite('Started over. Your changes were cleared.')`
  10. `toast.success('Started over. Your changes were cleared.')`

### C.7 `useAssetLifecycleController` — `src/app/controllers/use-asset-lifecycle-controller.ts`

Owns asset error, asset retry, and asset-ready (which triggers the URL/draft restore flow).

```ts
interface AssetLifecycleControllerOptions {
  announcements: AnnouncementsApi
  dialogState: DialogStateSnapshot
  selectionEffects: SelectionEffectsApi
  startup: {
    catalog: FurnitureCatalogEntry[]
    defaultFloorFinishId: string
    defaultWallFinishId: string
    floorFinishIds: string[]
    wallFinishIds: string[]
    handleAssetError: (error: Error) => void // from useStartupState
    handleAssetsReady: () => void // from useStartupState
    retryAssetLoading: () => void // from useStartupState
    resetEditorShellState: () => void // wrapper around runStartupReset
  }
}

interface AssetLifecycleController {
  handleSceneAssetError: (error: Error) => void
  handleSceneAssetsReady: () => void
  handleRetryAssetLoading: () => void
}
```

- Holds `restoreAttemptedRef` internally. No other controller touches it.
- Calls `runStartupRestoreFlow` from `_shared/restore-flow.ts`.
- Mirrors today's:
  - `runStartupAssetErrorTransition(error, { ... })` + toast.error + announceAssertive on error.
  - `runStartupRetryTransition(...)` + clearAssertiveAnnouncement on retry.
  - The full `handleSceneAssetsReady` body: SCENE_URL_PARAM cleanup, finish-ids normalization, `applyRestoredState`, `runStartupRestoreFlow` invocation, then `selectionEffects.notePendingSelection({ announceMode: 'suppress', requestOutlinerFocus: false })`, then `startup.handleAssetsReady()`.
- `restoreInitialLayout`, `setFloorFinishId`, `setWallFinishId` are called via `sceneCommands.restoreInitialLayout` and `sceneStateActions.setFloorFinishId/setWallFinishId` (no longer threaded through options).

### C.8 `useShareController` — `src/app/controllers/use-share-controller.ts`

Owns the share-scene-URL flow.

```ts
interface ShareControllerOptions {
  announcements: AnnouncementsApi
}

interface ShareController {
  handleShareSceneUrl: () => Promise<'shared' | 'copied' | null>
}
```

- Reads `useItems()`, `useFloorFinishId()`, `useWallFinishId()` from `scene-state-store`.
- Reads the active finish ids inline by computing from `useStartupState()` exactly as today (same `floorFinishIds.includes(activeFloorFinishId)` membership check).
- Decision: the controller computes `activeFloorFinishId` and `activeWallFinishId` itself instead of receiving them. This duplicates logic that lives in `App.tsx` today, but the duplication is small (~6 lines) and the alternative is threading two more values through options for one handler.

  **Implementation note:** Extract that small derivation (`activeFloorFinishId`, `activeWallFinishId` from `floorFinishId`, `wallFinishId`, and `environmentConfig`) into a helper hook `useActiveFinishIds()` at `src/app/controllers/_shared/use-active-finish-ids.ts`. Use it from both `App.tsx` and the share controller. This is the **only** new shared hook in Phase 2.

- Calls `sceneStateActions.setEditorMessage(...)` / `clearEditorMessage()`.
- Announce/toast logic unchanged from today.

### C.9 `useSceneSelectionEffects` — `src/app/controllers/use-scene-selection-effects.ts`

Owns the three `useEffect` blocks and seven refs from D4.

```ts
interface SceneSelectionEffectsOptions {
  announcements: AnnouncementsApi
  editorInteractionsEnabled: boolean
}

interface SelectionEffectsApi {
  notePendingSelection(behavior: PendingSelectionChangeBehavior | null): void
  notePendingSource(source: InteractionSource | null): void
  notePostDeleteOutlinerFocusIndex(index: number | null): void
  notePostDeleteFocusTarget(target: 'room-view' | 'outliner' | null): void
}
```

Effects (preserved verbatim, only inputs change):

1. Post-delete outliner focus effect: reads `useItems()` from store, calls `selectionMetaActions.requestOutlinerFocus(...)` directly (no `sync.requestOutlinerFocusByIndex` indirection — that wrapper goes away).

   The underlying `requestOutlinerFocusByIndex` callback in App.tsx today does `selectionMetaActions.requestOutlinerFocus({ token: Date.now(), preferredIndex })`. Inline that call here.

2. Selection-source reconciliation effect: reads `useSceneStateStore((s) => s.selectedId)` (use the bare store, not `useSceneReadModel`, because `selectedId` is the only field this effect needs) and calls `selectionMetaActions.setSelectedSource(...)`.

3. Selection side-effect announcer: reads `useItems()`, `useSceneStateStore((s) => s.selectedId)`, and `useOutlinerFocusRequest()` from `selection-meta-store`. Calls `announcePolite` and `selectionMetaActions.requestOutlinerFocus`. Calls `clearPendingBehavior`-style logic.

The fourth (cleanup) effect that exists today —

```ts
useEffect(() => {
  if (!editorInteractionsEnabled) return
  if (
    sceneReadModel.selectedId !==
    previousSelectionSideEffectSelectedIdRef.current
  )
    return
  pendingSelectionChangeBehaviorRef.current = null
}, [editorInteractionsEnabled, sceneReadModel.items, sceneReadModel.selectedId])
```

— stays here as well. It clears stale `pendingSelectionChangeBehaviorRef` when items mutate but selectedId did not.

Returns `SelectionEffectsApi`. The implementation closes over the refs.

### C.10 What stays in `App.tsx`

After Phase 2, `App.tsx` retains:

- The `roomViewRef` cleanup `useEffect` (cancelAnimationFrame on unmount) and `focusRoomView` callback.
- The `dialogState.isBlockingOverlayOpen` → clear-outliner-focus-request effect.
- The `handleOutlinerFocusHandled` wrapper (or inline it on the outliner consumer; see step D.4).
- The keyboard-shortcut wiring (`useKeyboardShortcuts`) and camera key-state wiring (`useCameraKeyState`).
- The `__ROOM_LAYOUT_TEST__` bridge behavior.
- The render output (Canvas, scene composition, overlay).
- `useDraftPersistence({ environmentConfig })` mount.
- Composition of all controllers, preview coordination, and Canvas pointer-missed glue.
- The pointer-missed handler on Canvas, which calls `focusRoomView()`, `clearPreviewOnCanvasMiss()`, and `selection.handleClearSelection()` in that order.
- The two new context providers (`EditorRefsContext`, `OverlayLayoutContext`).

`App.tsx`'s original line count target was **under 350 lines**. The implemented refactor removed the large prop-bundle and handler-hook argument lists, but the remaining composition root is still above that target because it retains startup memoization, controller wiring, app-shell effects, and the JSX tree. Further reduction is deferred to a later shell split.

---

## Item D — Overlay rewiring

### D.1 Drop the prop bundles

In `src/app/overlay/editor-overlay.tsx`, delete the exported interfaces:

- `EditorCameraProps`
- `EditorStartupProps`
- `EditorHistoryProps`
- `EditorSceneProps`
- `EditorCatalogProps`
- `EditorDialogsProps`
- `EditorPreviewProps`

Replace with three new interfaces (defined locally in the file, exported only if a leaf needs them):

```ts
interface TopHeaderShellProps {
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  onUndo: () => void
  onRedo: () => void
  onSetCameraPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (id: string) => void
  onConfirmStartOver: () => void
  onOpenStartOverDialog: (options?: DialogOpenOptions) => void
  catalogIdToAdd: string
}

interface OutlinerShellProps {
  onSelectById: PanelSelectById
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
  onFocusHandled: () => void
  onNavigateBackToSelectionControls: () => boolean
  previewedId: string | null
}

interface CameraToolsShellProps {
  onSetCameraPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
}
```

The `EditorOverlay` component takes these three plus a single `selectedItemControlsAnchorRef` (see D.6). All other values are read from stores or from the two contexts.

### D.2 Outliner reads from stores

Edit `src/app/scene-panel/outliner.tsx`:

- Drop the `readModel: SceneReadModel` prop.
- Add internal `useItems()` and `useSceneStateStore((s) => s.selectedId)` calls.
- Drop the `disabled: boolean` prop. The component derives from `editorInteractionsEnabled` (read via `useEditorInteractionsEnabled()`) AND from `useDialogStateSnapshot(...)` for `isBlockingOverlayOpen` — but `useDialogStateSnapshot` requires arguments and can't be called freely.

  **Resolution:** Add a `useIsBlockingOverlayOpen()` selector to `src/editor-state/dialog-store.ts` that returns just the derived `isBlockingOverlayOpen` boolean. Update `Outliner` to call `useEditorInteractionsEnabled()` and `useIsBlockingOverlayOpen()` and compute `disabled = !editorInteractionsEnabled || isBlockingOverlayOpen` internally. Remove the `disabled` prop.

  This is the **only** change to dialog-store in Phase 2.

- Keep the remaining props (`focusRequest`, `onFocusHandled`, `onNavigateBackToSelectionControls`, `onSelectById`, `previewedId`, `onPreviewChange`).
- The `focusRequest` prop is supplied by `EditorOverlay` based on `useOutlinerFocusRequest()` filtered by `useIsBlockingOverlayOpen()` (the existing `dialogState.isBlockingOverlayOpen ? null : outlinerFocusRequest` logic). Move that filter inside `Outliner` itself: read both via selectors, render `null` focus request when blocking overlay is open. Drop the `focusRequest` prop entirely.
- After this, `OutlinerShellProps` shrinks to:

  ```ts
  interface OutlinerShellProps {
    onSelectById: PanelSelectById
    onPreviewChange: (
      id: string | null,
      source: 'outliner-hover' | 'outliner-focus',
    ) => void
    onNavigateBackToSelectionControls: () => boolean
  }
  ```

  `onFocusHandled` is also dropped: when `Outliner` consumes a focus request, it calls `selectionMetaActions.clearOutlinerFocusRequest()` directly. The `handleOutlinerFocusHandled` wrapper in `App.tsx` is deleted.

  `previewedId` is dropped: `Outliner` reads it via `usePreviewedId({ ... })` from `scene-state-store`. **Resolution:** `usePreviewedId` requires `isBlockingOverlayOpen` and `editorInteractionsEnabled` arguments. The Outliner already has both via the new selectors. Pass them as `usePreviewedId({ isBlockingOverlayOpen, editorInteractionsEnabled })` inside the component.

### D.3 TopHeader reads from stores

Edit `src/app/overlay/top-header.tsx`:

- Drop props that are now derivable from stores: `editorInteractionsEnabled`, `floorFinishId`, `floorFinishLoading`, `floorFinishes`, `wallFinishId`, `wallFinishes`, `historyAvailability` props (use `useHistoryAvailability()`), `dialogs` prop (read individual dialog flags from a single `useDialogStateSnapshot()` call).
- Keep the action callbacks (undo, redo, share, etc.).
- `floorFinishes` and `wallFinishes` come from `useStartupState()` — the environment config. Add a thin selector in `useStartupState`'s return value if not already present (it already returns `environmentConfig`; access `environmentConfig?.floorFinishes ?? []` inline).
- `floorFinishLoading` is a piece of local state in `App.tsx` today (`isFloorFinishLoading`). It's set by the scene's `onFloorLoadingChange` callback. After Phase 2:
  - Add a new field `floorFinishLoading: boolean` to `editor-runtime-store.ts` (note the rename: store field drops the `is` prefix to match the surrounding store-naming convention; `useFloorFinishLoading()` is the consumer-facing selector).
  - Add an action `setFloorFinishLoading(loading: boolean)` to that store.
  - `App.tsx` passes `editorRuntimeActions.setFloorFinishLoading` as the `onFloorLoadingChange` to `Scene`.
  - `TopHeader` reads `useFloorFinishLoading()` from the runtime store directly.
  - The `useState<boolean>` named `isFloorFinishLoading` in `App.tsx` is removed.

  This is the **only** new field added to a Phase 1 store in Phase 2. It is justified because the value is consumed only by `TopHeader`, and threading it through props now blocks the `EditorOverlay` simplification.

### D.4 CameraTools

Edit `src/app/camera/camera-tools.tsx` (or wherever `CameraTools` lives):

- Drop the `editorInteractionsEnabled` and `hasSelection` props.
- `editorInteractionsEnabled` → `useEditorInteractionsEnabled()`.
- `hasSelection` → derive from `useSceneStateStore((s) => s.selectedId !== null)`. Add a selector hook `useHasSelection()` to `scene-state-store.ts` that returns this boolean. (The existing `useSelectedFurniture` allocates an object; for a boolean we want the cheaper selector.)

### D.5 Status message + dialog wrappers

The `<StatusMessage message={statusMessage} />` line in `EditorOverlay` reads `editorMessage` via prop today. Change it to:

- `StatusMessage` reads `useEditorMessage()` from the scene state store directly. Drop the `message` prop.

For dialog wrappers (`DeleteConfirmationDialog`, `StartOverConfirmationDialog`, `InitializationProgress`, `InitializationError`):

- Move them out of `EditorOverlay`'s body into a new `EditorOverlayDialogs` component in the same file (no separate file needed since these are tightly coupled).
- `EditorOverlayDialogs` takes a small props interface with the action callbacks (`onConfirmDeleteSelection`, `onConfirmStartOver`, `onOpenStartOverDialog`, `onRetryAssetLoading`) and reads everything else from stores via `useDialogStateSnapshot` and runtime/scene-state hooks.
- `App.tsx` renders `<EditorOverlay ... />` and `<EditorOverlayDialogs ... />` as siblings (or `EditorOverlay` renders `<EditorOverlayDialogs />` internally — pick the second; it preserves the current single render-tree shape).

### D.6 Selected-item-controls anchor ref

`SelectedItemControls` is rendered in `App.tsx` today (not inside `EditorOverlay`). That structure stays. The `selectedItemControlsRef` is held in `App.tsx` and provided through `EditorRefsContext`. The component continues to receive the ref as `containerRef` prop (no change) and continues to receive `selectedFurniture`, `selectedToolbarGeometry`, etc. as props. **Item E in Phase 3 will rework this; do not touch it now.**

### D.7 EditorOverlay's exclusion-rect refs

`EditorOverlay` receives five `*ElementRef` props today (`topHeaderElementRef`, etc.). After Phase 2:

- `EditorOverlay` reads `registerExclusionElement` from `OverlayLayoutContext` and calls it inline for each section.
- The five `*ElementRef` props are removed.
- `App.tsx` no longer threads these through.

---

## Migration steps

Do these in order. Each step ends with `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and the relevant `e2e` lane(s) all green. Do **not** start the next step on red.

### Step 1 — Scaffold `src/app/controllers/` and the shared modules

1. Create `src/app/controllers/_shared/` with:
   - `types.ts` — move `RestorableState`, `DraftRestoreAttempt`, `RestoreFlowNotifications`, `InvalidRestoreCase`, `SelectionAnnouncementMode`, `PendingSelectionChangeBehavior` from `use-scene-handlers.ts`. Export all.
   - `format-messages.ts` — move `formatCoordinate`, `normalizeDegreesRadians`, `formatMoveBlockedMessage`, `formatSelectedItemDetailsBlockedMessage`, `formatSelectedItemDetailsInvalidValueMessage`. Export all.
   - `restore-flow.ts` — move `runStartupRestoreFlow`, `tryRestoreDraft`, `reportInvalidRestore`, `reportRecoveredDraftAfterInvalidLink`, `restoreFromInvalidLinkWithDraftFallback`. Export `runStartupRestoreFlow` only.
   - `constants.ts` — `export const ROTATION_STEP_RADIANS = Math.PI / 12`.
   - `use-active-finish-ids.ts` — small hook `useActiveFinishIds()` returning `{ activeFloorFinishId, activeWallFinishId }` derived from `useFloorFinishId()`, `useWallFinishId()`, and `useStartupState().environmentConfig`.

2. Update `use-scene-handlers.ts` to import from the new modules instead of declaring inline. Re-run tests; nothing should change.

3. Create `src/app/controllers/_shared/restore-flow.test.ts` and copy the relevant test cases from `use-scene-handlers.share.test.ts` and `use-scene-handlers.source.test.ts` that exercise `runStartupRestoreFlow` directly (not through the hook). Drive the function with a notifications double. Keep the originals in place for now — they will be deleted as their controllers come online.

**Acceptance:** Tests stay green. `use-scene-handlers.ts` shrinks by ~150 lines as helpers move out.

### Step 2 — Add new selectors and runtime-store field

1. In `src/editor-state/dialog-store.ts`:
   - Add `export const useIsBlockingOverlayOpen = (...) => useDialogStore(s => s.isBlockingOverlayOpen)`.
   - Confirm the snapshot already exposes `isBlockingOverlayOpen`. If the derivation lives only in `useDialogStateSnapshot`, re-derive it inline in the new selector.

2. In `src/editor-state/scene-state-store.ts`:
   - Add `export const useHasSelection = () => useSceneStateStore(s => s.selectedId !== null)`.
   - Confirm `useSelectedId` already exists; if not, add it.

3. In `src/editor-state/editor-runtime-store.ts`:
   - Add `floorFinishLoading: boolean` field, default `false`.
   - Add `setFloorFinishLoading(loading: boolean)` to `editorRuntimeActions`.
   - Add `export const useFloorFinishLoading = () => useEditorRuntimeStore(s => s.floorFinishLoading)`.
   - Reset to `false` in `resetEditorRuntime` / `reset`.

4. Update `editor-runtime-store.test.ts` to cover the new field and action.

5. In `src/app/use-scene-handlers.ts` and `App.tsx`, leave wiring as-is for now.

**Acceptance:** Tests green; new selectors typecheck.

### Step 3 — Extract `useSceneSelectionEffects`

1. Create `src/app/controllers/use-scene-selection-effects.ts`. Implement per C.9.
2. Create co-located `use-scene-selection-effects.test.ts` covering each effect's behavior:
   - Post-delete focus index resolves and clears.
   - Selection-source reconciliation calls `setSelectedSource` only on actual change.
   - Selection announcer announces with each `announceMode`.
   - Cleanup effect clears stale behavior when items mutate without selection change.
3. In `App.tsx`, mount `useSceneSelectionEffects({ announcements, editorInteractionsEnabled })` and obtain `selectionEffects`.
4. Pass `selectionEffects` into `useSceneHandlers` via a new `selectionEffects` option. Inside `useSceneHandlers`, replace ref writes with `selectionEffects.note*` calls. **Remove the seven internal refs and the four effects from `useSceneHandlers` in this step** — they live in `useSceneSelectionEffects` now.
5. Run tests. Update `use-scene-handlers.test.ts` to mock `selectionEffects`.

**Acceptance:** All tests green. `use-scene-handlers.ts` is ~200 lines shorter.

### Step 4 — Extract controllers one at a time

In this order: selection → movement → history → deletion → catalog → start-over → asset-lifecycle → share.

For each controller:

1. Create `src/app/controllers/use-<name>-controller.ts` per the spec in C.1–C.8.
2. Create co-located `.test.ts` mirroring the relevant test cases from `use-scene-handlers.test.ts` / `.source.test.ts` / `.share.test.ts` / `.startup.test.ts`. Tests mount the controller in isolation; mock options.
3. Mount the new controller in `App.tsx`. Use its handlers in place of the corresponding `useSceneHandlers` returns.
4. Remove the corresponding handlers and their dependencies from `useSceneHandlers` (delete the destructured options that are no longer used by remaining handlers; trim the returned object).
5. Run all tests. Confirm green.

**Sub-step ordering rationale:** Selection first because it's the foundation that the selection-effects API was built for. Movement and history follow because they only depend on selection-effects. Deletion next because it depends on selection-effects + dialog state. Catalog and start-over after that. Asset-lifecycle is the heaviest, which is why it's near the end. Share is last because it has no dependency on other controllers.

After all eight controllers are extracted, `useSceneHandlers` is empty; delete the file and its three test files in one commit.

**Acceptance after each sub-step:** Tests green.
**Acceptance for the whole step:** `use-scene-handlers.ts`, `use-scene-handlers.test.ts`, `use-scene-handlers.share.test.ts`, `use-scene-handlers.source.test.ts`, `use-scene-handlers.startup.test.ts` are gone. All controller tests are green.

### Step 5 — Add the two contexts

1. Create `src/app/contexts/editor-refs-context.tsx` exporting:

   ```ts
   export const EditorRefsContext: Context<EditorRefs | null>
   export function useEditorRefs(): EditorRefs
   export function EditorRefsProvider(props: {
     value: EditorRefs
     children: ReactNode
   }): JSX.Element
   ```

   `useEditorRefs()` throws if used outside the provider.

2. Create `src/app/contexts/overlay-layout-context.tsx` exporting analogous `OverlayLayoutContext`, `useOverlayLayout`, `OverlayLayoutProvider`. The shape matches D.6.

3. In `App.tsx`, build the two values inside `App` (`editorRefs = useMemo(() => ({ roomViewRef, selectedItemControlsRef }), [])`; `overlayLayout = useMemo(() => ({ exclusionRects: overlayExclusions.rects, registerExclusionElement: overlayExclusions.registerExclusionElement, syncLayoutMode: dialogState.syncLayoutMode }), [overlayExclusions.rects, overlayExclusions.registerExclusionElement, dialogState.syncLayoutMode])`).

4. Wrap the render output with both providers (inside `<TooltipProvider>`).

5. Add tests for each context's "throws outside provider" behavior at `src/app/contexts/editor-refs-context.test.tsx` and `overlay-layout-context.test.tsx`.

**Acceptance:** Tests green. `App.tsx` mounts the providers but no leaf consumes them yet.

### Step 6 — Migrate leaves to read from stores/contexts

Per D.2–D.4:

1. Update `Outliner` to read from stores. Drop `readModel`, `disabled`, `previewedId`, `focusRequest`, `onFocusHandled` props. Update `outliner.test.tsx` accordingly.
2. Update `TopHeader` and the header-mode/desktop/mobile children to read from stores. Drop the corresponding props. Update tests.
3. Update `CameraTools` to read from stores. Drop the corresponding props. Update tests.
4. Update `StatusMessage` to read `useEditorMessage()`. Drop `message` prop. Update tests.
5. Update `App.tsx` to pass `editorRuntimeActions.setFloorFinishLoading` as `onFloorLoadingChange` to `<Scene />`. Remove the `useState<boolean>` for `isFloorFinishLoading`.

**Acceptance:** Tests green. The leaves no longer take store-derived props.

### Step 7 — Rewire `EditorOverlay`

Per D.1, D.5, D.6, D.7:

1. In `src/app/overlay/editor-overlay.tsx`:
   - Delete the seven exported prop interfaces.
   - Add the three new shell prop interfaces.
   - Move dialog wrappers and startup overlays into `EditorOverlayDialogs` (same file).
   - Replace the five exclusion-rect ref props with `useOverlayLayout()` calls.
   - Update the JSX to use the new prop shape.
2. Update `editor-overlay.test.tsx` to render with the new shape.
3. Delete `src/app/overlay/use-overlay-props.ts` and `use-overlay-props.test.ts`.
4. Update `App.tsx`:
   - Delete the `useOverlayProps({...})` call and the destructured `*Props` consts.
   - Construct the three shell prop objects inline (each is small after the leaf migrations) and pass to `<EditorOverlay />`.
   - Render `<EditorOverlayDialogs />` inside or alongside `<EditorOverlay />` per D.5.

**Acceptance:** Tests green; `App.tsx` line count down to under 350.

### Step 8 — Remove `SceneReadModel` from the public surface

`SceneReadModel` is consumed by the deletion controller's return type. Per C.4 we already collapse the return to `void`. Final cleanup:

1. Delete `SceneReadModel` from `src/scene/scene.types.ts`.
2. The `useSceneReadModel` selector in `scene-state-store.ts` was added in Phase 1 as a back-compat. After Step 7, its remaining caller is the `EditorSceneProps.readModel` prop, which is gone. Delete `useSceneReadModel` and `areSceneReadModelsEqual` from `scene-state-store.ts`.
3. Update `scene-state-store.test.ts` to drop the deleted-selector tests.
4. Verify no `SceneReadModel` imports remain.

**Acceptance:** `grep -r SceneReadModel src/` returns no matches. Tests green.

### Step 9 — Documentation pass

1. Update `AGENTS.md`:
   - Update any line counts referenced for `useSceneHandlers` / `App.tsx`.
   - Add a "Controllers" subsection under "Architecture" describing `src/app/controllers/` and the rule that controllers are React hooks, not components.
   - Add a "Contexts" subsection describing `EditorRefsContext` and `OverlayLayoutContext` and the rule that contexts hold refs and layout values, not state.
   - Update the "Hook locality" section to call out `src/app/controllers/` as the home for handler hooks.
2. Update `docs/editor-state-architecture.md`:
   - Add a "Phase 2 controller layout" section listing the eight controllers and `useSceneSelectionEffects`.
   - Document the `SelectionEffectsApi` shape and the rule that controllers do not coordinate through return values.
3. No `README.md` changes expected; verify and skip if so.

**Acceptance:** Docs accurately describe the new architecture.

### Step 10 — Final validation

Run, in order:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:run`
4. `pnpm test:e2e` (full Playwright Chromium suite)
5. `pnpm test:e2e -- e2e/editor-a11y-audits.spec.ts` if not already covered by step 4
6. `pnpm test:browser:perf` and diff against the Phase 1 captured baseline. Drag scenario and idle-camera-tracking scenario must show no regression.
7. `pnpm fix` — formatter pass.

If any of these fails, fix and re-run from `pnpm typecheck`. Do not skip steps.

---

## Files created

- `src/app/controllers/_shared/types.ts`
- `src/app/controllers/_shared/format-messages.ts`
- `src/app/controllers/_shared/restore-flow.ts`
- `src/app/controllers/_shared/restore-flow.test.ts`
- `src/app/controllers/_shared/constants.ts`
- `src/app/controllers/_shared/use-active-finish-ids.ts`
- `src/app/controllers/_shared/use-active-finish-ids.test.ts`
- `src/app/controllers/use-selection-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-movement-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-history-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-deletion-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-catalog-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-start-over-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-asset-lifecycle-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-share-controller.ts` (+ `.test.ts`)
- `src/app/controllers/use-scene-selection-effects.ts` (+ `.test.ts`)
- `src/app/contexts/editor-refs-context.tsx` (+ `.test.tsx`)
- `src/app/contexts/overlay-layout-context.tsx` (+ `.test.tsx`)

## Files deleted

- `src/app/use-scene-handlers.ts`
- `src/app/use-scene-handlers.test.ts`
- `src/app/use-scene-handlers.share.test.ts`
- `src/app/use-scene-handlers.source.test.ts`
- `src/app/use-scene-handlers.startup.test.ts`
- `src/app/overlay/use-overlay-props.ts`
- `src/app/overlay/use-overlay-props.test.ts`

## Substantially modified

- `src/App.tsx` — drops `useSceneHandlers` and `useOverlayProps`; mounts eight controllers + `useSceneSelectionEffects`; mounts two context providers; keeps composition-root startup, preview, keyboard, and JSX wiring.
- `src/app/overlay/editor-overlay.tsx` — drops seven prop bundles; adds three shell prop interfaces; adds `EditorOverlayDialogs` sub-component; reads from `OverlayLayoutContext` for exclusion-rect registration.
- `src/app/overlay/editor-overlay.test.tsx` — updated for the new prop shape.
- `src/app/overlay/top-header.tsx` and its children — read store state via selectors; prop list shrinks.
- `src/app/overlay/top-header*.test.tsx` — updated.
- `src/app/scene-panel/outliner.tsx` — drops `readModel`, `disabled`, `previewedId`, `focusRequest`, `onFocusHandled` props; reads from stores.
- `src/app/scene-panel/outliner.test.tsx` — updated.
- `src/app/camera/camera-tools.tsx` — drops `editorInteractionsEnabled`, `hasSelection` props.
- `src/app/overlay/status-message.tsx` — drops `message` prop; reads `useEditorMessage()`.
- `src/editor-state/scene-state-store.ts` — adds `useHasSelection`; deletes `useSceneReadModel` and `areSceneReadModelsEqual`.
- `src/editor-state/dialog-store.ts` — adds `useIsBlockingOverlayOpen`.
- `src/editor-state/editor-runtime-store.ts` — adds `floorFinishLoading` field, action, and selector.
- `src/editor-state/editor-runtime-store.test.ts` — covers the new field.
- `src/scene/scene.types.ts` — removes `SceneReadModel`.
- `AGENTS.md`, `docs/editor-state-architecture.md` — updated.

---

## Tests

### New tests required

Each controller has its own test file. Required coverage:

- `use-selection-controller.test.ts` — `handleCanvasPointerSelection`, `handleSelectById` source attribution. The `InteractionSource` union is `'canvas-keyboard' | 'canvas-pointer' | 'panel-keyboard' | 'panel-pointer' | 'toolbar' | null`; tests must cover all six values to lock down the announce-mode mapping. `handleClearSelection`. Verifies `selectionEffects.notePending*` calls fire with the expected behavior objects (mock `selectionEffects`).
- `use-movement-controller.test.ts` — `handleMoveSelection` ok / blocked-bounds / blocked-collision / dragging / no-selection / no-op result paths and announcements; `handleRotateSelection`; `handleUpdateSelectedItemDetails` for positionX, positionZ, rotationDegrees and each result reason.
- `use-history-controller.test.ts` — undo/redo success and no-op cases; `selectionEffects.notePendingSelection` is called with `{ announceMode: 'suppress', requestOutlinerFocus: true }` only on success.
- `use-deletion-controller.test.ts` — `handleConfirmDeleteSelection` with each `selectedSource` (drives the room-view-vs-outliner focus branch); `handleOpenDeleteDialog`; `handleOpenDeleteDialogFromRoomView`. Verifies `dialogState.openDelete` and `dialogState.closeDialog` are called and `selectionEffects.notePostDeleteFocusTarget` is called with the right value.
- `use-catalog-controller.test.ts` — successful add (selectionEffects + setSelectedSource), failed add (no calls), drawer open change + clearEditorMessage on transition.
- `use-start-over-controller.test.ts` — confirm-start-over runs each step (10 of them) in order (use a sequenced spy).
- `use-asset-lifecycle-controller.test.ts` — error path (toast + announcement + transition), retry path, ready path with each restore branch (URL-only, draft-only, URL+draft, fresh, invalid). Move the relevant cases from `use-scene-handlers.startup.test.ts`.
- `use-share-controller.test.ts` — share via `navigator.share`, fallback to clipboard, `setEditorMessage` on too-large URL, abort handling.
- `use-scene-selection-effects.test.ts` — each effect's behavior. Mock the announcer, drive store state via `sceneStateStore.setState`, assert `selectionMetaActions.requestOutlinerFocus` calls.
- `_shared/restore-flow.test.ts` — moved-from-share-and-source tests for `runStartupRestoreFlow`.
- `_shared/use-active-finish-ids.test.ts` — derivation correctness.
- `editor-refs-context.test.tsx` — provider value access; throws when used outside provider.
- `overlay-layout-context.test.tsx` — same.

### Updated tests

- `editor-runtime-store.test.ts` — add `floorFinishLoading` coverage.
- `scene-state-store.test.ts` — drop `useSceneReadModel` / `areSceneReadModelsEqual` cases; add `useHasSelection`.
- `dialog-store.test.ts` — add `useIsBlockingOverlayOpen` coverage.
- `editor-overlay.test.tsx` — new prop shape.
- `outliner.test.tsx` — store-driven; drive via `sceneStateStore.setState`.
- `top-header*.test.tsx` — store-driven.
- `camera-tools.test.tsx` — store-driven.

### Tests deleted (covered by new controller tests)

- `use-scene-handlers.test.ts`
- `use-scene-handlers.share.test.ts` (cases moved to `restore-flow.test.ts` and `use-share-controller.test.ts`)
- `use-scene-handlers.source.test.ts` (cases moved to `use-selection-controller.test.ts` and `use-scene-selection-effects.test.ts`)
- `use-scene-handlers.startup.test.ts` (cases moved to `use-asset-lifecycle-controller.test.ts`)
- `use-overlay-props.test.ts` (no replacement needed; the file is gone)

### Tests that must pass unchanged

- All `e2e/` Playwright suites. Pay particular attention to:
  - `e2e/url-restore.spec.ts`
  - `e2e/editor-history.spec.ts`
  - `e2e/drag-collision.spec.ts`
  - `e2e/drag-bounds.spec.ts`
  - `e2e/editor-accessibility-flows.spec.ts`
  - `e2e/editor-a11y-audits.spec.ts`
  - `e2e/startup-loading.spec.ts` and `e2e/startup-load-error.spec.ts`
  - `e2e/add-furniture.spec.ts`
  - `e2e/editor-dialogs.spec.ts`
  - `e2e/editor-hotkeys.spec.ts`
  - `e2e/selected-toolbar-placement.spec.ts`
- All RTTR component tests under `src/scene/internal/`.
- Hook tests not directly affected (`use-preview-controller.test.ts`, `use-draft-persistence.test.ts`, etc.).

### Performance verification

- Diff `pnpm test:browser:perf` traces against the Phase 1 baseline captured in `plans/perf-baseline-phase1-wip.md`.
- Two scenarios: drag interaction, and idle camera tracking with a selected item (verifies the toolbar-geometry deadband stays effective and that store fanout from `selection-meta-store` does not re-render the wrong leaves).
- If frame budget regresses by more than the noise band documented in the existing perf baseline, stop and analyze before merging.

---

## Watch-outs

- **Identity stability of derived selectors.** When leaves switch from prop reads to store reads, they will subscribe to selectors. If a selector returns a new array/object on every store update (e.g., a `useItems()` that maps internally), unrelated state changes will re-render the leaf. The Phase 1 store implementations already preserve identity for `items`, `historyAvailability`, etc. — verify that adding new selectors (`useHasSelection`, `useIsBlockingOverlayOpen`, `useFloorFinishLoading`) returns primitives, not freshly-allocated objects.

- **Selection effects ordering.** The three effects in `useSceneSelectionEffects` depend on each other through refs. The order of the `useEffect` calls in the source file must match the order in `useSceneHandlers` today: (1) post-delete focus, (2) selection-source reconciliation, (3) selection announcer, (4) cleanup. Do not reorder. Effects in React fire in source order on mount; that ordering matters for the ref interactions.

- **`useSceneSelectionEffects` mounting site.** Mount it before the controllers in `App.tsx` so its returned API is available to controllers. React hook order rules apply; mount it as the first hook after the dialog-state snapshot.

- **`flushSync` calls.** The room-view focus blur/focus uses `flushSync`. Phase 2 does not touch that. Verify after the refactor that `roomViewHasFocus` still updates synchronously enough for `useKeyboardShortcuts({ roomViewHasFocus })` to see the right value during the pointer-missed → focus → next-keystroke sequence. The `e2e/editor-hotkeys.spec.ts` suite covers this.

- **Test doubles for `selectionEffects`.** Multiple controller tests will need a `selectionEffects` mock. Add a small helper `createSelectionEffectsMock()` in `src/app/controllers/_shared/test-helpers.ts` that returns `{ notePendingSelection: vi.fn(), notePendingSource: vi.fn(), notePostDeleteOutlinerFocusIndex: vi.fn(), notePostDeleteFocusTarget: vi.fn() }`.

- **`announcements` test double.** Same pattern: `createAnnouncementsMock()` returning `{ announcePolite: vi.fn(), announceAssertive: vi.fn(), clearAssertiveAnnouncement: vi.fn(), queueMovementAnnouncement: vi.fn(), clearQueuedMovementAnnouncement: vi.fn(), politeAnnouncement: '', assertiveAnnouncement: '' }`. Place in the same `_shared/test-helpers.ts`. (Do not export from `index.ts`; tests import directly.)

- **`dialogState` test double.** Same pattern: `createDialogStateMock(overrides?)` returning a snapshot with all fields. Default everything to safe values (`isDeleteDialogOpen: false`, `closeDialog: vi.fn()`, etc.). Place in `_shared/test-helpers.ts`.

- **Don't accidentally turn `editor-state` into a leaf.** The `useIsBlockingOverlayOpen`, `useHasSelection`, `useFloorFinishLoading` selectors live in `editor-state/`. Do not move any controller or context file under `editor-state/`. **Note:** the Phase 1 plan referenced an ESLint rule banning React-component imports under `editor-state/**`; that rule was not actually committed. Phase 2 does not introduce it either — adding cross-layer ESLint enforcement is the stated job of Item F (Phase 4). Treat "don't import React components from `editor-state/`" as a convention enforced by code review for now; do not add the rule as part of Phase 2 scope. The store files are pure `.ts` modules today; verify each new selector you add does not import from any `.tsx` file or any module under `src/app/`.

- **The deletion controller's `SceneReadModel` return.** Today `handleConfirmDeleteSelection` returns `SceneReadModel | null` (always `null`). Step 8 deletes `SceneReadModel`. Make sure C.4's signature change to `() => void` lands **before** Step 8, otherwise typecheck fails.

- **Test harness shape preserved.** `__ROOM_LAYOUT_TEST__.getState()` continues to return the same fields with the same types. The `selectedName` derivation already reads from `sceneStateStore.getState()`. Do not change this block.

- **Avoid creating a "controllers index" barrel.** Each controller is imported by `App.tsx` directly. A barrel file at `src/app/controllers/index.ts` is **not** wanted because it makes selective imports harder to audit and tends to grow into a god-module.

- **Folder location is intentional.** `src/app/controllers/` lives under `src/app/`, not at the workspace root. Phase 2 does not introduce `editor-shell/`. That move is Item F (Phase 4 / future work).

- **No barrel exports from `_shared/`.** Each `_shared` module is imported directly by name. No `src/app/controllers/_shared/index.ts`.

- **Controller naming convention.** All controller files start with `use-` and end with `-controller.ts`. No exceptions in this phase.

- **Context provider mount order.** `<TooltipProvider>` wraps everything. Inside it, `<EditorRefsProvider>` wraps `<OverlayLayoutProvider>` wraps the `<main>` element. Refs come first because layout context depends on refs being stable; values are computed via `useMemo` inside `App` before the providers render.

- **Don't forget `useDraftPersistence`.** It mounts in `App.tsx` and reads `environmentConfig` from `useStartupState()`. Phase 2 does not touch it. Confirm it still works after `App.tsx` reorganization.

- **`previewedIdRef` in `App.tsx`.** This ref is read synchronously by `handleCanvasSelectPreviewed` and updated by both the store-driven `previewedId` selector and `handleCanvasKeyboardPreviewChange`. It stays in `App.tsx`. Do not move it into a controller.

  **Implementation note:** During Phase 2 implementation this ref + its three handlers (`handleCanvasKeyboardPreviewChange`, `handleCanvasBrowse`, `handleCanvasSelectPreviewed`) and the `previewedId → ref` sync effect were extracted into `src/app/controllers/use-canvas-keyboard-controller.ts`. The hook returns `previewedIdRef` so the test-state bridge can keep reading it. The synchronous-write semantics around `handleCanvasKeyboardPreviewChange` are preserved.

- **Intentional behavior tightening in Phase 2 controllers.** Two controllers tightened guards beyond the strict "behavior-preserving" goal. Both changes are deliberate and pass the existing test suite:
  - `useSelectionController.handleSelectById` and `handleClearSelection` now early-return when `editorInteractionsEnabled` is `false` or `sceneCommands.isSceneReady()` is `false`. The original handlers in `useSceneHandlers` did not check readiness — they relied on `sceneCommands` being a no-op pre-ready. Returning a `not-found` result (or doing nothing) when the scene isn't ready is more honest and prevents stale `clearEditorMessage` writes during startup. Pinned by `use-selection-controller.test.ts`.
  - `useDeletionController.handleConfirmDeleteSelection` now writes `DELETE_SELECTION_MISSING_MESSAGE` to the editor message store when `sceneCommands.isSceneReady()` is `false`. Previously the not-ready branch was silently absorbed inside `scene-command-actions.confirmDeleteSelection`. Pinned by `use-deletion-controller.test.ts`.

---

## Done definition (final acceptance gate)

All of the following must be true to consider Phase 2 complete:

1. `src/app/use-scene-handlers.*` files do not exist.
2. `src/app/overlay/use-overlay-props.*` files do not exist.
3. `src/app/controllers/` exists with eight controller hooks, `useSceneSelectionEffects`, and the `_shared/` modules listed above.
4. `src/app/contexts/` exists with `EditorRefsContext` and `OverlayLayoutContext`.
5. `src/App.tsx` does not import `useSceneHandlers`, `useOverlayProps`, `useSceneReadModel`, or any of the deleted prop bundles.

   **Status:** `App.tsx` remaining content is mostly: startup memo, controller wiring, JSX tree, effect hooks tied to App-shell composition. Reducing that would require either moving the JSX tree into a sub-component or splitting controller wiring into a single composition hook; both are deferred.

6. `src/app/overlay/editor-overlay.tsx` exports only the new `EditorOverlay` and `EditorOverlayDialogs` components and the three shell prop interfaces. The seven old prop interfaces are gone.
7. `SceneReadModel` is not defined or imported anywhere in `src/`.
8. `pnpm typecheck` passes.
9. `pnpm lint` passes.
10. `pnpm test:run` passes (existing tests + new controller/context tests).
11. `pnpm test:e2e` passes for the full Chromium suite.
12. `pnpm test:browser:perf` traces show no regression vs. the Phase 1 baseline on the drag and idle-camera-tracking scenarios.
13. `pnpm fix` reports no remaining changes.
14. `AGENTS.md` and `docs/editor-state-architecture.md` reflect the new structure.
15. The feature behavior, visuals, accessibility semantics, and keyboard shortcuts are unchanged.

---

## What follows Phase 2

For context (do not act on this in Phase 2):

- **Phase 3 (Item E)** decomposes `SelectedItemControls` into pure UI primitives with dual render sites (docked + floating).
- **Phase 4 (Item F)** moves files into `editor-state/` (already done in Phase 1), `editor-shell/`, and `editor-ui/` and adds the cross-layer ESLint enforcement.

Phase 2 lays the groundwork for both: controllers are easy to relocate into `editor-shell/`, and the new context surface gives `editor-ui/` leaves a clean place to look up refs/layout.
