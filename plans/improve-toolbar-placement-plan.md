# Plan: Improve Toolbar Placement

Improve selected-item action toolbar placement without introducing authored anchors or full silhouette search. Keep the existing scene geometry channel and overlay exclusion registry, but replace the four-side first-fit desktop policy with a small scored candidate system that stays close to the selected object's projected UI/render bounds, avoids the selected object and overlay chrome, remains stable during camera/object motion, and docks on mobile or low-confidence cases. Add one concise docs page that explains bounds selection first, placement strategy second, and link it from the README with a short at-a-glance summary.

## Scope

- Included: desktop floating placement refinement, selected-object overlap avoidance based on projected bounds, overlay exclusion avoidance, deterministic scoring/tie-breaks, placement hysteresis, tests, and documentation.
- Excluded: authored anchors, mesh silhouette extraction, occlusion/raycast visibility scoring, movement controls, mobile floating placement, content-pipeline changes, and changes to the scene/object movement collision footprint system.
- Preserve the existing architecture: scene computes projected geometry, app measures overlay exclusions, `src/lib/ui/selected-toolbar-placement.ts` makes pure placement decisions, and `SelectedItemControls` applies the result to the one existing toolbar instance.

## Contract Decisions

- Floating candidate identity must be explicit. Add stable human-readable floating candidate ids such as `top-center`, `top-left`, and `right-upper` rather than inferring stability from `side` or coordinates.
- Extend the pure placement input with `previousFloatingCandidateId?: SelectedToolbarFloatingCandidateId`.
- Extend floating `ToolbarPlacement` results with `candidateId: SelectedToolbarFloatingCandidateId`. Docked placements do not need candidate ids for hysteresis; add docked labels only as optional debug/test metadata if implementation truly needs them, and document that they are deterministic placement labels, not hysteresis candidates.
- Keep floating candidate ids stable across refactors because `SelectedItemControls` hysteresis and the happy-path contract will rely on them.
- Placement inputs must use one explicit coordinate space. Scene projection points start as canvas-local CSS pixels. `App.tsx` should pass the existing `roomViewRef` into `SelectedItemControls`; `SelectedItemControls` should reactively measure that element, convert geometry points to viewport CSS pixels, and choose the placement container. App remains orchestration-only and does no scoring.
- Do not rely on the current accidental invariant that the canvas fills the viewport. It may remain true today, but the implementation must work with a non-zero canvas/container offset.
- Placement returns `left`/`top` in viewport CSS pixels. The selected-controls positioning wrapper must remain viewport-aligned; if that wrapper ever becomes room-view-relative or otherwise offset, convert placement coordinates into wrapper-local coordinates before applying the transform.
- Add narrow source-count metadata to available toolbar geometry: `sourcePointCount` and `projectedPointCount`. `sourcePointCount` means attempted projection input count; `projectedPointCount` means accepted finite/in-frustum projected points.
- `object-origin` remains dock-only because a single point cannot define a reliable object avoidance rect. Counts for `object-origin` are harmless if emitted, but confidence logic and tests should not imply those counts matter for floating placement.
- Keep mobile/narrow layout docked via `useHeaderLayoutMode()`.

## Steps

1. Phase 1: Lock current geometry semantics and add confidence metadata
   - Treat `SelectedToolbarGeometry` from `src/scene/scene.types.ts` as the existing scene-to-app geometry channel. Do not add authored anchor fields.
   - Keep source semantics from `src/scene/internal/selected-toolbar-geometry.ts`: `ui-bounds-node` first, `render-bounds` second, `object-origin` last.
   - Add `sourcePointCount` and `projectedPointCount` to the available geometry shape because this plan includes partial-projection confidence gates.
   - Define `sourcePointCount` as the number of input points attempted for projection before finite/in-frustum filtering.
   - Define `projectedPointCount` as the number of points accepted after projection filtering.
   - For `render-bounds`, `sourcePointCount` should be 8 because the source is the 8 visual bounds corners. For `ui-bounds-node`, it should be the UI-bounds points attempted. For `object-origin`, it may be 1 but must not affect floating confidence because that source always docks.
   - Keep overlay exclusions as viewport-space DOMRects from `useOverlayExclusionRects()`.
   - Preserve the hidden toolbar accessibility fix: hidden placement must remain visually hidden, non-interactive, and hidden from assistive tech.

