# Plan A: Selected Item Actions and Editable Details

## Purpose

Update the selected-item controls for the React Three Fiber furniture layout demo so they feel appropriate for a consumer e-commerce room-planning experience while preserving the accessibility model established in the previous work.

This plan covers:

- conditionally rendering selected-item controls only when an item is selected,
- improving the selected-item action toolbar,
- removing the old movement button toolbar,
- making the selected-item details panel editable,
- validating position and rotation edits against existing room bounds/collision rules,
- preserving the scoped keyboard shortcut model,
- integrating proper focus/tab behavior,
- adding accessible feedback and announcements,
- updating README documentation.

This plan **does not** cover visually floating the toolbar near the selected mesh. That should be a separate follow-up plan. The toolbar should be structured so it can later be visually floated without changing its semantics, DOM order, or focus behavior.

---

# Existing relevant behavior

The project currently has or recently added:

- a visible **Furniture in room** panel,
- a focusable **3D room view**,
- scoped keyboard shortcuts active primarily when the 3D room view is focused,
- canvas keyboard spatial navigation for previewing/selecting items,
- selected/preview state synced between the canvas and the panel,
- `selectedItemId`,
- `selectedSource`,
- `previewItemId`,
- `previewSource`,
- live announcements for canvas interactions,
- Escape handling with priority for dialogs/menus/inputs,
- selected mesh outline,
- preview mesh outline.

The project also currently has:

- a **Selection Other Actions** toolbar containing:
  - Delete,
  - Rotate Left,
  - Rotate Right,

- a details panel that always exists and shows selected item position/orientation as static text,
- a movement button toolbar with left/up/right/down buttons,
- toolbar and details panel positioned globally rather than contextually,
- toolbar disabled when nothing is selected rather than conditionally rendered.

---

# High-level recommendation

Implement this as one selected-item-controls pass.

The selected-item toolbar and details panel should be handled together because they share:

- selection lifecycle,
- DOM/tab order,
- focus management,
- validation feedback,
- announcements,
- README documentation,
- future floating-toolbar compatibility.

Keep the floating visual placement for a later pass.

---

# Target final behavior for this pass

When no item is selected:

```text
- No selected-item action toolbar is rendered.
- No selected-item details panel is rendered.
- No selected-item movement toolbar is rendered.
- Normal app controls and Furniture in room panel remain available.
- The 3D room view can still be focused and used to spatially preview/select furniture.
```

When an item is selected:

```text
- Selected-item action toolbar appears.
- Editable selected-item details panel appears.
- Toolbar appears before details panel in DOM/tab order.
- Toolbar contains rotate counterclockwise, rotate clockwise, and remove item actions.
- Details panel contains editable position and rotation fields.
- Tab from the focused 3D room view reaches toolbar controls, then details inputs.
- Focus is not automatically moved to the toolbar/details when selection changes.
- Existing canvas keyboard movement/rotation shortcuts still work while the 3D room view has focus.
- Inputs suppress scene shortcuts.
- Invalid edits are rejected or not committed with visible and announced feedback.
```

---

# DOM and tab order

## Recommended logical order

The selected-item toolbar and details panel should be mounted after the 3D room view in DOM order.

Recommended structure:

```text
Header / app controls
Furniture in room panel
3D room view
Selected item actions toolbar, if selected
Selected item details panel, if selected
Other page controls
```

This means that when a furniture item is selected and focus is in the 3D room view:

```text
Tab →
  Rotate counterclockwise →
  Rotate clockwise →
  Remove item →
  Distance/position input 1 →
  Distance/position input 2 →
  Rotation input →
  next page control
```

Do not visually float the toolbar in this pass unless the codebase already makes it trivial. Logical DOM order matters more right now than visual proximity.

## No automatic focus jump

Do **not** automatically focus the selected-item toolbar or details panel when an item becomes selected.

Preserve source-aware focus:

```text
Selection from canvas keyboard:
- focus remains on 3D room view

Selection from canvas pointer:
- focus moves to/remains on 3D room view

Selection from Furniture in room panel keyboard:
- focus remains on the activated panel button

Selection from Furniture in room panel pointer:
- use normal button/pointer focus behavior

Selection from toolbar/details:
- focus remains in the toolbar/details unless the action removes or clears the item
```

The user should reach toolbar/details with Tab, not by surprise focus movement.

---

# Selected-item action toolbar

## Rename and semantics

Rename the toolbar from **Selection Other Actions** to something consumer-facing.

