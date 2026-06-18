# Plan: Dialog Refactor And Cleanup

## Purpose

Replace the current hardcoded dialog store and app-level dialog wiring with a
phase-driven implementation that yields a generic dialog orchestrator, feature-
owned dialog rules, and behavior-contract tests.

This document is implementation-first:

1. Phases are the source of truth.
2. Requirements that matter for execution are colocated with the phase that
   implements them.
3. Global context is intentionally brief and only captures guidance that applies
   to all phases.

## Global Guidance (Applies To Every Phase)

1. Preserve architecture boundaries from `docs/architecture-boundaries.md`.
2. Do not add compatibility shims for removed dialog APIs.
3. Keep `docs/editor-state-architecture.md` as the canonical editor-state
   architecture document; do not add a new standalone dialog architecture doc.
4. Keep runtime code independent from `src/test/**`.
5. Run the phase validation commands before moving to the next phase.
6. Execute phases in order; do not start a later phase until the current phase
   meets its acceptance criteria and validation steps.

## Phase Order And Handoffs

1. Phase 1 -> Phase 2 handoff:
   - generic dialog store API and contract are in place
   - legacy store contract surface removed
   - `dialog-store` tests and typecheck are green
2. Phase 2 -> Phase 3 handoff:
   - registry bootstrap is wired in app startup
   - snapshot adapter and `syncLayoutMode` threading are removed
   - no controller still depends on `DialogStateSnapshot`
3. Phase 3 -> Phase 4 handoff:
   - top-header coordinator owns responsive continuity and semantic focus
   - top-header components no longer rely on legacy dialog prop bundles
4. Phase 4 -> Phase 5 handoff:
   - feature ownership boundaries are enforced in runtime code
   - remaining dialog orchestration in app controllers is multi-domain only
5. Phase 5 -> Phase 6 handoff:
   - behavior-contract browser/a11y coverage is green
   - no tests still assert removed store fields or token names

## Phase 1: Replace The Core Dialog Store Contract

### Goal

Replace legacy dialog store state and methods with one active-surface model and
one generic API.

### Runtime changes

1. Create `src/editor-state/dialog-contract.ts` with shared types:
   - `DialogId`
   - `DialogKind = 'blocking' | 'non-blocking'`
   - `DialogAccessPoint`
   - `DialogOpenRequest`
   - `DialogDefinition`
   - `DialogRuntimeContext`
   - `ActiveSurfaceState`
2. Replace internals of `src/editor-state/dialog-store.ts` with the generic API:
   - `openDialog(id, request?) -> boolean`
   - `setDialogOpen(id, open, request?) -> boolean`
   - `closeActiveDialog() -> void`
   - `isDialogOpen(id) -> boolean`
   - `useActiveSurface()`
   - `useDialogOpen(id)`
   - `useDialogPayload(id)`
   - `useReturnFocusAccessPoint()`
3. Use a single active-surface union only:
   - `null`
   - `{ id, kind, payload, returnFocusAccessPoint }`
4. Remove legacy public contract/state:
   - `RoomSurfaceLayout`
   - `DialogReturnFocusTarget`
   - hardcoded `ActiveDialog` union
   - `syncLayoutMode`
   - `closeDialog`
   - `closeAllDialogs`
5. Replace open-check inputs based on
   `editorInteractionsEnabled/startupOverlayActive` with one startup-phase
   global gate.
6. Keep pending delete payload support, but store it as active-surface payload
   instead of a separate top-level field.

### Behavioral requirements implemented in this phase

1. Exactly one top-level surface can be open at a time.
2. Room remains `non-blocking`, but cannot coexist with any other top-level
   surface.
3. Opening another top-level surface closes the currently active one first.
4. Dialog store owns semantic return-focus access points only; it does not own
   UI element mapping.
5. Store contains no dialog-id-specific layout remap branches.

### Tests in this phase

1. Rewrite `src/editor-state/dialog-store.test.ts` around:
   - one-active-surface invariant
   - startup global gating
   - blocking vs non-blocking behavior through `kind`
   - payload retention while active
2. Delete tests that assert legacy method names or legacy dual-state fields.

### Acceptance criteria