2. Phase 2: Add reactive room-view rect measurement
   - Update `src/App.tsx` to pass the existing room-view element ref into `SelectedItemControls` as a prop such as `roomViewRef`.
   - Do not measure or score in `App.tsx`; App only owns the ref and passes it through as orchestration.
   - Add or reuse a focused app-side hook such as `src/app/hooks/use-element-rect.ts` that observes a provided element/ref and returns its latest `DOMRectReadOnly` snapshot.
   - The rect hook should be reactive, not a layout read during render. Use `ResizeObserver` for element size/position-affecting changes plus window resize/scroll and `visualViewport` resize/scroll where available, similar in spirit to `use-overlay-exclusion-rects.ts`.
   - In `src/app/selection/selected-item-controls.tsx`, use that measured room-view rect to convert `selectedToolbarGeometry.points` from canvas-local CSS pixels into viewport CSS pixels by adding the measured room-view rect offset.
   - If the room-view rect is temporarily unavailable, do not assume origin zero for floating placement. Force docked placement until the rect is measured.
   - Choose one placement container explicitly in `SelectedItemControls`: preferably the measured room-view rect if the toolbar should stay within the canvas/room area; otherwise a viewport rect is acceptable, but converted geometry points and exclusion rects must still be in viewport space. Do not mix spaces.
   - Keep all active exclusion rects in viewport coordinates so they can be compared directly with candidate rects.

3. Phase 3: Refactor placement internals around viewport-space candidates
   - In `src/lib/ui/selected-toolbar-placement.ts`, preserve the public `computeSelectedToolbarPlacement()` entry point but split the internals into explicit helpers.
   - Add a floating candidate model with id, side, anchor point, ideal rect, adjusted rect, generation order, validity reason, and optional score details.
   - Extract projected point bounds once with a helper such as `getPointBounds(points)` from the converted viewport-space geometry points.
   - Update fit/clamp helpers so non-zero containers are first-class. Candidate rects are viewport-space rects, so `fitsContainer()` and clamping must compare against `containerRect.left`, `containerRect.top`, `containerRect.right`, and `containerRect.bottom`, not `0..width` / `0..height`.
   - If `DOMRectReadOnly.right/bottom` are not present in plain test fixtures, normalize rect-like inputs to derived edges via `left + width` and `top + height` in one helper.
   - Keep or adapt existing helpers including `getAnchor()`, `createRectFromAnchor()`, `fitsViewport()`/`fitsContainer()`, `avoidsExclusions()`, and `getDockedPlacement()` so the change is incremental rather than a rewrite.
   - Keep deterministic behavior: stable candidate generation order, stable tie-breaks, and named constants for every threshold.

4. Phase 4: Generate a curated candidate set
   - Generate a small fixed set around the selected object, roughly 10-12 candidates rather than an open-ended search.
   - Recommended floating candidates: `top-center`, `top-left`, `top-right`, `bottom-center`, `bottom-left`, `bottom-right`, `right-center`, `right-upper`, `right-lower`, `left-center`, `left-upper`, and `left-lower`.
   - Derive candidate anchors from support bands and point bounds, not from authored anchors. Top/bottom candidates should use projected top/bottom bands and left/center/right x positions. Left/right candidates should use projected side bands and upper/center/lower y positions.
   - Keep the toolbar outside the selected object by default: top candidates sit above the projected top edge, bottom below the bottom edge, right to the right edge, and left to the left edge.
   - Preserve the current happy path: for a symmetric object with no chrome/viewport pressure, `top-center` should win just like the current simple top-side policy.

5. Phase 5: Add geometry confidence and hard gates
   - Before scoring, validate projected geometry. Dock if points are non-finite, bounds are degenerate, or bounds are too small to represent a meaningful object footprint.
   - For `ui-bounds-node` and `render-bounds`, require a minimum projected point count and a minimum object avoidance rect size. Recommended starting point: at least 3-4 projected points and at least one meaningful width/height threshold such as `MIN_PROJECTED_BOUNDS_SIZE`.
   - Use `sourcePointCount` and `projectedPointCount` to detect partial geometry. For `render-bounds`, dock when fewer than half of the expected 8 corners project successfully. For `ui-bounds-node`, use a named minimum projected ratio or minimum projected count so malformed/clipped UI bounds do not drive floating placement.
   - Dock if the projected avoidance rect is pathological: mostly outside the container, far larger than the container, or so clipped that every nearby candidate would require extreme clamping.
   - Build a selected-object avoidance rect from projected point bounds, inflated by a named object clearance constant.
   - Apply hard gates before scoring: container fit after adjustment, no overlay exclusion intersection, no object avoidance intersection, maximum cross-axis clamp shift, and maximum attachment distance.
   - Treat intersections with active overlay exclusion rects as hard invalid for floating candidates. These are app chrome and should not be covered by the floating toolbar.
   - Treat intersections with the selected-object avoidance rect as hard invalid for floating candidates. If every floating candidate overlaps the object or chrome, dock instead of covering the furniture.

