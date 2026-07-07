# Coverage Gap Triage (Phase 2)

A prioritized read of the coverage map (`pnpm coverage`) crossed with the
`expand` notes in `audit-ledger.md`. The aim is to target **real risk that is
cheap to verify**, not to raise a percentage. Coverage % is the prompt, not the
goal: many 0% files are intentionally e2e-tested or presentational and should
stay uncovered at the unit level.

Each item: what's untested · why it matters · rough effort. Tiers are a
recommendation; the actual cut is a decision for Phase 3.

## Status

- **Tier 1 — done (Phase 3).** New/extended suites: `selected-item-detail-messages`,
  `top-header-focus`, `share-scene` (native path), `scene-reset`, `movement-actions`
  (announcements), `get-visual-object-bounds`, `scene-services`, `scene-model`,
  `selection-store`, `validate-catalog-asset-nodes`, `catalog-manifest`,
  `use-camera-key-motion`. Suite 595 → 639 tests; statements 77.3% → 79.0%.
- **Tier 2 — done (Phase 3), via extraction not integration.** On inspection
  `use-furniture-operations` had no r3f binding and its `move`/`setSelectionTransform`
  decision logic was cleanly pure, just inlined. Extracted to
  `resolveMoveSelectionInHistory`/`resolveSetSelectionTransformInHistory` in
  `furniture-operations.ts` (matching the existing `*InHistory` seam) and
  unit-tested there; the hook is now thin glue covered by e2e. The remaining thin
  wrappers (`rotate`/`delete`/`add` — already pure-extracted) stay as-is.
- **Tier 3 — lock-in done (post-e2e).** With the e2e audit + gap analysis
  producing a **verified** coverage map, the durable record now lives in
  `intentional-unit-exclusions.md` (covered-by-e2e wrappers with spec
  cross-references, presentational/config skips, and explicitly accepted gaps),
  linked from `docs/architecture/testing.md`. The gap analysis also closed the two
  real holes it found — `focus-selected` (`F`) and `focus-toolbar` (`Shift+T`) now
  have e2e — so every Tier 2 wrapper is genuinely e2e-covered. The skip list below
  is superseded by that doc.
- **Over-mock rewrites — done.** Per-file outcome:
  - `focus-actions`: assert the queued `useSelectionFocusStore` request over spy calls.
  - `selection-actions`: assert the real preview clear in `clearCanvasSelection`;
    the `selectionEffects` payload assertions kept (legitimate boundary tests).
  - `use-scene-snapshot`: swap the mock-mapped content recheck for a stable-getter
    contract test.
  - `restored-scene-history`: consolidate three overlapping wrapping tests into one;
    drop the language-level error-propagation test.
  - `furniture-collection-cache`: test the real `useFurnitureAssetLoadingProgress`
    logic, delete the drei passthrough tests, move `resolvePublicAssetPath` to a new
    `asset-path.test.ts`.
  - None needed flagging as integration-shaped, so no new inputs to the e2e audit
    from this pass.
- **Incidental-coverage gap pass — done.** Coverage % hides logic that is exercised
  only through another file's test (e.g. `asset-path` was). A per-source-file sweep
  for logic modules lacking a co-located test surfaced the real cases: added tests
  for the pure `toolbar-placement/{rect-utils, convex-geometry, toolbar-anchors}.ts`
  (reached only via a hook, so barely covered).
  Then the two untested stores: tested `catalog-selection-store` (`getActiveCatalogId`
  fallback logic — stored selection vs first-entry vs empty); skipped `assets-store`
  (trivial spread-merge/reset plumbing, incidentally covered) and `ui-bounds` (trivial
  - heavily exercised indirectly).

## Tier 1 — pure logic, cheap, real branches (recommended)

These are framework-free or near-pure, fast to test, and have genuine
branch/behaviour gaps. Best value per line.

