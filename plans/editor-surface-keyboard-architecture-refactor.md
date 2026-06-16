# Plan: Editor Surface Keyboard Architecture Refactor

## Objective

Implement a deterministic keyboard and overlay architecture with:

- Canonical selection inspector
- Supplemental floating quick actions on desktop only
- Stable DOM and focus order
- Explicit pane-navigation shortcuts
- Explicit focus-intent state (no persisted selected-source inference)

Canonical source of truth for this refactor: this document.

## Implementation Order and Reading Rules

Use these rules while executing the plan:

1. Phases execute in numeric order from Phase 1 through Phase 5.
2. Steps execute in listed order within each phase unless a phase-local gate explicitly groups steps into one atomic slice.
3. When a phase-local gate marks steps as atomic, they must land together in one implementation slice.
4. Runtime behavior, tests, and docs/help updates for a changed contract land in the same phase slice; do not defer contract updates to a later phase.
5. Per-step `Changes` lists are the primary source of file ownership. Later scope/index sections are secondary references only.

## Implementation Phases

### Phase 1: Keyboard and Focus Foundations

Phase 1 slice gates:

- Steps 1.1, 1.2, and 1.3 are one atomic shortcut-foundation slice.
- Step 1.4 follows after the shortcut-foundation slice is in place.

#### Step 1.1: Add deterministic pane-navigation shortcuts

Changes:

- Update `src/features/keyboard/keyboard-shortcuts.definitions.ts`.
- Add shortcuts:
  - `focus-inspector` -> `Shift+I`
  - `focus-room-view` -> `Shift+R`
  - `focus-outliner` -> `Shift+O`

Requirements:

- All three use `use-keyboard-shortcuts` handler.
- All three appear in keyboard help metadata under a dedicated `Navigation` section.

#### Step 1.2: Extend shortcut dispatcher and gating

Changes:

- Update `src/features/keyboard/use-keyboard-shortcuts.ts`.
- Add callbacks:
  - `onFocusInspector`
  - `onFocusRoomView`
  - `onFocusOutliner`

Requirements:

- Block when `isBlockingOverlayOpen` is true.
- Block when target is input/textarea/select/contenteditable.
- Allow regardless of `roomViewHasFocus` for pane-navigation shortcuts.
- Keep room-view focus requirement for scene-manipulation and camera-motion shortcuts.

#### Step 1.3: Wire pane-navigation behavior in app composition

Changes:

- Update `src/app/App.tsx`.
- Implement handlers:
  - Focus Inspector: focus the first enabled control inside the inspector surface; if no selection, focus outliner and announce `No item selected. Focus moved to Furniture in room.`
  - Focus Room View: focus room-view region; if selection exists, sync canvas browse cursor to the selected item; if no selection exists, do not change current preview state.
  - Focus Outliner: request focus for selected outliner item when `selectedId` exists, else first outliner item when items exist, else outliner container.

Requirements:

- Pass handlers into `useKeyboardShortcuts`.
- Use outliner focus requests (`selectionMetaActions.requestOutlinerFocus`) as the canonical path for Focus Outliner behavior rather than duplicating outliner query/focus logic in `App.tsx`.
- For Focus Room View, use the canvas preview controller path so browse preview state is synchronized through `handleCanvasKeyboardPreviewChange(selectedId)` when selection exists.
- For Focus Outliner, map fallback requests explicitly:
  - `selectedId` present -> `targetSelectedId`
  - no `selectedId` and items present -> `preferredIndex: 0`
  - no items -> `focusContainer: true`

#### Step 1.4: Add shared focus-target helpers

Changes:

- Create/update helper utilities in `src/app/chrome/focusable-controls.ts` for:
  - First actionable inspector control

Requirements:

- Replace ad hoc selector usage with shared helpers where direct focus targeting is still needed.
- Keep outliner item/container targeting in the outliner focus-request flow so focus fallback behavior remains centralized in `Outliner`.
- Inspector focus helpers only search within the docked inspector surface; they do not target floating quick actions or camera tools.

### Phase 2: Surface Layout and Traversal Contract

Phase 2 slice gates:

- Step 2.1 lands with stale Shift+Tab instructional copy removal.
- Step 2.2 lands before Step 2.3.
- Step 2.3 lands with camera-selector/test migration.
- Step 2.4 lands after Steps 2.1 through 2.3.

#### Step 2.1: Remove legacy Shift+Tab rescue behavior

Changes:

- Update `src/features/scene-panel/outliner.tsx` and related wiring.
- Remove Shift+Tab interception that jumps to selected controls.
- Remove `onNavigateBackToSelectionControls` plumbing across overlay/app contracts.

Requirements:

- Enforce natural DOM tab order for outliner -> inspector.
- Remove the Shift+Tab instruction from both sr-only scene guidance and polite selection announcements in the same slice.

