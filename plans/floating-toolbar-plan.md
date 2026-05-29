## Plan: Floating Selected-Item Toolbar

Replace the current centered selected-item actions card with a compact, icon-only toolbar that stays in the existing accessible DOM order while visually positioning itself near the selected furniture on desktop. The toolbar placement uses a new selected-object UI geometry channel from the scene, a concrete app-shell exclusion-rect registry for overlay chrome, and a single DOM instance that switches between floating and docked placement modes. On mobile, dock the toolbar by default using the existing header breakpoint so touch interaction stays predictable and accessible.

**Decisions**

- Preserve the current DOM order: room view, selected item actions, selected item details, then `EditorOverlay`. Visual floating must not change the tab/focus contract.
- Render exactly one selected action toolbar DOM instance. Its placement mode changes between floating and docked; no duplicated floating/docked copies.
- Keep the current region/group/button accessibility model. Do not add `role="toolbar"` unless implementing the full toolbar keyboard pattern.
- Keep selected toolbar geometry out of `SceneReadModel`, `SceneSnapshotItem`, draft persistence, and `window.__ROOM_LAYOUT_TEST__.getState()`, except for optional purpose-built debug data in a dedicated test/debug hook. Existing `pointerTarget` remains the spatial-browse/test-click target and continues to use visual/render bounds only.
- Treat `uiBoundsNodeName` as an optional asset contract. Omitted field means normal fallback. Malformed manifest value means startup validation error. Provided-but-missing GLB node is a hard asset contract failure in this demo, surfaced through the existing asset error path.
- Document the hard/soft failure tradeoff in the README: real consumer ecommerce apps may choose configurable soft fallback with telemetry for optional UI geometry, but this demo intentionally fails fast for referenced asset-contract mismatches.
- On mobile/narrow layouts, dock the toolbar by default near the selected details/action area. Use the existing `HEADER_DESKTOP_MEDIA_QUERY` / `useHeaderLayoutMode()` contract from `src/app/overlay/use-header-layout-mode.ts` so toolbar mode cannot disagree with the mounted header variant.
- Do not remove the visual outliner in this task; keep it as the accessible room-contents surface and leave deeper mobile panel refinement for follow-up.
- Keep 2D footprint movement/collision logic untouched. Toolbar placement uses render/UI geometry only.

**Steps**

1. Phase 1: Compact toolbar shell and one-instance placement model
   - Update `src/app/selection/selected-item-actions.tsx` to remove the `Card`, visible title, visible selected item name, and panel-like spacing.
   - Keep the labelled section `aria-label="Selected item actions"` so existing accessible navigation and tests remain meaningful.
   - Continue rendering `SelectionToolsOther`, but configure its `ToolButton`s as icon-only visible controls using `labelVisibility="sr-only"`, existing full labels, tooltips, and shortcut metadata.
   - Use the existing toolbar icon sizing path, specifically `size="toolbar-icon"` if that variant remains available in `button-variants.tsx`; otherwise choose one explicit compact size and document why.
   - Preserve `SelectedItemControls` in `src/App.tsx` after the room-view `<section>` and before `EditorOverlay`.
   - Ensure there is only one `SelectedItemActions` DOM instance. The component receives a placement mode/result and changes class/style only; this prevents `findFirstFocusableControl(selectedItemControlsRef.current)` from finding a hidden duplicate.
   - Do not portal the toolbar outside `SelectedItemControls`; all measurement nodes, dev attributes, and focusable controls stay inside the existing suppression root and stay removed when `testOverlaysHidden` is true.

