## Plan: Rebased Overlay Reorganization

Reorganize the overlay toward a consumer ecommerce 3D-planner layout, but rebase the work to the current branch state: selected-item controls are already extracted into `App.tsx`, source-aware Tab/Shift+Tab hinting is already implemented, and the selected-item focus contract is already encoded in tests. The refactor should therefore preserve the existing selected-item DOM/focus architecture, reposition non-selected overlay surfaces to better match the visual layout and DOM order, add the Environment button/dialog shell in this scope without changing its internal selector content model, and require that desktop changes do not regress current small-screen tab order, focus-return behavior, or accessible DOM order.

**Steps**

1. Phase 0: Freeze the current branch accessibility contract and rebase ownership before any UI moves.
   - Treat the following as hard product behavior that already exists and must not regress:
     - `SelectedItemControls` stays mounted in `App.tsx` after the room view and before `EditorOverlay`
     - room-view-origin selection keeps focus on the room view and announces that `Tab` reaches selected item actions/details
     - room-contents-panel-origin selection keeps focus in the panel and announces that `Shift+Tab` reaches selected item actions/details
     - selection does not auto-focus selected-item actions/details
     - delete from room view follows the room-view focus path; delete from selected-item actions follows the existing non-room-view/outliner path
     - selected-item detail inputs suppress room-view shortcuts while focused
     - opening remove-item from selected-item actions does not blur-commit dirty detail inputs
     - startup overlay and catalog drawer suppress selected-item controls and surrounding shell controls from focus/navigation
   - Rebase the ownership map explicitly to current code:
     - `App.tsx` owns room-view focus, selected-item render order, and delete-origin wiring
     - `use-scene-handlers.ts` owns source-aware selection copy, delete focus-return logic, and typed-details updates
     - `use-scene-sync.ts` owns outliner focus handoff
     - `use-preview-controller.ts` owns preview-source arbitration
     - `selected-item-controls.tsx` owns shared blur-suppression and gating between selected-item actions/details
2. Phase 1: Lock the contract-test set before layout work. _blocks all later phases_
   - Mark the existing blocker suites as contract tests that should not be rewritten to fit regressions:
     - `/home/splict/src/room-layout/src/app/selection/selected-item-controls.test.tsx`
     - `/home/splict/src/room-layout/src/app/selection/selected-item-details.test.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.test.tsx`
     - `/home/splict/src/room-layout/src/app/use-scene-handlers.test.ts`
     - `/home/splict/src/room-layout/src/app/selection/selection-tools-other.test.tsx`
     - `/home/splict/src/room-layout/e2e/editor-accessibility-flows.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-accessibility.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-dialogs.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-hotkeys.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-a11y-audits.spec.ts`
   - Tighten any missing assertions before moving layout, especially for:
     - `Tab` from room view reaching selected-item actions and then details
     - `Shift+Tab` from room-contents-panel-origin selection reaching selected-item controls
     - room-view delete focus return vs. non-room-view delete focus return
     - delete-dialog cancel/confirm focus restoration
     - blur-commit suppression during remove-item dialog open
     - selected-item action labels and `aria-keyshortcuts`
     - shell inert behavior while catalog drawer or startup overlay is active
     - current small-screen keyboard order, focus-return behavior, and accessible DOM order not regressing
3. Phase 2: Define the execution matrix and acceptance criteria. _depends on 1_
   - Build a contract-to-code matrix that includes `App.tsx`, `use-preview-controller.ts`, `use-scene-handlers.ts`, `use-scene-sync.ts`, `selected-item-controls.tsx`, `selected-item-details.tsx`, and `use-keyboard-shortcuts.ts`.
   - Document the DOM-order rule for this refactor:
     - selected-item DOM order in `App.tsx` is already correct and must remain
     - non-selected overlay surfaces inside `EditorOverlay` should be reordered so DOM order tracks visual order as much as practical
     - no separate mobile-only DOM is introduced in this scope
   - Add explicit acceptance criteria for small screens:
     - current small-screen tab order remains usable
     - current focus-return behavior remains correct under the inherited narrow layout
     - accessible DOM order remains coherent even without a separate mobile-specific DOM
     - any mobile-impacting regressions discovered during desktop reorganization must be addressed now or escalated before implementation proceeds