#### Step 2.2: Enforce inspector command parity and mobile quick-action policy

Changes:

- Update selection UI components, including:
  - `src/features/selection/selected-details-view.tsx`
  - `src/features/selection/selected-actions-view.tsx`
  - `src/features/selection/selection-tools-other.tsx`
  - Selection placement logic that determines docked/floating site behavior

Requirements:

- Inspector includes rotate left, rotate right, and delete actions.
- Inspector DOM/tab order is:
  - rotate counterclockwise
  - rotate clockwise
  - remove item
  - placement/detail inputs
- Floating quick actions remain supplemental on desktop.
- Floating quick actions mirror only those three actions and do not introduce unique commands, unique state, or unique focus destinations.
- Floating quick-action site does not render on mobile layout mode.
- Mobile policy is enforced by placement/layout contracts (not by CSS-only hiding) so keyboard/focus behavior matches rendered structure.

#### Step 2.3: Move camera tools into shell layout flow

Changes:

- Update `src/app/chrome/editor-overlay.tsx` and related chrome/layout components.

Requirements:

- Remove floating anchor positioning and camera anchor measurement logic.
- Place camera tools in shared shell/rail layout after inspector in tab sequence.
- Update overlay exclusion-rect registration/tests to reflect the new camera tools mount point.
- Update E2E selectors/tests that currently depend on `[data-camera-anchor]`.
- Preserve current non-blocking Room-surface behavior where camera tools remain available while Room is open.

#### Step 2.4: Finalize unified shell DOM order

This order applies to editor interaction surfaces after top-header controls in the global tab sequence. It does not redefine top-header ordering contracts.

Consolidate shell composition to enforce this editor-surface order:

1. Room-view region
2. Outliner
3. Inspector
4. Floating quick actions (desktop only, after inspector)
5. Camera tools

Requirements:

- No tab-index ordering hacks.
- DOM order is canonical focus order for this surface group.
- This refactor does not change top-header keyboard order contracts (`Add Furniture`, `Room`, `Undo`, `Redo`, `More actions`, and other header controls remain governed by their current tests/docs).

### Phase 3: State and Announcement Simplification

Phase 3 slice gates:

- Steps 3.1 and 3.2 are one atomic selected-source-removal slice.
- Step 3.3 lands with assertion-string updates in affected tests.

#### Step 3.1: Remove persisted selection-source infrastructure

Changes:

- Update `src/editor-state/selection-meta-store.ts` and all dependent controllers/effects.
- Remove:
  - `selectedSource` state
  - `setSelectedSource`/selector APIs
  - `notePendingSource` in `SelectionEffectsApi` and all callers
  - Source-specific announce modes that only supported workaround instructions
- Collapse selection announcement modes to the remaining behavior-backed set:
  - `default`
  - `suppress`
  - `added`

Requirements:

- Keep `PanelInteractionSource` only at immediate event boundaries (for example outliner/button event classification) and remove it from persisted store state, selection-effects APIs, and delete-return logic.
- Ensure add/select/move/delete flows continue to produce correct announce/focus outcomes without selected-source persistence.

#### Step 3.2: Make delete return-focus deterministic

Changes:

- Update `src/app/controllers/use-deletion-controller.ts` and selection effects flow.
- Set explicit post-delete focus target at dialog-open time:
  - Room-view initiated delete -> return to room-view
  - Inspector or outliner initiated delete -> return to outliner

Requirements:

- No historical source-tag inference.
- No fallback branch on old source state.
- Dialog-open callers set the return target explicitly:
  - room-view delete shortcut / room-view initiated delete dialog -> `room-view`
  - inspector delete action / outliner-initiated delete dialog -> `outliner`

#### Step 3.3: Harden announcements with fixed templates

Changes:

- Update `src/app/controllers/use-selection-effects-controller.ts`.
- Set polite templates:
  - `{ItemName} selected.`
  - `Selection cleared.`
  - `{ItemName} added to room.`
  - `{ItemName} removed from room.`
  - `No item selected. Focus moved to Furniture in room.`

Requirements:

- Assertive announcements reserved for validation/action failures.
- Remove Shift+Tab instructional suffixes and other legacy workaround instructions.
- There is no selection-announcement copy variant for panel-keyboard vs canvas-keyboard selection after this change.

### Phase 4: Docs, Help, and Test Synchronization

Phase 4 slice gates:

- Apply docs/help/tests updates incrementally with each runtime contract change; do not defer all updates to the end.

#### Step 4.1: Update user-facing keyboard help and in-app guidance

Changes:

- Update:
  - `src/features/keyboard/keyboard-shortcuts-help.tsx`
  - `src/features/keyboard/keyboard-shortcuts-help.test.tsx`
  - `docs/editor-shortcuts-reference.md`
  - `src/app/App.tsx` sr-only scene instructions