1. Store cannot represent simultaneous blocking/non-blocking active states.
2. No exported store type exposes `activeDialog`, `roomSurfaceLayout`, or
   `syncLayoutMode`.
3. No exported API requires callers to pass `editorInteractionsEnabled` or
   `startupOverlayActive`.
4. No store logic contains layout remap branches keyed by dialog id.
5. `dialog-store.test.ts` verifies the new contract, not removed surface area.

### Validation

1. Run rewritten dialog-store tests.
2. Run `pnpm typecheck`.

## Phase 2: Bootstrap Registry And Remove Snapshot Wiring

### Goal

Move dialog definition composition to explicit app bootstrap and remove
snapshot-based dialog wiring from app/controller surfaces.

### Runtime changes

1. Add `src/app/dialogs/dialog-context-builder.ts`.
2. Build `DialogRuntimeContext` in that module and keep context ownership in app
   composition.
3. Add `src/app/dialogs/bootstrap-dialog-registry.ts` and configure store
   registry there.
4. Import bootstrap once from `src/App.tsx` before dialog consumers render.
5. Make bootstrap registration idempotent so repeated evaluation does not
   duplicate registry entries or change behavior.
6. Create feature-owned definition modules:
   - `src/features/catalog/catalog-dialog-definition.ts`
   - `src/features/selection/delete-dialog-definition.ts`
   - `src/features/keyboard/keyboard-shortcuts-dialog-definition.ts`
   - `src/features/project-info/project-info-dialog-definition.ts`
   - `src/features/startup/start-over-dialog-definition.ts`
   - `src/features/room-surface/room-surface-dialog-definition.ts`
   - `src/app/chrome/top-header/header-more-actions-dialog-definition.ts`
7. Each definition declares:
   - `id`
   - `kind`
   - `getPayload(context, request)`
   - `canOpen(context, request)`
   - `getReturnFocusAccessPoint(context, request)`
8. Delete `src/app/chrome/hooks/use-dialog-state-snapshot.ts`.
9. Replace all `useDialogStateSnapshot` consumers with direct store hooks/actions.
10. Remove `useDialogStateSnapshotOptions` and snapshot-only plumbing from app
    composition and controllers.
11. Remove `syncLayoutMode` threading from:
    - `src/app/chrome/editor-shell.tsx`
    - `src/app/chrome/shell-layout-services-provider.tsx`
    - `src/shared/layout/overlay-layout-context.ts`
    - callers that existed only to forward that prop
12. Replace controller contracts using `Pick<DialogStateSnapshot, ...>` with:
    - direct generic store hooks, or
    - narrow action dependencies when DI is intentional for tests
13. Remove generic `dialogState` bag naming once snapshot model is gone.

### DialogRuntimeContext requirements (implemented in this phase)

1. Context is built in app layer and passed at bootstrap.
2. Store reads cross-store state through `DialogRuntimeContext` only.
3. Store must not write to other stores.
4. Context provides these inputs as functions/selectors:
   - startup readiness from `editor-runtime-store` startup phase
   - selected-item presence/data for dialog guards
   - start-over eligibility derived by app composition
   - editor interactions enabled input used by dialog guards
5. Keep layout mode out of dialog store state and APIs.
6. Keep startup readiness as the single store-level global gate. If
   `editorInteractionsEnabled` is retained, use it only in feature-level
   `canOpen` guard logic, not as a second store-level global gate.

### Boundary requirements in this phase

In `src/editor-state/dialog-store.ts`:

1. Disallow writes to `scene-state-store`.
2. Disallow writes to `selection-meta-store`.
3. Disallow reading layout mode from shell layout context.

### Files that must be updated in this phase

1. `src/App.tsx`
2. `src/app/dialogs/dialog-context-builder.ts` (new)
3. `src/app/dialogs/bootstrap-dialog-registry.ts` (new)
4. `src/app/chrome/editor-shell.tsx`
5. `src/app/chrome/shell-layout-services-provider.tsx`
6. `src/app/chrome/editor-overlay.tsx`
7. `src/shared/layout/overlay-layout-context.ts`
8. `src/app/controllers/use-catalog-controller.ts`
9. `src/app/controllers/use-deletion-controller.ts`
10. `src/app/controllers/use-start-over-controller.ts`
11. `src/app/controllers/use-asset-lifecycle-controller.ts`
12. Any remaining import site of `useDialogStateSnapshot` or
    `DialogStateSnapshot`

