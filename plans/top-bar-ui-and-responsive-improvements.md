## Plan: Top Header Handoff Checklist

Implement the split top-header redesign in five reviewable commits, but make the remaining state contracts explicit before implementation: mobile-only surfaces use first-class dialog keys so they cannot remount as desktop surfaces across the 48rem fork; launch-source-aware focus return is carried in dialog-state metadata and resolved through header-owned refs; the desktop utility cluster keeps Keyboard shortcuts, Project info, and Share inline rather than behind a More menu; and the new mobile tab order is a deliberate contract change, not a test rewrite chasing implementation. The execution should preserve the existing top-overlay accessibility matrix while moving the top controls into purpose-built mobile and desktop header shells.

**Steps**

1. Commit 1: Shared header primitives and layout-mode wiring. _blocks all later commits_
   - Goal: add only the primitives and responsive-mode support required for the new header, with no visible overlay restructure yet.
   - Files to add:
     - `/home/splict/src/room-layout/src/app/overlay/use-header-layout-mode.ts`
     - `/home/splict/src/room-layout/src/app/overlay/use-header-layout-mode.test.ts` if a dedicated hook test is added
   - Files to modify:
     - `/home/splict/src/room-layout/src/components/ui/button-variants.tsx`
     - `/home/splict/src/room-layout/src/components/ui/tool-button.tsx`
     - `/home/splict/src/room-layout/src/components/ui/button-group-variants.tsx` only if required by the Edit-zone segmented treatment
   - Work:
     - add the coarse `matchMedia('(min-width: 48rem)')` layout-mode hook for choosing which header mounts
     - add top-header-specific button sizing such as `toolbar` and `toolbar-icon`
     - extend `ToolButton` from its current limited visible-label API to an explicit label-visibility API without changing existing consumers by default
     - do not use additional JavaScript thresholds for sub-layout label collapse or wrapping; keep those behaviors later in CSS/container queries
   - Done when:
     - no visible overlay layout changes exist yet
     - the new hook reliably reports `mobile` and `desktop`
     - `ToolButton` remains backward-compatible by default
2. Commit 2: Trigger decoupling, dialog-state metadata, and keyboard policy. _depends on 1_
   - Goal: prepare the controls and state wiring needed for actions moving into mobile More and desktop inline utility triggers, while preserving and extending the current exclusivity model.
   - Files to modify:
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.test.tsx`
     - `/home/splict/src/room-layout/src/app/project-info/project-info-dialog.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.ts`
     - `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.test.ts`
     - `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts`
     - `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.test.ts` if props change
     - `/home/splict/src/room-layout/src/App.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.ts`
     - `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.test.tsx`
     - `/home/splict/src/room-layout/src/app/catalog/catalog-add-button.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/share-scene-button.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/new-scene-button.tsx`
     - `/home/splict/src/room-layout/src/app/history/history-tools.tsx`
   - Files to add if the split is clearer that way:
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-dialog.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-trigger.tsx`
   - Work:
     - decouple `KeyboardShortcutsHelp` so the keyboard shortcuts dialog content/state can be launched from an external mobile More action or a dedicated desktop inline trigger rather than only from its built-in trigger
     - keep project info on its existing external-trigger model unless More-launch behavior proves it needs extra abstraction
     - extend `useDialogState.ts` with first-class active-dialog keys for mobile-only surfaces instead of reusing a single generic Environment key:
       - `environment-mobile`
       - `environment-desktop`
       - `more-mobile`
       - existing keys for catalog, delete, keyboard shortcuts, info, new-scene remain intact
     - add dialog-state metadata for focus return, for example a semantic `returnFocusTarget` token such as `mobile-more`, `room-inline`, `keyboard-inline`, `info-inline`
     - make the actual DOM ref ownership live in the header components; `TopHeader` resolves the token to a concrete ref and passes an explicit focus-return callback/ref into launched shells
     - define resize behavior in state now:
       - if the layout mode changes to desktop while `activeDialog` is `environment-mobile` or `more-mobile`, close that mobile-only surface before the desktop header presents any desktop-only shell
       - because mobile and desktop Environment use distinct dialog keys, the desktop dialog must never momentarily mount from a still-open mobile key
     - keep desktop keyboard shortcuts and project info as direct inline triggers instead of introducing a separate desktop overflow surface
     - adapt Share so it no longer hard-codes `hidden sm:inline`; mobile label behavior should later be controlled by the active header layout/CSS
     - rewrite Add Furniture as a stable primary action, removing the hover-expand behavior
   - preserve accessible names such as `Start over` even if the control moves into overflow
   - Done when:
     - keyboard shortcuts can be launched from a mobile More action or a desktop inline trigger
     - project info remains compatible with mobile More launch and desktop inline launch without unnecessary new abstraction
     - the active-dialog shape distinguishes mobile-only surfaces from desktop ones
     - focus return has an explicit ownership mechanism rather than depending on built-in trigger nesting
     - Share label visibility is no longer tied to the global `sm` breakpoint in the component itself
     - Add Furniture no longer expands on hover or focus