Requirements:

- Navigation section includes `Shift+I`, `Shift+R`, `Shift+O`.
- Dialog/help copy matches actual gating and scope behavior.
- No stale Shift+Tab guidance.
- In-app guidance explicitly states pane-navigation shortcuts and room-view scoping without describing any removed rescue traversal.

#### Step 4.2: Update contributor and architecture docs

Changes:

- Update:
  - `docs/keyboard-shortcuts.md`
  - `docs/overlay-interaction-model.md`
  - `docs/editor-workflow-reference.md`
  - `docs/testing.md`
  - `docs/architecture-boundaries.md`
  - `docs/selected-toolbar-placement.md`

Requirements:

- Reflect room-view scoping policy and pane-navigation policy.
- Reflect finalized state ownership seams:
  - Surface/layout state
  - Interaction state
  - Domain state
- Reflect desktop-only supplemental quick-action positioning policy.
- Ensure every code path reference in docs resolves to an existing file path in the current repository layout.

#### Step 4.3: Migrate and expand test contracts

Changes:

- Unit/integration updates:
  - `src/features/keyboard/use-keyboard-shortcuts.test.tsx`
  - `src/features/keyboard/keyboard-shortcuts-help.test.tsx`
  - `src/features/scene-panel/outliner.test.tsx`
  - `src/app/chrome/editor-overlay.test.tsx`
  - `src/features/camera/camera-tools.test.tsx`
  - `src/features/selection/selected-actions-view.test.tsx`
  - `src/features/selection/docked-selected-item-site.test.tsx`
  - `src/features/selection/selected-item-placement-context.test.tsx`
  - `src/app/controllers/use-canvas-keyboard-controller.test.ts`
  - `src/app/controllers/use-preview-controller.test.ts`
  - `src/app/controllers/use-movement-controller.test.ts`
  - `src/app/controllers/use-selection-effects-controller.test.ts`
  - `src/app/controllers/use-deletion-controller.test.ts`
  - `src/app/controllers/use-selection-controller.test.ts`
  - `src/app/controllers/use-catalog-controller.test.ts`
  - `src/app/controllers/use-history-controller.test.ts`
  - `src/app/controllers/use-start-over-controller.test.ts`
  - `src/app/controllers/use-asset-lifecycle-controller.test.ts`
  - `src/editor-state/selection-meta-store.test.ts`
  - `src/shared/layout/use-overlay-exclusion-rects.test.ts`
- E2E updates:
  - `e2e/editor-hotkeys.spec.ts` for `Shift+I`, `Shift+R`, `Shift+O`
  - `e2e/editor-accessibility-flows.spec.ts` for natural traversal contract
  - `e2e/editor-accessibility.spec.ts` for non-canvas keyboard flow updates
  - `e2e/editor-a11y-audits.spec.ts` for semantic/announcement regressions
  - `e2e/editor-dialogs.spec.ts` for camera-tools availability and selector updates after camera relocation
  - `e2e/selected-toolbar-placement.spec.ts` for desktop floating-toolbar placement invariants
  - `e2e/perf/selected-camera-nudge.perf.spec.ts` for selected-toolbar stability/perf regressions

### Phase 5: Cleanup

Phase 5 slice gate:

- Phase 5 runs last and is behaviorally no-op (dead code/reference cleanup only).

#### Step 5.1: Remove dead code and stale references

Changes:

- Delete obsolete logic tied to:
  - Shift+Tab outliner rescue behavior
  - Persisted selected-source inference
  - Mobile floating quick-actions
  - Camera floating-anchor measurement logic
  - Unused token field on `SceneOutlinerFocusRequest`
- Cleanup locations:
  - Runtime code
  - Tests
  - Docs
  - Comments and migration notes
  - `src/editor-state/types/scene-panel.types.ts` — remove token field from SceneOutlinerFocusRequest
  - `src/app/App.tsx`, `src/app/controllers/use-selection-effects-controller.ts` — remove token assignment at request creation sites
  - `src/editor-state/selection-meta-store.test.ts`, `src/features/scene-panel/outliner.test.tsx` — remove token from test request constructors

## Secondary Scope Index

This index is a secondary reference for cross-phase or easy-to-miss files. Use the relevant step above as the primary source of truth.

### Cross-Phase Runtime and Support Files

- `src/app/chrome/focusable-controls.ts`
- `src/app/chrome/selection-placement-engine-provider.tsx`
- `src/features/selection/use-compute-selected-item-placement.ts`
- `src/features/selection/selected-item-placement.types.ts`
- `src/shared/layout/use-overlay-exclusion-rects.ts`
- `src/features/camera/camera-tools.tsx`
- `src/app/controllers/use-canvas-keyboard-controller.ts`
- `src/app/controllers/use-preview-controller.ts`
- `src/app/controllers/_shared/selection-effects.types.ts`