### Tests in this phase

1. Delete `src/app/chrome/hooks/use-dialog-state-snapshot.test.ts`.
2. Replace meaningful removed coverage with:
   - dialog-store orchestration tests
   - top-header integration tests for focus/responsive behavior
3. Update/delete tests that only exercised snapshot adapter wiring.
4. Rewrite controller tests stubbing `dialogState` bags to use narrow action
   dependencies.
5. Add `src/app/dialogs/dialog-context-builder.test.ts`.
6. Add `src/app/dialogs/bootstrap-dialog-registry.test.ts`.
7. Add integration test coverage proving bootstrap sequence occurs before dialog
   consumers render.

### Acceptance criteria

1. `useDialogStateSnapshot` no longer exists.
2. `App.tsx` no longer constructs a dialog snapshot object.
3. Registry configuration happens in one explicit bootstrap module.
4. No controller type/prop references `DialogStateSnapshot`.
5. `syncLayoutMode` no longer exists in shell providers/layout context contract.
6. Bootstrap wiring is idempotent and does not cause duplicate dialog
   registrations.

### Validation

1. Run targeted tests for replaced snapshot consumers.
2. Run `pnpm typecheck`.

## Phase 3: Rebuild Top-Header Dialog Coordination

### Goal

Move responsive continuity and top-header dialog orchestration out of store-like
prop bundles into a top-header coordinator and semantic focus handling.

### Runtime changes

1. Create `src/app/chrome/top-header/use-top-header-dialog-coordinator.ts`.
2. Move top-header orchestration to this coordinator.
3. Replace top-header return-focus handling with semantic access-point
   resolution.
4. Keep focus lookup/fallback implementation inside `src/app/chrome/top-header/`.
5. Update `TopHeaderDesktop` and `TopHeaderMobile` to use generic dialog API.
6. Keep mobile More-actions hand-off behavior in top-header code.
7. Keep `TopHeader` as shell coordinator without store-specific dialog plumbing.
8. Use `useHeaderLayoutMode()` directly in top-header coordinator.

### Responsive continuity behavior (implemented in this phase)

1. Room stays open across layout change by swapping presentation.
2. Start Over stays open across layout change.
3. Keyboard Shortcuts stays open across layout change.
4. Project Info stays open across layout change.
5. More-actions closes when switching to desktop.
6. If More-actions closes on desktop switch, focus moves to first enabled
   desktop auxiliary action control.
7. Dialog store does not receive or own layout transition logic.

### Semantic access-point requirements

Use semantic `DialogAccessPoint` tokens:

1. `top-header-room`
2. `top-header-keyboard-shortcuts`
3. `top-header-project-info`
4. `top-header-start-over`
5. `top-header-more-actions`
6. `room-view`
7. `outliner`
8. `selection-inspector`
9. `none`

These tokens describe logical access points and do not encode mobile/desktop
DOM identity.

### Files that must be updated in this phase

1. `src/app/chrome/top-header/top-header.tsx`
2. `src/app/chrome/top-header/top-header.types.ts`
3. `src/app/chrome/top-header/top-header-desktop.tsx`
4. `src/app/chrome/top-header/top-header-mobile.tsx`
5. `src/app/chrome/top-header/header-more-actions-drawer.tsx`
6. `src/features/room-surface/room-drawer.tsx`
7. `src/features/room-surface/room-sidebar.tsx`
8. `src/app/chrome/top-header/share-scene-button.tsx`
9. `src/app/chrome/top-header/start-over-button.tsx`
10. `src/shared/layout/use-header-layout-mode.ts` only if token naming or
    breakpoint semantics need updates

### Tests in this phase

1. Rewrite:
   - `src/app/chrome/top-header/top-header.test.tsx`
   - `src/app/chrome/top-header/top-header-desktop.test.tsx`
   - `src/app/chrome/top-header/top-header-mobile.test.tsx`
