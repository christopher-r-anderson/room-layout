# Plan A: Selected Item Controls and Editable Details

## Goal

Turn the current selection-specific UI into a consumer-facing selected-item workflow that fits the existing app architecture:

- remove the always-present top-bar selection controls,
- replace the read-only inspector with editable selected-item details,
- keep the visible room-contents list as the primary DOM accessibility surface,
- preserve the room-view keyboard model introduced in the canvas-navigation work,
- make typed edits respect the same bounds and collision rules as direct manipulation.

This pass is about semantics, focus order, validation, and shared command flow. It does not include a floating object-anchored toolbar.

## Current Codebase Map

### App shell and DOM order

- `src/App.tsx` renders the focusable room-view `<section>` first, then `EditorOverlay`.
- Because `EditorOverlay` renders after the room view, everything inside it is already after the room view in DOM order.
- The current overlay order is not suitable for the desired tab flow because `EditorOverlay` renders camera tools first, then the top action row and title/actions block, then the left-column panels.

### Current selected-item UI

- `src/app/selection/selection-tools-movement.tsx` renders the move up/down/left/right toolbar.
- `src/app/selection/selection-tools-other.tsx` renders the rotate/delete toolbar with `aria-label="Selection Other Actions"`.
- `src/app/scene-panel/inspector.tsx` is the current always-mounted, read-only details card.
- `src/app/overlay/editor-overlay.tsx` mounts all three surfaces inside the overlay, regardless of whether anything is selected.

### Selection and focus state

- The canonical scene selection lives in `SceneReadModel.selectedId` from `src/scene/scene.types.ts`.
- App-shell selection metadata lives in `src/app/overlay/use-overlay-state.ts` as `selectedSource` plus the derived `selectedFurniture` lookup.
- Selection-source tracking already uses `InteractionSource` from `src/app/scene-interaction.types.ts`, which already includes `'toolbar'` and `'inspector'`.
- Outliner focus handoff is owned by `src/app/hooks/use-scene-sync.ts`.
- Delete-confirm focus return is currently managed in `src/app/use-scene-handlers.ts` through `pendingDeleteFocusTargetRef`, which only distinguishes `'room-view'` and `'outliner'`.

### Command and validation path

- App-level command dispatch is centralized in `src/app/hooks/use-scene-commands.ts`.
- App-level orchestration, announcements, and focus behavior are centralized in `src/app/use-scene-handlers.ts`.
- Scene mutations cross the boundary through `SceneRef` in `src/scene/scene.types.ts` and are implemented in `src/scene/internal/use-scene-imperative-api.ts`.
- Movement validation currently uses `resolveMovedFurniturePosition` in `src/lib/three/furniture-layout.ts`.
- Rotation validation currently uses `resolveRotatedFurnitureTransform` in `src/lib/three/furniture-layout.ts` and `rotateSelectedFurnitureInHistory` in `src/scene/internal/furniture-operations.ts`.
- The current move path includes edge snapping. That is appropriate for drag and keyboard nudge behavior, but not ideal for typed precision edits.

### Keyboard scoping

- Room-view shortcuts are defined in `src/app/keyboard/use-keyboard-shortcuts.ts`.
- Text-input and dialog suppression comes from `src/lib/ui/keyboard-event-target.ts`.
- The current architecture already suppresses room-view shortcuts when focus leaves the room view, and also avoids matching most shortcuts inside text inputs.

### Documentation and copy surfaces that will need updates

- `README.md`
- `docs/keyboard-shortcuts.md`
- `docs/editor-shortcuts-reference.md`
- `src/app/keyboard/keyboard-shortcuts-help.tsx`
- `src/App.tsx` screen-reader instructions
- `src/app/use-scene-handlers.ts` canvas-selection announcement copy

## Product Decisions for This Codebase

### Keep the visible room-contents panel

The current `Outliner` in `src/app/scene-panel/outliner.tsx` remains the primary DOM representation of placed furniture. This pass should not introduce a hidden duplicate scene graph or move selection management into canvas-only controls.

In user-facing docs, test titles, and browser assertions, prefer the shipped UI wording such as `Furniture in room` or `room-contents panel`. Keep `Outliner` as the internal code name.

### Move selected-item controls out of `EditorOverlay`

To get the desired keyboard order, the selected-item controls should not remain inside the current overlay toolbar or left-column stack.