3. Commit 3: New mobile and desktop header shells over existing surfaces. _depends on 2_
   - Goal: add the new header components using the existing dialog/content surfaces and updated state wiring, without switching `EditorOverlay` yet.
   - Files to add:
     - `/home/splict/src/room-layout/src/app/overlay/top-header.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/top-header-mobile.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/top-header-desktop.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/header-more-actions-drawer.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/room-drawer.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/room-drawer.test.tsx`
   - Files to modify:
     - `/home/splict/src/room-layout/src/app/overlay/environment-dialog.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/environment-dialog.test.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/environment-panel.tsx` only to continue exporting the existing `RoomControls` cleanly
   - Work:
     - treat Environment as already-extracted content and build a new mobile drawer shell over it while keeping the current dialog shell for desktop
     - mobile header contract:
       - active under `48rem / 768px`
       - DOM/visual order is a single toolbar row: `Add Furniture`, `Undo`, `Redo`, `Share`, `More`
       - `Environment` moves into the More drawer instead of occupying its own inline mobile slot
       - mobile narrow-viewport tab sequence after the room view is now explicitly: `Add Furniture` -> `Undo` -> `Redo` -> `Share` -> `More`
     - More drawer contains `Environment`, `Start Over`, `Keyboard shortcuts`, `Project info`
     - Environment opens as a drawer
     - desktop header contract:
       - active at `48rem / 768px` and above
       - DOM/visual order: Build, Edit, Utilities
       - Build contains `Add Furniture`, `Environment`
       - Edit contains `Undo`, `Redo`, `Start Over`
       - Utilities contain icon-only `Keyboard shortcuts`, icon-only `Project info`, then labeled `Share`
       - no desktop `Room Layout` title or desktop `More` menu is rendered
     - Environment opens as a dialog
     - keep sub-threshold label-collapse and wrapping behavior in CSS/container queries inside each variant rather than in JS
   - Done when:
     - both header variants render independently with the right grouping
     - Environment uses drawer on mobile and dialog on desktop
     - mobile More contents and desktop inline utility controls are correct
     - the mobile tab sequence is explicitly represented in the header DOM order
     - no second extraction of Environment controls was needed because the existing `RoomControls` surface was reused
     - the new mobile drawer shell has focused component-level test coverage
4. Commit 4: EditorOverlay integration while preserving existing top-overlay contracts. _depends on 3_
   - Goal: switch the live overlay to the new header while preserving the current inerting, focus-order, exclusivity, and focus-return behaviors already covered by tests.
   - Files to modify:
     - `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/editor-overlay.test.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts` only if additional state props are required
     - `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.test.ts` only if props change
   - Work:
     - replace the current top `grid` with `TopHeader`
     - mount only one header variant at a time
     - preserve current top-overlay accessibility contracts as first-class requirements:
       - project-actions cluster is inert while the catalog drawer is open
       - dialog exclusivity remains enforced
       - lower overlay regions and camera tools stay in their current DOM positions
       - mobile More joins the existing exclusivity matrix instead of creating a parallel state channel outside it
     - preserve or intentionally update the narrow-viewport tab-order contract to the new explicitly defined mobile sequence
     - ensure More-launched dialogs restore focus to More while inline-launched dialogs keep returning to their own triggers
   - Done when:
     - the old three detached top panels are gone
     - only one header variant is mounted
     - catalog-open inerting still suppresses the appropriate top actions
     - the mobile tab order matches the newly defined contract rather than an accidental implementation detail
     - no duplicate accessible names or duplicate tab stops exist