4. Phase 3: Reorganize non-selected overlay regions and DOM order in `editor-overlay.tsx`. _depends on 1-2_
   - Treat this phase as both visual repositioning and DOM-order cleanup for non-selected overlay surfaces.
   - Rebuild `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx` into explicit desktop regions whose DOM order broadly matches their visual order:
     - top-left primary scene-building actions
     - top-center global history/reset actions
     - top-right utility/help/share actions
     - lower-left room contents
     - lower-right placeholder or future inspector zone for non-selected overlays where applicable
     - right-edge viewport controls
   - Keep `SelectedItemControls` outside this work; its App-level DOM slot is already correct.
   - Move `CatalogDrawer` trigger/Add Furniture into the beginning of the non-selected overlay DOM and visual flow so it is early both visually and in keyboard order.
   - Move `HistoryTools` and `NewSceneButton` into the top-center global cluster, with New Scene visually separated from undo/redo so it does not imply reversibility.
   - Keep `CopySceneUrlButton`, `KeyboardShortcutsHelp`, and `ProjectInfoDialog` grouped in the top-right utility cluster.
   - Keep `Outliner` in the lower-left.
   - Keep `CameraTools` on the right edge for now, with future compaction out of scope.
5. Phase 4: Convert Environment from an always-mounted panel into a first-class dialog-driven surface. _depends on 3_
   - Make the implementation decision explicit: default to a dialog, and only switch to a drawer if a documented blocker appears during implementation (for example, unusable content sizing or focus behavior under the inherited small-screen layout).
   - Treat Environment as part of the existing one-active-modal-at-a-time matrix. It should participate in the same mutual-exclusion rules currently enforced by `use-dialog-state.ts` for catalog, delete, info, and new-scene; it should not coexist with another active modal surface.
   - Expand dialog-state plumbing explicitly:
     - update `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.ts` to add Environment modal state/open-close handlers
     - update `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.test.ts` to cover mutual exclusion, guards, and close/open behavior
     - update `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts` and `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.test.ts` to carry Environment dialog props through the overlay prop groups
     - update `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx` and its dialog prop shape to render the new Environment trigger and modal
   - Make the extraction rule explicit:
     - do not reuse `EnvironmentPanel` unchanged inside a dialog
     - extract a dedicated environment form/helper surface from the current `EnvironmentPanel` shell so the wall/floor selector logic and loading behavior can be reused without dragging along the persistent card/collapsible chrome
     - do not preserve the current collapsible card shell or the persisted expanded/collapsed preference inside the modal by default
     - the modal should present the environment form content directly, with the button trigger becoming the new discovery/control surface
   - Preserve the current environment control semantics in this pass:
     - keep the same floor/wall selectors and loading behavior
     - do not switch to swatches/thumbnails or change option semantics
   - Ensure the Environment dialog uses the same modal focus trap, trigger focus return, and shell inert behavior as the other dialogs.
6. Phase 5: Preserve selected-item architecture while visually integrating it with the new layout. _depends on 3-4_
   - Do not plan a new extraction/decoupling effort that has already landed.
   - Keep `SelectedItemControls` in `App.tsx` and preserve its logical DOM order after the room view.
   - Reposition `SelectedItemDetails` visually toward the lower-right inspector area while preserving the existing coordinator wiring in `/home/splict/src/room-layout/src/app/selection/selected-item-controls.tsx` unless a minimal internal split is needed purely for layout.
   - If a small internal refactor is needed, it must be framed as preserve-and-reposition work, not as a new architecture project:
     - keep shared blur-suppression plumbing intact
     - keep `controlsSuppressed` gating intact
     - keep selected-item actions/details relative DOM order intact
     - keep delete-dialog handler routing and focus-return logic intact
7. Phase 6: Reconcile copy, docs, and product wording with the new overlay. _depends on 3-5_
   - Update in-app wording that changes because of region or trigger changes:
     - `/home/splict/src/room-layout/src/app/use-scene-handlers.ts`
     - `/home/splict/src/room-layout/src/App.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.tsx`
   - Update docs so repo guidance stays internally consistent:
     - `/home/splict/src/room-layout/README.md`
     - `/home/splict/src/room-layout/docs/keyboard-shortcuts.md`
     - `/home/splict/src/room-layout/docs/editor-shortcuts-reference.md`
   - Preserve the documented contract that the room contents panel remains the primary accessible DOM representation and the room view remains a focused enhancement, not a replacement.
8. Phase 7: Final contract validation and follow-up boundaries. _depends on 1-6_
   - Re-run the contract suites and compare behavior against the planning docs, not just against updated snapshots/selectors.
   - Any failing contract test should default to being treated as a product regression until the team explicitly decides otherwise.
   - Defer these follow-ups to separate work once the reorganized layout is stable:
     - compact selected-item details redesign
     - floating object-adjacent selected-item actions toolbar
     - environment swatches/thumbnails and richer content
     - camera reset/compaction redesign
     - dedicated mobile-specific layout work if later needed

**Relevant files**