Recommended visible/accessible label:

```text
Selected item actions
```

Possible implementation:

```tsx
<section aria-label="Selected item actions">...</section>
```

If there is a visible heading, prefer:

```tsx
<section aria-labelledby="selected-item-actions-heading">
  <h2 id="selected-item-actions-heading">Selected item actions</h2>
  ...
</section>
```

The exact heading level should fit the existing page structure.

## Conditional rendering

The selected-item toolbar should only render when `selectedItemId` exists.

Avoid:

```text
- permanently mounted disabled toolbar
- disabled buttons appearing in tab order
- generic “no selected item” placeholder text inside the toolbar
```

Preferred:

```tsx
{
  selectedItem ? <SelectedItemActions item={selectedItem} /> : null
}
```

## Button order

Use this order:

```text
1. Rotate counterclockwise
2. Rotate clockwise
3. Remove item
```

Rationale:

- rotation actions are common, low-risk item adjustments,
- destructive action should be last,
- this feels more natural than Delete first,
- Delete/Remove should not visually lead the group.

## Button labels

Prefer consumer-facing language.

Recommended visible labels where there is enough room:

```text
Rotate counterclockwise
Rotate clockwise
Remove item
```

On smaller screens, icon-only buttons are acceptable if each has a robust accessible name and ideally a tooltip/visible-on-focus label.

Recommended accessible names:

```text
Rotate selected item counterclockwise
Rotate selected item clockwise
Remove selected item
```

For the destructive action, prefer **Remove item** over **Delete** in visible UI because this is a consumer room layout context. “Remove item” maps better to “remove from room/layout.”

The confirmation dialog can say:

```text
Remove sofa from room?
```

## Toolbar actions

Toolbar buttons should call the same underlying command functions used by keyboard shortcuts.

Do not duplicate rotation/delete logic separately.

Conceptual commands:

```ts
rotateSelectedItemCounterclockwise()
rotateSelectedItemClockwise()
requestRemoveSelectedItem()
```

These commands should:

- operate on `selectedItemId`,
- update item state,
- update live announcements,
- preserve focus appropriately,
- respect existing collision/bounds logic if rotation can affect footprint/collision.

## Focus behavior in toolbar

Normal buttons with normal Tab navigation are sufficient.

Do not implement roving tabindex or ARIA toolbar behavior unless the codebase already uses that pattern and it can be done correctly.

Simple is better here:

```text
Tab moves through:
- Rotate counterclockwise
- Rotate clockwise
- Remove item
```

When a toolbar button is activated:

```text
Rotate counterclockwise:
- rotate selected item
- keep focus on the button
- announce result

Rotate clockwise:
- rotate selected item
- keep focus on the button
- announce result

Remove item:
- open confirmation dialog
- dialog receives focus
```

If removing succeeds:

```text
- selected item is removed
- selection is cleared
- toolbar/details unmount
- announce removal
- return focus to a sensible place
```

Recommended focus return after removal from toolbar:

```text
- return focus to the 3D room view wrapper
```

This is a stable fallback because the toolbar will disappear.

If the codebase can reliably return focus to the next item in the Furniture in room panel, that is also acceptable, but do not overcomplicate this pass.

---

# Remove the movement button toolbar

The existing selected-item movement button toolbar with left/up/right/down should be removed.

Rationale:

```text
- movement is already available through keyboard arrows in the focused 3D room view
- precise movement will be available through editable details fields
- button-based nudging can feel more like a debug/demo control than a polished consumer planner
- removing it reduces duplicated control surfaces
```

Do not remove the underlying movement commands. Keep them for:

- arrow-key movement while 3D room view is focused,
- possible future touch/mobile nudge controls if intentionally designed later.

This pass should remove the visible movement toolbar UI, not necessarily the movement logic.

---

# Selected-item details panel

## Rename and semantics

Use consumer-facing naming.

Recommended visible heading:

```text
Item details
```

or, if space allows:

```text
Selected item details
```

Possible structure:

```tsx
<section aria-labelledby="selected-item-details-heading">
  <h2 id="selected-item-details-heading">Item details</h2>
  ...
</section>
```

If the selected item name is available, include it in the panel:

```text
Sofa details
```

or:

```text
Item details: Sofa
```

Be careful not to create a heading that changes too noisily. A stable heading plus item name inside the panel is fine.

## Conditional rendering

The details panel should only render when an item is selected.

Avoid always showing:

```text
- empty details panel
- “No item selected” static text
- non-editable position text when no item is selected
```

Preferred:

```tsx
{
  selectedItem ? <SelectedItemDetails item={selectedItem} /> : null
}
```

## Editable fields

Replace static position/orientation text with editable fields.

Recommended fields:

```text
Position:
- Distance from left wall
- Distance from back wall

Rotation:
- Rotation
```

However, the implementation agent must verify that the app’s coordinate system maps accurately to “left wall” and “back wall.”

If it does, use consumer labels:

```text
Distance from left wall
Distance from back wall
Rotation
```

If not, use safer labels:

```text
Left/right position
Front/back position
Rotation
```

Do not expose raw technical labels like `x`, `z`, or `rotationY` in the visible UI unless no better consumer label is accurate.

## Field order

Use this order:

```text
1. Position fields
2. Rotation field
```

Rationale:

- position is the core placement detail,
- rotation also exists in the toolbar, so details rotation can come after position,
- this matches a consumer “where is it?” then “which way is it facing?” mental model.

## Units

Use clear units.

If the app’s room dimensions are in meters, feet, or arbitrary units, decide how to present them.

Preferred for consumer UI:

```text
ft
in
cm
m
```

If the app currently uses abstract scene units, either:

1. map scene units to consumer units, or
2. label the field clearly enough without pretending.

Examples:

```text
Distance from left wall (ft)
Distance from back wall (ft)
Rotation (degrees)
```

Rotation should be degrees in the UI even if stored internally as radians.

## Input components

If the project already has shadcn UI components for inputs/labels/fields, reuse them.

If not, install the needed components with shadcn:

```bash
pnpm shadcn@latest add input label
```

Depending on the shadcn version and project setup, also consider:

```bash
pnpm shadcn@latest add field
```

The implementation agent should inspect existing components first.

Treat generated shadcn components as project-owned code and adjust styling/accessibility as needed.

## Input types

Use a controlled text or number input with careful validation.

For this demo, a text input with explicit parsing can be easier to handle accessibly than `type="number"` because it allows intermediate states like:

```text
-
1.
empty string
```

Either is acceptable if implemented carefully.

Recommended:

```tsx
<Input
  inputMode="decimal"
  value={draftValue}
  onChange={...}
  onBlur={commit}
  onKeyDown={...}
/>
```

Use `aria-describedby` to connect help/error text.

---

# Editing and commit behavior

Avoid applying scene updates on every keystroke unless the existing app architecture strongly favors it.

Recommended behavior:

```text
While editing:
- maintain local draft string state for each input
- allow temporary incomplete values

On Enter:
- attempt to commit

On blur:
- attempt to commit

On Escape:
- cancel edit and restore previous committed value
```

This is better than rejecting every intermediate keystroke because users may need to type temporarily invalid strings before reaching a valid number.

## Commit flow

On commit:

```text
1. Parse the input.
2. Validate numeric format.
3. Convert UI units to scene units if needed.
4. Build a proposed item transform.
5. Run existing out-of-bounds validation.
6. Run existing collision validation.
7. If valid:
   - update item transform
   - clear error for that field
   - update draft value from committed canonical value
   - announce success if appropriate
8. If invalid:
   - do not commit the transform
   - show field-level error
   - announce error
   - either keep invalid draft for correction or restore previous valid value
```

## Keep invalid draft or restore?

Either approach can be valid.

Recommended for consumer demo:

```text
Keep the invalid draft focused and show an error.
```

This lets users correct their value without losing what they typed.

But if the codebase strongly favors canonical value restoration, restoring is acceptable as long as the error clearly explains what happened.

Recommended invalid behavior:

```text
- keep focus in the invalid field
- mark the field invalid
- show inline error text
- announce the error
- do not move the furniture
```

## Error examples

For parse errors:

```text
Enter a number.
```

For out-of-bounds:

```text
Sofa must stay inside the room.
```

For collision:

```text
Sofa overlaps another item. Choose a different position.
```

For rotation collision if applicable:

```text
Sofa overlaps another item at that rotation.
```

For unsupported precision/range:

```text
Enter a value between 0 and 12 ft.
```

The implementation agent should tailor the messages to the actual room dimensions and validation model.

---

# Validation requirements

The editable details panel must not bypass existing placement rules.

Use the existing source of truth for:

- out-of-bounds checks,
- collision checks,
- item footprint,
- room dimensions,
- rotation normalization.

Do not create a separate approximate validation system if existing collision/footprint logic can be reused.

