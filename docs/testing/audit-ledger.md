# Unit Test Audit Ledger

A per-file validity record for the Vitest unit suite (94 files). Each file was read
against its source and given one verdict:

- **keep** — asserts intended, observable behavior; mocking is proportionate; no
  significant coupling to implementation details.
- **fix** — has a concrete test-quality problem to address (over-mocking that
  verifies wiring/fakes, assertions on incidental output or internal state,
  tautological assertions, brittle exact-string/className matches, trivial
  language/library tests, duplicated setup, or structural inconsistency).
- **expand** — the tests present are fine, but a notable untested behavior/branch is
  worth covering in a later phase. Recorded in the note, never as new tests now.

A file marked **fix** may also carry an **expand** note. Original audit counts:
64 keep, 30 fix (`preview-actions.test.ts` was reclassified `fix`→`keep` on closer
review — see its row).

**Phase 3 update:** the coverage-expansion phase (see `coverage-triage.md`)
resolved the `expand`/coverage gaps in `share-scene`, `movement-actions`,
`get-visual-object-bounds`, `scene-services`, `scene-model`,
`selection-focus-store`, `validate-catalog-asset-nodes`, `catalog-manifest`, and
`use-camera-key-motion`, and added new suites for `selected-item-detail-messages`,
`top-header-focus`, and `scene-reset`. Their rows below describe the original
audit state.

> Scope note: this phase is **tests-only**. "Fix" items that require a _source_
> change to do properly (e.g. exposing a public selector) are marked
> `fix→deferred` and left for a later phase rather than refactored now.

## core