2. Remove assertions against old dialog prop bundle shape.
3. Add integration tests for:
   - semantic focus-token resolution
   - More-actions hand-off behavior
   - layout-change continuity for Room/Start Over/Keyboard Shortcuts/Project Info
   - More-actions close-on-desktop behavior

### Acceptance criteria

1. `top-header.types.ts` no longer encodes old dialog prop-bundle surface.
2. Top-header components do not pass legacy forwarder props tied to removed
   store methods.
3. Focus behavior is resolved from semantic access-point tokens.
4. Resize continuity and More close-on-desktop live in coordinator, not store.
5. No top-header tests reference removed snapshot adapter/token naming.

### Validation

1. Run top-header unit tests.
2. Run dialog-focused Playwright coverage for resize/focus return.

## Phase 4: Move Dialog Ownership Back Toward Features

### Goal

Ensure feature-owned dialogs are opened and guarded by owning features while app
shell remains responsible for layout placement and cross-feature composition.

### Runtime changes

1. Open feature-owned dialogs from feature-local code using generic store API.
2. Keep app/chrome responsible for shell placement only.
3. For shell-rendered placements, keep feature-owned host/orchestration next to
   owning feature and render host from shell when needed.
4. Keep `header-more-actions` owned by top-header (shell-specific).
5. Keep Room presentation in `src/features/room-surface/`; shell chooses
   placement but does not own dialog rules.
6. Keep delete/start-over payload derivation in owning features, not in store.
7. Keep app-level controllers only where they coordinate multiple domains.

### Files that must be updated in this phase

1. `src/features/selection/delete-confirmation-dialog.tsx` and caller path
2. `src/features/startup/start-over-confirmation-dialog.tsx` and caller path
3. `src/features/keyboard/keyboard-shortcuts-help.tsx`
4. `src/features/project-info/project-info-dialog.tsx`
5. `src/features/room-surface/room-drawer.tsx`
6. `src/features/room-surface/room-sidebar.tsx`
7. `src/app/chrome/editor-overlay.tsx` for remaining shell-rendered feature
   dialog hosts
8. `src/app/controllers/use-catalog-controller.ts`
9. `src/app/controllers/use-deletion-controller.ts`
10. `src/app/controllers/use-start-over-controller.ts`
11. `src/app/controllers/use-asset-lifecycle-controller.ts`

### Tests in this phase

1. Update feature tests to use new store hooks/actions directly.
2. Remove tests that existed only because app/chrome owned orchestration.
3. Add integration tests where feature-local guard logic is meaningful.

### Acceptance criteria

1. Feature-specific open guards live in feature-owned definition modules.
2. App/chrome no longer owns feature dialog rules.
3. No feature needs `src/app/**` imports to open/inspect its own dialog.
4. Dialog placement decisions are separated from dialog state decisions.
5. Any remaining app controller touching dialogs has explicit multi-domain need.

### Validation

1. Run targeted feature tests for delete/start-over/keyboard/project-info/room.
2. Run `pnpm typecheck`.

## Phase 5: Rewrite Browser And Accessibility Coverage

### Goal

Align browser and accessibility tests with behavioral contracts of the new
model and remove assertions tied to deleted implementation details.

### Test changes

Rewrite or prune tests in:

1. `e2e/editor-dialogs.spec.ts`
2. `e2e/editor-accessibility-flows.spec.ts`
3. `e2e/editor-accessibility.spec.ts`
4. `e2e/editor-a11y-audits.spec.ts`
5. unit/integration tests asserting removed fields/token names/snapshot wiring
6. `src/app/controllers/use-catalog-controller.test.ts`
7. `src/app/controllers/use-deletion-controller.test.ts`
8. `src/app/controllers/use-start-over-controller.test.ts`
9. `src/app/controllers/use-asset-lifecycle-controller.test.ts`

The suite must explicitly cover:

1. one-active-surface invariant
2. Room non-blocking but mutually exclusive behavior
3. opening blocking surface closes Room first
4. mobile More hand-off to Keyboard Shortcuts/Project Info/Start Over
5. focus return from close/confirm flows
6. layout-change continuity for preserved surfaces
7. More close-on-desktop behavior
8. camera preset availability while Room is open
9. inert/focus-order behavior while blocking surfaces are open