## Position validation

When editing a position field:

```text
- preserve the other coordinate
- preserve the current rotation
- build proposed transform
- validate against bounds
- validate against collisions
- commit only if valid
```

## Rotation validation

When editing rotation:

```text
- parse degrees
- normalize degrees to a sensible range, likely 0–359 or -180–180
- convert to internal representation if needed
- build proposed transform
- validate footprint/collision if rotation affects footprint
- commit only if valid
```

## Rotation normalization

Consumer UI should probably display degrees.

Recommended display normalization:

```text
0° to 359°
```

Examples:

```text
- 0
- 90
- 180
- 270
```

If user enters:

```text
-90
```

Either normalize to:

```text
270
```

or accept/display `-90` if the app’s existing model works that way.

For consumer clarity, `0–359` is usually cleaner.

## Step values

Suggested defaults:

```text
Position:
- step: whatever matches the existing fine movement increment
- maybe 0.1 if using meters or feet
- maybe 1 if using inches/cm

Rotation:
- step: 15 degrees, or existing keyboard rotation increment
```

The implementation agent should align with existing keyboard movement/rotation increments.

---

# Shortcut scoping with inputs

This is critical.

When focus is inside details panel inputs:

```text
- Arrow keys must not move furniture.
- W/A/S/D must not orbit camera.
- Shift + W/A/S/D must not pan camera.
- , / . must not rotate furniture.
- - / = must not zoom camera.
- Delete/Backspace must edit text normally, not remove item.
- Escape should cancel the current input edit if supported, otherwise allow normal input behavior.
```

The previous shortcut scope model should already support this. Confirm it works with the new inputs.

Recommended scope extension:

```ts
type ShortcutScope =
  | 'global'
  | 'room-view'
  | 'room-view-object-selected'
  | 'dialog'
  | 'text-entry'
  | 'selected-item-toolbar'
  | 'selected-item-details'
```

For this pass, the key rule is:

```text
If activeElement is an input/textarea/select/contenteditable, scene shortcuts do not fire.
```

---

# Announcements

Use the existing live region/status system from the previous accessibility work.

Do not create multiple competing live regions unless the codebase already has a pattern for local form errors.

## Toolbar action announcements

Rotate counterclockwise:

```text
Sofa rotated counterclockwise.
```

Rotate clockwise:

```text
Sofa rotated clockwise.
```

Remove success:

```text
Sofa removed from room.
```

Remove canceled:

```text
Remove canceled.
```

## Details success announcements

Position success:

```text
Sofa position updated.
```

More specific if useful:

```text
Sofa distance from left wall updated to 4 feet.
```

Rotation success:

```text
Sofa rotation updated to 90 degrees.
```

## Details error announcements

Invalid number:

```text
Enter a number for distance from left wall.
```

Out of bounds:

```text
Sofa must stay inside the room.
```

Collision:

```text
Sofa overlaps another item. Choose a different position.
```

## Avoid noisy announcements

Do not announce every `onChange` keystroke.

Announce on:

```text
- successful commit
- failed commit
- destructive action result
- rotation action result
```

---

# Remove confirmation dialog

The Remove item action should continue to use a confirmation dialog.

Recommended dialog copy:

```text
Title: Remove sofa from room?
Description: This will remove the sofa from your room layout.
Actions:
- Cancel
- Remove item
```

Accessibility/focus behavior:

```text
- focus moves into dialog when opened
- Escape cancels dialog
- Cancel closes dialog and returns focus to the Remove item button
- Confirm removes item
- after confirm, toolbar/details unmount
- focus returns to 3D room view or another stable location
```

Recommended after confirm:

```text
focus 3D room view wrapper
```

because the toolbar button disappears.

If the item was removed through another source, use the appropriate source-aware focus return if the codebase supports it.

---

# State and command organization

The implementation agent should look for existing command/update functions and avoid duplicating transform logic.

Prefer command-style functions such as:

```ts
selectItem(itemId, source)
clearSelection()
rotateSelectedItem(direction)
removeSelectedItem()
updateSelectedItemTransform(proposedTransform)
validateItemTransform(itemId, proposedTransform)
announce(message)
```

These names are conceptual; adapt to the codebase.

Important:

```text
- toolbar buttons
- keyboard shortcuts
- details input commits
```

should all use the same underlying item update/validation logic where possible.

This reduces risk that keyboard movement and form edits follow different collision rules.

---

# Component structure guidance