2. Phase 2: UI-bounds asset contract and leakage prevention
   - Add optional `uiBoundsNodeName?: string` to `FurnitureCatalogEntry` in `src/scene/objects/furniture-catalog.ts` and `FurnitureItem` in `src/scene/objects/furniture.types.ts`.
   - In `src/app/startup/catalog-manifest.ts`, validate optional `uiBoundsNodeName` as a trimmed non-empty string when present; reject malformed values as `ManifestValidationError`.
   - Propagate `uiBoundsNodeName` through `createFurnitureItem()` and `areFurnitureItemsEqual()` in `src/scene/internal/furniture-operations.ts`.
   - Add a pure `validateCatalogAssetNodes({ catalog, sourceScenesByPath })` helper under `src/scene/internal/`. It verifies each `nodeName` exists and, when `uiBoundsNodeName` is provided, that the UI-bounds node exists inside that catalog node subtree.
   - Invoke `validateCatalogAssetNodes` from the render/useMemo path in `src/scene/scene.tsx` after GLTF scenes resolve and before the current `onAssetsReady` effect can fire. Do not throw from an effect. A validation failure must be thrown during render under the existing `SceneAssetErrorBoundary`, or otherwise explicitly routed through the existing asset-error handler before assets-ready is reported.
   - In `src/scene/internal/objects/interactive-furniture.tsx`, mark the matching UI-bounds node and all descendants with a stable marker such as `userData.roomLayoutRole = 'ui-bounds'`, set them invisible, disable cast/receive shadows, and disable their raycast function.
   - Mark UI-bounds before any default mesh collection runs. The clone setup order should be: clone node, zero root position, mark/disable UI-bounds subtree, then call default `getMeshes(node)` for visual shadow setup. If setup needs to inspect all meshes, add an explicit `includeUiBounds` option rather than relying on default traversal.
   - Add reusable helpers such as `isUiBoundsObject()`, `markUiBoundsSubtree()`, and `getVisualObjectBounds()` in `src/lib/three/` so all tree traversal code consistently identifies and excludes this role.
   - Update `getMeshes()` in `src/lib/three/get-meshes.ts` to exclude UI-bounds meshes by default, with an explicit opt-in only if a caller truly needs them. This prevents selection outlines and preview outlines from including UI geometry.
   - Replace raw `Box3().setFromObject(object)` usage for pointer targets and visual focus bounds with `getVisualObjectBounds()` or equivalent filtered bounds. Apply this to `src/scene/internal/scene-snapshot.ts` and the selected-object camera focus path in `src/scene/internal/use-scene-imperative-api.ts`.
   - For `focusSelected()`, never pass the unfiltered selected root object to `cameraControls.fitToBox`. Pass a filtered visual `Box3` if the `camera-controls` type supports it, or a filtered temporary object/box proxy if not. Update the existing focusSelected unit test accordingly.
   - Ensure pointer/raycast behavior does not treat UI-bounds meshes as object hit targets; do not rely only on `visible = false`.

3. Phase 3: Precise scene-to-app geometry contract
   - Export a selected toolbar geometry contract from `src/scene/scene.types.ts` rather than importing scene internals from app code.
   - Keep this contract as a separate callback channel such as `onSelectedToolbarGeometryChange`. Do not add it to `getReadModel()`, `getSnapshot()`, `SceneSnapshotItem`, URL/draft persistence, or the default e2e `getState()` payload.
   - Define the coordinate space explicitly: geometry points are canvas-local CSS pixels, top-left origin, matching current `pointerTarget` conventions from `scene-snapshot.ts`. App code converts canvas-local coordinates to viewport/root-local coordinates using `roomViewRef.getBoundingClientRect()` and the selected-controls root rect.
   - The success shape should include selected id, source, canvas size, projected points, and a source node name when available. Source values should distinguish `ui-bounds-node`, `render-bounds`, and `object-origin`.
   - The unavailable shape should include selected id when known and a reason such as `no-selection`, `object-not-ready`, `no-placement-points`, `non-finite-projection`, or `behind-camera`.
   - Keep geometry points unrounded for layout quality. Use a publisher deadband, approximately `0.5px`, to avoid React state churn. Any test/debug attributes may be rounded for readability.
   - Preferred source order: marked UI-bounds node, visual/render bounds excluding UI-bounds nodes, object world position if render bounds are empty, then unavailable geometry.
   - Reject non-finite and behind-camera projections. Do not reject offscreen x/y points solely for being outside the viewport; app placement can still use them to choose a side or dock.
   - Publish geometry only for the selected object from the scene, not all furniture. Use an R3F frame hook throttled to roughly 20-30 fps and emit a final update when selection, object transform, camera transform, or canvas size changes.
   - Emit unavailable geometry on deselect or object unregister so the app can switch to no-toolbar/docked behavior deterministically.

4. Phase 4: App-shell exclusion-rect registry and placement
   - Add an app-level exclusion registry hook, for example `src/app/overlay/use-overlay-exclusion-rects.ts`, owned by `App.tsx` because `SelectedItemControls` and `EditorOverlay` are siblings.
   - The hook should expose `registerExclusionElement(id, element | null)` callback refs, current measured exclusion rects, and a manual refresh function. Rect ids should include at least `top-header`, `outliner`, `selected-details`, `camera-tools`, `desktop-room-sidebar`, and `mobile-room-drawer`.
   - Measurements should use `getBoundingClientRect()` in viewport CSS pixels and be refreshed via `ResizeObserver`, `window` resize/scroll, and `visualViewport` resize/scroll where available. This is important for mobile browser chrome and drawer changes.
   - Pass the registry callbacks from `App.tsx` into `SelectedItemControls` and `EditorOverlay`. `SelectedItemDetails` registers the `selected-details` rect; `EditorOverlay` registers top header, outliner, and camera controls; `TopHeaderDesktop`/`RoomSidebar` register the desktop Room sidebar when open; `TopHeaderMobile`/`RoomDrawer` register the mobile Room drawer when open.
   - Keep registration wrappers pointer-events-neutral and do not change tab order. Registration should be a measurement concern only.
   - Add pure UI placement helpers under `src/lib/ui/` for convex hull, support-band anchoring, side candidate generation, rectangle intersection, viewport clamping, and deterministic docked fallback.
   - Preferred floating side order on desktop: `top`, then `bottom`, then `right`, then `left`.
   - Candidate floating placements must reject intersections with viewport padding and active exclusion rects. If every floating candidate conflicts, use the same single toolbar instance in docked mode.
   - On mobile layout from `useHeaderLayoutMode()`, use docked mode by default instead of object-following mode. This matches common touch-first consumer room-planner behavior where selected actions sit in a stable control area and the canvas remains easier to manipulate.
   - Docked placement should be deterministic and should not reuse the old hardcoded center. Prefer a location adjacent to the selected details area while avoiding the header and active mobile panels.
   - Keep the parent `SelectedItemControls` shell `pointer-events: none`; the toolbar and details surfaces explicitly restore `pointer-events: auto`.
   - Use `transform: translate3d(...)`, short transform/opacity transitions, and a reduced-motion-safe path. Do not remount the action buttons during movement.