6. Phase 6: Score only reasonable candidates
   - Score lower as better, with deterministic tie-break by generation order.
   - Include side preference so the toolbar still prefers familiar placements when quality is otherwise equal. Start with top, then bottom, then right/left, but let clearance and stability override that preference when a side is visibly better.
   - Include distance from ideal attachment and clamp shift, but only after the hard maximum gates have removed weird candidates.
   - Include clearance quality from overlay exclusions and the object avoidance rect, capped so it cannot pull the toolbar away from the selected object just to gain more whitespace.
   - Include compactness so candidates remain visually attached to the selected object.
   - Keep a low-confidence score threshold as a final guard, but do not rely on it to rescue candidates that should have failed a hard gate.
   - Keep scoring constants named and covered by behavior-oriented tests rather than exact arithmetic assertions.

7. Phase 7: Add hysteresis/stability
   - Extend the pure placement input with `previousFloatingCandidateId?: SelectedToolbarFloatingCandidateId`.
   - Return `candidateId` from `ToolbarPlacement` only for floating placement unless debug/test needs justify optional docked labels.
   - In `src/app/selection/selected-item-controls.tsx`, keep a ref for the last floating candidate id and reset it when selected id, geometry source, toolbar size, room-view rect/container rect, layout mode, or exclusion-rect signature changes.
   - It is also acceptable to skip exclusion-driven reset if the pure helper always revalidates the previous floating candidate against current exclusions before applying hysteresis. If choosing that route, document it in code/tests and add a test where an opened panel invalidates the previous candidate.
   - If the previous floating candidate is still valid and the new best candidate is only marginally better, keep the previous candidate. Use a named score delta threshold.
   - Do not infer stability from `side` or from approximate coordinates; that would be brittle after candidate expansion.
   - Do not introduce animation-driven state loops. The toolbar should still be positioned by the existing computed style/transform path on the single `SelectedItemActions` instance.

8. Phase 8: Preserve and clarify docked fallback behavior
   - Keep docked placement deterministic and exclusion-aware, but document it as best-effort rather than a hard guarantee.
   - Floating candidates have hard overlay/object rejection. Docked fallback should try to avoid header, side panels, drawers, details, and camera tools, but if every docked position conflicts, return the least-bad deterministic docked position instead of hiding the only selected-item actions.
   - If docked placement labels are returned for debug or tests, do not feed them into floating hysteresis and do not treat them as part of the product-facing candidate contract.
   - If product review later requires all modes to avoid chrome absolutely, that should be a separate decision because it would require a stronger hidden/overflow strategy for tiny or fully blocked viewports.
   - Add tests that distinguish these policies: floating rejects chrome/object intersections; docked fallback remains available even when all dock candidates are blocked.

9. Phase 9: Update app integration narrowly
   - Keep `src/App.tsx` as orchestration only: it passes `roomViewRef`, selected geometry, selected furniture, and exclusion registry data, but contains no placement scoring or candidate logic.
   - Keep `SelectedItemControls` responsible for combining selected furniture, toolbar size, `selectedToolbarGeometry`, room-view rect, converted viewport-space geometry points, container rect, exclusion rects, previous floating candidate id, and responsive layout mode.
   - Continue guarding against stale geometry by only using `available` geometry when `selectedToolbarGeometry.selectedId === selectedFurniture.id`.
   - Continue passing the same measured toolbar size from `useElementSize()` and the same exclusion rects from `useOverlayExclusionRects()`.
   - Placement returns viewport CSS pixels. Keep the selected-controls wrapper viewport-aligned when applying `translate3d(left, top, 0)`, or explicitly convert viewport coordinates to wrapper-local coordinates before applying the transform if that wrapper changes later.
   - Avoid changes to `SelectedItemActions` and `SelectionToolsOther` unless placement metadata or test attributes are needed for assertions.

10. Phase 10: Tests