Do not assume these exact file names. The implementation agent should adapt to the actual codebase.

A reasonable conceptual structure:

```text
SelectedItemControls
├─ SelectedItemActions
│  ├─ RotateCounterclockwiseButton
│  ├─ RotateClockwiseButton
│  └─ RemoveItemButton
└─ SelectedItemDetails
   ├─ PositionFields
   └─ RotationField
```

Or:

```tsx
{selectedItem ? (
  <SelectedItemControls
    item={selectedItem}
    onRotateCounterclockwise={...}
    onRotateClockwise={...}
    onRequestRemove={...}
    onUpdateTransform={...}
  />
) : null}
```

Inside:

```tsx
<section aria-label="Selected item actions">
  ...
</section>

<section aria-labelledby="selected-item-details-heading">
  ...
</section>
```

Keep this component logically mounted after the 3D room view.

Future floating pass can add positioning to `SelectedItemActions` without changing its semantic role or DOM position.

---

# Styling guidance

## Toolbar

Current large-screen labels and small-screen icon-only behavior is acceptable.

Improve as needed:

```text
Large screens:
- icon + visible text labels

Small screens:
- icon-only buttons
- accessible names required
- tooltips or visually hidden labels recommended
```

Destructive action should be visually distinct but not overly alarming.

Recommended order and style:

```text
[Rotate counterclockwise] [Rotate clockwise] [Remove item]
```

`Remove item` should be last.

## Details panel

Details panel should visually feel like selected-object precision controls, not debug data.

Recommended groups:

```text
Item details
Position
  Distance from left wall
  Distance from back wall
Rotation
  Rotation
```

Use compact but readable layout.

Field-level errors should appear near the relevant input.

Example:

```text
Distance from left wall
[ 4.2 ft ]
Sofa must stay inside the room.
```

Use existing design tokens/classes.

---

# README updates

Add or update README documentation for selected-item controls.

Suggested text:

```md
### Selected item controls

When furniture is selected, the app shows contextual item actions and editable item details. These controls are only rendered while an item is selected so keyboard users do not tab through disabled controls that do not apply.

The selected-item actions include rotation and removal. Destructive removal is confirmed before the item is removed from the room.

The details panel provides editable position and rotation fields for precise adjustments. These form controls use the same room bounds and collision validation as direct manipulation, so typed changes cannot place furniture outside the room or overlapping another item.

The 3D room view keeps focus when an item is selected from the canvas. Users can continue using canvas keyboard controls, or press Tab to reach selected-item actions and details. Selecting an item from the “Furniture in room” panel keeps focus in the panel, preserving the user’s current navigation path.

The selected-item toolbar is currently placed in logical tab order after the 3D room view. A later visual placement pass may position it near the selected object while preserving the same DOM order and keyboard behavior.
```

Also update keyboard controls:

```md
When furniture is selected in the 3D room view:

- Arrow keys: move the selected item
- Shift + Arrow keys: move farther
- Alt + Arrow keys: move precisely
- , / .: rotate the selected item
- Tab: move to selected-item actions and details
- Delete / Backspace: remove the selected item after confirmation
- Escape: deselect the item

In selected-item details:

- Enter or blur: commit an edited value
- Escape: cancel the current edit, if editing is in progress
```

---

# Acceptance checklist

## Conditional rendering

```text
[ ] Selected-item action toolbar is not rendered when no item is selected.
[ ] Selected-item details panel is not rendered when no item is selected.
[ ] Old movement button toolbar is removed from the UI.
[ ] No disabled selected-item controls remain as unnecessary tab stops.
```

## Toolbar

```text
[ ] Toolbar is labeled “Selected item actions” or equivalent.
[ ] Buttons are ordered: rotate counterclockwise, rotate clockwise, remove item.
[ ] Button labels are consumer-facing.
[ ] Icon-only buttons have accessible names.
[ ] Rotate buttons use the same underlying rotation logic as keyboard shortcuts.
[ ] Remove item opens a confirmation dialog.
[ ] Successful removal clears selection and unmounts toolbar/details.
[ ] Focus returns sensibly after removal.
```

## Details panel

```text
[ ] Details panel is labeled “Item details” or equivalent.
[ ] Position fields are editable.
[ ] Rotation field is editable.
[ ] Labels are consumer-friendly and accurate to the coordinate model.
[ ] Units are visible or otherwise clear.
[ ] Rotation displays in degrees.
[ ] Field order is position first, then rotation.
```