| file                                               | verdict | note                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| core/commands/editor-command.test.ts               | keep    | `it.each` over command kinds asserts the real dispatch contract; mocked handlers are the unit's actual collaborators.                                                                                                                                                                                                                    |
| core/model/scene-model.test.ts                     | keep    | Pure equality/derivation tests on real inputs. Expand: `hasNoFurniture` union + missing-finish equality.                                                                                                                                                                                                                                 |
| core/operations/active-finish-ids.test.ts          | keep    | Drives real stores; asserts derived ids/options incl. invalid-id fallback.                                                                                                                                                                                                                                                               |
| core/operations/canvas-keyboard-actions.test.ts    | keep    | Asserts observable browse/select via real `getPreviewedId`; proportionate mocks.                                                                                                                                                                                                                                                         |
| core/operations/canvas-keyboard-navigation.test.ts | keep    | Thorough pure-function coverage of spatial sort / browse target.                                                                                                                                                                                                                                                                         |
| core/operations/focus-actions.test.ts              | fix     | `requestOutlinerFocus` tests (`:51-54,62-65,73-76`) spy on the collaborator instead of asserting resulting `selectionFocusStore` state (as the reconciler tests do at `:108,112,123`).                                                                                                                                                   |
| core/operations/history-actions.test.ts            | keep    | Asserts the real gating contract (not-ready/disabled no-op, announce + suppress on success).                                                                                                                                                                                                                                             |
| core/operations/movement-actions.test.ts           | fix     | Mostly command passthrough/wiring (`:71-72,90-94`). Expand: announcement strings via `queueMovementAnnouncement`/`formatMoveBlockedMessage` (source `:51-65`) never asserted.                                                                                                                                                            |
| core/operations/preview-actions.test.ts            | keep    | `previewedIdRaw` is the direct output of the unit under test (preview-actions owns the raw preview state machine); the gated `getPreviewedId` lives in `previewed-id.ts` and would gate to null here since these tests intentionally omit `markAssetsReady()`. Expand: `forceClearPreview` (source `:114`) untested.                     |
| core/operations/previewed-id.test.ts               | keep    | Exhaustive pure-gating cases; hook/get tests confirm real cross-store gating.                                                                                                                                                                                                                                                            |
| core/operations/preview-reconciler.test.ts         | keep    | Drives real stores; asserts observable hygiene. Expand: blocking-overlay branch (source `:24`).                                                                                                                                                                                                                                          |
| core/operations/selection-actions.test.ts          | fix     | Several assertions are wiring on mocked `selectionEffects`/`clearPreviewOnCanvasMiss` (`:77,99-105,114-115,131-134`); prefer asserting resulting store state.                                                                                                                                                                            |
| core/operations/selection-effects.test.ts          | keep    | Drives the real reconciler through store mutations; asserts observable outcomes.                                                                                                                                                                                                                                                         |
| core/operations/share-scene.test.ts                | fix     | Only clipboard-fallback tested; `serializeSceneToUrl` mocked as passthrough (`:69-77`). Expand: native-share path + AbortError/error branches (source `:35-60`) — the bulk of the function.                                                                                                                                              |
| core/operations/startup-coordinator.test.ts        | keep    | Run-once/retry/error-reset/cache-clear covered against real stores; restore-flow correctly mocked as a boundary.                                                                                                                                                                                                                         |
| core/operations/view-actions.test.ts               | keep    | Asserts real interactive+ready gate. Expand: `focusSelectedInView` happy path.                                                                                                                                                                                                                                                           |
| core/persistence/furniture-serialization.test.ts   | fix     | Old-style `'should …'` names (`:10,16,22,29,36,44,50,61,71`) inconsistent with the suite; some near-trivial `isFiniteNumber` cases.                                                                                                                                                                                                      |
| core/persistence/restore-flow.test.ts              | keep    | Spies are the unit's real output channel; asserts per-branch contract incl. user-facing copy.                                                                                                                                                                                                                                            |
| core/persistence/scene-draft.test.ts               | fix     | Hard-codes the prefixed storage key `'room-layout:scene-draft'` (`:65`) while source uses `'scene-draft'`; couples to the storage lib's prefixing. Assert via `loadSceneDraft` round-trip instead.                                                                                                                                       |
| core/persistence/scene-url.test.ts                 | keep    | Strong parse/serialize table; round-trip + precondition guard (`:340,381`). Exemplary.                                                                                                                                                                                                                                                   |
| core/stores/dialog-store.test.ts                   | keep    | Asserts observable selector behavior via public API. Expand: `canOpen`/`getPayload`, `setDialogOpen(false)`.                                                                                                                                                                                                                             |
| core/stores/editor-lifecycle-store.test.ts         | keep    | Drives public actions; asserts state + derived selectors per transition.                                                                                                                                                                                                                                                                 |
| core/stores/feedback-store.test.ts                 | fix     | `:155-162` spies `window.clearTimeout` and only asserts `toHaveBeenCalled()` — implementation detail; assert no pending announcement lands after reset (as `:120-150` do).                                                                                                                                                               |
| core/stores/scene-document-store.test.ts           | fix     | ~15-method stub re-pasted as `overrides` in 8 tests (`:238-251,263-276,288-301,317-330,352-365,380-393,418-431,468-481,540-553`) despite the helper's `overrides` param; many delegation tests are tautological "spy called with X". Reads raw `previewedIdRaw` (`:175,183,213,219`) — fix→deferred (no public preview selector exists). |
| core/stores/selection-focus-store.test.ts          | keep    | Asserts observable source/focus-request transitions. Expand: `roomViewFocusRequest` set/clear.                                                                                                                                                                                                                                           |
| core/stores/toolbar-geometry-store.test.ts         | keep    | Short-circuit test asserts genuine notification behavior. Expand: available→available diff branches.                                                                                                                                                                                                                                     |

## domain

| file                                        | verdict | note                                                                     |
| ------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| domain/catalog.test.ts                      | keep    | Asserts lookup result + exact thrown message.                            |
| domain/geometry/furniture-footprint.test.ts | keep    | Exemplary — real rotated inputs, oriented edge math, `toBeCloseTo`.      |
| domain/geometry/furniture-layout.test.ts    | keep    | Strong clamp/overlap/snap/wall-snap coverage across all three resolvers. |
| domain/geometry/furniture-spawn.test.ts     | keep    | Deterministic ordering, ring-skip search, null-when-full.                |
| domain/geometry/wall-clearance.test.ts      | keep    | Rotation-aware clearance + round-trip resolve.                           |

## features