- `/home/splict/src/room-layout/plans/canvas-navigation-plan.md` — hard contract for room-view focus, preview ownership, source-aware selection, and Tab/Shift+Tab guidance.
- `/home/splict/src/room-layout/plans/details-editor-and-tab-flow.md` — hard contract for selected-item DOM order, delete origin/focus behavior, and editable-details interaction rules.
- `/home/splict/src/room-layout/src/App.tsx` — composition root; already owns room-view focus, selected-item DOM order, and distinct delete-origin wiring.
- `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx` — non-selected overlay region reorganization, DOM-order cleanup, and Environment trigger/modal integration.
- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.ts` — modal mutual-exclusion matrix; add Environment here as a first-class participant.
- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.test.ts` — verify Environment modal guards and one-active-modal-at-a-time behavior.
- `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts` — carry Environment dialog props into overlay composition.
- `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.test.ts` — keep grouped prop mapping/reference stability correct after adding Environment dialog props.
- `/home/splict/src/room-layout/src/app/overlay/environment-panel.tsx` — source of current environment shell and selector logic; extract reusable environment form content from here rather than mounting the whole collapsible card inside a dialog.
- `/home/splict/src/room-layout/src/app/selection/selected-item-controls.tsx` — preserve shared blur suppression, shell gating, and selected-item actions/details coordination.
- `/home/splict/src/room-layout/src/app/selection/selected-item-actions.tsx` — selected-item actions surface whose labels/shortcuts remain a live product contract.
- `/home/splict/src/room-layout/src/app/selection/selected-item-details.tsx` — details surface to reposition visually without changing input behavior.
- `/home/splict/src/room-layout/src/app/use-scene-handlers.ts` — source-aware announcements, delete focus-return, and typed-details updates.
- `/home/splict/src/room-layout/src/app/hooks/use-scene-sync.ts` — outliner focus handoff and modal-open suppression.
- `/home/splict/src/room-layout/src/app/use-preview-controller.ts` — preview ownership and arbitration, part of the hard contract matrix.
- `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.ts` — room-view shortcut scoping and input suppression.
- `/home/splict/src/room-layout/src/lib/ui/keyboard-event-target.ts` — shared editing-target detection that protects detail inputs.
- `/home/splict/src/room-layout/src/app/catalog/catalog-drawer.tsx` and `/home/splict/src/room-layout/src/app/catalog/catalog-add-button.tsx` — Add Furniture relocation to the beginning of the flow.
- `/home/splict/src/room-layout/src/app/history/history-tools.tsx` and `/home/splict/src/room-layout/src/app/overlay/new-scene-button.tsx` — top-center history/reset cluster.
- `/home/splict/src/room-layout/src/app/scene-panel/outliner.tsx` — lower-left room contents surface and focus contract participant.
- `/home/splict/src/room-layout/src/app/camera/camera-tools.tsx` — right-edge viewport controls retained in this pass.
- `/home/splict/src/room-layout/src/app/selection/selected-item-controls.test.tsx` — blur suppression and gating contract tests.
- `/home/splict/src/room-layout/src/app/selection/selected-item-details.test.tsx` — detail input contract tests.
- `/home/splict/src/room-layout/src/app/selection/selection-tools-other.test.tsx` — selected-item action label/shortcut contract tests.
- `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.test.tsx` — editing-target shortcut suppression contract tests.
- `/home/splict/src/room-layout/src/app/use-scene-handlers.test.ts` — source-aware hinting and focus-return contract tests.
- `/home/splict/src/room-layout/e2e/editor-hotkeys.spec.ts` — canvas browse, selection hint, and keyboard delete confirmation contract tests.
- `/home/splict/src/room-layout/e2e/editor-accessibility-flows.spec.ts` — Tab/Shift+Tab flow, focus recovery, shell inert behavior, and selected-item order contract tests.
- `/home/splict/src/room-layout/e2e/editor-accessibility.spec.ts` — selected-item details/input accessibility flows.
- `/home/splict/src/room-layout/e2e/editor-dialogs.spec.ts` — dialog focus-return and delete confirmation wording/behavior.
- `/home/splict/src/room-layout/e2e/editor-a11y-audits.spec.ts` — post-refactor accessibility regression audit.
- `/home/splict/src/room-layout/playwright.config.ts` — existing desktop-only Playwright defaults; Phase 4/7 should add at least one narrow-viewport verification path rather than relying only on the default desktop viewport.
- `/home/splict/src/room-layout/README.md` — existing user-facing contract and overlay/accessibility wording that must stay consistent.
- `/home/splict/src/room-layout/docs/keyboard-shortcuts.md` — shortcut wording that may need overlay/location updates.
- `/home/splict/src/room-layout/docs/editor-shortcuts-reference.md` — shortcut/location wording that may need overlay updates.

**Verification**