- Extend `src/lib/ui/selected-toolbar-placement.test.ts` first. This is the main risk surface and should cover the scoring behavior as pure logic.
- Add tests for `top-center` winning in the symmetric no-obstacle case, candidate choice near diagonal open space, non-zero container rect coordinate handling, object-overlap rejection, overlay hard rejection, maximum clamp/attachment gates, low-confidence docking, previous-floating-candidate hysteresis, deterministic tie-breaks, `object-origin` dock-only behavior, and `forceDocked` mobile behavior.
- Add geometry-confidence tests for insufficient projected points, low projected/source ratio, degenerate/tiny bounds, huge/offscreen/pathological bounds, and partial render-bounds projections.
- Add hook/integration tests for the reactive room-view rect path: element rect changes, ResizeObserver updates, viewport resize/scroll updates, and no floating placement before the rect is known.
- Keep exact candidate-name assertions for stable product contracts such as the `top-center` happy path and previous-candidate retention. For tunable scoring scenarios, prefer behavior assertions such as mode, side, no intersections, and stability rather than over-specifying exact winners.
- Add or update `src/app/selection/selected-item-controls.test.tsx` for integration behavior: previous candidate reset or revalidation on exclusion changes, reset on selection/container/layout change, stale geometry guard still works, hidden toolbar focusability remains fixed, converted points use measured room-view offset, and returned viewport coordinates are applied correctly to the viewport-aligned wrapper.
- Reuse existing `use-overlay-exclusion-rects` tests unless integration changes require new coverage; the registry itself should not need redesign.
- Add one targeted desktop Playwright test because this is browser-visible and depends on real DOMRects plus canvas/viewport alignment. Keep it narrow: select an item, assert the toolbar avoids the selected-object screen rect and visible chrome, nudge/orbit the camera slightly, and assert the candidate remains stable or changes only when gates require it.
- Keep mobile Playwright expectations docked.

11. Phase 11: Documentation

- Create one concise docs page: `docs/selected-toolbar-placement.md`.
- Section 1 should be bounds selection. Explain the difference between visual/render bounds, optional UI-bounds nodes, object-origin fallback, and why movement footprint/collision geometry is separate from toolbar placement geometry.
- Avoid using `anchor` language for `uiBoundsNodeName`. Use terms like placement bounds, toolbar bounds source, projected UI bounds, or avoidance shape.
- Define `sourcePointCount` and `projectedPointCount` in the bounds section if the metadata is part of the implementation.
- Include a small Mermaid flowchart in the bounds section showing `ui-bounds-node -> render-bounds -> object-origin -> unavailable/docked`.
- Section 2 should be placement strategy. Explain projected 2D points, coordinate conversion through the measured room-view rect, viewport-space placement output, candidate generation, object avoidance, overlay exclusions, hard gates, scoring, hysteresis, and docked/mobile fallback.
- Include a small Mermaid flowchart in the placement section showing `geometry + toolbar size + measured room-view rect + exclusions + previous floating candidate -> candidates -> hard gates -> score -> keep previous if close -> floating or docked`.
- Keep the doc as an overview, not a code replacement. Link to the primary implementation files rather than documenting every constant.
- Update `README.md` Documentation section with a link to `docs/selected-toolbar-placement.md` and 2-4 lines summarizing both supported approaches: bounds source order and middle-ground scored candidate placement.
- Update the README catalog/asset language so `uiBoundsNodeName` is described as providing projected toolbar bounds/placement geometry, not anchoring. It should state that UI bounds do not bypass overlap checks and are not authored point anchors.
- Update `public/catalog-manifest-schema.md` as required, not optional. Replace the current wording that says `uiBoundsNodeName` is used to "anchor" the toolbar with wording that says it provides the preferred bounds source for selected-toolbar placement.

12. Phase 12: Verification

- Run `pnpm fix` after implementation edits.
- Run focused unit tests: `pnpm vitest run src/lib/ui/selected-toolbar-placement.test.ts src/app/selection/selected-item-controls.test.tsx` or the repo-equivalent focused command.
- Run focused hook tests for the new/reactive room-view rect measurement hook if it is added as its own module.
- Run the targeted desktop Playwright test added for real DOMRect/canvas alignment.
- Run `pnpm typecheck`.
- Run `pnpm test:run`.
- Run `pnpm test:e2e` because this changes browser-facing editor placement behavior and relies on real DOMRect/canvas integration.
- Manually verify desktop placements for a UI-bounds item and a render-bounds fallback item, with top header, outliner, camera tools, selected details, desktop room sidebar, and mobile room drawer states.

## Relevant files