| target                                                                 | untested behaviour                                                                                                                                                      | effort                                   |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `app/chrome/top-header/top-header-focus.ts` (42% st, 30% br)           | Pure DOM focus resolution: forward/backward walk, disabled/`aria-hidden`/`inert` filtering, missing-target and empty-root edges. ~130 lines, mostly uncovered branches. | M — build jsdom fixtures, call functions |
| `core/operations/share-scene.ts` (50% st, 44% br)                      | Native-share path: `navigator.share`/`canShare`, `AbortError` (user cancel) vs real error, clipboard fallback selection. The bulk of the function.                      | M — mock `navigator.share`/clipboard     |
| `core/persistence/scene-reset.ts` (0%)                                 | `resetSceneToDefaults`: env-config finish fallbacks (`?? ''`), `isSceneReady` camera gate, draft clear, suppress-announce selection clear.                              | M — real stores + mock `sceneCommands`   |
| `features/selection/selected-item-detail-messages.ts` (57% st, 40% br) | Pure message formatting — exhaustive `reason` switch + invalid-value copy. User-facing strings.                                                                         | S — pure in/out                          |
| `core/operations/movement-actions.ts` _(ledger expand)_                | Movement/blocked announcement strings (`queueMovementAnnouncement`/`formatMoveBlockedMessage`); the test file already mocks feedback but never asserts them.            | S — assert on the existing mock          |
| `scene/internal/three/get-visual-object-bounds.ts` _(ledger top-fix)_  | Returned `Box3` union across meshes, ui-bounds exclusion, null-on-empty — the function's actual output (current test only checks a cache-hit).                          | S — real three meshes                    |

Cheap ledger `expand` follow-ons in the same spirit (all small, pure): `scene-services` `clearSceneServices`/`getSceneServicesIfReady` null; `validate-catalog-asset-nodes` `!sourceScene` branch; `use-camera-key-motion` keyS/A/D + delta-cap; `scene-model` `hasNoFurniture` union; `catalog-manifest` floor diffuse/normal invalid-path; `selection-store` `roomViewFocusRequest`.

## Tier 2 — orchestration / hooks (judgment call)

The headline 0% files. Each wraps an **already-tested** pure function (history
transitions, furniture operations, geometry) with read-store → run → write-back
glue plus r3f binding. Two honest caveats:

- The pure core is covered, so the marginal value is only the glue (guards,
  read/write wiring).
- Unit-testing them means either mocking the pure fns (→ testing the mocks) or
  driving **real stores and asserting outcomes** (higher value, more setup) —
  and e2e already exercises these paths through the live scene.

Worth it only if we want unit-level confidence in the wiring independent of e2e.
Ranked by payload:

| target                                                        | size     | note                                                               |
| ------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| `scene/internal/furniture/use-furniture-operations.ts`        | 78 lines | Largest glue surface; most worth an integration-style test if any. |
| `scene/internal/selection/use-toolbar-geometry-projection.ts` | 38 lines | Projection wiring.                                                 |
| `app/commands/use-editor-focus-commands.ts`                   | 37 lines | Focus command routing.                                             |
| `scene/internal/history/use-history-operations.ts`            | 22 lines | Thin didChange-guard + write-back.                                 |
| `scene/internal/camera/use-camera-operations.ts`              | 24 lines | Thin preset/key-state forwarding.                                  |
| `scene/internal/selection/use-selection-operations.ts`        | 20 lines | Thin.                                                              |
| `app/commands/use-editor-command-handlers.ts`                 | 10 lines | Command→handler map.                                               |
| `features/startup/use-startup-bootstrap.ts`                   | 6 lines  | Thin mount trigger for `core/operations/startup-bootstrap`.        |

Recommendation: if we touch this tier at all, do **only** `use-furniture-operations`
as a real-store integration test and leave the thin wrappers to e2e.

## Tier 3 — skip at the unit level

Intentionally e2e-tested, presentational, trivial, or config:

- Canvas composition: `scene/scene.tsx`, `app/App.tsx`, `main.tsx`, `app/chrome/editor-body.tsx`, `top-header-dialogs.tsx`.
- r3f environment/presentational: `environment/{lighting,room,wall-material}.tsx`, `camera/camera-controls.tsx`, `feedback/announcer.tsx`, `project-info/asset-attribution.tsx`, `startup/initialization-{error,progress}.tsx`, the confirmation-dialog components, `catalog-drawer.tsx`, `room-sidebar.tsx`.
- Config/registration: `*-dialog-definition.ts`, `camera-presets.ts`.
- Pure wiring: `core/operations/editor-reconcilers.ts` (composes three already-tested reconcilers).
- Debug/test infra: `shared/debug/perf-counters.ts`, `app/testing/use-test-state-bridge.ts`.

## Out of scope (standing)

Chasing a coverage number; re-testing Base UI primitive behavior through
`shared/ui` wrappers (project-added contracts there are in scope — see
`intentional-unit-exclusions.md`); testing pure-constant modules
(`domain/geometry/room-metrics.ts`).