The implementation should render a new `SelectedItemControls` block directly in `src/App.tsx` after the room-view `<section>` and before `EditorOverlay`. That gives the correct logical order:

1. room view
2. selected item actions, when selected
3. selected item details, when selected
4. remaining overlay controls such as camera tools, history, outliner, and environment

This keeps `App.tsx` as orchestration only while making tab order explicit and testable.

### Resolve the outliner-origin tab tradeoff explicitly

Moving selected-item controls ahead of `EditorOverlay` optimizes the room-view path, but it also means those controls sit earlier in DOM order than the outliner.

For this pass, preserve the current rule that outliner-origin selection keeps focus in the outliner. The consequence should be documented explicitly:

- room-view-origin selection reaches selected-item controls with forward `Tab`
- outliner-origin selection keeps focus in the outliner and reaches selected-item controls via `Shift+Tab`, not forward `Tab`

That is an acceptable tradeoff for this pass because it preserves source-aware focus behavior without adding surprise focus jumps or moving the selected-item controls back behind the overlay.

### Replace, do not extend, the old selection toolbar layout

The move button toolbar should be removed from the UI entirely. The current movement behavior remains available through:

- room-view arrow-key shortcuts,
- future typed absolute edits in the details panel.

The rotate/delete toolbar should be reworked into a selected-item-only surface rather than kept as a permanently mounted disabled toolbar.

### Use consumer-facing labels, but do not invent wall semantics

The current scene model exposes `position[0]` and `position[2]` in meters, and the codebase does not have a product-facing wall-name contract.

For this pass, the editable fields should use safe, consumer-readable labels tied to the actual data model:

- `Left/right position (m)` for X
- `Front/back position (m)` for Z
- `Rotation (deg)` for rotation

Do not relabel these as “distance from left wall” or “distance from back wall” until the app has a stable wall-orientation contract in the UI and docs.

### Keep legacy source identifiers in this pass

The shared interaction types already include `'inspector'` in both:

- `src/app/scene-interaction.types.ts`
- `src/scene/scene.types.ts`

Typed details commits should keep using that existing identifier in this pass. Renaming the shared source contracts to match newer UI copy would create broader churn across command tests and app-state plumbing without improving the shipped behavior.

### Typed position edits should be precise, not snap-oriented

Keyboard nudges and drag should keep the current edge-snapping behavior.

Typed details edits should use the same bounds and collision rules but should not silently wall-snap a valid numeric entry to a nearby edge. A precision field that changes `1.95` to `2.0` because of drag-oriented snap logic will feel wrong in a consumer details editor.

That means this pass should add an explicit absolute-transform validation path rather than routing typed edits through `moveSelection()`.

### Keep delete confirmation, but use consumer copy

The existing `DeleteConfirmationDialog` should stay, but the visible copy should be updated from scene-editor wording to consumer wording, for example:

- title: `Remove item from room?`
- description: `Remove Sofa from your room layout?`
- confirm button: `Remove item`

The file can stay named `delete-confirmation-dialog.tsx`; this pass only needs to update the surfaced copy and behavior.

## Target End State

When no item is selected:

- `SelectedItemControls` is not rendered.
- `SelectionToolsMovement` is not rendered anywhere.
- `SelectionToolsOther` is not rendered in its old always-on form.
- The outliner and other editor controls remain available.

When an item is selected:

- A selected-item actions section appears after the room view in DOM order.
- An editable item-details section appears immediately after the actions section.
- Focus stays where the selection originated; selection does not auto-jump focus into the new controls.
- `Tab` from the focused room view reaches the selected-item actions first, then the editable details fields.
- Inputs commit on `Enter` and blur, cancel the local draft on `Escape`, and do not trigger room-view shortcuts.
- Invalid typed changes do not mutate scene state.

## Concrete Component Plan

### 1. Introduce a dedicated selected-item controls feature folder

Create or repurpose components under `src/app/selection/`:

- `selected-item-controls.tsx` as the wrapper
- `selected-item-actions.tsx` for rotate/remove controls
- `selected-item-details.tsx` for editable fields

Do not keep the editable details implementation in `src/app/scene-panel/inspector.tsx`. That file is currently a passive scene-panel card; this feature is selected-item controls and belongs with the other selection surfaces.

### 2. Remove the old top-bar movement surface

Delete the `SelectionToolsMovement` usage from `src/app/overlay/editor-overlay.tsx`.

If nothing else uses it after the rewrite, remove:

- `src/app/selection/selection-tools-movement.tsx`
- `src/app/selection/selection-tools-movement.test.tsx`
- `src/app/selection/selection-tools-other.test.tsx`

### 3. Rework rotate/delete into selected-item actions

`selection-tools-other.tsx` can either be renamed or replaced. The important outcome is:

- render only when `selectedFurniture` is not `null`
- label the section `Selected item actions`
- keep button order as rotate counterclockwise, rotate clockwise, remove item
- use consumer-visible labels
- keep `ToolButton` and `ButtonGroup` if that remains the cleanest reuse path

The current rotate wiring already goes through `handlers.handleRotateSelection()` and ultimately `useSceneCommands().rotateSelection()`. That shared path should remain.

### 4. Replace the read-only inspector with editable details

Replace the current `Inspector` behavior with a new selected-item-details surface that:

- only mounts when `selectedFurniture` exists
- shows current X, Z, and rotation values as editable strings
- keeps local draft state per field
- surfaces inline validation errors near each field

Because `src/components/ui/` does not currently contain `input.tsx` or `label.tsx`, this pass should explicitly account for one of these options:

1. Add `src/components/ui/input.tsx` and `src/components/ui/label.tsx` from the project’s shadcn setup and use them here.
2. Build a minimal local field row in `selected-item-details.tsx` using native `<label>` and `<input>` if adding shared primitives would create unnecessary churn.

The first option is preferable if the generated primitives match the rest of the repo cleanly. Do not introduce a heavier form abstraction than this feature needs.

## Scene and Command Architecture Changes

### Add an explicit absolute transform command

The current `SceneRef` API does not expose a command for “set the selected item to this exact position/rotation if valid.” That is the core missing capability for editable details.

Add a new scene command on `SceneRef` in `src/scene/scene.types.ts`, for example:

```ts
setSelectionTransform: (input: {
  position?: [number, number, number]
  rotationY?: number
}) => UpdateSelectionTransformResult
```

The exact name can differ, but it should represent an absolute transform commit rather than a delta move.

### Add a structured result type

This new command should return a structured result rather than a boolean so the app layer can map failures to field-level errors and announcements.

Recommended result shape:

```ts
type UpdateSelectionTransformResult =
  | { ok: true; item: FurnitureItem }
  | {
      ok: false
      reason: 'no-selection' | 'blocked-bounds' | 'blocked-collision' | 'no-op'
    }
```

Returning the updated item on success makes announcement formatting and draft normalization easier in `use-scene-handlers.ts`.

### Add the smallest geometry helper that enables absolute commits

Do not duplicate collision and bounds logic inside the React component or inside `use-scene-handlers.ts`.

Instead, add the smallest new absolute-transform helper needed in `src/lib/three/furniture-layout.ts` and keep `resolveMovedFurniturePosition` as the snap-aware helper for drag and keyboard movement.

If extracting common clamp-plus-overlap logic from `resolveRotatedFurnitureTransform` meaningfully reduces duplication, do that. If not, prefer the narrower change that only adds the new absolute-commit path.

The required behavior split is:

- snap-aware relative movement for drag and keyboard
- exact typed absolute edits for details inputs

### Implement the scene command in `use-scene-imperative-api`

In `src/scene/internal/use-scene-imperative-api.ts`:

- read the active selected item from `selectedIdRef`
- build the proposed absolute transform from the input
- validate through the new helper in `src/lib/three/furniture-layout.ts`
- commit the new present-state entry through the existing history utilities
- preserve the selected item ID

This command should create a real history entry on success, just like existing move and rotate commands.

### Surface the command through `useSceneCommands`

Extend `src/app/hooks/use-scene-commands.ts` with the new command so app code continues to use one command slice rather than reaching into `sceneRef.current` ad hoc.

This is also the right place to keep the `editorInteractionsEnabled` guard consistent with the rest of the command API.

## Handler and Announcement Plan

### Add a dedicated details-commit handler in `useSceneHandlers`

`src/app/use-scene-handlers.ts` should own the app behavior for typed edits, not the component.

Add a handler along the lines of:

```ts
handleUpdateSelectedItemDetails(...)
```

Responsibilities:

- clear any stale editor message before a commit attempt
- call the new scene command through `commands`
- sync the read model on success
- set `selectedSource` to `'inspector'` on successful details commits
- announce success through `announcePolite`
- map failure reasons to field-friendly messages