- `src/App.tsx` — pass the existing `roomViewRef` into `SelectedItemControls`; keep orchestration-only and avoid placement scoring.
- `src/app/hooks/use-element-rect.ts` — likely new focused hook for reactive element rect measurement via ResizeObserver and viewport resize/scroll handling.
- `src/lib/ui/selected-toolbar-placement.ts` — primary implementation target; refactor from four-side first-fit to viewport-space curated candidate generation, non-zero container hard gates, scoring, and hysteresis-aware selection.
- `src/lib/ui/selected-toolbar-placement.test.ts` — main unit test suite for candidate generation, coordinate-space handling, non-zero container gates, scoring, confidence behavior, and hysteresis.
- `src/app/selection/selected-item-controls.tsx` — consume reactive room-view rect, convert canvas-local points to viewport coordinates, pass previous floating candidate context, reset/revalidate stability refs, preserve stale selected-geometry guard and responsive docking, and apply returned viewport coordinates correctly.
- `src/app/selection/selected-item-controls.test.tsx` — integration tests for coordinate conversion, reactive rect updates, reset/revalidation, stale guard, and hidden-focus behavior.
- `src/scene/internal/selected-toolbar-geometry.ts` — preserve bounds source order and emit narrow `sourcePointCount` / `projectedPointCount` metadata.
- `src/scene/scene.types.ts` — add narrow confidence metadata to available selected-toolbar geometry; do not add authored anchor concepts.
- `src/app/overlay/use-overlay-exclusion-rects.ts` — reference pattern for reactive measurement; placement should consume its current rects, not redesign overlay exclusion measurement.
- `e2e/*` — add one focused desktop browser test in the most appropriate existing selection/editor spec or a new narrow spec if cleaner.
- `docs/selected-toolbar-placement.md` — new overview doc covering bounds selection and placement strategy.
- `README.md` — add doc link, short project-level summary, and clarify `uiBoundsNodeName` terminology.
- `public/catalog-manifest-schema.md` — required wording update so `uiBoundsNodeName` is not described as an anchor.

## Decisions

- Do not implement authored anchors now.
- Use `candidateId` only as the floating stability contract unless docked debug labels are genuinely useful.
- App passes `roomViewRef` to `SelectedItemControls`; `SelectedItemControls` uses reactive rect measurement, performs coordinate conversion, and calls the pure placement helper.
- Placement helper inputs and outputs are viewport CSS pixels; non-zero container rects must be handled by comparing against `left/top/right/bottom` edges.
- The selected-controls wrapper must remain viewport-aligned for direct `left/top` transforms, or coordinates must be converted before applying transforms.
- `sourcePointCount` is attempted projection input count; `projectedPointCount` is accepted finite/in-frustum projected count.
- Do not rely on canvas-fills-viewport as a hidden invariant; convert canvas-local points to viewport coordinates using a measured room-view rect.
- Do not let UI-bounds or future anchors bypass overlap avoidance. UI-bounds define the projected bounds/avoidance shape; placement still determines whether the toolbar fits.
- Keep object-origin as dock-only; counts for object-origin do not participate in floating confidence rules.
- Keep mobile docked by default.
- Prefer hard gates plus a small scored candidate set over silhouette extraction or open-ended screen-space search.
- Floating candidates must avoid overlay chrome and selected-object overlap. Docked fallback is best-effort and remains available even in fully constrained viewports.
- Update documentation terminology because `anchor` is ambiguous here: reserve it for future authored point anchors, not `uiBoundsNodeName` bounds meshes.

## Acceptance Criteria

- Desktop toolbar can choose among more than four placements and can land in diagonal/nearby open space when that is the best valid candidate.
- The symmetric no-obstacle case still chooses `top-center`, preserving the current happy-path feel.
- Floating placement avoids active overlay chrome and the selected object's projected avoidance rect.
- Floating placement rejects weird candidates through hard gates before scoring: excessive clamp shift, excessive attachment distance, container failure, chrome overlap, object overlap, and low-confidence geometry.
- Toolbar remains stable during small camera/object updates by using explicit floating candidate ids for hysteresis.
- Room-view rect measurement is reactive and does not require layout reads during render.
- Coordinate-space behavior is explicit and tested with `roomViewRef` conversion plus a non-zero container rect whose `left/top/right/bottom` are respected.
- Placement coordinates are viewport CSS pixels and are applied to a viewport-aligned wrapper, or converted if that wrapper changes.
- Geometry confidence uses source/projected point counts for partial-projection decisions instead of duplicating hidden source assumptions in placement code.
- Low-confidence or invalid floating states dock deterministically.
- Docked placement is documented and tested as best-effort, not absolute chrome avoidance, and docked labels do not become hysteresis candidates.
- Mobile remains docked by default.
- Existing accessible DOM order, one-toolbar-instance model, hidden focusability fix, rotate/delete behavior, and stale-geometry guard remain intact.
- README links to the new docs page and summarizes bounds selection plus placement strategy without requiring the reader to open the doc.
- `public/catalog-manifest-schema.md` and README no longer describe `uiBoundsNodeName` as anchoring the toolbar; they describe it as selected-toolbar bounds/placement geometry.
- The new docs page gives an accurate overview of bounds selection and placement, includes one Mermaid diagram in each section, and points readers to the code for full details.