1. Contract baseline before layout work:
   - `pnpm test:run -- src/app/selection/selected-item-controls.test.tsx`
   - `pnpm test:run -- src/app/selection/selected-item-details.test.tsx`
   - `pnpm test:run -- src/app/selection/selection-tools-other.test.tsx`
   - `pnpm test:run -- src/app/keyboard/use-keyboard-shortcuts.test.tsx`
   - `pnpm test:run -- src/app/use-scene-handlers.test.ts`
2. Browser contract validation before and after each major move:
   - `pnpm exec playwright test e2e/editor-hotkeys.spec.ts`
   - `pnpm exec playwright test e2e/editor-accessibility-flows.spec.ts`
   - `pnpm exec playwright test e2e/editor-accessibility.spec.ts`
   - `pnpm exec playwright test e2e/editor-dialogs.spec.ts`
   - `pnpm exec playwright test e2e/editor-a11y-audits.spec.ts`
3. Add a concrete small-screen regression check instead of relying only on desktop defaults:
   - add or update one focused Playwright scenario under a narrow mobile-ish viewport (for example `390x844`) that verifies overlay DOM/tab order and dialog focus-return behavior for the reorganized top actions plus the new Environment modal trigger
   - minimum assertions for that scenario: Add Furniture remains early in tab order, the Environment trigger opens/closes correctly, focus returns to its trigger, and the inherited narrow-viewport DOM/tab order does not collapse into a contradictory sequence
4. Phase-gated verification:
   - after Phase 3, verify Add Furniture moved earlier visually and in DOM order, while selected-item contract tests pass unchanged
   - after Phase 4, verify Environment trigger opens a dialog, returns focus to its trigger, inerts the underlying shell, and passes the narrow-viewport browser check
   - after Phase 5, verify selected-item details are visually rehomed without changing the existing Tab/Shift+Tab, delete, blur-suppression, and input-shortcut contracts
5. Manual contract checks against the planning docs and current branch behavior:
   - selecting from room view keeps focus on room view and announces the `Tab` hint
   - selecting from room contents keeps focus there and announces the `Shift+Tab` hint
   - `Tab` from room view reaches selected-item actions and then details
   - `Shift+Tab` from room-contents-origin selection reaches selected-item controls without forcing focus jumps on selection
   - opening remove-item from selected-item actions does not blur-commit dirty details
   - room-view delete and selected-item-action delete still return focus along their existing distinct paths
   - Add Furniture is visually and keyboard-order early in the flow
   - the Environment dialog behaves as part of the one-active-modal system
   - small-screen tab order, focus return, and accessible DOM order remain usable without a separate mobile DOM

**Decisions**

- Rebased to current branch state: selected-item extraction/App-level DOM order, source-aware hinting, and much of the selected-item contract are already implemented and should be preserved, not re-architected.
- Phase 3 changes both visual layout and DOM order for non-selected overlay surfaces inside `editor-overlay.tsx`; selected-item DOM order in `App.tsx` remains intact.
- The Environment change in scope is now concrete: convert it to a dialog-triggered modal surface now, with dialog as the default decision. Only switch to drawer if a documented blocker appears during implementation.
- Environment participates in the existing one-active-modal-at-a-time matrix managed by `use-dialog-state.ts`.
- Reuse existing environment configuration means reusing the selector logic and state flow, not reusing the current collapsible card shell or persisted expanded-state UX inside the modal.
- Mobile-specific custom layout work is out of scope, but mobile impact is not ignored: any regression to current small-screen accessibility or tab order is in scope to fix or escalate, and at least one narrow-viewport Playwright check is required.
- Updating tests merely to match an unintended regression is out of bounds; contract tests are blocker tests.
- Included in scope: non-selected overlay reorganization, Add Furniture/history/utility regrouping, Environment dialog-state plumbing plus button/dialog conversion, visual rehoming of selected-item details, docs/readme updates, and contract-test hardening needed to protect existing behavior.
- Excluded from scope: floating selected-item actions toolbar implementation, compact details redesign, Environment content redesign, camera feature redesign, and separate mobile-only DOM/layout architecture.

**Further Considerations**

1. If extracting the environment form content from `EnvironmentPanel` reveals too much shell/form coupling, prefer a narrow helper extraction for the selectors and loading indicators rather than keeping the collapsible card nested inside a dialog.
2. If visually moving selected-item details while preserving its current coordinator proves awkward, prefer a minimal preserve-and-reposition internal refactor over a broader architectural rewrite.
3. After this reorg stabilizes, a separate follow-up can decide whether the outliner should be relabeled consumer-facing as `Items in room` everywhere, but that copy change should not be bundled with the contract-sensitive layout pass unless it becomes necessary for clarity.