Delete tests that only prove removed mechanisms:

1. legacy per-dialog store methods
2. `roomSurfaceLayout` public state
3. layout-specific return-focus token names
4. snapshot-adapter-only behavior

### Acceptance criteria

1. Browser/a11y tests assert product behavior, not removed implementation shape.
2. No surviving test references deleted token names or deleted store APIs.
3. Removed legacy tests are replaced by higher-signal behavior tests or
   intentionally dropped with no behavior loss.

### Validation

1. Run dialog and accessibility Playwright files first.
2. Run `pnpm test:e2e` after focused suite is green.

## Phase 6: Documentation And Final Cleanup

### Goal

Finalize docs and remove dead runtime/test artifacts tied to deleted dialog
semantics.

### Documentation updates required in this phase

Update these files in place:

1. `README.md`
2. `docs/editor-state-architecture.md`
3. `docs/overlay-interaction-model.md`
4. `docs/keyboard-shortcuts.md`
5. `docs/editor-workflow-reference.md`
6. `docs/testing.md`
7. `docs/architecture-boundaries.md`
8. `src/app/README.md`
9. `src/features/README.md`
10. `src/editor-state/README.md`
11. `docs/editor-shortcuts-reference.md` (only if user-facing wording becomes
    inaccurate)

### `docs/editor-state-architecture.md` rewrite requirements

This file exits the refactor as durable architecture guidance, not a phase log.
Keep it as one file; do not split into per-store docs.

Required outcomes:

1. Opening section uses timeless architecture framing (purpose/scope/boundaries).
2. Dialog orchestration has a dedicated top-level section with subsections for:
   - ownership and boundary of dialog-store
   - shared contract types and registry model
   - global gating and feature-specific guards
   - active-surface invariant and blocking/non-blocking semantics
   - payload model and return-focus access points
   - responsive continuity ownership (top-header coordinator, not store)
   - external reads through `DialogRuntimeContext`
   - disallowed writes/seam constraints
3. Other store sections may stay concise, but tone must be architecture reference
   tone (not migration status language).
4. Data-flow section documents current directional flow across scene,
   editor-state, and app shell seams.
5. Include a short "How to use dialog-store" subsection covering:
   - where to register a dialog definition
   - how to open/close/read dialog state
   - where guards/return-focus policy belong
   - what not to put in the store
6. Include a short "What remains by design" subsection listing intentional seams
   outside dialog-store scope.

Required non-goals:

1. Do not fully expand unrelated store sections in this pass.
2. Do not create new standalone dialog architecture docs.
3. Do not retain phase-progress language.

Acceptance checks for this file:

1. No section/paragraph presents architecture as in-progress migration.
2. A reader can implement a new dialog definition without reading
   `src/editor-state/dialog-store.ts` internals.
3. External data sources and boundary constraints are explicit.
4. Organization and tone match canonical architecture reference docs.

### Cleanup changes

1. Delete dead code/comments tied only to:
   - old return-focus token names
   - `syncLayoutMode`
   - `useDialogStateSnapshot`
   - legacy per-dialog store methods
   - stale prop-threading helper wrappers
2. Re-run grep for removed APIs/token names.
3. Do not update `.agents/**` or `AGENTS.md` unless inaccuracies are introduced
   by this refactor.

### Acceptance criteria

1. Docs reflect new dialog architecture and preserved behavior.
2. No docs describe removed dual-state model/per-dialog methods.
3. No dead runtime code/comments/tests remain for removed semantics.
4. App/features/editor-state README files agree on ownership boundaries.

### Validation

1. Run `pnpm lint`.
2. Run `pnpm typecheck`.
3. Run `pnpm test:run`.
4. Run `pnpm test:e2e`.
5. Verify no intended runtime uses remain for:
   - `useDialogStateSnapshot`
   - `syncLayoutMode`
   - `roomSurfaceLayout`
   - `DialogReturnFocusTarget`
   - `openCatalog(`
   - `openInfo(`
   - `openKeyboardShortcuts(`
   - `openHeaderMoreActions(`
   - `openStartOver(`
