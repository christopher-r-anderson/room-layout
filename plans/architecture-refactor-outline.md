# Architecture Refactor — Outline

## Goal

Restructure the editor so that:

- `App.tsx` stops being an integration bus and becomes a thin composition root.
- Cross-cutting state lives in a small set of well-scoped stores instead of being threaded through `App.tsx` and bundled by `useOverlayProps` / `useSceneHandlers`.
- The scene stops publishing a parallel read-model up to the app shell — there is one source of truth for editor state.
- Selected-item UI can participate in normal layout (responsive, calculated, accessible) while still rendering over the canvas when geometry is available.
- Boundaries between scene, editor shell, editor state, and pure UI are real and enforceable.

We are pre-release, so this plan optimizes for the best long-term architecture rather than the least disruption. Behavior of the app does not change.

## Guiding decisions

These are baked into every Item below:

- **State strategy:** Adopt Zustand for cross-cutting editor state. Use multiple narrow stores (one concern per store), not one mega-store. Selectors are the public API; React leaves subscribe directly via `useStore(selector)`.
- **Scene state lives in a store, not in two places.** The current dual surface (imperative `SceneRef` + `onReadModelChange` push to `useOverlayState`) is collapsed. Three.js objects remain the rendering source of truth for the canvas; the store holds the React-facing projection of items/selection/history. Commands are store actions; the scene component reacts to store changes.
- **Imperative API stays only where it earns its keep.** Camera controls, focusing the room view, and frame-loop-coupled drag interactions remain imperative. Everything else moves to actions.
- **`SelectedItemControls` is decomposed into pure UI primitives.** Placement decision is a hook; the same primitives can be rendered inside the overlay grid (docked) or via a portal in canvas-screen space (floating). No more rect side channel for the docked case.
- **Boundaries are enforced by ESLint, not by convention.** Once the layers exist, they get hard import rules.

## Items and Phases

There are six Items. They are grouped into four Phases. Each Phase is independently shippable.

---

### Phase 1 — State foundation

This phase is the keystone. It introduces the stores and migrates scene state into them. Subsequent phases are mostly subtraction.

#### Item A — Introduce editor stores

Add Zustand. Create a small set of stores that together hold all cross-cutting editor state currently scattered across `useOverlayState`, `useDialogState`, `useStartupLifecycle`, `usePreviewController`, ad-hoc `useState` in `App.tsx`, and the scene's internal React state.

Stores (final names decided in the Phase 1 plan):

- **Editor runtime store** — startup phase (loading / ready / errored), asset error details, `editorInteractionsEnabled` (derived), `startupOverlayActive` (derived).
- **Scene state store** — `items`, `selectedId`, `previewedId`, history availability, drag flag, floor/wall finish ids, editor message. This is what the scene reads from and writes to.
- **Selection meta store** — selection source (`InteractionSource`), toolbar geometry, focus-target requests. Split from scene state because it is purely UI-shell concerns and should not invalidate scene rendering.
- **Dialog store** — dialog stack, return-focus targets, room-surface layout. Mostly a port of today's `useDialogState`.

Each store exposes:

- Plain selector hooks (`useSelectedId`, `useItems`, etc.).
- A small set of action functions that perform validated transitions (so something like `selectById` can clear preview, set source, and queue an announcement in one step instead of being coordinated in `App`).
- A vanilla `getState`/`subscribe` surface for non-React consumers (scene internals, test harness).

Approach:

- Stand the stores up alongside the existing hooks first, with the existing hooks as the writers, so behavior is unchanged.
- Then move the writers (one slice at a time) into the stores and delete the hooks they replace.
- The `window.__ROOM_LAYOUT_TEST__` harness reads from stores at the end of this Item.

#### Item B — Collapse the scene `SceneRef` + read-model duality

Today the scene publishes a `SceneReadModel` up via `onReadModelChange`/`onSelectionChange`/`onHistoryChange` and exposes a `SceneRef` for commands. App-shell code stores the read-model in `useOverlayState` and calls commands via the ref. This is two sources of truth that have to be kept in sync.

After Item B:

- The scene state store from Item A is the single source of truth for `items`, `selectedId`, `previewedId`, history availability, drag flag, finish ids.
- The `Scene` component subscribes to that store for everything it currently receives via props or computes internally.
- Scene commands (`selectById`, `moveSelection`, `rotateSelection`, `addFurniture`, `confirmDeleteSelection`, `restoreInitialLayout`, etc.) become store actions. Where commands need access to three.js geometry (collision, bounds), the action delegates to internal scene helpers exposed via a tightly-scoped registration API; they are not part of the public store surface.
- A thin `SceneRef` survives only for genuinely imperative needs: focusing the room view, camera presets, frame-loop hooks. Everything else is removed.
- `useSceneSync` is deleted. `useOverlayState` shrinks to nothing or is deleted entirely.