### Reuse the existing movement failure wording where it still fits

`use-scene-handlers.ts` already has `formatMoveBlockedMessage()` for bounds and collision failure announcements. Reuse or extract that mapping instead of inventing a second wording table.

For field-level details errors, the component can prefix the field name while reusing the shared reason mapping, for example:

- `Left/right position must stay inside the room.`
- `Front/back position overlaps another item.`

The exact copy can be refined in implementation, but the reason mapping should stay centralized.

### Update selection announcements to match the new tab path

The current canvas-keyboard selection announcement in `handleSelectById()` says:

- `Press Tab to reach item controls in the Furniture List.`

That will be wrong once selected-item controls move out of the outliner column. Update it to reference the new selected-item controls, for example:

- `Press Tab to reach selected item actions and details.`

### Preserve the current non-room-view delete focus model

The current codebase already distinguishes room-view delete from non-room-view delete in `src/app/use-scene-handlers.ts`, and the current browser contract expects successful non-room-view delete to return focus to the outliner.

This pass should preserve that behavior unless a separate product decision explicitly changes it.

This is a repo-specific focus contract for this pass, not a general rule that every selected-item toolbar delete should always return focus to the room-contents panel forever.

Recommended implementation order:

1. Reuse `handleOpenDeleteDialog()` from selected-item controls so successful delete follows the current non-room-view focus path.
2. Verify that cancel returns focus to the invoking button or input through the existing alert-dialog focus restore.
3. Only add a more complex explicit return-focus ref if cancel behavior is not stable in tests.

That keeps the visible room-contents list as the primary post-delete DOM surface while avoiding unnecessary focus-model churn in the same pass.

Docs and tests for this pass should distinguish the two delete flows clearly:

- `Delete` from the focused 3D room view follows the room-view focus path.
- `Remove item` from selected-item actions follows the existing non-room-view room-contents-panel focus path.

## Details Editor Behavior

### Field model

The details panel should edit three fields derived from `selectedFurniture`:

- X position in meters
- Z position in meters
- rotation in degrees

Display formatting should be stable and consumer readable:

- meters with a fixed decimal precision, matching the current inspector’s `toFixed(1)` convention unless a stronger reason emerges during implementation
- degrees as a normalized whole number or a short decimal string

### Draft state and commit behavior

Each field should keep a local string draft so users can type intermediate states such as:

- empty string
- `-`
- `1.`

Commit rules:

- `Enter`: attempt commit
- blur: attempt commit
- `Escape`: restore the last committed field value and clear the local error

Invalid drafts should remain visible after a failed commit so the user can correct them in place.

Blur-triggered commit should be guarded so it does not apply a stale draft after the selected item changes or while the remove confirmation flow is opening.

### Parsing and normalization

- Parse position fields as meters directly.
- Parse rotation as degrees in the UI and convert to radians before scene commit.
- Normalize rotation for display after a successful commit.

Use a consistent display range for rotation. Prefer `0` to `359` degrees in the UI even if the internal radian value wraps differently.

### Error presentation

Each field should have:

- inline error text
- `aria-invalid` when invalid
- `aria-describedby` pointing to help or error text

Do not announce on every keystroke. Announce only when a commit succeeds or fails.

Treat `no-op` commits as low-noise. A parsed value that resolves to the current committed transform should clear local draft/error state without surfacing a loud error or success announcement.

## Keyboard and Focus Integration

### Preserve the current room-view scoping model

The plan should rely on the existing keyboard architecture, not replace it.

Important current behavior that must remain true:

- room-view shortcuts in `use-keyboard-shortcuts.ts` require `roomViewHasFocus`
- text-input-like targets are filtered by `keyboard-event-target.ts`
- dialogs suppress room-view shortcuts

### Practical consequence for the new details inputs

Once focus leaves the room view and enters the selected-item controls:

- room-view movement, rotate, delete, and camera shortcuts should no longer fire because `roomViewHasFocus` becomes false
- text-entry targets also remain protected by the existing input-target checks

This means the main work here is verification and a small amount of component-level key handling for `Escape`, not a wholesale keyboard-architecture change.

### DOM order requirement

The selected-item controls must be rendered between the room-view section and `EditorOverlay` in `src/App.tsx`.

Do not leave them inside `EditorOverlay` and attempt to fix focus order with `tabIndex` tricks. The DOM should express the intended order directly.