5. Commit 5: Contract tests, share/restore validation, and docs. _depends on 4_
   - Goal: update the highest-signal existing tests and docs to encode the new contract instead of inventing parallel coverage first.
   - Files to modify:
     - `/home/splict/src/room-layout/src/app/overlay/editor-overlay.test.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/environment-dialog.test.tsx`
     - `/home/splict/src/room-layout/src/app/overlay/room-drawer.test.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.test.tsx`
     - `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.test.tsx`
     - `/home/splict/src/room-layout/e2e/editor-accessibility-flows.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-dialogs.spec.ts`
     - `/home/splict/src/room-layout/e2e/editor-a11y-audits.spec.ts`
     - `/home/splict/src/room-layout/e2e/url-restore.spec.ts`
     - `/home/splict/src/room-layout/docs/keyboard-shortcuts.md`
     - `/home/splict/src/room-layout/docs/editor-shortcuts-reference.md`
     - `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.tsx`
   - Test contract to add or update:
     - extend `editor-overlay.test.tsx` rather than inventing a separate harness where possible
     - extend `environment-dialog.test.tsx` for desktop shell focus return and external-trigger launch behavior
     - add `room-drawer.test.tsx` for mobile shell behavior and More-trigger focus return path
     - extend `keyboard-shortcuts-help.test.tsx` or split it so the decoupled trigger/content path has focused component tests
     - extend `use-keyboard-shortcuts.test.tsx` only where header-trigger changes alter shortcut gating or focus ownership expectations
     - extend `editor-accessibility-flows.spec.ts` for the new mobile narrow-viewport order, Environment focus return, and mobile More-trigger focus return
     - extend `editor-dialogs.spec.ts` for mobile More exclusivity, inline desktop trigger behavior, and dialog return targets launched from mobile More or desktop inline controls
     - extend `editor-a11y-audits.spec.ts` for both header variants and opened states:
       - mobile baseline
       - mobile More drawer open
       - mobile Environment drawer open
       - desktop baseline
       - desktop keyboard shortcuts dialog open
       - desktop Environment dialog open
     - extend `url-restore.spec.ts` because Share and Environment already have browser coverage there
   - Docs/copy updates:
     - update in-app copy in `keyboard-shortcuts-help.tsx` so it no longer implies project info is always a labeled top-level action
     - update external docs mentioning top-action discoverability
   - Done when:
     - existing high-signal tests are updated instead of duplicated
     - component-local coverage exists for the keyboard-help trigger split and new mobile Environment drawer shell
     - mobile More focus return and desktop inline utility-trigger coverage are encoded in focused tests or browser paths
     - share/restore coverage still passes after Share and Environment move within the header
     - docs and in-app copy match the new discoverability model

**Execution checklist**

1. Before coding
   - Confirm the behavioral decisions that this plan now recommends:
     - mobile More participates in global modal gating and uses a first-class `activeDialog` key
     - desktop keeps `Keyboard shortcuts`, `Project info`, and `Share` inline with no separate More surface
     - dialogs launched from mobile More return focus to the More trigger through dialog-state metadata plus header-owned refs
     - mobile-only open surfaces close when crossing to desktop at 48rem

   - Confirm mobile More contents are exactly `Environment`, `Start Over`, `Keyboard shortcuts`, `Project info`.
   - Confirm the desktop utility cluster is exactly `Keyboard shortcuts`, `Project info`, `Share`.
   - Confirm `Share` stays visible on mobile.
   - Confirm the new mobile tab sequence after the room view is: `Add Furniture`, `Undo`, `Redo`, `Share`, `More`.

2. Commit 1 checklist
   - Add `use-header-layout-mode.ts`.
   - Add toolbar sizes to `button-variants.tsx`.
   - Extend `ToolButton` label visibility without breaking existing consumers.
3. Commit 2 checklist
   - Decouple keyboard shortcuts dialog from its trigger.
   - Keep project info on the existing abstraction unless More-launch behavior forces further refactoring.
   - Extend `use-dialog-state.ts` with first-class mobile-only keys and focus-return metadata.
   - Update `use-overlay-props.ts`, `App.tsx`, and keyboard shortcut gating if state ownership changes.
   - Replace legacy Add Furniture behavior.
   - Remove Share’s hard-coded `sm` label hiding from the component.