### Cross-Phase Verification and Regression Files

- `src/features/camera/camera-tools.test.tsx`
- `src/features/selection/selected-actions-view.test.tsx`
- `src/app/controllers/use-movement-controller.test.ts`
- `src/features/selection/selected-item-placement-context.test.tsx`
- `src/shared/layout/use-overlay-exclusion-rects.test.ts`
- `e2e/editor-dialogs.spec.ts`
- `e2e/selected-toolbar-placement.spec.ts`
- `e2e/perf/selected-camera-nudge.perf.spec.ts`

## Verification Plan

1. Approve keyboard interaction matrix:
   - Room view
   - Outliner
   - Inspector
   - Quick actions
   - Pane-navigation round-trips
   - Desktop and mobile
2. Run `pnpm test:run` after each phase slice.
3. Run `pnpm test:e2e` with explicit checks for:
   - `Shift+I`, `Shift+R`, `Shift+O`
   - Natural tab order
   - Room-view shortcut scoping
   - No mobile floating quick-actions
4. Run targeted suites:
   - `e2e/editor-hotkeys.spec.ts`
   - `e2e/editor-accessibility-flows.spec.ts`
   - `e2e/editor-accessibility.spec.ts`
   - `e2e/editor-a11y-audits.spec.ts`
   - `e2e/editor-dialogs.spec.ts`
   - `e2e/selected-toolbar-placement.spec.ts`
   - `e2e/perf/selected-camera-nudge.perf.spec.ts`
5. Phase-scoped minimum validation:
   - Phase 1: `use-keyboard-shortcuts.test.tsx`, `keyboard-shortcuts-help.test.tsx`, `use-canvas-keyboard-controller.test.ts`, `use-preview-controller.test.ts`, `e2e/editor-hotkeys.spec.ts`
   - Phase 2: `outliner.test.tsx`, `editor-overlay.test.tsx`, `camera-tools.test.tsx`, `selected-actions-view.test.tsx`, `docked-selected-item-site.test.tsx`, `selected-item-placement-context.test.tsx`, `use-overlay-exclusion-rects.test.ts`, `e2e/editor-accessibility-flows.spec.ts`, `e2e/editor-dialogs.spec.ts`, `e2e/selected-toolbar-placement.spec.ts`, `e2e/perf/selected-camera-nudge.perf.spec.ts`
   - Phase 3: `selection-meta-store.test.ts`, `use-movement-controller.test.ts`, `use-selection-effects-controller.test.ts`, `use-deletion-controller.test.ts`, `use-selection-controller.test.ts`, `use-catalog-controller.test.ts`, `use-history-controller.test.ts`, `use-start-over-controller.test.ts`, `use-asset-lifecycle-controller.test.ts`
   - Phase 4 and Phase 5: rerun the full targeted suite list above after doc/help cleanup and dead-code cleanup
6. Run formatting/autofix first:
   - `pnpm fix`
7. Run static validation on fixed output:
   - `pnpm lint`
   - `pnpm typecheck`
8. Re-run impacted automated checks after fix/lint/typecheck:
   - `pnpm test:run`
   - rerun the explicit targeted suites listed above that match the touched phase slice
9. Manual desktop and mobile-width keyboard pass:
   - Outliner retains focus after keyboard selection
   - Next Tab reaches inspector naturally
   - `Shift+R` returns to room view and syncs browse cursor when selected
   - Keyboard shortcuts dialog and sr-only instructions match docs
10. Manual screen-reader smoke pass:
    - Predictable focus movement
    - Fixed announcement templates
    - No stale Shift+Tab instructional text

## Locked Decisions

- Canonical selected-item editing is in inspector.
- Floating quick actions are supplemental desktop affordances only.
- Mobile does not render floating quick-action toolbar when inspector parity exists.
- Camera tools are integrated into shell/rail layout, not floating anchored controls.
- Pane-navigation shortcuts are fixed to `Shift+I` (Inspector), `Shift+R` (Room View), and `Shift+O` (Outliner).
- Scene-manipulation and camera-motion shortcuts remain room-view-focus scoped.
- Selection source persistence is removed.
- Explicit focus intents drive return behavior.
- User help, docs, and tests are in scope and must stay synchronized.

## Final Behavior Contract

1. Outliner keyboard selection retains focus in outliner.
2. Next Tab from outliner naturally reaches inspector.
3. Focus Inspector with no selection redirects to outliner and announces guidance.
4. Focus Room View restores room-view focus and syncs browse cursor to selected item when selection exists.
5. Delete return-focus is explicit by initiator context and never inferred from historical source tags.
6. Legacy Shift+Tab rescue behavior and related instructional copy are fully removed.
