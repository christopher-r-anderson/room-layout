# Phase 3 — Layout (Plan)

This plan implements **Item E** from `architecture-refactor-outline.md`: decompose `SelectedItemControls` into pure UI primitives with dual render sites (docked + floating). After Phase 3, the docked toolbar/details participate in real overlay-grid layout (no rect side channel, no absolute-positioning math for the docked case), the floating toolbar continues to be canvas-anchored through the existing geometry contract, and the placement decision is made once by a single hook and consumed by two thin render sites.

This is a **behavior-preserving refactor**. Visual output, keyboard shortcuts, accessibility semantics, focus order, persistence, URL restore, blur-commit suppression on Remove, and announcements must all be unchanged. The implementor is expected to run `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and the relevant `pnpm test:e2e` lanes after each step and at the end.

The implementor should read this plan front to back before starting and should not introduce additional refactors not described here.

---

## Outcome (definition of done)

- `src/app/selection/selected-item-controls.tsx` and its co-located test are deleted. The component is replaced by two render-site components and one composition hook.
- A single `useSelectedItemPlacement()` hook makes the placement decision once. It returns a discriminated union `{ site: 'docked' | 'floating' | 'hidden'; ... }`.
- `SelectedActionsView` and `SelectedDetailsView` (renamed from `SelectedItemActions` / `SelectedItemDetails`, kept in `src/app/selection/`) are pure: they take props in and render JSX out. They do not call `useHeaderLayoutMode`, `useElementSize`, `useElementRect`, `useToolbarGeometry`, `useSyncExternalStore`, or any store/context hook. They do not own the blur-suppression ref. They do not know about placement modes beyond "am I shown? am I disabled?".
- Two render-site components live at `src/app/selection/`:
  - `DockedSelectedItemSite` — renders the actions + details inside the overlay grid using normal CSS layout. No `transform: translate3d`. No absolute positioning. Uses container queries / media-query-style classes for responsive layout. Mounted as a named child of `EditorOverlay`.
  - `FloatingSelectedItemSite` — renders the actions in canvas-screen space via `transform: translate3d`, anchored from the existing toolbar-geometry → viewport conversion math. The floating site renders **only** the actions toolbar, not the details card; the details card is always docked. (See D5.)
- Exactly **one** DOM instance of `SelectedActionsView` exists at any time. When placement is `'floating'`, the docked site renders the details card only and skips rendering the actions toolbar. When placement is `'docked'`, the docked site renders both. When placement is `'hidden'`, neither site renders the actions toolbar (the docked site still renders the details card, since the details card is always shown when there is a selection — see D5 below).
- Blur-commit suppression between the Remove button and the details inputs is preserved through a single `SelectedItemInteractionContext` consumed by whichever site renders each surface. There is no global module state for this.
- The selection meta store gains no new fields. The toolbar-geometry contract from the scene is unchanged. `selectedToolbarGeometry` is read once inside `useSelectedItemPlacement` via the existing `useToolbarGeometry()` selector.
- `App.tsx` no longer renders `<SelectedItemControls>` directly. It renders `<FloatingSelectedItemSite />` as a sibling to the `<section>` room-view (still inside the same `<main>` and inside both context providers). The docked site is rendered by `EditorOverlay` as a named child within its grid.
- `EditorOverlay`'s prop interface gains no `dockedSelectedItem` prop; the docked site is mounted internally and reads from stores + the new placement context.
- `selectedItemControlsRef` (the suppression-root ref kept in `EditorRefsContext`) is repurposed to point at the **floating** site's wrapper element. The "back to selected controls" navigation handler (`handleNavigateBackToSelectionControls` in `App.tsx`) is updated so it finds the first focusable control in whichever site is currently mounted (docked or floating). See D7.
- The overlay exclusion-rect registry no longer registers `'selected-details'` — the docked details card is part of the overlay grid and naturally claims space; the floating actions toolbar continues to avoid header / outliner / camera-tools / room sidebar / room drawer rects, but is small enough that it does not need to register itself as an exclusion. (See D8.)
- All existing Vitest tests, all RTTR tests, and all Playwright suites under `e2e/` pass without product changes. New tests cover the placement hook, both site components, and the interaction-context contract.
- No new dependencies. No edits under `src/scene/**`. No edits to `src/lib/three/**`.
- No edits to `src/lib/ui/selected-toolbar-placement.ts`, `convex-geometry.ts`, `toolbar-anchors.ts`, or `rect-utils.ts`. The placement-math primitives stay where they are; only their caller moves.
- `AGENTS.md` and `docs/selected-toolbar-placement.md` are updated to reflect the dual-render-site architecture.

## Out of scope

Do not do these even if tempting:

- **Item F (folder reorganization into `editor-state` / `editor-shell` / `editor-ui`).** Do not move files between those layers. Do not introduce `src/editor-shell/` or `src/editor-ui/`.
- **Touching the scene module or scene-state stores.** No edits under `src/scene/**`. No changes to the `SelectedToolbarGeometry` type or to the `selectionMetaStore`.
- **Changing what `selectedToolbarGeometry` represents** (sources, reasons, projection rules, deadband). Phase 3 does not alter the scene-side contract.
- **Changing the floating-placement math.** `computeSelectedToolbarPlacement`, `getConvexHull`, etc. stay as-is. Only the call site moves.
- **Adding a `role="toolbar"` keyboard pattern** to the actions surface. The actions surface continues to use the existing `aria-label="Selected item actions"` section + `ButtonGroup` pattern, and individual buttons remain in normal tab order. (See `docs/floating-toolbar-plan.md` "Decisions" — that decision is still in force.)
- **Changing announcement copy, toast wording, dialog flow, or keyboard-shortcut behavior.**
- **Splitting the placement math into more files, renaming `selected-toolbar-placement.ts`, or changing its return shape.** The Phase 3 hook wraps it; it does not replace it.
- **Adding new Zustand stores or new selectors.** All store reads use existing selectors.
- **Changing the catalog/manifest format, asset pipeline, or `uiBoundsNodeName` semantics.**
- **Removing the existing exclusion-rect registry.** It still serves the floating-site placement math. Only the `'selected-details'` registration is removed (D8).

---

## Cross-cutting decisions (lock these before implementing)

These must not drift during implementation. If implementation friction suggests changing one of these, stop and re-read this section.

### D1. Two render sites, never both rendering the actions toolbar

Phase 3 introduces two separate DOM render sites:

- **Docked site** (`DockedSelectedItemSite`) lives inside `EditorOverlay`'s grid as a named child between the outliner and the camera-tools (see D6 for exact slot). It uses normal CSS layout with Tailwind utilities and a container-query / media-query class set. It is **always** mounted as long as there is a selection (so the details card is always present when an item is selected); it **conditionally renders the actions toolbar** only when `placement.site === 'docked'`.
- **Floating site** (`FloatingSelectedItemSite`) lives as a sibling to the room-view `<section>` in `App.tsx`. It is mounted only when `placement.site === 'floating'`. It renders **only** the actions toolbar, absolutely positioned via `transform: translate3d(left, top, 0)`. It does not render the details card.

The actions toolbar therefore has exactly one DOM instance at any time:

| `placement.site` | Docked site renders                    | Floating site renders |
| ---------------- | -------------------------------------- | --------------------- |
| `'docked'`       | actions toolbar **and** details card   | (not mounted)         |
| `'floating'`     | details card only                      | actions toolbar       |
| `'hidden'`       | details card only (toolbar suppressed) | (not mounted)         |

When there is **no selection**, neither site renders anything (the docked site returns `null` early; the floating site is not mounted by `App.tsx`). The startup-overlay / catalog-drawer "suppressed" states are layered on top and force `'hidden'`; see D2.

### D2. Single placement hook, called exactly once

`useSelectedItemPlacement()` is the only place the placement decision is made. It is called once in `App.tsx` and the result is provided through a new React context (`SelectedItemPlacementContext`).

```ts
// src/app/selection/selected-item-placement.types.ts

export type SelectedItemPlacementSite = 'docked' | 'floating' | 'hidden'

export type SelectedItemPlacement =
  | {
      site: 'docked'
      // Layout flags read by DockedSelectedItemSite; used to decide
      // whether to render the actions toolbar or only the details card.
      reason: 'mobile-layout' | 'no-geometry' | 'low-confidence' | 'forced'
    }
  | {
      site: 'floating'
      // Pre-computed viewport-CSS-pixel position for the floating actions
      // toolbar. The docked site uses these only to decide that it should
      // skip rendering the toolbar.
      left: number
      top: number
      side: ToolbarSide // from selected-toolbar-placement
      candidateId: ToolbarFloatingCandidateId
    }
  | {
      site: 'hidden'
      reason: 'no-selection' | 'suppressed' | 'computed-hidden'
    }
```

The hook signature:

```ts
export function useSelectedItemPlacement(options: {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  editorInteractionsEnabled: boolean
}): SelectedItemPlacement
```

Internally the hook:

1. Reads `useSelectedFurniture()` and `useToolbarGeometry()` from the existing stores.
2. Reads `useHeaderLayoutMode()` and the `roomViewRef` rect via `useElementRect(roomViewRef)`. The `roomViewRef` is read from `EditorRefsContext` via `useEditorRefs()`. **Resolution:** `EditorRefsContext` is React-tree-stable, but `useElementRect` requires a `RefObject`; pass `editorRefs.roomViewRef` directly (it is the same `RefObject` instance for the lifetime of the app).
3. Reads `exclusionRects` from `useOverlayLayout()` (Phase 2 context). The exclusion rects are an array; the hook reduces them into the `Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>` shape that `computeSelectedToolbarPlacement` expects. **Resolution:** the Phase 2 `OverlayLayoutContext` exposes `exclusionRects` as `ReadonlyArray<DOMRect>` (values from `Object.values(rects)`); change it to expose the keyed map directly so the placement hook can pass it into `computeSelectedToolbarPlacement` without an id-loss layer. See "Pre-flight tweak" below.
4. Owns the `previousFloatingCandidateId` hysteresis store (the `createCandidateStore` + `useSyncExternalStore` block currently inside `SelectedItemControls`). The store is created once via `useMemo(() => createCandidateStore(undefined), [])` and reset (via the existing `useEffect` on selection / size / mode change) inside the hook. The hook is the **only** place this store exists.
5. Computes the placement by calling `computeSelectedToolbarPlacement(...)` with the same inputs and rules as today. The discriminated `placement.mode` from the placement helper is mapped to the `SelectedItemPlacement` shape:
   - `mode === 'docked'` → `{ site: 'docked', reason: <classified> }`
   - `mode === 'floating'` → `{ site: 'floating', left, top, side, candidateId }`
   - `mode === 'hidden'` → `{ site: 'hidden', reason: 'computed-hidden' }`
6. Layers suppression: if `selectedFurniture === null`, returns `{ site: 'hidden', reason: 'no-selection' }`. If `startupOverlayActive || isCatalogDrawerOpen`, returns the **same** result the placement helper would have produced for `forceDocked: true`, but with the `reason` field set to `'forced'` (since the toolbar is `inert` in that case anyway and only the docked site is mounted with the details card). Suppression does not force `'hidden'` in the actions toolbar — the actions toolbar is rendered but `disabled`/`inert` is applied by the consumer. **Lock:** the existing behavior is exactly this; preserve it.

The hook **does not** call into the actions/details components or hold any other React state.

### D3. Pure UI primitives

`SelectedActionsView` and `SelectedDetailsView` are pure functions of their props. They contain no store reads, no context reads, no element-rect / element-size hooks, no header-layout-mode reads, and no hysteresis state. They take all of their inputs as props.

#### `SelectedActionsView` final prop shape

```ts
// src/app/selection/selected-actions-view.tsx

export interface SelectedActionsViewProps {
  selectedFurniture: FurnitureItem
  disabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete: () => void
  onRotateSelection: (direction: -1 | 1) => void
  // Only the floating site sets these. The docked site omits them and the
  // section uses normal CSS layout.
  placementMode?: 'floating' | 'docked'
  placementCandidateId?: ToolbarFloatingCandidateId
  style?: CSSProperties
  className?: string
  sectionRef?: Ref<HTMLElement>
}
```

The `placementMode === 'hidden'` branch is gone — when placement is hidden, the component is not rendered at all (the floating site does not mount; the docked site skips the actions toolbar). The `aria-hidden`/`inert` controls today driven from `placementMode === 'hidden'` are now driven by `disabled` only. **Lock:** verify that the existing tests in `selected-item-controls.test.tsx` that exercise the `'hidden'` placement actually exercise scenarios where `placement.site === 'hidden'` (no-selection or suppression) — those scenarios result in the toolbar simply not rendering, and the test assertions migrate to `expect(...).not.toBeInTheDocument()`.

#### `SelectedDetailsView` final prop shape

```ts
// src/app/selection/selected-details-view.tsx

export interface SelectedDetailsViewProps {
  selectedFurniture: FurnitureItem
  disabled: boolean
  className?: string
  sectionRef?: Ref<HTMLElement>
  consumeBlurCommitSuppression: () => boolean
  onInvalidSelectedItemDetailValue?: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}
```

This is unchanged from today's `SelectedItemDetails`. The component file is **renamed** to `selected-details-view.tsx` (with an exported function named `SelectedDetailsView`) but its internal logic — the `SelectedItemDetailsCard` private component, `FIELD_CONFIG`, draft handling, blur-commit gate — is moved verbatim. `SelectedItemDetailsPlaceholder` (used elsewhere?) is re-exported under the same name from the new file path or kept as a separate file; check usage and decide. **Resolution:** `grep` shows `SelectedItemDetailsPlaceholder` is exported alongside `SelectedItemDetails` in the same file today. Keep the placeholder export from `selected-details-view.tsx` for backward compat. (Audit consumers in step 1.)

### D4. Blur-commit suppression lives in a tiny scoped context

The current `suppressNextBlurCommitRef` is declared inside `SelectedItemControls`. After Phase 3, the actions toolbar may live in a different render site than the details card, so the ref must be shared across sites. The cleanest seam is a tiny context:

```ts
// src/app/selection/selected-item-interaction-context.tsx

export interface SelectedItemInteraction {
  prepareDeleteBlurSuppression: () => void
  consumeBlurCommitSuppression: () => boolean
}
```

- The provider lives at the **outer** scope where both sites are present — i.e. inside `App.tsx`'s render tree, **outside** both `<FloatingSelectedItemSite />` and `<EditorOverlay />`. Mount it inside the existing `<OverlayLayoutProvider>`, so the order is `TooltipProvider > EditorRefsProvider > OverlayLayoutProvider > SelectedItemPlacementProvider > SelectedItemInteractionProvider > main`.
- The provider owns one `useRef<boolean>` and exposes the two stable callbacks via a `useMemo`-stabilized object value.
- `SelectedActionsView` does **not** consume this context directly. The site component consumes it and forwards `onPrepareDelete` to the actions view. This keeps the actions view fully pure.
- `SelectedDetailsView` does not consume this context directly either; the site forwards `consumeBlurCommitSuppression`.

There is **no** global module state for blur suppression. There is **no** event-bus pattern. The context exists purely so the two sites share the single ref.

### D5. The details card is always docked

The details card never floats. Geometry-anchored placement is only meaningful for the actions toolbar, which is small (~140×48px) and benefits from being near the selected object. The details card is a several-row form that benefits from grid alignment with the room-view footprint, not from canvas-anchored positioning.

Today the details card is rendered inside `SelectedItemControls` with `className="absolute bottom-30 md:bottom-2 left-2 right-2 md:left-auto md:w-auto"` — i.e. it is already pinned to a viewport-anchored corner and not following the object. Phase 3 makes this explicit:

- The details card is rendered exclusively by `DockedSelectedItemSite`.
- The Tailwind classes used today for its corner placement transfer to the docked site's `<SelectedDetailsView className="..." />`. The site is responsible for the layout classes, not the view component.
- The mobile/desktop responsive split (`bottom-30` mobile vs. `bottom-2 md:left-auto md:w-auto` desktop) continues to use the same Tailwind breakpoints — **not** `useHeaderLayoutMode()`. This matches today's behavior exactly. **Lock:** do not migrate this to a JS-driven `headerLayoutMode === 'mobile'` branch; the visual breakpoint is currently media-query-driven and must remain so.

If a future product change wants the details card to dock alongside the floating toolbar in a stack, it can be revisited; not in Phase 3.

### D6. Exact docked site slot inside `EditorOverlay`

`EditorOverlay`'s body today renders (in tab/DOM order):

1. `TopHeader`
2. `StatusMessage`
3. `Outliner`
4. `EditorOverlayDialogs` (modal layer; doesn't affect DOM order for tab navigation when closed)
5. `CameraTools`

The docked selected-item site is mounted as a child of `EditorOverlay` between **(3) Outliner** and **(5) CameraTools**. Tab order becomes: TopHeader → Outliner → DockedSelectedItemSite (actions, then details) → CameraTools.

**Lock:** today the actions/details tab order goes "room-view → SelectedItemControls (actions then details) → EditorOverlay (TopHeader → Outliner → CameraTools)". Tab order changes in Phase 3:

- When **floating**: `room-view` → **floating actions toolbar** → `EditorOverlay`'s TopHeader → Outliner → DockedSelectedItemSite (details only) → CameraTools.
- When **docked**: `room-view` → `EditorOverlay`'s TopHeader → Outliner → DockedSelectedItemSite (actions, then details) → CameraTools.

This is a **deliberate** semantic shift from today, where actions/details were always mounted as siblings to room-view (so always between room-view and TopHeader in tab order). The new docked tab order puts the details card after the outliner instead of before the top header.

**This is the one intentional behavior change in Phase 3.** It is documented in this plan, in `AGENTS.md`, and in `docs/selected-toolbar-placement.md`. Existing accessibility tests that pin "Tab from room-view → actions/details" must be updated to:

- Floating mode (desktop with geometry): keep the existing assertion (room-view → floating actions toolbar → top-header).
- Docked mode (mobile / no-geometry): updated assertion (room-view → top-header → outliner → docked actions → docked details → camera-tools). Tests in `e2e/editor-accessibility-flows.spec.ts` and `e2e/selected-toolbar-placement.spec.ts` are the relevant ones; see "Tests" below.

The `handleNavigateBackToSelectionControls` Shift+Tab handler in `App.tsx` (used by the outliner-back nav) needs to find the **first focusable control inside whichever site is mounted**:

- If the floating site is mounted, focus its first control.
- Else, focus the first control inside the docked site (which sits in the overlay grid).

See D7 for the implementation.

### D7. Refs and "back to selected controls" navigation

The Phase 2 `EditorRefsContext` exposes `selectedItemControlsRef: RefObject<HTMLDivElement | null>`. After Phase 3, this ref is repurposed as a **single ref that points at whichever site is currently mounted**. The implementation owns one ref in `App.tsx`. Both sites accept a `containerRef` prop and assign it. Because at most one site mounts the actions toolbar at a time, only one site has the actions toolbar focusable controls, and the ref is correct for `findFirstFocusableControl(...)`.

To make this work with both sites:

- **Floating site** sets `containerRef={selectedItemControlsRef}` on its outer wrapper `<div>` (the `pointer-events-none` absolute layer that wraps the actions toolbar).
- **Docked site** assigns the same `selectedItemControlsRef` to its outer `<div>` **only when it is rendering the actions toolbar** (i.e. `placement.site === 'docked'`). When the docked site is rendering details only (i.e. `placement.site === 'floating'` or `'hidden'`), it does **not** claim the ref.

Both sites can safely use the same ref because the placement union guarantees mutual exclusion of the actions toolbar.

`handleNavigateBackToSelectionControls` continues to do:

```ts
const firstFocusableControl = findFirstFocusableControl(
  selectedItemControlsRef.current,
)
```

— and works for both sites without change.

**Resolution for refs context:** the docked site receives `selectedItemControlsRef` from the placement context, not via a prop chain. The Phase 2 `EditorRefsContext` already exposes it. The site reads it via `useEditorRefs()` and conditionally attaches it.

### D8. Exclusion-rect registry — drop `'selected-details'`

After Phase 3, the docked details card is part of the overlay grid. Its rect is **not** consumed by the floating-toolbar placement math, because the floating site is the actions toolbar only and the details card lives inside `EditorOverlay`'s natural grid (so the toolbar is naturally placed away from it via the existing exclusion entries for `'top-header'`, `'outliner'`, `'camera-tools'`, etc.; the docked details card is anchored to a viewport corner and the toolbar's hard gates already keep it within the room-view rect).

- The `'selected-details'` id is removed from `OverlayExclusionRectId` in `src/app/overlay/use-overlay-exclusion-rects.ts`.
- `App.tsx`'s call to `overlayExclusions.registerExclusionElement('selected-details')` is removed; the docked site does not register itself.
- The `selectedDetailsRef` prop on `SelectedItemControls` is removed (along with the component itself).
- Tests for the exclusion registry update accordingly.

**Lock:** if implementation reveals a real placement collision between the floating actions toolbar and the docked details card, **stop and report** rather than re-introducing the `'selected-details'` exclusion entry. The docked details card lives at `bottom-2 md:left-auto md:w-auto` (i.e. bottom-right on desktop). The desktop floating toolbar prefers top-then-bottom placement, so collisions in practice should not occur. If they do, the right answer is to add an exclusion entry for the **docked details card's rect** but only when the floating site is active — that work would be a separate, scoped follow-up.

### D9. Pre-flight tweak: keyed exclusion rects in `OverlayLayoutContext`

The Phase 2 `OverlayLayoutContext` exposes `exclusionRects: ReadonlyArray<DOMRect>` (the values, not the keyed map). The placement hook needs the keyed map to feed `computeSelectedToolbarPlacement`. Change the context shape **once, in this phase** so the placement hook receives the data it needs:

```ts
// Before (Phase 2):
interface OverlayLayout {
  exclusionRects: ReadonlyArray<DOMRect>
  registerExclusionElement: (
    id: OverlayExclusionRectId,
  ) => (element: HTMLElement | null) => void
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}

// After (Phase 3):
interface OverlayLayout {
  exclusionRects: Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>
  registerExclusionElement: (
    id: OverlayExclusionRectId,
  ) => (element: HTMLElement | null) => void
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}
```

`useOverlayExclusionRects` already returns the keyed map; the change is a one-line edit in `App.tsx`'s `overlayLayout = useMemo(...)` (drop `Object.values(...)`). Update the context-test value shape and the `OverlayLayout` interface. No other consumer of the array shape exists today.

### D10. No new contexts beyond placement and interaction

Two new contexts are introduced in Phase 3:

1. `SelectedItemPlacementContext` — provides the `SelectedItemPlacement` value computed by `useSelectedItemPlacement`.
2. `SelectedItemInteractionContext` — provides `prepareDeleteBlurSuppression` / `consumeBlurCommitSuppression`.

That's it. Do not introduce additional contexts. Both contexts live in `src/app/selection/` (next to the components that use them), not in `src/app/contexts/`. Phase 2's `EditorRefsContext` and `OverlayLayoutContext` continue to live in `src/app/contexts/`; they are cross-cutting (used by many features), whereas the two new contexts are local to the selected-item feature.

### D11. Render-site components do not import each other

`DockedSelectedItemSite` and `FloatingSelectedItemSite` are siblings. They both import `SelectedActionsView` and `SelectedDetailsView`. They both consume `SelectedItemPlacementContext` and `SelectedItemInteractionContext`. They do not import each other and they do not import `App.tsx` types beyond what's needed.

---

## Item E — Component layout (final shape)

### E.1 `useSelectedItemPlacement` — `src/app/selection/use-selected-item-placement.ts`

Owns the placement decision per D2.

```ts
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useEditorRefs } from '@/app/contexts/editor-refs-context'
import { useOverlayLayout } from '@/app/contexts/overlay-layout-context'
import { useElementRect } from '@/app/hooks/use-element-rect'
import { useElementSize } from '@/app/hooks/use-element-size'
import { useHeaderLayoutMode } from '@/app/overlay/use-header-layout-mode'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import { useToolbarGeometry } from '@/editor-state/selection-meta-store'
import {
  computeSelectedToolbarPlacement,
  type ToolbarFloatingCandidateId,
} from '@/lib/ui/selected-toolbar-placement'
import type { SelectedItemPlacement } from './selected-item-placement.types'

export function useSelectedItemPlacement(options: {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  editorInteractionsEnabled: boolean
  // The actions-section size is measured from inside the rendering site, but
  // a stable size measurement is needed for the placement math. Today
  // `SelectedItemControls` measures the actions section via `useElementSize`.
  // After Phase 3, the *floating* site mounts the actions section with a
  // measurement ref obtained from this hook; the hook owns the size store.
  // See `actionsSizeRef` in the return type below.
}): {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}
```

Implementation notes:

- The hook owns the previous-floating-candidate hysteresis store. The `useEffect` that resets the candidate id on selection / source / size / mode changes lives here, with the same dependency array as today.
- The hook calls `useElementSize()` and exposes the returned ref as `actionsSizeRef`. The floating site (which is the only site that needs measured size for translate3d math) attaches this ref to its `<SelectedActionsView sectionRef={actionsSizeRef} />`. The docked site **also** attaches it (so the size measurement remains correct when the toolbar is in the docked grid; the placement hook still needs it to decide whether floating would fit). **Resolution:** because at most one site renders the actions toolbar at a time, only one DOM element receives the ref — that's fine; `useElementSize` re-measures on remount.
- The hook reads `roomViewRect` via `useElementRect(editorRefs.roomViewRef)`. **Lock:** `editorRefs.roomViewRef` is a stable `RefObject` across the app's lifetime; this is safe.
- Coordinate conversion (canvas-local → viewport CSS pixels) happens inside this hook, exactly as it does in `SelectedItemControls` today. Move the `convertedToolbarPoints` math, the `placementContainerRect` selection, and the `forceDocked` branch verbatim.
- The `forceDocked` parameter is set to `headerLayoutMode === 'mobile' || !hasMeasuredRoomViewRect`, identical to today.
- The hook handles the no-geometry case (`activeToolbarGeometry === null`) by calling `computeSelectedToolbarPlacement({ ..., forceDocked: true, points: [] })` — same as today.
- The mapping from `ToolbarPlacement` (the helper's return) to `SelectedItemPlacement`:
  - `mode === 'docked'` → `{ site: 'docked', reason }`. The `reason` field is set to `'mobile-layout'` if `headerLayoutMode === 'mobile'`, `'no-geometry'` if `activeToolbarGeometry === null`, `'low-confidence'` if the helper returned docked from the confidence check (we can't tell from the return; treat as `'low-confidence'`), else `'forced'`. **Lock:** classification is informational; it does not affect rendering. Tests use it to pin behavior.
  - `mode === 'floating'` → `{ site: 'floating', left, top, side, candidateId: candidateId! }`. (The helper guarantees `candidateId` is set in floating mode.)
  - `mode === 'hidden'` → `{ site: 'hidden', reason: 'computed-hidden' }`.
- Suppression layering: if `selectedFurniture === null`, return `{ site: 'hidden', reason: 'no-selection' }`. If `controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen`, do **not** override the site — preserve today's behavior where the actions toolbar is rendered with `inert`/`disabled` while suppressed. The hook returns the same `{ site, ...}` it would otherwise; suppression is applied by the consumer (the site components) via the `disabled` prop on `SelectedActionsView`.

### E.2 `SelectedActionsView` — `src/app/selection/selected-actions-view.tsx`

Verbatim port of today's `SelectedItemActions` body, with these changes:

- Function name: `SelectedActionsView`.
- Props per D3 (drop `placementMode === 'hidden'` handling — the component is not rendered in that case).
- The `data-selected-toolbar-mode` and `data-selected-toolbar-candidate` attributes are preserved exactly. Tests rely on them.
- The internal `<SelectionToolsOther />` rendering is unchanged. The `editorInteractionsEnabled` prop on `SelectionToolsOther` is `!disabled`, identical to today.

Old file `src/app/selection/selected-item-actions.tsx` is **moved** (renamed via `git mv`) to `src/app/selection/selected-actions-view.tsx`. Co-located test file (if present) is moved similarly. **Resolution:** there is no test file specifically for actions today (`selected-item-actions` is covered by `selected-item-controls.test.tsx`); the new view gets a co-located `selected-actions-view.test.tsx` containing the unit tests for the pure view (see "Tests" below).

### E.3 `SelectedDetailsView` — `src/app/selection/selected-details-view.tsx`

Verbatim port of today's `SelectedItemDetails` body. Function name: `SelectedDetailsView`. Internal `SelectedItemDetailsCard` private component, `FIELD_CONFIG`, `getWallClearances` import, draft handling, `commitField`, `renderField`, all unchanged.

`SelectedItemDetailsPlaceholder` (currently exported from the same file) is preserved as `SelectedDetailsPlaceholder` and re-exported from `selected-details-view.tsx`. **Resolution:** audit consumers in step 1 (`grep -r 'SelectedItemDetailsPlaceholder' src/`); if the placeholder is unused outside this module, drop it; if it has consumers, rename them in the same step.

Old file `src/app/selection/selected-item-details.tsx` is `git mv`d to `src/app/selection/selected-details-view.tsx`. Its test file moves similarly.

### E.4 `DockedSelectedItemSite` — `src/app/selection/docked-selected-item-site.tsx`

```ts
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import { useSelectedItemPlacement } from './use-selected-item-placement-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { useEditorRefs } from '@/app/contexts/editor-refs-context'
import { SelectedActionsView } from './selected-actions-view'
import { SelectedDetailsView } from './selected-details-view'

export function DockedSelectedItemSite({
  // No external props after this phase. The docked site reads everything
  // from stores and contexts.
  onOpenDeleteDialog,
  onRotateSelection,
  onInvalidSelectedItemDetailValue,
  onUpdateSelectedItemDetails,
}: DockedSelectedItemSiteProps) {
  const placement = useSelectedItemPlacement()
  const selectedFurniture = useSelectedFurniture()
  const { selectedItemControlsRef } = useEditorRefs()
  const interaction = useSelectedItemInteraction()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()  // see "Resolution" below
  const startupOverlayActive = useStartupOverlayActive()

  if (selectedFurniture === null) {
    return null
  }

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed
  const renderActions = placement.site === 'docked'
  const claimsControlsRef = renderActions

  return (
    <div
      ref={claimsControlsRef ? selectedItemControlsRef : undefined}
      inert={controlsSuppressed}
      aria-hidden={controlsSuppressed}
      className="contents"  // grid-friendly; lets children participate in EditorOverlay's grid
    >
      {renderActions ? (
        <SelectedActionsView
          className="..."  // grid-aware classes; see Layout decisions
          disabled={controlsDisabled}
          selectedFurniture={selectedFurniture}
          onOpenDeleteDialog={onOpenDeleteDialog}
          onPrepareDelete={interaction.prepareDeleteBlurSuppression}
          onRotateSelection={onRotateSelection}
          // No placementMode / placementCandidateId / style — the docked site
          // uses CSS layout, not transforms.
        />
      ) : null}

      <SelectedDetailsView
        key={selectedFurniture.id}
        className="..."  // existing corner-pinned classes
        disabled={controlsDisabled}
        selectedFurniture={selectedFurniture}
        consumeBlurCommitSuppression={interaction.consumeBlurCommitSuppression}
        onInvalidSelectedItemDetailValue={onInvalidSelectedItemDetailValue}
        onUpdateSelectedItemDetails={onUpdateSelectedItemDetails}
      />
    </div>
  )
}

interface DockedSelectedItemSiteProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}
```

**Resolution: `useIsCatalogDrawerOpen`.** Today this flag is read from the dialog snapshot in `App.tsx`. The docked site needs it for the `controlsSuppressed` calculation. Two options:

- (a) Add a `useIsCatalogDrawerOpen()` selector to `dialog-store.ts`. This mirrors Phase 2's `useIsBlockingOverlayOpen` selector. **Pick this.**
- (b) Pass `isCatalogDrawerOpen` as a prop. Reject — it would require also passing `editorInteractionsEnabled` and `startupOverlayActive`, defeating the simplification.

So Phase 3 adds **one** new selector hook to `dialog-store.ts`: `useIsCatalogDrawerOpen`. Add a co-located test case. The Phase 2 `useDialogStateSnapshot(...)` still exists and is still consumed elsewhere; this is purely a fast selector for the rare consumer that wants just this boolean.

**Resolution for layout classes.** The docked site's children participate in the overlay's grid. Two layout strategies:

- **Strategy A (Tailwind grid-area):** `EditorOverlay` defines a `grid` with named areas; the docked site's children claim the `selected-actions` and `selected-details` areas via `grid-area-[selected-actions]` etc. Pros: explicit, responsive via container queries. Cons: requires `EditorOverlay` grid changes that might ripple.
- **Strategy B (absolute positioning, same as today):** the docked site keeps the today-style absolute positioning (`absolute pointer-events-none w-full h-full z-10` wrapper, with corner-pinned children). Pros: zero `EditorOverlay` change. Cons: doesn't fully realize the "real CSS layout" promise of Phase 3.

**Pick Strategy B for Phase 3.** The Phase 3 outline says the docked site "can use real CSS layout (grid, container queries) and respond to overlay sizing without rect side channels." This phase achieves the **architectural** goal (one placement decision, two render sites, pure UI primitives) but defers the **layout** rewrite. Strategy A is a follow-up that is safe to do once the docked site is its own component. Document this in the plan and in `AGENTS.md`. Reasoning: Strategy A risks breaking visual regressions in the existing detailed responsive treatment (which spans Tailwind breakpoints, container behavior of the room view, mobile drawer interaction). The behavior-preservation contract is more important than the layout-purity bonus right now.

So `DockedSelectedItemSite`'s outer wrapper keeps `className="absolute pointer-events-none w-full h-full z-10"` and its children keep their existing absolute corner-pinned classes. The `<EditorOverlay>` simply mounts `<DockedSelectedItemSite />` between Outliner and CameraTools.

**Update the plan summary at the top of this section accordingly:** the docked site uses absolute positioning today, identical to `SelectedItemControls`'s wrapper. The architectural goal is met (single placement decision, pure UI views, two render sites); the "real CSS layout" goal is deferred to a follow-up.

### E.5 `FloatingSelectedItemSite` — `src/app/selection/floating-selected-item-site.tsx`

```ts
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import { useSelectedItemPlacement } from './use-selected-item-placement-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { useEditorRefs } from '@/app/contexts/editor-refs-context'
import { SelectedActionsView } from './selected-actions-view'

export function FloatingSelectedItemSite({
  onOpenDeleteDialog,
  onRotateSelection,
}: FloatingSelectedItemSiteProps) {
  const placement = useSelectedItemPlacement()
  const selectedFurniture = useSelectedFurniture()
  const { selectedItemControlsRef } = useEditorRefs()
  const interaction = useSelectedItemInteraction()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isCatalogDrawerOpen = useIsCatalogDrawerOpen()
  const startupOverlayActive = useStartupOverlayActive()

  if (placement.site !== 'floating') {
    return null
  }
  if (selectedFurniture === null) {
    return null
  }

  const controlsSuppressed = startupOverlayActive || isCatalogDrawerOpen
  const controlsDisabled = !editorInteractionsEnabled || controlsSuppressed

  return (
    <div
      ref={selectedItemControlsRef}
      inert={controlsSuppressed}
      className="absolute pointer-events-none w-full h-full z-10"
      aria-hidden={controlsSuppressed}
    >
      <SelectedActionsView
        className="absolute transition-[transform,opacity] duration-150 ease-out"
        disabled={controlsDisabled}
        selectedFurniture={selectedFurniture}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onPrepareDelete={interaction.prepareDeleteBlurSuppression}
        onRotateSelection={onRotateSelection}
        placementMode="floating"
        placementCandidateId={placement.candidateId}
        sectionRef={interaction.actionsSizeRef}
        style={{
          transform: `translate3d(${placement.left}px, ${placement.top}px, 0)`,
        }}
      />
    </div>
  )
}

interface FloatingSelectedItemSiteProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
}
```

**Note** — the `actionsSizeRef` from `useSelectedItemPlacement` is consumed via `interaction.actionsSizeRef`. This is incorrect placement; revise: `actionsSizeRef` lives on the placement context value, not the interaction context. Final shape:

```ts
// SelectedItemPlacementContext value:
interface SelectedItemPlacementContextValue {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}
```

Both sites read both fields from this single context. The interaction context only carries `prepareDeleteBlurSuppression` and `consumeBlurCommitSuppression`.

The `pointer-events-none` wrapper continues to be the suppression root and the ref target — same as `SelectedItemControls`'s wrapper today.

### E.6 `SelectedItemPlacementContext` — `src/app/selection/use-selected-item-placement-context.tsx`

```ts
import { createContext, useContext, type ReactNode } from 'react'
import type { SelectedItemPlacement } from './selected-item-placement.types'

interface SelectedItemPlacementContextValue {
  placement: SelectedItemPlacement
  actionsSizeRef: (element: HTMLElement | null) => void
}

const SelectedItemPlacementContext =
  createContext<SelectedItemPlacementContextValue | null>(null)

export function SelectedItemPlacementProvider({
  value,
  children,
}: {
  value: SelectedItemPlacementContextValue
  children: ReactNode
}) {
  return (
    <SelectedItemPlacementContext.Provider value={value}>
      {children}
    </SelectedItemPlacementContext.Provider>
  )
}

export function useSelectedItemPlacement() {
  const value = useContext(SelectedItemPlacementContext)
  if (value === null) {
    throw new Error(
      'useSelectedItemPlacement must be used inside SelectedItemPlacementProvider',
    )
  }
  return value.placement
}

export function useSelectedItemActionsSizeRef() {
  const value = useContext(SelectedItemPlacementContext)
  if (value === null) {
    throw new Error(
      'useSelectedItemActionsSizeRef must be used inside SelectedItemPlacementProvider',
    )
  }
  return value.actionsSizeRef
}
```

Two consumer hooks instead of one combined hook so each site re-renders on minimal state. (Both hooks read the same context object reference, so React will not rebroadcast unless that object identity changes; the `App.tsx` provider value uses `useMemo` to keep identity stable across re-renders that don't change `placement` or `actionsSizeRef`.)

### E.7 `SelectedItemInteractionContext` — `src/app/selection/selected-item-interaction-context.tsx`

```ts
import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react'

interface SelectedItemInteraction {
  prepareDeleteBlurSuppression: () => void
  consumeBlurCommitSuppression: () => boolean
}

const SelectedItemInteractionContext =
  createContext<SelectedItemInteraction | null>(null)

export function SelectedItemInteractionProvider({
  children,
}: {
  children: ReactNode
}) {
  const suppressNextBlurCommitRef = useRef(false)

  const value = useMemo<SelectedItemInteraction>(
    () => ({
      prepareDeleteBlurSuppression: () => {
        suppressNextBlurCommitRef.current = true
      },
      consumeBlurCommitSuppression: () => {
        if (!suppressNextBlurCommitRef.current) {
          return false
        }
        suppressNextBlurCommitRef.current = false
        return true
      },
    }),
    [],
  )

  return (
    <SelectedItemInteractionContext.Provider value={value}>
      {children}
    </SelectedItemInteractionContext.Provider>
  )
}

export function useSelectedItemInteraction() {
  const value = useContext(SelectedItemInteractionContext)
  if (value === null) {
    throw new Error(
      'useSelectedItemInteraction must be used inside SelectedItemInteractionProvider',
    )
  }
  return value
}
```

**Lock:** the existing `SelectedItemControls` body has a small wrinkle around the Remove button:

```ts
const handleOpenDeleteDialog = () => {
  try {
    onOpenDeleteDialog()
  } finally {
    suppressNextBlurCommitRef.current = false
  }
}
```

Today this clears the suppression flag after the delete handler runs (so a Remove click without a focused detail input doesn't strand the flag for the next session). After Phase 3, this finalization needs to live in `DockedSelectedItemSite` and `FloatingSelectedItemSite`. Each site's `handleOpenDeleteDialog` wrapper:

```ts
const handleOpenDeleteDialogWithSuppressionReset = () => {
  try {
    onOpenDeleteDialog()
  } finally {
    interaction.consumeBlurCommitSuppression() // returns and clears
  }
}
```

— but this calls `consumeBlurCommitSuppression` in a finally, even when no field was focused. This **changes** the gesture from "set to false unconditionally" to "consume (returns false if already false, else true; in both cases clears)". The end state (`suppressNextBlurCommitRef.current === false`) is the same, but the test for "preserves blur commits when remove is clicked without a focused detail input" needs to verify that consuming-after-no-suppression is a no-op. Verify with the existing test "clears delete blur suppression when remove is clicked without a focused detail input" — this test currently sets the ref via `onPrepareDelete()` (the pointer-down) and then clicks Remove without focusing details, then checks the ref is reset. The new behavior produces the same observable end state. **Lock:** keep the test green; do not loosen its assertion.

### E.8 `App.tsx` changes

After Phase 3, `App.tsx`:

- Removes the `selectedToolbarGeometry`, `selectedItemControlsRef`-as-passed-prop, and overlay-exclusion `'selected-details'` plumbing previously feeding `<SelectedItemControls>`.
- Removes the `<SelectedItemControls ... />` render entirely.
- Adds `<FloatingSelectedItemSite />` as a sibling of the room-view `<section>` — same DOM position as where `<SelectedItemControls>` lives today, since the floating site is the canvas-anchored equivalent. The component takes only `onOpenDeleteDialog` and `onRotateSelection` props; everything else comes from contexts/stores.
- Wraps the existing render tree with two new providers, in this order (outer to inner): `SelectedItemPlacementProvider` then `SelectedItemInteractionProvider`. They live **inside** `OverlayLayoutProvider` and **outside** `<main>`.
- Calls `useSelectedItemPlacement` (the compute hook, not the consumer hook) inside `App` to produce the placement value, and feeds it to `SelectedItemPlacementProvider`. **Naming clarification:** the compute hook is `useComputeSelectedItemPlacement` and the consumer hook (called by sites) is `useSelectedItemPlacement` — flip naming if simpler. Rename to:
  - `useComputeSelectedItemPlacement` — called once in `App.tsx`, returns `{ placement, actionsSizeRef }`
  - `useSelectedItemPlacement` — context consumer, returns `placement`
  - `useSelectedItemActionsSizeRef` — context consumer, returns `actionsSizeRef`
- The `editorInteractionsEnabled`, `startupOverlayActive`, `isCatalogDrawerOpen` arguments to `useComputeSelectedItemPlacement` come from the existing `startup` memo + `dialogState` snapshot, identical to today's prop wiring.
- Removes the `selectedDetailsRef={overlayExclusions.registerExclusionElement('selected-details')}` line.
- Removes the `'selected-details'` entry from `OverlayExclusionRectId` (in `use-overlay-exclusion-rects.ts`) — handled in step 5.
- Updates the `overlayLayout` memo to expose the keyed map directly (per D9): `{ exclusionRects: overlayExclusions.rects, registerExclusionElement, syncLayoutMode }`.
- The `handleNavigateBackToSelectionControls` function is unchanged (per D7).

Pass-through props for site components flow from `App.tsx`:

- `<DockedSelectedItemSite>` receives `onOpenDeleteDialog`, `onRotateSelection`, `onInvalidSelectedItemDetailValue`, `onUpdateSelectedItemDetails` — these come from the existing controllers (`deletionController.handleOpenDeleteDialog`, `movementController.handleRotateSelection`, `movementController.handleInvalidSelectedItemDetailValue`, `movementController.handleUpdateSelectedItemDetails`).
- `<FloatingSelectedItemSite>` receives `onOpenDeleteDialog`, `onRotateSelection` only.

### E.9 `EditorOverlay` changes

`EditorOverlay` mounts `<DockedSelectedItemSite />` between Outliner and CameraTools. It threads through the four callbacks via a new prop bundle:

```ts
interface DockedSelectedItemShellProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}
```

The Phase 2 `EditorOverlayProps` interface (per the Phase 2 plan, currently `topHeader`, `outliner`, `cameraTools`, `selectedItemControlsAnchorRef`) gains a fifth field: `dockedSelectedItem: DockedSelectedItemShellProps`. The existing `selectedItemControlsAnchorRef` field (if present in the current implementation) is **removed** because the docked site reads `selectedItemControlsRef` from `EditorRefsContext` directly (per D7).

If `selectedItemControlsAnchorRef` is not actually present in the current `EditorOverlay` API (Phase 2 may have wired it differently), skip the removal. Audit the current shape during step 6.

### E.10 What stays in `App.tsx`

After Phase 3, `App.tsx` retains:

- All Phase 2 controllers and `useSceneSelectionEffects`.
- The composition-root context providers (`TooltipProvider`, `EditorRefsProvider`, `OverlayLayoutProvider`, plus the two new placement/interaction providers).
- `useComputeSelectedItemPlacement(...)` call.
- The render of `<FloatingSelectedItemSite />` (sibling to room-view).
- The `<EditorOverlay>` render with the new `dockedSelectedItem` prop bundle.
- All Phase 2 imperative wiring.

The expected line-count delta for `App.tsx` is **negative** (it loses the inline `<SelectedItemControls>` block plus its prop wiring) but small. Phase 3 does not target a specific line count for `App.tsx`.

---

## Migration steps

Do these in order. Each step ends with `pnpm typecheck`, `pnpm lint`, `pnpm test:run`, and the relevant `e2e` lane(s) all green. Do **not** start the next step on red.

### Step 1 — Audit and plan-local prep

1. `grep -rn 'SelectedItemDetailsPlaceholder' src/` to find consumers of the placeholder. Plan whether to delete or rename in step 4.
2. `grep -rn 'SelectedItemControls' src/` and `grep -rn 'SelectedItemActions' src/` and `grep -rn 'SelectedItemDetails' src/` to enumerate consumers that will be touched.
3. Confirm the current `EditorOverlay` API in `src/app/overlay/editor-overlay.tsx`. Verify whether `selectedItemControlsAnchorRef` is currently a prop. Note the Phase 2 implementation reality (the deferred plan in `phase-2-plan.md` may differ from what landed).
4. Run baseline `pnpm test:run` and capture passing test count for the regression guard.

**Acceptance:** Audit complete; baseline test count recorded.

### Step 2 — Add `useIsCatalogDrawerOpen` selector + flip overlay context shape

1. In `src/editor-state/dialog-store.ts`:
   - Add `export const useIsCatalogDrawerOpen = () => useDialogStore(s => s.isCatalogDrawerOpen)` (verify the field is named `isCatalogDrawerOpen` in the snapshot — adjust if it's named differently). Add a co-located test case in `dialog-store.test.ts`.
2. In `src/app/contexts/overlay-layout-context.tsx`:
   - Change the `OverlayLayout` interface so `exclusionRects` is `Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>` (per D9).
   - The provider value is now a keyed object instead of an array.
3. In `src/App.tsx`:
   - Update the `overlayLayout = useMemo(...)` call to drop `Object.values(...)` and pass `overlayExclusions.rects` directly.
4. Update `overlay-layout-context.test.tsx` if any test asserts the array shape; switch to the map shape.
5. Run `pnpm typecheck` and `pnpm test:run`. Both must pass.

**Acceptance:** Tests green; new selector and updated context shape land independently of the Phase 3 component refactor. This step is reversible if Phase 3 is paused.

### Step 3 — Define placement types and contexts

1. Create `src/app/selection/selected-item-placement.types.ts` with the `SelectedItemPlacement` discriminated union per D2.
2. Create `src/app/selection/use-selected-item-placement-context.tsx` per E.6. Export `SelectedItemPlacementProvider`, `useSelectedItemPlacement`, `useSelectedItemActionsSizeRef`. Add a co-located test asserting both consumer hooks throw outside the provider and return the provided value inside.
3. Create `src/app/selection/selected-item-interaction-context.tsx` per E.7. Export `SelectedItemInteractionProvider` and `useSelectedItemInteraction`. Add a co-located test asserting (a) the consumer throws outside the provider, (b) `prepareDeleteBlurSuppression` followed by `consumeBlurCommitSuppression` returns true and clears, (c) `consumeBlurCommitSuppression` without prepare returns false.

**Acceptance:** Tests green. Contexts compile but are not yet mounted.

### Step 4 — Move and rename the pure views

1. `git mv src/app/selection/selected-item-actions.tsx src/app/selection/selected-actions-view.tsx`. Rename the exported function to `SelectedActionsView`. No internal logic changes. Update the props per D3 (drop `placementMode === 'hidden'` handling — but keep the `placementMode` prop because the floating site still passes `'floating'` for the data attribute).
2. `git mv src/app/selection/selected-item-details.tsx src/app/selection/selected-details-view.tsx`. Rename the exported function to `SelectedDetailsView`. Rename `SelectedItemDetailsPlaceholder` to `SelectedDetailsPlaceholder`. Update the placeholder consumers identified in step 1 (if any).
3. Update the existing `SelectedItemControls` to import from the new file paths and use the new function names. Tests should still pass.
4. `git mv src/app/selection/selected-item-details.test.tsx src/app/selection/selected-details-view.test.tsx`. Update the `import` line and any rendered-component name string. The body of the test file remains unchanged.
5. Co-locate a new `src/app/selection/selected-actions-view.test.tsx` (extract the toolbar/section render assertions from `selected-item-controls.test.tsx`):
   - Renders rotate (CCW/CW) and delete buttons with the existing labels.
   - `disabled={true}` propagates to the button group.
   - `onRotateSelection` is invoked with the right direction on each rotate button click.
   - `onOpenDeleteDialog` is invoked on the delete button click; `onPrepareDelete` is invoked on `pointerdown`.
   - `placementMode='floating'` and `placementMode='docked'` propagate to the `data-selected-toolbar-mode` attribute.
   - `placementCandidateId` propagates to the `data-selected-toolbar-candidate` attribute when set.
6. Run `pnpm typecheck`, `pnpm test:run`, `pnpm fix`.

**Acceptance:** Tests green. The pure views are renamed; `SelectedItemControls` still renders them. No behavior change.

### Step 5 — Drop the `'selected-details'` exclusion id

1. Edit `src/app/overlay/use-overlay-exclusion-rects.ts`:
   - Remove `'selected-details'` from `OverlayExclusionRectId`.
2. Edit `src/App.tsx`:
   - Remove the `selectedDetailsRef={overlayExclusions.registerExclusionElement('selected-details')}` prop on `<SelectedItemControls>`.
3. Edit `src/app/selection/selected-item-controls.tsx`:
   - Remove the `selectedDetailsRef` prop.
4. Update `use-overlay-exclusion-rects.test.ts` if any case explicitly registers `'selected-details'`.
5. Run `pnpm typecheck`, `pnpm test:run`. Manually verify in the browser that the floating toolbar still avoids the corner-pinned details card on desktop (it should, since the details card is corner-pinned at bottom-right and the desktop floating placement prefers top sides). If a regression appears, see D8 lock and stop.

**Acceptance:** Tests green; no visible regression in toolbar/details collisions.

### Step 6 — Build the placement compute hook

1. Create `src/app/selection/use-compute-selected-item-placement.ts`:
   - Move the `createCandidateStore` helper, the hysteresis store creation, the `previousFloatingCandidateId` reset effect, the `useElementSize` for the actions section, the `useElementRect(roomViewRef)` read, the `useHeaderLayoutMode` read, the canvas-local → viewport conversion math, and the `computeSelectedToolbarPlacement` call from `SelectedItemControls` into this hook.
   - The hook returns `{ placement: SelectedItemPlacement, actionsSizeRef }`. Map the underlying `ToolbarPlacement.mode` to the `SelectedItemPlacement.site` per D2.
   - The hook reads `useSelectedFurniture()`, `useToolbarGeometry()`, `useEditorRefs()` (for `roomViewRef`), `useOverlayLayout()` (for `exclusionRects`).
   - Suppression: when `selectedFurniture === null`, return `{ site: 'hidden', reason: 'no-selection' }` directly (skip the helper call).
   - When `startupOverlayActive || isCatalogDrawerOpen`, **do not** override the site; the consumer applies suppression via `disabled`/`inert`.
2. Add `src/app/selection/use-compute-selected-item-placement.test.ts`:
   - Mocks `useToolbarGeometry`, `useSelectedFurniture`, `useEditorRefs`, `useOverlayLayout`, `useElementRect`, `useElementSize`, `useHeaderLayoutMode`.
   - Cases: no selection → `{ site: 'hidden', reason: 'no-selection' }`; geometry available, desktop, no exclusions → `{ site: 'floating', ... }`; geometry available, mobile → `{ site: 'docked', reason: 'mobile-layout' }`; geometry available, no room-view rect → `{ site: 'docked', reason: 'no-geometry' }`; `object-origin` source → `{ site: 'docked', reason: 'forced' }`; geometry belongs to previous selection → `{ site: 'docked', reason: 'no-geometry' }` (because `activeToolbarGeometry === null` after the id mismatch).
   - **Note:** the helper-level placement math is already heavily covered by `selected-toolbar-placement.test.ts`; tests here focus on the **mapping** to `SelectedItemPlacement`, not on the underlying math.
3. The existing `SelectedItemControls` is **not** updated yet — it still owns its inline placement logic. The new hook coexists temporarily.

**Acceptance:** New tests green; existing tests unchanged.

### Step 7 — Build the two render-site components

1. Create `src/app/selection/floating-selected-item-site.tsx` per E.5. The component imports `SelectedActionsView`, the placement context, the interaction context, and `useEditorRefs`. The pure-views import path is the new one.
2. Create `src/app/selection/docked-selected-item-site.tsx` per E.4. Imports `SelectedActionsView` and `SelectedDetailsView`.
3. Co-locate tests:
   - `floating-selected-item-site.test.tsx`:
     - Renders nothing when `placement.site !== 'floating'`.
     - Renders nothing when `selectedFurniture === null`.
     - Renders the actions view with the correct `transform: translate3d(...)` when floating.
     - Sets the `selectedItemControlsRef` on its outer wrapper.
     - Applies `inert` and `aria-hidden` when `controlsSuppressed`.
     - Wires `onPrepareDelete` to `interaction.prepareDeleteBlurSuppression`.
     - The Remove-click finalizer (D6 / E.7) clears the suppression flag after `onOpenDeleteDialog` runs.
   - `docked-selected-item-site.test.tsx`:
     - Renders nothing when `selectedFurniture === null`.
     - Renders the details view always (when there's a selection), even when `placement.site === 'floating'` or `'hidden'`.
     - Renders the actions view only when `placement.site === 'docked'`.
     - Claims `selectedItemControlsRef` only when rendering actions.
     - Applies `inert`/`aria-hidden` under suppression.
     - Wires the same blur-suppression callbacks.
4. Run `pnpm typecheck`, `pnpm test:run`.

**Acceptance:** New site tests green. The components are not yet mounted in `App.tsx` / `EditorOverlay`.

### Step 8 — Replace `<SelectedItemControls>` in App.tsx and EditorOverlay

1. In `src/App.tsx`:
   - Add the imports for the new providers, the compute hook, and the two site components.
   - Remove the `import { SelectedItemControls } from './app/selection/selected-item-controls'`.
   - Call `const { placement, actionsSizeRef } = useComputeSelectedItemPlacement({ isCatalogDrawerOpen: dialogState.isCatalogDrawerOpen, startupOverlayActive: startup.startupOverlayActive, editorInteractionsEnabled: startup.editorInteractionsEnabled })`.
   - Memoize the placement context value: `const placementContextValue = useMemo(() => ({ placement, actionsSizeRef }), [placement, actionsSizeRef])`.
   - Wrap the existing `<main>` render with `<SelectedItemPlacementProvider value={placementContextValue}>` and `<SelectedItemInteractionProvider>` (in that order, inside `<OverlayLayoutProvider>`).
   - Replace the `<SelectedItemControls ... />` JSX with `<FloatingSelectedItemSite onOpenDeleteDialog={handlers.handleOpenDeleteDialog} onRotateSelection={handlers.handleRotateSelection} />`.
   - Pass the new `dockedSelectedItem` prop bundle to `<EditorOverlay>` (containing `onOpenDeleteDialog`, `onRotateSelection`, `onInvalidSelectedItemDetailValue`, `onUpdateSelectedItemDetails`). Remove the corresponding props that previously fed `<SelectedItemControls>`.
2. In `src/app/overlay/editor-overlay.tsx`:
   - Add the new `dockedSelectedItem: DockedSelectedItemShellProps` prop to the `EditorOverlayProps` interface.
   - Mount `<DockedSelectedItemSite {...dockedSelectedItem} />` between `<Outliner>` and `<CameraTools>` in the render tree.
3. Update `editor-overlay.test.tsx` to pass a `dockedSelectedItem` prop and verify the docked site is mounted.
4. Delete `src/app/selection/selected-item-controls.tsx` and `src/app/selection/selected-item-controls.test.tsx`. Migrate any remaining test cases in `selected-item-controls.test.tsx` not already covered by site/view/hook tests:
   - "marks selected item controls inert while the startup overlay is active" → covered by site tests.
   - "preserves the previous floating candidate across same-id selection refreshes" → covered by `use-compute-selected-item-placement.test.ts` (or the existing `selected-toolbar-placement.test.ts`).
   - "suppresses blur commits when the remove dialog is opening" → covered by interaction-context test + site tests.
   - All other `SelectedItemControls` tests have direct coverage in the new files.
5. Run full validation: `pnpm typecheck`, `pnpm lint`, `pnpm test:run`.

**Acceptance:** All Vitest tests green. `SelectedItemControls` no longer exists. Visual behavior unchanged.

### Step 9 — Update Playwright suites for the docked tab-order shift

Per D6, the docked tab order changes (room-view → top-header → outliner → docked-actions → docked-details → camera-tools, instead of room-view → actions → details → top-header → outliner → camera-tools). Floating tab order is unchanged.

1. `e2e/editor-accessibility-flows.spec.ts`:
   - Find any test that asserts "Tab from room-view goes to selected actions". For the desktop / floating case, no change. For the mobile / docked case, update the assertion to `Tab from room-view goes to top-header`.
   - The "Shift+Tab from outliner goes back to selected actions" test relies on `handleNavigateBackToSelectionControls`. This is unchanged; tests should still pass without edit because the handler finds whichever site holds the actions toolbar.
2. `e2e/selected-toolbar-placement.spec.ts`:
   - The "desktop floating toolbar stays off visible chrome" test exercises the floating site. Update the selector if it relied on `<SelectedItemControls>` as the wrapper; new wrapper is `<FloatingSelectedItemSite>` but the inner section still has `aria-label="Selected item actions"`, so most selectors should still resolve.
3. `e2e/editor-a11y-audits.spec.ts`:
   - Ensure axe still passes. The DOM order change in the docked case is not an a11y violation, but verify there is no new "duplicate id" or "missing label" warning.
4. `e2e/drag-bounds.spec.ts` / `e2e/drag-collision.spec.ts` / `e2e/drag-interaction.spec.ts`:
   - These should not be affected. Run them anyway.
5. Run `pnpm test:e2e`.

**Acceptance:** Full Chromium Playwright suite passes.

### Step 10 — Performance verification

1. Run `pnpm test:browser:perf` and diff against the Phase 1 baseline (`plans/perf-baseline-phase1-wip.md`).
2. Two scenarios that matter for Phase 3:
   - **Drag scenario** — the floating toolbar follows the selected object during drag via `transform: translate3d`. The placement hook re-runs on every store update. Verify the hook does not allocate new context values when inputs are unchanged (the `useMemo` on `placementContextValue` should hold identity).
   - **Idle camera tracking with selected item** — the toolbar geometry publisher emits at ~20-30fps; the placement hook re-runs each emit. Verify no leaf re-render storm.
3. If frame budget regresses by more than the noise band documented in the existing perf baseline, stop and analyze before merging.

**Acceptance:** No perf regression vs. Phase 2 baseline.

### Step 11 — Documentation pass

1. Update `AGENTS.md`:
   - Under "Architecture", add a "Selected-item layout" subsection naming the four files (`selected-actions-view.tsx`, `selected-details-view.tsx`, `docked-selected-item-site.tsx`, `floating-selected-item-site.tsx`) and the rule that pure views do not import stores or contexts.
   - Note the docked tab-order shift (D6) so future contributors do not flag it as a regression.
   - Note that the docked layout uses absolute positioning today (Strategy B) and that grid-based docked layout (Strategy A) is a deferred follow-up.
2. Update `docs/selected-toolbar-placement.md`:
   - Add a short "Render sites" section explaining the docked vs. floating split and when each is active.
   - Update any code-path references to point at the new file names.
   - Note that the placement decision is now made by `useComputeSelectedItemPlacement` (App-level) and consumed via `SelectedItemPlacementContext`.
3. No `README.md` changes expected; verify and skip if so.

**Acceptance:** Docs accurately describe the dual-render-site architecture.

### Step 12 — Final validation

Run, in order:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test:run`
4. `pnpm test:e2e` (full Playwright Chromium suite)
5. `pnpm test:e2e -- e2e/editor-a11y-audits.spec.ts` if not already covered by step 4
6. `pnpm test:browser:perf` and diff against the Phase 1/2 captured baseline. Drag scenario and idle-camera-tracking scenario must show no regression.
7. `pnpm fix` — formatter pass.

If any of these fails, fix and re-run from `pnpm typecheck`. Do not skip steps.

---

## Files created

- `src/app/selection/selected-item-placement.types.ts`
- `src/app/selection/use-selected-item-placement-context.tsx` (+ `.test.tsx`)
- `src/app/selection/selected-item-interaction-context.tsx` (+ `.test.tsx`)
- `src/app/selection/use-compute-selected-item-placement.ts` (+ `.test.ts`)
- `src/app/selection/floating-selected-item-site.tsx` (+ `.test.tsx`)
- `src/app/selection/docked-selected-item-site.tsx` (+ `.test.tsx`)
- `src/app/selection/selected-actions-view.test.tsx`

## Files renamed (`git mv`)

- `src/app/selection/selected-item-actions.tsx` → `src/app/selection/selected-actions-view.tsx`
- `src/app/selection/selected-item-details.tsx` → `src/app/selection/selected-details-view.tsx`
- `src/app/selection/selected-item-details.test.tsx` → `src/app/selection/selected-details-view.test.tsx`

## Files deleted

- `src/app/selection/selected-item-controls.tsx`
- `src/app/selection/selected-item-controls.test.tsx`

## Substantially modified

- `src/App.tsx` — replaces `<SelectedItemControls>` render with `<FloatingSelectedItemSite>` + `dockedSelectedItem` overlay prop. Mounts the two new context providers. Calls `useComputeSelectedItemPlacement`. Drops the `selectedDetailsRef` and `selectedToolbarGeometry` prop wiring; drops the `useToolbarGeometry()` call (now consumed inside the placement hook).
- `src/app/overlay/editor-overlay.tsx` — adds `dockedSelectedItem` prop and renders `<DockedSelectedItemSite />` between Outliner and CameraTools.
- `src/app/overlay/editor-overlay.test.tsx` — passes the new `dockedSelectedItem` prop bundle.
- `src/app/contexts/overlay-layout-context.tsx` — `exclusionRects` becomes the keyed map (D9).
- `src/app/contexts/overlay-layout-context.test.tsx` — updated for the map shape.
- `src/app/overlay/use-overlay-exclusion-rects.ts` — drops `'selected-details'` from `OverlayExclusionRectId`.
- `src/app/overlay/use-overlay-exclusion-rects.test.ts` — drops any case that registered `'selected-details'`.
- `src/editor-state/dialog-store.ts` — adds `useIsCatalogDrawerOpen` selector.
- `src/editor-state/dialog-store.test.ts` — covers the new selector.
- `src/app/selection/selected-actions-view.tsx` (renamed) — exported function renamed; props simplified per D3.
- `src/app/selection/selected-details-view.tsx` (renamed) — exported function renamed; placeholder renamed.
- `AGENTS.md` — updated.
- `docs/selected-toolbar-placement.md` — updated.

---

## Tests

### New tests required

- `use-selected-item-placement-context.test.tsx` — provider value access; both consumer hooks throw outside provider.
- `selected-item-interaction-context.test.tsx` — provider value access; throws outside provider; suppression flag sequencing (prepare → consume → returns true and clears; consume without prepare → returns false).
- `use-compute-selected-item-placement.test.ts` — placement-mapping cases listed in step 6. Mocks the underlying selectors and the `useElementRect` / `useElementSize` / `useHeaderLayoutMode` hooks. Does not duplicate the math coverage already in `selected-toolbar-placement.test.ts`.
- `selected-actions-view.test.tsx` — pure-view assertions per step 4. Mocks `SelectionToolsOther` is not required; render the component directly with stub `selectedFurniture`.
- `floating-selected-item-site.test.tsx` — render guards, ref claim, suppression, blur-suppression wiring, finalizer behavior on Remove click.
- `docked-selected-item-site.test.tsx` — same coverage; additionally verifies the conditional actions toolbar render based on `placement.site`.

### Updated tests

- `dialog-store.test.ts` — add `useIsCatalogDrawerOpen` coverage.
- `overlay-layout-context.test.tsx` — switch to map-shape `exclusionRects`.
- `editor-overlay.test.tsx` — new `dockedSelectedItem` prop bundle; render assertion includes the docked site.
- `selected-actions-view.test.tsx` (new) and `selected-details-view.test.tsx` (renamed) — already covered above.
- `e2e/editor-accessibility-flows.spec.ts` — docked tab-order updates per step 9.
- `e2e/selected-toolbar-placement.spec.ts` — selector/path updates if needed.

### Tests deleted (covered by new component tests)

- `src/app/selection/selected-item-controls.test.tsx`. All cases migrate to:
  - View tests: `selected-actions-view.test.tsx`, `selected-details-view.test.tsx`.
  - Site tests: `floating-selected-item-site.test.tsx`, `docked-selected-item-site.test.tsx`.
  - Hook tests: `use-compute-selected-item-placement.test.ts`.
  - Context tests: `selected-item-interaction-context.test.tsx`.

### Tests that must pass unchanged

- All Phase 1 and Phase 2 controller / hook / store tests under `src/app/controllers/`, `src/app/contexts/`, `src/editor-state/`.
- All scene-internal tests under `src/scene/internal/`.
- All `e2e/` Playwright suites except those listed under "Updated tests".
- All `src/lib/ui/*.test.ts` (placement math is unchanged).

### Performance verification

- Diff `pnpm test:browser:perf` traces against the captured baseline. Drag and idle-camera-tracking scenarios are the gates.

---

## Watch-outs

- **Provider order matters.** The `SelectedItemPlacementProvider` must wrap `SelectedItemInteractionProvider` (or vice versa, but pick one and document it in `App.tsx`). Both must be inside `OverlayLayoutProvider` and `EditorRefsProvider` because the placement compute hook reads from both. Mounting order is `TooltipProvider > EditorRefsProvider > OverlayLayoutProvider > SelectedItemPlacementProvider > SelectedItemInteractionProvider > main`.

- **`actionsSizeRef` is consumed by exactly one DOM element.** When the placement is `'docked'`, `DockedSelectedItemSite` mounts the actions view with `sectionRef={actionsSizeRef}`. When the placement is `'floating'`, `FloatingSelectedItemSite` does the same. When `'hidden'`, neither. `useElementSize` re-measures on remount; the placement hook's hysteresis store reset effect already handles the transition. Verify the Step 6 mapping covers this.

- **Hysteresis store identity stability.** The `createCandidateStore` instance must be created once via `useMemo(() => createCandidateStore(undefined), [])`. Recreating it on each render would defeat the hysteresis. Today's `SelectedItemControls` does this correctly; the move into the placement hook must preserve the same dependency array.

- **Identity stability of the placement context value.** `App.tsx` memoizes `{ placement, actionsSizeRef }` with `useMemo`. The hook must return a stable `actionsSizeRef` callback (which `useElementSize` already provides — it's a ref callback, not a new function each render). The `placement` value is a fresh object on every successful `computeSelectedToolbarPlacement` call; React will rebroadcast on every placement change. That is fine — the placement _should_ drive re-renders when it changes. Suppress unnecessary re-renders by ensuring the helper does not return new placement objects when nothing changed; today `computeSelectedToolbarPlacement` returns a new object every call. **Do not** add a deep-equality memo around it in Phase 3 (Phase 2 deliberately avoided that pattern); accept the re-render cost as a non-regression vs. today.

- **`SelectedActionsView` must not check `placementMode === 'hidden'` anywhere.** The "hidden" case is now "component not rendered". Audit the move in step 4 to ensure the `aria-hidden` and `inert` attributes on the section come from `disabled` (or always-undefined), not from `placementMode === 'hidden'`. Update `data-selected-toolbar-mode` to omit a value when `placementMode` is not provided (docked-grid case).

- **The docked site's `containerRef` claim must be conditional.** Per D7, the docked site claims `selectedItemControlsRef` only when `placement.site === 'docked'`. If both sites accidentally claim the ref, `selectedItemControlsRef.current` may end up pointing at the wrong DOM (last-write-wins inside React's commit). Verify the test `docked-selected-item-site.test.tsx` covers the conditional ref claim explicitly.

- **The Remove-click finalizer.** Today `SelectedItemControls`'s `handleOpenDeleteDialog` clears the suppression flag in a `finally`. After Phase 3, this is the responsibility of the site components (per E.7's lock). Both sites must implement the finalizer; do not push it down into `SelectedActionsView` (that would re-couple the view to interaction state).

- **`SelectedDetailsPlaceholder` consumers.** Run the audit in step 1. If consumers exist outside `SelectedItemControls`, rename their import. If the placeholder is only used internally, drop it.

- **Tab-order regression in mobile/docked mode.** Per D6, tab order changes in the docked case. Update `e2e/editor-accessibility-flows.spec.ts` deliberately. **Do not** try to re-create the today-tab-order via a portal or DOM trick — the architectural intent of Phase 3 is that the docked site participates in the overlay grid naturally. The accessibility outcome is equivalent; the order is just different.

- **Avoid creating a `selection/index.ts` barrel.** Each component is imported by `App.tsx` or `EditorOverlay` directly. A barrel file is not wanted because it makes selective imports harder to audit and tends to grow.

- **Floating site's `pointer-events-none` wrapper is the suppression root.** The `inert` attribute on the wrapper plus the `pointer-events-none` class makes the wrapper transparent to pointer events while still containing focusable controls during normal selection. This is how the existing `<SelectedItemControls>` works; preserve it exactly in `FloatingSelectedItemSite`.

- **The docked site's wrapper class.** Per E.4 / Strategy B, keep `className="absolute pointer-events-none w-full h-full z-10"` on the docked site's outer wrapper, exactly matching today's `SelectedItemControls`. Do not change to `display: contents` or any grid class in this phase.

- **Don't accidentally re-introduce `SceneReadModel`.** Phase 2 removed it; verify the new components import only from `scene-state-store` and `selection-meta-store`, never from `scene.types.ts` for read-model concerns.

- **`useElementRect` / `useElementSize` are tied to refs that stabilize across renders.** The `roomViewRef` (from `EditorRefsContext`) is stable. The `actionsSizeRef` is a ref callback that the placement hook owns and re-uses across renders (returned by `useElementSize`). Verify these are not re-allocated per render in the new code path.

- **No edits to the `selectedToolbarGeometry` publisher.** The scene side emits geometry exactly as today. Phase 3 only changes the consumer.

- **Don't optimize the placement hook into a selector.** The placement hook reads four+ inputs (geometry, room-view rect, header mode, action size). It is not a one-line store selector and should remain a hook that calls the helper. Resist any urge to memoize it more aggressively; today's recompute frequency is the perf baseline.

---

## Done definition (final acceptance gate)

All of the following must be true to consider Phase 3 complete:

1. `src/app/selection/selected-item-controls.tsx` and its test file do not exist.
2. `src/app/selection/selected-actions-view.tsx`, `selected-details-view.tsx`, `floating-selected-item-site.tsx`, `docked-selected-item-site.tsx`, `use-compute-selected-item-placement.ts`, `use-selected-item-placement-context.tsx`, `selected-item-interaction-context.tsx`, and `selected-item-placement.types.ts` all exist with the documented exports.
3. `App.tsx` no longer imports `SelectedItemControls`. It renders `<FloatingSelectedItemSite>` and passes `dockedSelectedItem` to `<EditorOverlay>`.
4. `EditorOverlay` mounts `<DockedSelectedItemSite>` between Outliner and CameraTools.
5. `OverlayLayout.exclusionRects` is the keyed `Partial<Record<...>>` map.
6. `'selected-details'` is not present in `OverlayExclusionRectId`.
7. `useIsCatalogDrawerOpen` is exported from `dialog-store.ts` and consumed by both site components.
8. `pnpm typecheck` passes.
9. `pnpm lint` passes.
10. `pnpm test:run` passes (existing tests + new component / hook / context tests).
11. `pnpm test:e2e` passes for the full Chromium suite, including the updated tab-order assertions in `editor-accessibility-flows.spec.ts`.
12. `pnpm test:browser:perf` traces show no regression vs. the Phase 2 baseline on the drag and idle-camera-tracking scenarios.
13. `pnpm fix` reports no remaining changes.
14. `AGENTS.md` and `docs/selected-toolbar-placement.md` reflect the new structure, including the deferred Strategy A grid-layout note and the docked tab-order shift.
15. The feature behavior, visuals, accessibility semantics (modulo the deliberate D6 tab-order shift), and keyboard shortcuts are unchanged.

---

## What follows Phase 3

For context (do not act on this in Phase 3):

- **Phase 4 (Item F)** moves files into `editor-state/` (already done in Phase 1), `editor-shell/`, and `editor-ui/`, and adds the cross-layer ESLint enforcement. The pure view components from Phase 3 (`SelectedActionsView`, `SelectedDetailsView`) are the natural first inhabitants of `editor-ui/`. The site components and the placement hook stay in `editor-shell/`. The contexts also move to `editor-shell/`.
- **Strategy A (grid-based docked layout)** is a deferred follow-up that can ship independently of Phase 4 if desired. It would replace the docked site's absolute positioning with grid placement inside `EditorOverlay`'s grid template, and would let the actions toolbar / details card respond to overlay sizing via container queries instead of viewport breakpoints.

Phase 3 lays the groundwork for both: the pure views are framework-agnostic and ready to live in `editor-ui/`, and the docked site is its own component (no longer entangled with the floating logic) so its layout can be rewritten in isolation.