4. Commit 3 checklist

- Build `TopHeader`, `TopHeaderMobile`, `TopHeaderDesktop`.
- Build `HeaderMoreActionsDrawer`.
- Build mobile `RoomDrawer` shell over the existing controls.
- Keep sub-layout compaction in CSS/container queries, not additional JS thresholds.
- Add focused component tests for the new drawer shell.

5. Commit 4 checklist
   - Swap `EditorOverlay` to `TopHeader`.
   - Verify only one variant is mounted.
   - Verify existing catalog-open inerting still holds for the appropriate top-action cluster.
   - Verify lower overlay and camera DOM positions stay stable.
   - Verify More-launched dialogs return focus to More and inline-launched dialogs return focus to their own triggers.
6. Commit 5 checklist

- Update existing overlay/environment/dialog/browser tests first.
- Extend `url-restore.spec.ts` for share/environment fallout.
- Expand axe audits for both variants and open surfaces.
- Add focused tests for keyboard-help trigger/content split plus mobile More and desktop inline-trigger focus paths.
- Update in-app keyboard help copy and external docs.

7. Final validation checklist
   - Run `pnpm fix`.
   - Run `pnpm lint`.
   - Run `pnpm typecheck`.
   - Run `pnpm test:run`.
   - Run targeted Playwright specs for accessibility flows, dialogs, a11y audits, and url restore.
   - Manually verify compact phone, standard phone, tablet, and desktop behavior, including resize across the 48rem boundary while mobile surfaces are open.

**Relevant files**