| file                                                                    | verdict | note                                                                                                                                                                                |
| ----------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| features/camera/camera-tools.test.tsx                                   | keep    | Role/name queries, asserts dispatched payloads + `aria-disabled`. Local `renderWithDispatch` duplicates history-tools' (see helpers).                                               |
| features/catalog/catalog-actions.test.ts                                | keep    | Real store side-effects + message mapping; proportionate mock.                                                                                                                      |
| features/catalog/catalog-add-button.test.tsx                            | fix     | Asserts exact Tailwind class tokens (`:14-17`: `hover:w-42`, `rounded-full`, `rounded-lg`) — brittle styling coupling; keep the role/text checks.                                   |
| features/history/history-tools.test.tsx                                 | fix     | className assertions (`:96-97`: `sr-only`, `h-9`) couple to styling; the shortcut/aria/dispatch tests are good.                                                                     |
| features/keyboard/keyboard-event-target.test.ts                         | keep    | Pure predicate over real DOM nodes; thorough.                                                                                                                                       |
| features/keyboard/keyboard-shortcut-matcher.test.ts                     | keep    | Real `KeyboardEvent`s; comprehensive modifier/code/array coverage.                                                                                                                  |
| features/keyboard/keyboard-shortcuts-help.test.tsx                      | fix     | `:56-67` over-asserts a long list of exact help strings that mirror the definitions data (high churn); trim to structure + representative rows.                                     |
| features/keyboard/use-camera-key-state.test.ts                          | keep    | `renderHook` + real events; only the scene boundary spied. Excellent.                                                                                                               |
| features/keyboard/use-keyboard-shortcuts.test.tsx                       | keep    | Behavior-first via harness + real key events; asserts commands + `defaultPrevented`.                                                                                                |
| features/outliner/outliner.test.tsx                                     | fix     | Preview-state asserted via className regex `/bg-accent/` (`:165-166,178`); prefer a semantic signal (`aria-current`/data attr).                                                     |
| features/room-surface/room-controls.test.tsx                            | keep    | aria-busy + handler forwarding via real radio clicks. Option factories (`:10-42`) duplicate room-drawer's.                                                                          |
| features/room-surface/room-drawer.test.tsx                              | fix     | Option factories (`:13-37`) duplicate room-controls'; "forwards room control changes" (`:144-175`) re-tests RoomControls through the drawer. Expand: `contentRef` forwarding.       |
| features/selection/deletion-actions.test.ts                             | fix     | Inline `CHAIR` fixture (`:46-57`) duplicates shared `FURNITURE_ITEM`; reuse it. Module mocking otherwise proportionate.                                                             |
| features/selection/selected-details-panel.test.tsx                      | fix     | Re-declares the same 6-level provider tree 3× (`:43-70,89-119,137-166`) where only `placement` differs; extract a `renderPanel` helper (model: `renderFloatingActions` `:224-254`). |
| features/selection/selected-details-view.test.tsx                       | keep    | Strong commit/blur/escape/optimistic/normalization coverage; renders the component directly.                                                                                        |
| features/selection/selected-item-detail-actions.test.ts                 | fix     | Inline `CHAIR` (`:37-48`) duplicates shared fixture + deletion-actions' copy; consolidate.                                                                                          |
| features/selection/selected-item-interaction-context.test.tsx           | keep    | Tests provider guard + one-shot prepare/consume semantics.                                                                                                                          |
| features/selection/selected-item-placement-context.test.tsx             | keep    | Hook guards + identity passthrough.                                                                                                                                                 |
| features/selection/selected-item-tools.test.tsx                         | keep    | Real roving-tabindex/keyboard + disabled gating; exact `aria-keyshortcuts` are contract values. Expand: `onPrepareDelete`/pointer-down.                                             |
| features/selection/toolbar-placement/selected-toolbar-placement.test.ts | keep    | Pure geometry with meaningful invariants; `toBeCloseTo` on intended output.                                                                                                         |
| features/startup/catalog-manifest.test.ts                               | keep    | Well-structured; mocks only true boundaries. Expand: floor diffuse/normal invalid-path branch (source `:329-341`).                                                                  |
| features/startup/start-over-actions.test.ts                             | keep    | Spies real collaborator boundaries; asserts open-guard + confirm sequence.                                                                                                          |
| features/url-scene/use-draft-persistence.test.ts                        | keep    | Mocks the persistence boundary; drives real stores to assert save/clear gating.                                                                                                     |

## scene