5. Phase 5: User asset-authoring checkpoint
   - After schema/runtime support lands, the user will create hidden low-poly bounds meshes in the GLBs before final visual verification.
   - Authoring guidance: create a simple low-poly mesh named with a stable convention such as `<NodeName>_UIBounds`; make it a descendant of the catalog `nodeName` root; approximate meaningful visible mass; apply transforms before export; preserve names; do not rely on Blender hidden state.
   - After export, add `uiBoundsNodeName` to the matching entry in `public/catalog-manifest.json`.
   - Start with `couch-1`, because the current screenshot shows the old actions panel overlapping the leather couch and it is the most useful proof case.
   - Because provided-but-missing UI bounds are hard failures in this demo, verify the GLB node names before committing manifest changes.

6. Phase 6: Tests, docs, and verification
   - Update component tests for `SelectedItemControls`, `SelectedItemActions`, and `SelectionToolsOther` to assert one toolbar instance, icon-only visible treatment, accessible labels, shortcut metadata, disabled behavior, blur suppression, and inert suppression.
   - Add unit tests for the exclusion registry: rect registration/unregistration, ResizeObserver refresh, `visualViewport` refresh, and inactive room sidebar/drawer removal from the set.
   - Add unit tests for placement helpers: hull, support-band point, top placement, top-clips-to-bottom fallback, chrome-exclusion rejection, clamp fallback, mobile docked mode tied to the shared header layout breakpoint, empty geometry.
   - Add Three.js helper tests for UI-bounds marking/exclusion, render-bounds excluding UI nodes, pointer target unaffected by UI bounds, focus bounds unaffected by UI bounds, valid UI-bounds geometry source, object-origin fallback, and behind-camera/unavailable reasons.
   - Update `interactive-furniture.test.tsx` to verify an optional UI-bounds node is marked before default `getMeshes()` shadow setup, hidden, non-shadowing, non-raycasting, and excluded from default mesh collection.
   - Update `catalog-manifest.test.ts` to preserve valid `uiBoundsNodeName`, reject malformed values, and document that missing GLB nodes are render-time asset validation failures rather than manifest shape failures.
   - Add scene validation tests for `validateCatalogAssetNodes`, including valid node, missing `nodeName`, missing provided `uiBoundsNodeName`, and `uiBoundsNodeName` outside the catalog node subtree.
   - Add/extend Playwright coverage for Tab from room view to actions/details, Shift+Tab from outliner to actions, one toolbar instance, selected toolbar staying outside exclusion rects on desktop, mobile docked toolbar behavior, camera-change repositioning, rotate/delete behavior, catalog/startup suppression, axe audit with selected controls visible, and a drag-blocking regression proving a selected object remains draggable when the toolbar is visible and near it.
   - Keep `testOverlaysHidden` behavior in `src/App.tsx`: when overlays are hidden, selected controls and their measurement hooks/dev attributes are not mounted.
   - Update `README.md` and `public/catalog-manifest-schema.md` to explain visual geometry, footprint geometry, optional UI-bounds geometry, authored anchors as future work, and the current hard-fail asset policy with production tradeoff notes.

**Relevant files**