## Validation

```text
[ ] Invalid numeric input is not committed.
[ ] Out-of-bounds position is not committed.
[ ] Colliding position is not committed.
[ ] Invalid rotation/colliding rotation is not committed if applicable.
[ ] Validation uses existing room bounds/collision logic.
[ ] Errors are shown visually near the relevant field.
[ ] Errors are announced to screen reader users.
[ ] Successful commits update the item and clear errors.
```

## Focus and keyboard

```text
[ ] Selecting from canvas keyboard keeps focus on the 3D room view.
[ ] Selecting from canvas pointer focuses/remains on the 3D room view.
[ ] Selecting from Furniture in room panel keeps focus in the panel.
[ ] Focus is not automatically moved to toolbar/details after selection.
[ ] Tab from 3D room view reaches selected-item toolbar, then details.
[ ] Inputs suppress scene shortcuts.
[ ] Arrow keys in inputs do not move furniture.
[ ] Delete/Backspace in inputs edit text normally and do not remove furniture.
[ ] Escape in dialogs cancels dialog before clearing selection.
```

## Announcements

```text
[ ] Rotate toolbar actions are announced.
[ ] Remove success is announced.
[ ] Details commit success is announced.
[ ] Details validation errors are announced.
[ ] Announcements are not fired on every keystroke.
```

## Future floating-toolbar compatibility

```text
[ ] Selected-item toolbar is structurally isolated enough to be visually floated later.
[ ] Toolbar is logically mounted after the 3D room view.
[ ] No focus behavior depends on the toolbar’s visual position.
[ ] README notes floating placement is a future visual enhancement that should preserve DOM order.
```

---

# Recommended implementation phases

## Phase 1: Audit current selected-item controls

Inspect:

```text
- existing Selection Other Actions toolbar component
- existing details panel component
- existing movement button toolbar
- existing selection state and selected item lookup
- existing rotation/delete command logic
- existing movement/position update logic
- existing collision/out-of-bounds validation
- existing live announcement utility
- existing shadcn/ui components
```

Deliverable:

```text
- map current components and commands to this plan
- identify what can be reused
- identify whether input/label/field components need to be installed
```

## Phase 2: Rework selected-item toolbar

Implement:

```text
- conditional render only when selected
- rename/relabel toolbar
- reorder buttons
- update labels/accessibility names
- ensure actions use shared commands
- remove disabled no-selection behavior
```

Deliverable:

```text
- selected-item toolbar behaves correctly in DOM/tab order
- no floating yet
```

## Phase 3: Remove movement button toolbar

Implement:

```text
- remove visible movement button UI
- keep underlying movement logic for keyboard controls
- ensure no references break
```

Deliverable:

```text
- movement is handled by 3D room keyboard controls and future details fields, not separate arrow buttons
```

## Phase 4: Rework details panel as conditional editable panel

Implement:

```text
- conditional render only when selected
- add labeled editable fields
- use shadcn input/label/field if appropriate
- display units
- display current selected item values
- maintain draft state while editing
```

Deliverable:

```text
- details panel is editable but may initially use basic validation wiring
```

## Phase 5: Add validation and commit behavior

Implement:

```text
- parse/commit on Enter and blur
- cancel on Escape if editing
- validate against existing bounds/collision logic
- show field-level errors
- announce success/error
- update canonical item state only on valid commit
```

Deliverable:

```text
- details edits cannot create invalid layout state
```

## Phase 6: Verify shortcut scoping and focus

Test and fix:

```text
- inputs suppress scene shortcuts
- toolbar actions do not steal focus unexpectedly
- selection from different sources preserves focus behavior
- removal focus return works
```

Deliverable:

```text
- selected-item controls integrate with existing focus/navigation model
```

## Phase 7: README update

Update documentation with:

```text
- selected-item controls behavior
- editable details behavior
- validation behavior
- tab/focus behavior
- note that floating toolbar placement is future work
```

---

# What should remain deferred to Plan B

Do **not** include these unless explicitly requested:

```text
- visual floating placement of toolbar near selected mesh
- custom anchor/bounding mesh toolbar positioning
- projected bounding box toolbar positioning
- toolbar collision/viewport edge avoidance
- smoothing toolbar position during camera movement
- portal strategy for floating toolbar
- z-index/overlay collision work beyond what is necessary now
```

Plan A should make the toolbar/details **semantically and behaviorally correct**. Plan B can make the toolbar **visually float** while preserving this behavior.