## Concrete File-Level Plan

### Phase 1: Create the new selected-item controls surface

Files:

- `src/app/selection/selected-item-controls.tsx`
- `src/app/selection/selected-item-actions.tsx`
- `src/app/selection/selected-item-details.tsx`
- `src/App.tsx`
- `src/app/overlay/use-overlay-props.ts`
- `src/app/overlay/use-overlay-props.test.ts`

Implementation:

- render `SelectedItemControls` only when `overlayState.selectedFurniture` exists
- mount it immediately after the room-view `<section>`
- pass selection handlers from `useSceneHandlers`
- keep `EditorOverlay` responsible for the rest of the overlay chrome
- trim obsolete selection-only props from the overlay prop-group contract once the controls move out of `EditorOverlay`
- pass the startup-overlay and catalog-drawer-open gating state needed to keep the new controls out of the focus order when the shell is intentionally inerted

### Startup and drawer gating requirement

The new selected-item controls should inherit the same focus suppression expectations as the rest of the non-scene shell.

At minimum:

- when the startup overlay is active, the selected-item controls must not be reachable or exposed as active interactive content
- when the catalog drawer is open, the selected-item controls must follow the same non-drawer accessibility and focus-suppression rules as the surrounding shell

If the implementation uses `inert` and `aria-hidden` to mirror the current overlay behavior, keep that behavior explicit and testable rather than relying on incidental visual overlap.

### Phase 2: Remove the old selection-only toolbar and inspector wiring

Files:

- `src/app/overlay/editor-overlay.tsx`
- `src/app/overlay/use-overlay-props.ts`
- `src/app/overlay/use-overlay-props.test.ts`
- `src/app/selection/selection-tools-movement.tsx`
- `src/app/selection/selection-tools-other.tsx`
- `src/app/selection/selection-tools-other.test.tsx`
- `src/app/scene-panel/inspector.tsx`
- `src/app/scene-panel/inspector.test.tsx`

Implementation:

- remove `SelectionToolsMovement` from `EditorOverlay`
- remove the old always-on `SelectionToolsOther` placement from `EditorOverlay`
- remove the old `Inspector` placement from `EditorOverlay`
- delete or repurpose the old files and tests so the feature no longer exists in two locations

### Phase 3: Add absolute selected-item transform commits

Files:

- `src/lib/three/furniture-layout.ts`
- `src/lib/three/furniture-layout.test.ts`
- `src/scene/scene.types.ts`
- `src/scene/internal/use-scene-imperative-api.ts`
- `src/scene/internal/use-scene-imperative-api.test.ts`
- `src/app/hooks/use-scene-commands.ts`
- `src/app/hooks/use-scene-commands.test.ts`

Implementation:

- add a shared absolute-transform resolution helper without edge snapping
- add a new `SceneRef` command for selected-item transform commits
- expose that command through `useSceneCommands`
- cover success, bounds rejection, collision rejection, and no-selection behavior in unit tests

### Phase 4: Add app-level handlers for details commits and updated delete origin

Files:

- `src/app/use-scene-handlers.ts`
- `src/app/use-scene-handlers.test.ts`

Implementation:

- add a handler for details commits
- keep success and error announcements centralized here
- update selection-source tracking for `'inspector'`
- preserve the existing non-room-view delete focus behavior for selected-item controls unless a separate UX decision changes it
- update the Tab hint announcement text for canvas-keyboard selection

### Phase 5: Finish keyboard help, instructions, and docs

Files:

- `src/App.tsx`
- `src/app/keyboard/keyboard-shortcuts-help.tsx`
- `README.md`
- `docs/keyboard-shortcuts.md`
- `docs/editor-shortcuts-reference.md`

Implementation:

- update the room-view instructions string to mention selected-item actions/details instead of a generic selected-item panel
- update keyboard help copy to use consumer-facing rotate/remove labels
- document that selected-item controls only appear when an item is selected
- document that typed details edits commit on Enter or blur and cancel on Escape
- rename stale inspector/selected-item-panel wording in app copy and browser-test expectations that still reference the old surface

## Test Plan

### Unit tests

Add or update:

- `src/lib/three/furniture-layout.test.ts`
- `src/scene/internal/use-scene-imperative-api.test.ts`
- `src/app/hooks/use-scene-commands.test.ts`
- `src/app/use-scene-handlers.test.ts`
- `src/app/overlay/use-overlay-props.test.ts`
- a new component test for selected-item details in `src/app/selection/`
- remove or replace the old inspector coverage in `src/app/scene-panel/inspector.test.tsx`