- `src/App.tsx` — preserve selected controls DOM order, own/pass exclusion registry, pass room/root refs needed for coordinate conversion, preserve `testOverlaysHidden` behavior.
- `src/app/selection/selected-item-controls.tsx` — own one toolbar instance, placement mode, suppression root, details/action order, selected-details exclusion registration, and measurement integration.
- `src/app/selection/selected-item-actions.tsx` — replace card panel with compact icon-only action surface.
- `src/app/selection/selection-tools-other.tsx` — keep rotate/delete command wiring, labels, shortcut metadata, and toolbar icon sizing.
- `src/app/overlay/use-overlay-exclusion-rects.ts` — new app-shell measurement registry for placement exclusions.
- `src/app/overlay/use-header-layout-mode.ts` — shared mobile/desktop breakpoint source for toolbar docking policy.
- `src/app/overlay/editor-overlay.tsx`, `top-header.tsx`, `top-header-desktop.tsx`, `top-header-mobile.tsx`, `room-sidebar.tsx`, `room-drawer.tsx` — register header/outliner/camera/room chrome exclusion elements without changing tab order.
- `src/scene/scene.types.ts` — export the selected toolbar geometry callback contract and unavailable reasons.
- `src/scene/scene.tsx` — run render-time asset node validation, pass `uiBoundsNodeName`, and publish selected-object UI geometry through a separate callback channel.
- `src/scene/internal/objects/interactive-furniture.tsx` — mark/hide/disable UI-bounds nodes before default mesh traversal.
- `src/lib/three/get-meshes.ts` — exclude UI-bounds meshes by default.
- `src/lib/three/*bounds*` or similar new helper — compute filtered visual bounds for pointer targets and focus framing.
- `src/scene/internal/scene-snapshot.ts` — keep pointer targets based on visual bounds excluding UI bounds.
- `src/scene/internal/use-scene-imperative-api.ts` — focus selected with filtered visual bounds or a filtered proxy, never the unfiltered root.
- `src/app/startup/catalog-manifest.ts` — validate and normalize optional `uiBoundsNodeName`.
- `public/catalog-manifest.json` — add `uiBoundsNodeName` only after GLB meshes exist.
- `public/catalog-manifest-schema.md` and `README.md` — document schema, geometry separation, and hard/soft failure policy.

**Verification**

1. Run `pnpm fix` before final validation.
2. Run `pnpm typecheck`.
3. Run `pnpm test:run`.
4. Run targeted Playwright specs: `pnpm playwright test --project=chromium e2e/editor-accessibility-flows.spec.ts e2e/editor-a11y-audits.spec.ts` plus the new selected-toolbar placement/drag spec.
5. Run `pnpm test:e2e` before merge because this changes browser-facing editor flow, focus order risk, and selection controls.
6. Run `pnpm test:browser:perf` or at least the editor interaction perf scenario if the geometry publisher updates during camera movement.
7. Manual verify: fallback-only item, UI-bounds item, camera orbit, object rotate, drag/move with toolbar visible, viewport resize, desktop chrome collision fallback, desktop Room sidebar exclusion, mobile Room drawer exclusion, mobile docked behavior, toolbar delete, toolbar rotate, catalog/startup suppression, and overlay-hidden test mode.

**Acceptance Criteria**

- The selected rotate/delete UI is no longer a centered card-like panel.
- Exactly one selected action toolbar DOM instance exists when an item is selected.
- The visual toolbar is compact, icon-only, consumer-facing, and fully accessible through labels/tooltips/shortcut metadata.
- DOM/tab order remains room view, selected item actions, selected item details, then the rest of the overlay.
- Outliner-origin selection still reaches selected actions via Shift+Tab.
- Startup/catalog suppression still uses the existing `inert` plus `aria-hidden` root and removes controls from tab order.
- Desktop placement follows the selected object when it can do so without colliding with viewport padding or active exclusion rects for header, outliner, details, camera controls, desktop Room sidebar, or mobile Room drawer.
- Mobile placement docks by default according to the same breakpoint that controls the header layout and remains usable with details/outliner surfaces present.
- Asset-node validation failures for provided node names happen before assets-ready and are caught by the existing asset error flow.
- Valid `uiBoundsNodeName` uses the marked UI-bounds geometry source; omitted field uses render-bounds fallback; malformed values or missing referenced GLB nodes fail as documented asset-contract errors.
- UI-bounds nodes do not affect selection outlines, preview outlines, pointer targets, focus-selected camera framing, raycasting, spatial-navigation test hooks, read models, snapshots, or persistence.
- Existing rotate, delete, details editing, announcements, focus-return behavior, and furniture dragging still work with the toolbar visible.
- Existing 2D footprint collision/movement logic is not replaced or imported into toolbar placement.
- README/schema docs explain render geometry, footprint geometry, UI-bounds geometry, future authored anchors, and asset failure policy.

**Out of Scope**

- Authored semantic anchors or product callouts.
- Mesh silhouette extraction or high-detail render-vertex sampling fallback.
- Removing the visual outliner or redesigning the mobile details/outliner layout beyond what is necessary to dock the action toolbar.
- Replacing the scene/object collision footprint system.
- Production-grade telemetry or configurable asset strictness; document this as future work rather than adding a partial policy system now.