- `/home/splict/src/room-layout/src/components/ui/button-variants.tsx` — top-header-specific button sizing.
- `/home/splict/src/room-layout/src/components/ui/tool-button.tsx` — explicit label-visibility control layered over the current API.
- `/home/splict/src/room-layout/src/components/ui/button-group-variants.tsx` — optional Edit-zone segmentation adjustments.
- `/home/splict/src/room-layout/src/app/overlay/use-header-layout-mode.ts` — coarse layout-mode fork at 48rem.
- `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.tsx` — current trigger-owned keyboard help surface and in-app copy that must be decoupled/updated.
- `/home/splict/src/room-layout/src/app/keyboard/keyboard-shortcuts-help.test.tsx` — focused coverage for the trigger/content split.
- `/home/splict/src/room-layout/src/app/project-info/project-info-dialog.tsx` — existing external-trigger dialog surface.
- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.ts` — single active-dialog model extended with mobile-only keys and focus-return metadata.
- `/home/splict/src/room-layout/src/app/overlay/use-dialog-state.test.ts` — exclusivity, resize, and return-target tests to extend.
- `/home/splict/src/room-layout/src/app/overlay/use-overlay-props.ts` — overlay prop wiring for new dialog-state surfaces.
- `/home/splict/src/room-layout/src/App.tsx` — app-level state wiring if new surfaces are added to the state machine.
- `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.ts` — modal gating and global shortcut behavior across the new header surfaces.
- `/home/splict/src/room-layout/src/app/keyboard/use-keyboard-shortcuts.test.tsx` — focused keyboard policy coverage.
- `/home/splict/src/room-layout/src/app/catalog/catalog-add-button.tsx` — stable Add Furniture control.
- `/home/splict/src/room-layout/src/app/overlay/share-scene-button.tsx` — remove global `sm` label hiding and support layout-owned visibility.
- `/home/splict/src/room-layout/src/app/overlay/new-scene-button.tsx` — preserve accessible naming across inline and overflow uses.
- `/home/splict/src/room-layout/src/app/history/history-tools.tsx` — Edit-zone grouping and sizing.
- `/home/splict/src/room-layout/src/app/overlay/environment-panel.tsx` — continues to export the already-existing `RoomControls` surface.
- `/home/splict/src/room-layout/src/app/overlay/environment-dialog.tsx` — desktop Environment shell.
- `/home/splict/src/room-layout/src/app/overlay/environment-dialog.test.tsx` — desktop shell/focus-return coverage.
- `/home/splict/src/room-layout/src/app/overlay/room-drawer.tsx` — mobile Environment shell.
- `/home/splict/src/room-layout/src/app/overlay/room-drawer.test.tsx` — mobile shell/focus-return coverage.
- `/home/splict/src/room-layout/src/app/overlay/top-header.tsx` — single active header coordinator.
- `/home/splict/src/room-layout/src/app/overlay/top-header-mobile.tsx` — mobile header DOM.
- `/home/splict/src/room-layout/src/app/overlay/top-header-desktop.tsx` — desktop header DOM.
- `/home/splict/src/room-layout/src/app/overlay/header-more-actions-drawer.tsx` — mobile More surface.
- `/home/splict/src/room-layout/src/app/overlay/editor-overlay.tsx` — integration point for the new header and existing inerting behavior.
- `/home/splict/src/room-layout/src/app/overlay/editor-overlay.test.tsx` — top-overlay integration assertions.
- `/home/splict/src/room-layout/e2e/editor-accessibility-flows.spec.ts` — mobile/desktop focus flow and narrow-viewport contract.
- `/home/splict/src/room-layout/e2e/editor-dialogs.spec.ts` — exclusivity, mobile More, inline desktop trigger, and focus-return matrix.
- `/home/splict/src/room-layout/e2e/editor-a11y-audits.spec.ts` — baseline and open-surface axe audits.
- `/home/splict/src/room-layout/e2e/url-restore.spec.ts` — share/environment browser coverage already in place.
- `/home/splict/src/room-layout/docs/keyboard-shortcuts.md` — updated discoverability guidance.
- `/home/splict/src/room-layout/docs/editor-shortcuts-reference.md` — updated top-action discoverability guidance.

**Verification**

1. Commit 1 validation.
   - run focused hook/primitive tests if added
2. Commit 2 validation.
   - run `pnpm test:run -- src/app/overlay/use-dialog-state.test.ts`
   - run `pnpm test:run -- src/app/keyboard/keyboard-shortcuts-help.test.tsx`
   - run `pnpm test:run -- src/app/keyboard/use-keyboard-shortcuts.test.tsx`
3. Commit 3 validation.
   - run `pnpm test:run -- src/app/overlay/environment-dialog.test.tsx`
   - run `pnpm test:run -- src/app/overlay/room-drawer.test.tsx`
   - run focused render/integration tests for new header shells if added
4. Commit 4 validation.
   - run `pnpm test:run -- src/app/overlay/editor-overlay.test.tsx`
5. Commit 5 validation.
   - `pnpm exec playwright test e2e/editor-accessibility-flows.spec.ts`
   - `pnpm exec playwright test e2e/editor-dialogs.spec.ts`
   - `pnpm exec playwright test e2e/editor-a11y-audits.spec.ts`
   - `pnpm exec playwright test e2e/url-restore.spec.ts`
6. Final validation.
   - `pnpm fix`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test:run`

**Decisions**

- Use two purpose-built header DOMs, one mobile and one desktop.
- Mount only one header variant at a time.
- Keep the structural fork at `48rem / 768px`.
- Use CSS/container queries inside each variant for fine label/wrapping behavior; do not add extra JS thresholds for 24rem/64rem rules.
- Keep Add Furniture, Undo, Redo, and Share visible in both modes.
- Keep Environment inline on desktop and available from mobile More.
- Put Start Over in mobile More only and keep it inline on desktop.
- Keep Keyboard shortcuts and Project info in mobile More and as inline icon buttons on desktop.
- Treat mobile More as part of the global modal/exclusivity model through a first-class active-dialog key.
- Use direct inline desktop triggers instead of a desktop More surface.
- Dialogs launched from mobile More return focus to the More trigger, while dialogs launched from inline desktop triggers return focus to their own controls.
- Mobile-only open surfaces close on resize across the 48rem fork instead of morphing into desktop surfaces.
- The mobile narrow-viewport tab sequence after the room view becomes: `Add Furniture`, `Undo`, `Redo`, `Share`, `More`.

**Further Considerations**

1. If implementation reveals that the focus-return token system can be simplified to a narrower callback contract without losing clarity, make that simplification only after the behavior is covered by tests.
2. If the mobile More drawer and Environment drawer share a large amount of shell behavior after the contract is stable, factor a shared drawer-shell helper in a narrow cleanup after commit 3.
3. If later review decides Share should move into mobile More on the smallest phones, treat that as a follow-up after the current visible-Share contract lands and is tested.