Minimum behaviors to cover:

- absolute transform commit succeeds when valid
- absolute transform commit rejects bounds and collision failures
- absolute transform `no-op` clears draft/error state without a loud announcement
- details field `Escape` restores the committed value
- blur caused by selection change or opening remove confirmation does not commit a stale draft to the wrong item
- success and error announcements fire only on commit
- delete from selected-item controls returns focus appropriately after confirm

### Keyboard suppression tests

Extend `src/app/keyboard/use-keyboard-shortcuts.test.tsx` to verify that when focus is inside the new details inputs:

- arrow keys do not move the selected item
- `Delete` and `Backspace` do not open delete confirmation
- comma and period do not rotate the item

This repo already has a memory note to add explicit suppression tests whenever shortcut behavior changes; this work should follow that pattern.

### Existing browser tests and helpers that must move with the feature

Update the suites and helpers that already assert the current inspector, move buttons, delete copy, and focus contracts:

- `e2e/editor-accessibility.spec.ts`
- `e2e/editor-dialogs.spec.ts`
- `e2e/editor-a11y-audits.spec.ts`
- `e2e/support/editor-harness.ts`

These files already encode the current selection controls and dialog copy, so they should be treated as first-class implementation fallout rather than optional follow-up cleanup.

Update their wording and assertions to distinguish:

- `Delete` from the focused 3D room view
- `Remove item` from selected-item actions
- `Furniture in room` or `room-contents panel` as the user-facing panel name

### Browser tests

Add or extend Playwright coverage in the existing accessibility and hotkey suites:

- `e2e/editor-accessibility-flows.spec.ts`
- `e2e/editor-hotkeys.spec.ts`

At minimum verify:

- tab order from room view reaches selected-item actions, then details
- Furniture-in-room-panel-origin selection keeps focus in the room-contents panel and reaches selected-item controls via `Shift+Tab` rather than forward `Tab`
- selecting from the Furniture in room panel keeps focus in the room-contents panel
- selecting from the room view keeps focus on the room view
- typing in details inputs does not trigger room-view shortcuts
- invalid details commits show visible feedback and do not move the item
- `Delete` from the focused 3D room view follows the room-view focus path
- `Remove item` from selected-item actions follows the same non-room-view room-contents-panel focus contract the app uses elsewhere
- selected-item controls are suppressed from focus/navigation while the startup overlay is active
- selected-item controls are suppressed from focus/navigation when the catalog drawer is open, matching the surrounding shell behavior

## Acceptance Criteria

### UI structure

- selected-item controls are not rendered when there is no selection
- the move button toolbar is gone from the UI
- selected-item actions and details render outside `EditorOverlay`, directly after the room view in `App.tsx`

### Shared behavior

- rotate buttons still go through the shared rotate command path
- typed details commits go through a shared scene command path, not component-local mutation
- typed details validation reuses the same bounds/collision rules as the scene domain

### Keyboard and focus

- selection does not auto-move focus into the new controls
- `Tab` from the room view reaches selected-item actions first
- Furniture-in-room-panel-origin selection keeps focus in the room-contents panel, and selected-item controls are reachable from there via `Shift+Tab`
- details inputs suppress room-view shortcuts
- `Delete` from the focused 3D room view follows the room-view focus path
- `Remove item` from selected-item actions follows the existing non-room-view room-contents-panel focus behavior unless this is intentionally changed in a separate product decision

### Accessibility and announcements

- actions and details have clear section labels
- invalid fields expose inline and screen-reader-discernible errors
- announcements only occur on selection, successful commit, failed commit, rotate, and remove actions

### Documentation

- README and keyboard docs match the shipped behavior
- the on-canvas Tab hint in `src/app/use-scene-handlers.ts`, the room-view instructions in `src/App.tsx`, and the keyboard help copy all match the new control names and location

## Explicitly Deferred

This pass should not take on:

- floating toolbar placement near the selected object
- viewport edge-avoidance for a floating toolbar
- projection math or portal infrastructure for selection HUD placement
- broader room-contents panel redesign beyond any copy updates directly needed for this feature

The code should, however, leave the selected-item actions/details isolated enough that a later visual placement pass can reposition them without changing their DOM order or command wiring.