This Item is paired with Item A in the same phase because shipping A without B leaves a transitional architecture worse than what we have today.

---

### Phase 2 — Decomposition

Now that state is centralized and the scene is store-driven, the giant coordinator hooks shrink dramatically because they no longer need to be passed every slice they touch — they read and dispatch directly.

#### Item C — Decompose `useSceneHandlers` into focused controllers

The 1226-line `useSceneHandlers` is split along the seams it already documents (`Commands`, `Sync`, `Announcements`, `DialogState`, `StartupSlice`, `OverlayState`). Each becomes a focused controller hook (or in some cases a plain module of action functions, when no React state is needed):

- Selection controller — select / clear / focus / inspect-update.
- Movement controller — move, rotate, transform.
- History controller — undo / redo with announcements.
- Deletion controller — open dialog, confirm, post-delete focus management.
- Asset lifecycle controller — error, retry, ready, share-URL.
- Restore-flow controller — URL / draft restore (already half-isolated in helper functions).
- Catalog-add controller — add furniture, drawer state coordination.

Each controller takes a tiny dependency set and reads everything else from stores. The "pass 30 things in, return 30 things out" shape is gone.

#### Item D — Replace `useOverlayProps` with direct store consumption and scoped contexts

`useOverlayProps` exists only because `EditorOverlay` is one giant component receiving everything from `App`. After Item C, most of those callbacks are gone (controllers publish themselves, components read state from stores). For the genuinely shared values that don't belong in a store (e.g. element refs for exclusion rects, layout-mode callbacks), introduce two or three narrow contexts:

- `EditorRefsContext` — `roomViewRef`, `selectedItemControlsRef`, scene root ref.
- `OverlayLayoutContext` — exclusion rects, header layout mode, room-surface layout.

`useOverlayProps` is deleted. `EditorOverlay` becomes a layout shell with named children that read what they need.

---

### Phase 3 — Layout

#### Item E — Decompose `SelectedItemControls` into pure UI primitives with dual render sites

`SelectedItemActions` and `SelectedItemDetails` become pure, prop-driven components with no knowledge of placement, geometry, or stores. A single `useSelectedToolbarPlacement` hook decides which render site is active:

- **Docked render site** — lives inside `EditorOverlay`'s grid alongside the outliner, top header, and camera tools. Used on mobile, when no selection geometry is available, or when the floating placement would collide with overlay panels. It can use real CSS layout (grid, container queries) and respond to overlay sizing without rect side channels.
- **Floating render site** — a portal anchored in canvas-screen space. Used when geometry is available and the floating placement is preferred.

The placement hook reads geometry from the selection meta store, exclusion rects from `OverlayLayoutContext`, and layout mode from `useHeaderLayoutMode`. It emits a discriminated union (`{ site: 'docked' } | { site: 'floating'; transform: ... } | { site: 'hidden' }`). The two render sites render or skip based on that.

DOM order is whatever each site needs locally. Accessibility/focus order is dictated by the docked site's position in the overlay grid; the floating site is `aria-hidden` from a structural standpoint and only used when geometry is meaningful (the actions live in a roving-tabindex toolbar so this remains accessible — details in the Phase 3 plan).

#### Item F — Formalize package-style boundaries

After Items A–E, the natural layers have already formed. This Item makes them real:

- `src/scene/` — already isolated by ESLint. Keep.
- `src/editor-state/` (new) — Zustand stores + selectors + actions. No React-component imports.
- `src/editor-shell/` (renamed from most of `src/app/`) — controllers, overlay layout, dialogs, panels.
- `src/editor-ui/` (new) — pure UI primitives (`SelectedItemActions`, `SelectedItemDetails`, `Outliner` view layer, `TopHeader` view layer, `CameraTools` view layer). Props in, JSX out. No store imports, no controller imports, no refs to app shell.

ESLint rules:

- `editor-ui` may not import from `editor-shell`, `editor-state`, or `scene`.
- `editor-shell` may import from `editor-ui` and `editor-state`; may import scene contracts only via the existing approved modules.
- `editor-state` may not import React-component modules.
- `scene` may import from `editor-state` only through a narrow contracts module.

This Item is pure rearrangement and rule enforcement; no behavior changes.

---

## What is explicitly out of scope

- Rewriting the three.js drag math, collision, or geometry computation.
- Changing the catalog/manifest format or asset pipeline.
- Changing visual design, copy, or interaction semantics.
- Performance optimization beyond what naturally falls out of selector-scoped subscriptions replacing prop-drilled re-renders.

## Open questions deferred to per-phase plans

- Whether the Phase 3 docked toolbar should reuse the existing floating-toolbar component or a new shared primitive (decided in Phase 3 plan).