| file                                                       | verdict | note                                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| scene/furniture-collection-cache.test.ts                   | fix     | preload/clear tests assert a fully-mocked `useGLTF` passthrough (`:46-66`) — verifies the fake; `resolvePublicAssetPath` block (`:25-38`) belongs in that util's own test. Expand: `useFurnitureAssetLoadingProgress` clamp/NaN logic. |
| scene/internal/camera/use-camera-key-motion.test.ts        | keep    | Mocks only `useFrame`; drives the frame callback with real key-state + delta and asserts the motion math. Expand: keyS/A/D + delta-cap branch.                                                                                         |
| scene/internal/drag/furniture-drag.test.ts                 | fix     | Exemplary pure-logic content; only issue: no top-level `describe`, bare `it()` (`:8,17,23,42,46`).                                                                                                                                     |
| scene/internal/drag/use-scene-drag.test.ts                 | keep    | Mocks geometry collaborators at module seams; exercises real hook state transitions.                                                                                                                                                   |
| scene/internal/environment/floor-material.test.tsx         | keep    | Mocks only the IO seam; asserts real material state through RTTR incl. retry-after-failure.                                                                                                                                            |
| scene/internal/furniture/furniture-operations.test.ts      | keep    | Exemplary — real history state, referential-equality short-circuits, add/delete outcomes.                                                                                                                                              |
| scene/internal/furniture/interactive-furniture.test.tsx    | keep    | Uses shared R3F helpers; asserts real scene-graph structure, ui-bounds, lifecycle. Honors the RTTR ray limitation.                                                                                                                     |
| scene/internal/history/restored-scene-history.test.ts      | fix     | `buildRestoredSceneHistory` tests mock `buildFurnitureItemsFromInstances` then assert passthrough (`:67-92,131`); keep the real `getMaxRestoredInstanceSuffix` cases.                                                                  |
| scene/internal/history/scene-history-state.test.ts         | keep    | Real history ops; asserts selection-reconciliation across undo/redo + isDragging gate.                                                                                                                                                 |
| scene/internal/scene-services.test.ts                      | fix     | Only throw-before-register + same-ref getter (`:43,50`); large `createFakeServices` boilerplate (`:9-39`) for 2 assertions. Expand: `clearSceneServices`, `getSceneServicesIfReady` null.                                              |
| scene/internal/selection/selected-toolbar-geometry.test.ts | keep    | Real three objects + camera; asserts source-precedence ladder + off-canvas filtering.                                                                                                                                                  |
| scene/internal/selection/use-scene-selection.test.ts       | keep    | Real hook + real Group/mesh; resets the real store rather than mocking it.                                                                                                                                                             |
| scene/internal/snapshot/scene-snapshot.test.ts             | keep    | Exemplary — real camera/mesh/group; projection + rounding + exclusion.                                                                                                                                                                 |
| scene/internal/snapshot/use-scene-snapshot.test.ts         | fix     | `createSceneSnapshot` mocked (`:15-17`) so content assertions (`:91,137`) re-check the mock; keep the ref-freshness/arg-forwarding tests (`:103-148,175`).                                                                             |
| scene/internal/three/floor-texture-repeat.test.ts          | keep    | Pure function; division math + RangeError on invalid dims.                                                                                                                                                                             |
| scene/internal/three/get-cloned-node.test.ts               | keep    | Real Group/Mesh; asserts clone-not-original + named throw.                                                                                                                                                                             |
| scene/internal/three/get-meshes.test.ts                    | keep    | Real traversal; collection/empty/ui-bounds option.                                                                                                                                                                                     |
| scene/internal/three/get-visual-object-bounds.test.ts      | fix     | Single test only spies `computeBoundingBox` cache-hit (`:12`) — tests an internal optimization. Expand (main gap): the returned bounds union / ui-bounds exclusion / null-on-empty is untested.                                        |
| scene/internal/three/is-mesh.test.ts                       | fix     | Near-trivial one-line type-guard test (effectively asserts three.js's `isMesh`); also no top-level `describe` (`:5,9`).                                                                                                                |
| scene/internal/three/load-floor-texture.test.ts            | keep    | Heavy three loader mocking justified (no WebGL in jsdom); asserts retry-not-caching + loader-path selection.                                                                                                                           |
| scene/internal/validate-catalog-asset-nodes.test.ts        | keep    | Real scenes; accept/missing-root/missing-ui-bounds/stray/self-root throws. Expand: `!sourceScene` branch.                                                                                                                              |

## app + shared

| file                                              | verdict | note                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| app/chrome/editor-overlay.test.tsx                | keep    | Real tab/focus handoff + room-panel open/close through actual stores; leaf-component mocks proportionate. Expand: mobile branch.                                                                                                                                                      |
| app/chrome/providers/editor-providers.test.tsx    | keep    | Probe reads real context values through the composed tree.                                                                                                                                                                                                                            |
| app/chrome/top-header/share-scene-button.test.tsx | fix     | `:88-89` assert `label.className` not-containing `'hidden'` (near-tautological — no such class is ever set) + `'h-9'`; the async share-state tests are excellent.                                                                                                                     |
| app/chrome/top-header/top-header-desktop.test.tsx | keep    | Asserts observable composition; `data-top-header-root` is a deliberate seam.                                                                                                                                                                                                          |
| app/chrome/top-header/top-header-mobile.test.tsx  | keep    | Real dialog-trigger ARIA + drawer open via shared binding.                                                                                                                                                                                                                            |
| app/chrome/top-header/top-header.test.tsx         | fix     | **Dead mock** (`:41`): mocks `@/features/shell/use-header-layout-mode` but source imports `@/shared/layout/use-header-layout-mode` and `features/shell/` doesn't exist — the forced-desktop intent silently never applies; passes only because both layouts render identical testids. |
| app/dialogs/bootstrap-dialog-registry.test.ts     | fix     | Hard-codes `.toBe(7)` registry size (`:55,71`) — adding any dialog breaks unrelated idempotency/registration tests; assert specific IDs / pure idempotency instead.                                                                                                                   |
| shared/hooks/use-element-rect.test.ts             | keep    | DOM mocking inherent + proportionate; asserts observable rect across RO/viewport/removal. Mock setup shared with two siblings (helper candidate).                                                                                                                                     |
| shared/hooks/use-element-size.test.tsx            | keep    | Asserts the `trackPosition:false` contract via Profiler render-count.                                                                                                                                                                                                                 |
| shared/layout/overlay-exclusion-context.test.tsx  | keep    | Verifies split-context wiring + exact guard messages.                                                                                                                                                                                                                                 |
| shared/layout/use-header-layout-mode.test.ts      | keep    | Both branches: matchMedia-absent fallback + live breakpoint tracking.                                                                                                                                                                                                                 |
| shared/layout/use-overlay-exclusion-rects.test.ts | keep    | Thorough registration/observe/refresh/disconnect coverage.                                                                                                                                                                                                                            |
| shared/lib/ui/editor-history.test.ts              | keep    | Exemplary pure reducer tests incl. identity-preservation on no-op.                                                                                                                                                                                                                    |
| shared/lib/ui/storage.test.ts                     | keep    | Prefixing, JSON/boolean, validator/parse fallbacks, throw-safety.                                                                                                                                                                                                                     |
| shared/lib/utils.test.ts                          | fix     | `anchorNameFromId` cases (`:6,11`) near-trivial; keep the disallowed-char case (`:14`) + `parseAriaShortcuts` block.                                                                                                                                                                  |
| shared/providers/editor-refs-context.test.tsx     | keep    | Returns-provided-refs + exact guard message.                                                                                                                                                                                                                                          |
| shared/ui/alert-dialog.test.tsx                   | fix     | `:24-26` assert Tailwind class substrings to prove `cn()` gutter survival — brittle; assert `data-size`/structure, move the merge intent to a `cn` util test.                                                                                                                         |
| shared/ui/dialog.test.tsx                         | fix     | `:20-22` same class-substring pattern; move the twMerge intent into a `cn`/utils test.                                                                                                                                                                                                |
| shared/ui/tool-button.test.tsx                    | fix     | `:31` `label.className` `.toBe('')` + `:53` `.toContain('h-9')` couple to styling; `:52` `not.toContain('sr-only')` + the ARIA tests are the correct model. Our own component — keep behavior tests.                                                                                  |

## Phase 1 cleanup backlog (tests-only) — status

Grouped by type. ✅ = applied in Phase 1, ↪ = deferred (with reason).

### A. Brittle className / styling-coupled assertions → assert behavior

- ✅ `shared/ui/tool-button.test.tsx` — assert the displayLabel/sr-only contract; the sizing test now covers the `displayLabel=false` path.
- ✅ `app/chrome/top-header/share-scene-button.test.tsx` — removed the tautological `hidden`/`h-9` test (no such feature).
- ✅ `features/catalog/catalog-add-button.test.tsx` — assert the label renders visibly instead of Tailwind tokens.
- ✅ `features/history/history-tools.test.tsx` — dropped the `h-9` assertion, kept the sr-only label check.
- ✅ `shared/ui/alert-dialog.test.tsx` — assert `data-size` plus the mobile gutter.
- ✅ `shared/ui/dialog.test.tsx` — kept (the twMerge gutter-survival classes _are_ the unit under test; documented as such).
- ✅ `features/outliner/outliner.test.tsx` — source now exposes a `data-previewed` state attribute (CSS driven from it), and the test asserts that instead of the `bg-accent` token. Note: this is a styling/state hook, **not** aria — preview is correctly AT-silent (focus is self-announcing; keyboard browse announces at the source; hover is pointer-only), so only `aria-current` for selection carries AT semantics.

### B. Broken / brittle correctness — all applied

- ✅ `app/chrome/top-header/top-header.test.tsx` — fixed the dead `vi.mock` path; assert the desktop layout actually renders.
- ✅ `app/dialogs/bootstrap-dialog-registry.test.ts` — assert the registry matches `DIALOG_IDS` instead of `.toBe(7)`.
- ✅ `core/persistence/scene-draft.test.ts` — write the invalid payload via `saveJson` instead of the lib-prefixed key.

### C. Over-mocking / tautological assertions

- ✅ `core/stores/scene-document-store.test.ts` — collapsed the re-pasted service stubs (see D).
- ✅ `core/stores/feedback-store.test.ts` — `clearTimeout` spy → behavioral (assert no announcement repopulates after reset).
- ✅ `features/keyboard/keyboard-shortcuts-help.test.tsx` — trimmed the duplicated label-string list to structure + representatives.
- ↪ `core/operations/focus-actions.test.ts`, `selection-actions.test.ts`, `movement-actions.test.ts`, `scene/internal/snapshot/use-scene-snapshot.test.ts`, `restored-scene-history.test.ts`, `furniture-collection-cache.test.ts`, `scene-services.test.ts`, `get-visual-object-bounds.test.ts` — these tests' tautological assertions are often their _only_ assertions; replacing them well means asserting real outcomes the current code doesn't expose as observable, i.e. a rewrite that overlaps the coverage-expansion phase. Deferred to avoid gutting tests into assertion-less stubs now.

### D. Duplicated setup → shared helpers — all applied

- ✅ `scene-document-store.test.ts` — each delegation test passes only its spied method to the existing `overrides` param (~110 lines removed).
- ✅ `selected-details-panel.test.tsx` — extracted `renderPanel({ placement, children })`.
- ✅ Shared `makeFurnitureItem`/`CHAIR`/`FURNITURE_ITEM` in `@/test/support/furniture.ts`, replacing duplicated fixtures in selection, movement-actions, scene-document-store, and bootstrap-dialog-registry tests.
- ✅ Room option factories → `features/room-surface/test-fixtures.ts`.
- ↪ `renderWithDispatch` (`camera-tools`/`history-tools`) — the two variants differ (history needs a `Toolbar.Root` wrapper); sharing adds cross-file coupling for ~3 lines. Left local.
- ↪ DOM-measurement mock setup (`use-element-rect`/`use-element-size`/`use-overlay-exclusion-rects`) — optional; not pursued.

### E. Trivial tests / structure

- ✅ `shared/lib/utils.test.ts` — merged the two near-trivial `anchorNameFromId` cases (prefix + allowed chars) into one.
- ✅ `core/persistence/furniture-serialization.test.ts` — renamed `'should …'` titles to the imperative convention.
- ↪ Add top-level `describe` to `furniture-drag.test.ts` / `is-mesh.test.ts` — purely cosmetic; a whole-file re-indent for the wrapper, so skipped to avoid churn.
- ↪ `is-mesh.test.ts` — kept; it exercises our `isMesh` type predicate (low value but cheap, not deleted).

## Deferred to later phases (expand / source-coupled)

Marked here, **not acted on** in this tests-only phase:

- **Needs a source change first (`fix→deferred`):** a public preview selector so
  `scene-document-store.test.ts` stops reading `previewedIdRaw` — though on review
  this is likely a false positive (the store owns that field and the gated
  `getPreviewedId` would mask it in those tests), pending a decision.
  (`outliner.test.tsx` is resolved — see Phase 1 backlog A.)
- **Over-mock rewrites (overlap coverage work):** the category-C deferrals above.
- **Coverage gaps to weigh against the coverage map (Phase 2):**
  `share-scene` native-share path; `movement-actions` announcement strings;
  `get-visual-object-bounds` returned bounds; the untested `use*Operations` hook
  wrappers (`*-operations.ts` at 0% in the coverage run); `toolbar-geometry-projection`;
  `editor-reconcilers`; `use-scene-is-at-defaults`; plus the smaller per-file expand
  notes above.
- **Explicitly out of scope:** chasing a coverage number; testing vendored
  `shared/ui/*` primitives; testing pure-constant modules (`domain/geometry/room-metrics.ts`).
