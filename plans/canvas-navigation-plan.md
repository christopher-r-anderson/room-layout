# Plan: Accessible 3D Room Interaction Model for Consumer Furniture Layout Demo

## Project context

This is a React Three Fiber consumer-style 3D furniture layout demo intended for frontend-focused job applications. The app represents a 3D room where users can select, preview, move, rotate, and delete furniture. The target product context is a larger e-commerce or consumer room-planning platform, so the interaction model should prioritize:

- real-world consumer UX,
- accessibility,
- maintainability,
- clear keyboard support,
- screen reader-compatible alternatives to direct canvas interaction,
- practical tradeoffs rather than overly theoretical “perfect” 3D accessibility.

The app currently has:

- a visible collapsible panel named **“Furniture List”** that lists each furniture item,
- keyboard-tabbable item controls in that panel,
- visual selected state in the panel,
- yellow outline around the selected mesh in the 3D scene,
- blue thinner outline for hover/focus preview when hovering/focusing items or meshes,
- direct mesh click selection,
- Escape to deselect when not in a text field/contenteditable,
- global keyboard shortcuts for camera movement, item movement, rotation, deletion, zoom, etc.,
- an existing **Keyboard Help** popover and centralized polite/assertive live-region announcer,
- a selected-item toolbar with rotate clockwise, rotate counterclockwise, and delete controls,
- a details panel with position/rotation information that currently exists globally and is not editable.

The selected-item toolbar and details panel are expected to evolve later into:

- a contextual floating toolbar that only appears when an item is selected,
- a selected-item details panel that only appears when an item is selected,
- editable position and rotation controls,
- logical keyboard tab order after the 3D room view,
- focus behavior that depends on how the item was selected.

This plan primarily covers the selection, preview, keyboard navigation, shortcut scoping, and accessibility model. It also includes extension points so the future toolbar/details work can build on this without reworking the core interaction model.

## Codebase audit and terminology mapping

This plan was originally written without access to the repository. The current codebase already contains several of the interaction surfaces discussed here, so implementation should extend those surfaces instead of rebuilding them.

### Current component and file map

```text
App shell / interaction composition:
- src/App.tsx
- src/app/overlay/editor-overlay.tsx
- src/app/overlay/use-overlay-props.ts
- src/app/overlay/use-overlay-state.ts

Keyboard handling:
- src/app/keyboard/use-keyboard-shortcuts.ts
- src/app/keyboard/use-camera-key-state.ts
- src/app/keyboard/keyboard-shortcuts-help.tsx

Preview / announcement / selection sync:
- src/app/use-preview-controller.ts
- src/app/hooks/use-announcements.ts
- src/app/scene-panel/announcer.tsx
- src/app/hooks/use-scene-sync.ts
- src/app/use-scene-handlers.ts

Visible DOM scene representation:
- src/app/scene-panel/outliner.tsx

Current details surface:
- src/app/scene-panel/inspector.tsx

Scene-domain selection and camera internals:
- src/scene/scene.tsx
- src/scene/scene.types.ts
- src/scene/internal/use-scene-selection.ts
- src/scene/internal/use-scene-imperative-api.ts
- src/scene/internal/objects/interactive-furniture.tsx
```

### Terminology corrections for this repository

The rest of this document may use product-language names that do not exactly match the current UI. In this codebase, treat them as follows:

```text
"Furniture in room" -> the current "Furniture List" outliner in src/app/scene-panel/outliner.tsx
"selected-item details panel" -> the current read-only Inspector in src/app/scene-panel/inspector.tsx
"selected-item toolbar" -> the current top toolbar modules SelectionToolsMovement and SelectionToolsOther in src/app/overlay/editor-overlay.tsx
```

### Current-state findings that change the implementation approach

```text
- App.tsx already renders a wrapper section around Canvas plus SR-only scene instructions.
- That wrapper is not currently focusable, does not track room-view focus, and does not scope keyboard behavior.
- Keyboard behavior is currently window-global in both use-keyboard-shortcuts.ts and use-camera-key-state.ts.
- usePreviewController.ts already centralizes preview-source conflict handling, but only for scene pointer + outliner hover/focus.
- useSceneSync.ts already centralizes read-model syncing and selection announcements, and can still request outliner focus handoff.
- useSceneHandlers.ts already suppresses some outliner focus handoff, but deletion still explicitly returns focus into the outliner.
- useAnnouncements.ts and Announcer already provide live regions; do not add a second announcement system.
- KeyboardShortcutsHelp already exists; update it instead of creating a new shortcut-help UI.
- Outliner currently renders selected state only; it does not receive previewedId or render a separate preview style.
- SceneReadModel currently exposes only selectedId + items, so camera-relative keyboard navigation data should not be derived from app state alone.
```

### Ownership decisions for the implementation

Use the existing architecture boundaries instead of introducing a second parallel interaction model.

```text
Room-view focus ownership:
- Keep roomViewRef + roomViewHasFocus in App.tsx (or extract a tiny app-level hook used only by App.tsx).

Selection-source tracking:
- Keep selectedSource in app-shell state, not scene-domain persistence.
- Add a shared app type at src/app/scene-interaction.types.ts if the type is consumed across App, handlers, and overlay state.

Preview-source tracking:
- Extend src/app/use-preview-controller.ts with room-view keyboard preview support.

Spatial navigation logic:
- Keep camera-relative projection/sorting in the scene layer.
- Prefer a new pure helper in src/lib/three/ for ordering math, exposed through SceneRef via src/scene/internal/use-scene-imperative-api.ts.

Shortcut scoping:
- Keep Escape globally prioritized.
- Keep standard command shortcuts (Undo / Redo / New Scene) global unless product requirements explicitly change.
- Scope single-character room-manipulation keys to the focused room view.
```

### Source-aware defaults adopted by this updated plan

Unless product requirements change, this plan assumes:

```text
- Ctrl/Cmd+Z, Ctrl/Cmd+Y, and Ctrl/Cmd+N remain global editor shortcuts.
- W/A/S/D, Shift+W/A/S/D, 1-4, F, Arrow keys, Shift+Arrow, Alt+Arrow, , / ., Delete / Backspace, and - / = are room-view scoped.
- Canvas-origin selection/delete/clear keeps focus on the room view.
- Outliner-origin delete keeps focus in the outliner.
- useSceneSync selection announcements are suppressed for canvas-keyboard selection so a richer source-aware announcement can be emitted once.
```

---

# High-level recommendation

Do **not** replace the visible “Furniture in room” panel with a hidden DOM scene graph.

Instead:

1. Keep **“Furniture in room”** as the primary accessible DOM representation of the scene.
2. Make the 3D canvas area a **single focusable 3D room view region**.
3. Move most keyboard shortcuts from global behavior to **3D-room-view-focused behavior**.
4. Add **canvas-scoped spatial keyboard navigation** that lets users preview/select furniture items while the 3D room view has focus.
5. Keep the visible panel in stable logical order.
6. Use camera-relative spatial ordering only inside the focused 3D room view.
7. Synchronize preview and selection state visually between the canvas and the “Furniture in room” panel.
8. Add proper screen reader announcements for canvas keyboard preview, selection, movement, rotation, deletion, and deselection.
9. Track the **source of selection** so future selected-item controls can make sensible focus decisions.
10. Plan for selected-item toolbar/details controls to be mounted in a logical DOM position after the 3D room view, even if visually floating near the selected mesh.
11. Document the accessibility and UX tradeoffs in the README.

The important distinction:

```text
Good:
- One visible DOM list: “Furniture in room”
- One focusable 3D room view region
- Arrow keys inside that focused region update internal preview state
- Shared state syncs canvas and panel visuals
- Future selected-item controls appear conditionally after selection

Avoid:
- A second hidden DOM tree with one invisible/focusable button per furniture item
- Tabbing through hidden furniture controls that duplicate the visible “Furniture in room” controls
- Reordering the visible panel based on camera position
- Auto-moving focus unpredictably whenever selection changes
```

---

# Desired mental model

The app should have three interaction layers.

```text
Document / app layer
├─ Normal DOM tab order
├─ Furniture in room panel
├─ Toolbar / app-level controls
├─ Focusable 3D room view region
├─ Selected-item toolbar, only when selected
└─ Selected-item details panel, only when selected

3D room view focused
├─ Camera controls
├─ Canvas-only spatial item preview
├─ Selection
├─ Item movement
├─ Item rotation
└─ Item deletion

Dialog / form layer
└─ Inputs, confirmation dialogs, menus, popovers, product forms, etc.
```

The “Furniture in room” panel remains the dependable accessible control surface.

The focused 3D room view provides a keyboard-operable enhancement for interacting directly with the scene.

The future selected-item toolbar/details panel should not replace either of those. They are contextual controls for the currently selected object.

---

# Core state model

Refactor or confirm the app has a single source of truth for furniture interaction state.

At minimum, the app should conceptually track:

```ts
type InteractionSource =
  | 'canvas-keyboard'
  | 'canvas-pointer'
  | 'panel-keyboard'
  | 'panel-pointer'
  | 'toolbar'
  | 'details-panel'
  | null

type SceneInteractionState = {
  selectedItemId: string | null
  selectedSource: InteractionSource
  previewItemId: string | null
  previewSource: InteractionSource
  roomViewHasFocus: boolean
}
```

The actual codebase may already have selection/hover state with different names. Adapt the existing state rather than rewriting unnecessarily.

The important separation is:

```text
Selection:
- persistent
- one selected item max
- drives editing actions
- yellow outline in scene
- selected style in panel
- eventually causes selected-item toolbar/details to appear

Selection source:
- tracks how the item was selected
- supports future focus decisions for toolbar/details
- avoids blindly moving focus whenever selection changes

Preview:
- temporary
- one previewed item max
- comes from hover, panel focus, or canvas keyboard navigation
- blue outline in scene if not selected
- preview style in panel if not selected

DOM focus:
- actual browser focus
- should never be faked just to mirror preview
```

Do not move DOM focus to a panel item when the user previews an item through canvas keyboard navigation.

Do not automatically move focus to the selected-item toolbar in this pass. Preserve the user’s current interaction context.

---

# Selection source behavior

Track `selectedSource` when selection happens.

Examples:

```text
Mesh clicked:
selectedSource = 'canvas-pointer'

Canvas keyboard Enter/Space selects previewed item:
selectedSource = 'canvas-keyboard'

Furniture in room button clicked:
selectedSource = 'panel-pointer'

Furniture in room button activated with keyboard:
selectedSource = 'panel-keyboard'

Future toolbar action changes selection:
selectedSource = 'toolbar'

Future details-panel action changes selection:
selectedSource = 'details-panel'
```

This should not create complex behavior immediately. It is mainly an extension point for the selected-item toolbar/details work.

## Current-pass focus behavior after selection

### Selection from canvas keyboard

Example:

1. User tabs to the 3D room view.
2. Uses arrow keys to preview Sofa.
3. Presses Enter to select Sofa.

Recommended result:

```text
- Focus stays on the 3D room view.
- Selected item gets yellow outline.
- Matching panel row shows selected state.
- Existing/future toolbar/details controls may appear.
- Do not move focus to the toolbar.
- Announce that Tab reaches item actions/details.
```

Example announcement:

```text
Sofa selected. Use arrow keys to move it, comma and period to rotate it, Delete to remove it, or Tab for item actions and details.
```

### Selection from canvas pointer

Example:

1. User clicks the Sofa mesh.

Recommended result:

```text
- Focus moves to / remains on the 3D room view.
- Selected item gets yellow outline.
- Matching panel row shows selected state.
- Existing/future toolbar/details controls may appear.
- Do not move focus to the toolbar.
```

This keeps pointer-to-keyboard continuity: after clicking an object, keyboard controls work because the 3D room view is focused.

### Selection from Furniture in room panel by keyboard

Example:

1. User tabs to “Sofa” button.
2. Presses Enter or Space.

Recommended result:

```text
- Focus stays on the Sofa button.
- Selected item gets yellow outline.
- Matching panel row shows selected state.
- Existing/future toolbar/details controls may appear later in DOM order.
- Do not automatically move focus to the toolbar.
```

Optional announcement:

```text
Sofa selected. Item actions and details are available after the 3D room view.
```

Do not over-announce if the button’s own accessible state already communicates the change.

### Selection from Furniture in room panel by pointer

Recommended result:

```text
- Let normal button/pointer focus behavior happen.
- Selected item gets yellow outline.
- Matching panel row shows selected state.
- Existing/future toolbar/details controls may appear.
- Do not force focus into the 3D room view or toolbar.
```

---

# Future selected-item toolbar and details panel compatibility

The current implementation pass should not fully implement the floating selected toolbar/details behavior unless the implementation agent is specifically instructed to do so. However, the current plan should avoid decisions that would make that future work harder.

## Intended future behavior

When an item is selected:

```text
- A selected-item toolbar appears.
- It includes rotate counterclockwise, rotate clockwise, delete, and possibly other item-specific actions.
- It is visually positioned near the selected item using the separate floating-toolbar placement algorithm.
- It only exists when an item is selected.
- It is not permanently disabled when no item is selected.
```

When an item is selected:

```text
- A selected-item details panel appears.
- It includes editable position and rotation controls.
- It only exists when an item is selected.
- It participates in normal keyboard tab order after the selected-item toolbar.
```

## DOM order recommendation

Even if the toolbar visually floats near the selected object, it should be mounted in a logical DOM position.

Recommended order:

```text
Header / app controls
Furniture in room panel
3D room view
Selected-item toolbar, if selected
Selected-item details panel, if selected
Other page controls
```

This means:

```text
Tab from 3D room view →
  selected-item toolbar controls →
  selected-item details controls →
  next page control
```

This is preferable to placing the floating toolbar earlier in the DOM or portaling it somewhere that creates confusing tab order.

## Current plan amendment

In the current pass:

```text
- Track selectedSource.
- Scope shortcuts so editable details inputs will not accidentally trigger scene controls later.
- Include announcements that mention Tab can reach item actions/details.
- Do not auto-focus the toolbar after selection.
- Do not depend on the toolbar being permanently present or disabled.
```

If the current toolbar exists and is disabled when no item is selected, the implementation agent may leave it mostly alone in this pass, unless it conflicts with the new shortcut/focus model. The full conversion to conditional floating toolbar should be a follow-up plan.

---

# Visual state rules

## Selection visual state

When `selectedItemId === item.id`:

```text
Canvas:
- show strong selected outline, currently yellow

Furniture in room panel:
- show selected row/button style
- ensure accessible state is exposed

Selected-item toolbar/details:
- controls apply to this item
- future toolbar/details appear only when selected
```

Selection should visually dominate preview. If an item is both selected and previewed, render it as selected.

## Preview visual state

When `previewItemId === item.id` and `selectedItemId !== item.id`:

```text
Canvas:
- show thinner preview outline, currently blue

Furniture in room panel:
- show subtle preview style
- do not use the same style as real DOM focus
```

Preview style should be visually distinct from:

- selected state,
- hover state,
- keyboard focus ring.

A good pattern is:

```text
Selected:
- stronger background/accent
- selected icon/text
- yellow outline in canvas

Focused:
- normal browser-visible focus ring

Previewed:
- subtle background or left border/accent
- blue outline in canvas
```

## DOM focus visual state

Do not replace the native or custom focus ring with preview styling.

A panel item can be both focused and previewed. In that case, show both:

```text
- visible focus ring because the DOM control has focus
- preview styling because the corresponding mesh is previewed
```

---

# Preview source handling

Avoid hover/focus events fighting each other by tracking the source that set preview state.

Use a pattern like this:

```ts
function setPreview(itemId: string, source: InteractionSource) {
  setPreviewState({ itemId, source })
}

function clearPreview(source: InteractionSource) {
  setPreviewState((current) => {
    if (current.source !== source) return current
    return { itemId: null, source: null }
  })
}
```

This prevents a stale `pointerleave` from clearing a newer keyboard preview.

For example:

```text
1. User hovers mesh A.
2. previewSource = 'canvas-pointer'
3. User tabs to panel item B.
4. previewSource = 'panel-keyboard'
5. Mesh A pointerleave fires late.
6. It should not clear preview for B.
```

---

# Event behavior matrix

## Panel item hover

When pointer enters a furniture item in the “Furniture in room” panel:

```text
set previewItemId to item.id
set previewSource to 'panel-pointer'
```

When pointer leaves:

```text
clear preview only if previewSource === 'panel-pointer'
```

Effects:

```text
Canvas:
- corresponding mesh gets blue preview outline unless selected

Panel:
- row gets hover/preview style unless selected

DOM focus:
- unchanged

Screen reader:
- no live region announcement needed for pointer hover
```

## Panel item keyboard focus

When a furniture item button/control receives focus:

```text
set previewItemId to item.id
set previewSource to 'panel-keyboard'
```

When it loses focus:

```text
clear preview only if previewSource === 'panel-keyboard'
```

Effects:

```text
Canvas:
- corresponding mesh gets blue preview outline unless selected

Panel:
- focused control gets real focus ring
- row/control gets preview/focus styling

Screen reader:
- normal accessible name/state of the focused button should be enough
- do not add redundant live announcements for ordinary button focus
```

## Panel item activation

When user clicks the panel item or presses Enter/Space on its button:

```text
selectedItemId = item.id
selectedSource = 'panel-pointer' or 'panel-keyboard'
```

Recommended:

```text
previewItemId can either be cleared or left as item.id.
Selected visual state should dominate either way.
Focus should remain on the activated panel control.
```

Effects:

```text
Canvas:
- selected mesh gets yellow outline

Panel:
- selected item gets selected style

Toolbar/details:
- future selected-item controls may appear after the 3D room view in DOM order

Announcements:
- optional if selection happened through a normal button whose label/state already communicates selection
- useful to announce if current implementation already has selection status messaging
```

## Mesh pointer hover

When pointer enters a mesh:

```text
set previewItemId to item.id
set previewSource to 'canvas-pointer'
```

When pointer leaves:

```text
clear preview only if previewSource === 'canvas-pointer'
```

Effects:

```text
Canvas:
- hovered mesh gets blue preview outline unless selected

Panel:
- corresponding furniture row gets preview style unless selected

DOM focus:
- unchanged

Screen reader:
- no live region announcement needed for pointer hover
```

## Mesh click

When user clicks a mesh:

```text
selectedItemId = item.id
selectedSource = 'canvas-pointer'
focus the 3D room view wrapper
```

Effects:

```text
Canvas:
- clicked mesh gets selected outline

Panel:
- matching row shows selected state

Keyboard:
- subsequent room-view-scoped keyboard controls should work because the 3D view now has focus

Toolbar/details:
- future selected-item controls may appear
- do not automatically move focus to the toolbar
```

Focus the 3D room view wrapper on direct canvas interaction so keyboard shortcuts are scoped correctly.

Do not steal focus if a dialog, menu, or other overlay is active.

## Empty canvas click

When user clicks in the 3D view outside any object:

```text
selectedItemId = null
selectedSource = null
previewItemId = null
previewSource = null
focus the 3D room view wrapper
```

Effects:

```text
Canvas:
- selected outline cleared
- preview outline cleared

Panel:
- selected/preview style cleared

Toolbar/details:
- future selected-item controls disappear

Announcements:
- announce “Selection cleared” if the 3D room view has focus or the user is using keyboard flow
```

---

# Focusable 3D room view

Add or update a DOM wrapper around the Canvas that is focusable.

Conceptually:

```tsx
<section
  ref={roomViewRef}
  tabIndex={0}
  role="region"
  aria-label="3D room view"
  aria-describedby="room-view-keyboard-help"
  onFocus={handleRoomViewFocus}
  onBlur={handleRoomViewBlur}
  onKeyDown={handleRoomViewKeyDown}
>
  <p id="room-view-keyboard-help" className="sr-only">
    3D room view. Use arrow keys to move between furniture items. Press Enter to
    select an item. When an item is selected, arrow keys move it. Press Escape
    to clear selection. Press Tab to reach item actions and details when an item
    is selected.
  </p>

  <Canvas />
</section>
```

Implementation notes:

- Use the existing visually-hidden/sr-only utility if one exists.
- The wrapper must have a visible focus style.
- The canvas itself does not need to be the focus target; the wrapper can be the focus target.
- Ensure clicking or pointer-down inside the canvas focuses the wrapper.
- Ensure the wrapper does not steal focus from dialogs, popovers, menus, or form controls.
- If the app currently listens to `window` keydown globally, move most shortcut handling to this wrapper or gate it based on whether this wrapper contains/owns focus.
- Future selected-item controls should follow this wrapper in DOM order.

---

# Keyboard shortcut scoping

Current behavior: shortcuts work globally unless the active element is a text field/contenteditable.

Recommended behavior: most shortcuts only work while the 3D room view is focused.

## Scopes

Implement or approximate a shortcut scope model.

Conceptually:

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

Pseudo-logic:

```ts
function getShortcutScope({
  activeElement,
  roomViewHasFocus,
  selectedItemId,
  dialogOpen,
}: ShortcutContext): ShortcutScope {
  if (dialogOpen) return 'dialog'
  if (isTextEntryElement(activeElement)) return 'text-entry'

  // Future extension:
  // if (isInsideSelectedItemToolbar(activeElement)) return 'selected-item-toolbar';
  // if (isInsideSelectedItemDetails(activeElement)) return 'selected-item-details';

  if (roomViewHasFocus && selectedItemId) return 'room-view-object-selected'
  if (roomViewHasFocus) return 'room-view'
  return 'global'
}
```

The actual implementation can be simpler, but behavior should match this model.

## Global shortcuts

Only a tiny set should remain global.

Recommended:

```text
Escape:
- allowed globally with priority rules

Shortcut help:
- optional, but only if implemented carefully
```

Do not leave these as global:

```text
W/A/S/D
Shift + W/A/S/D
Arrow keys
Shift + Arrow keys
Alt + Arrow keys
, / .
- / =
Delete / Backspace
```

Those should be active only in the 3D room view or in specific focused controls where appropriate.

This is especially important because future selected-item details will contain editable inputs. Arrow keys inside those inputs must not move furniture.

---

# Escape behavior

Escape should use a priority stack.

Recommended order:

```text
1. If a confirmation dialog is open:
   - cancel/close dialog
   - return focus appropriately

2. Else if menu/popover is open:
   - close it
   - return focus appropriately

3. Else if active element is a text input, textarea, select, or contenteditable:
   - generally do not hijack Escape
   - allow the control/component to handle it
   - exception only if existing UX intentionally uses Escape to close a parent popover/dialog

4. Else if selectedItemId exists:
   - clear selection
   - selectedSource = null
   - future selected-item toolbar/details disappear
   - announce “Selection cleared” when appropriate

5. Else if previewItemId exists and room view is focused:
   - clear preview
   - announce “Preview cleared” if helpful

6. Else:
   - do nothing
```

This keeps Escape useful but avoids fighting standard component behavior.

---

# 3D room view keyboard controls

## Room view focused, no item selected

When the 3D room view has focus and no item is selected:

| Key                    | Behavior                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| ArrowRight / ArrowDown | Preview next visible furniture item in camera-relative spatial order |
| ArrowLeft / ArrowUp    | Preview previous visible furniture item                              |
| Home                   | Preview first visible furniture item                                 |
| End                    | Preview last visible furniture item                                  |
| Enter / Space          | Select previewed item                                                |
| W/A/S/D                | Orbit camera                                                         |
| Shift + W/A/S/D        | Pan camera                                                           |
| - / =                  | Zoom out / in                                                        |
| Escape                 | Clear preview, or clear selection if somehow selected                |
| H or ?                 | Optional: open keyboard shortcuts help                               |

Important:

- Arrow keys browse/preview items only when no item is selected.
- DOM focus remains on the 3D room view wrapper.
- The matching panel row gets preview styling.
- The matching mesh gets blue outline.
- A polite live announcement should describe the previewed item.

Example announcement:

```text
Previewing armchair. Press Enter to select.
```

## Room view focused, item selected

When the 3D room view has focus and an item is selected:

| Key                | Behavior                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| Arrow keys         | Move selected item                                                                                 |
| Shift + Arrow keys | Move selected item by larger step                                                                  |
| Alt + Arrow keys   | Move selected item by finer step                                                                   |
| , / .              | Rotate selected item                                                                               |
| Delete / Backspace | Open delete confirmation                                                                           |
| Escape             | Deselect item                                                                                      |
| W/A/S/D            | Orbit camera                                                                                       |
| Shift + W/A/S/D    | Pan camera                                                                                         |
| - / =              | Zoom out / in                                                                                      |
| Tab                | Leave 3D room view and proceed to next focusable control, eventually selected-item toolbar/details |

Important:

- In selected-object mode, arrow keys move the selected item.
- They do not browse to another item.
- To browse other items via canvas keyboard navigation, user presses Escape to deselect first.
- Pointer hover may still preview a different item while one is selected, but keyboard arrows remain editing controls once selected.
- Do not automatically move focus to the toolbar on selection.
- Let Tab be the path from 3D room view to selected-item actions/details.

Example selection announcement:

```text
Sofa selected. Use arrow keys to move it, comma and period to rotate it, Delete to remove it, or Tab for item actions and details.
```

Example movement announcement:

```text
Sofa moved forward.
```

Avoid announcing every tiny movement too aggressively if it becomes noisy. Consider debouncing or using concise messages.

---

# Spatial navigation implementation

Spatial navigation should be internal to the focused 3D room view. It should not reorder the visible “Furniture in room” panel.

## Goal

When the 3D room view is focused and no item is selected, arrow keys should let the user browse visible furniture items in camera-relative order.

Use a pragmatic implementation.

Do not try to solve perfect spatial navigation.

## Recommended algorithm

For each furniture item:

1. Determine a representative world-space point.
   - Usually the bounding box center is good enough.
   - For unusual objects, consider center of bounding box projected to the floor or object origin if already normalized well.

2. Project that world-space point into screen/viewport coordinates using the current camera.

3. Determine whether the item is visible enough to include.
   - Exclude objects behind the camera.
   - Exclude objects clearly outside the viewport.
   - Optionally include partially visible objects if their projected center is near the viewport.
   - For a demo, center-point visibility is acceptable.

4. Sort visible items by screen-space position:
   - top to bottom,
   - then left to right,
   - with a row tolerance so items on roughly the same visual row sort horizontally.

Pseudo-code:

```ts
type SpatialItem = {
  id: string
  screenX: number
  screenY: number
  visible: boolean
}

function sortSpatially(items: SpatialItem[]) {
  const rowTolerance = 48

  return [...items]
    .filter((item) => item.visible)
    .sort((a, b) => {
      if (Math.abs(a.screenY - b.screenY) > rowTolerance) {
        return a.screenY - b.screenY
      }

      return a.screenX - b.screenX
    })
}
```

5. When user presses ArrowRight or ArrowDown:
   - move to next item in sorted spatial list.

6. When user presses ArrowLeft or ArrowUp:
   - move to previous item in sorted spatial list.

7. Home:
   - preview first item.

8. End:
   - preview last item.

## What to do if no item is currently previewed

When the room view is focused and the user presses an arrow key with no preview item:

```text
Preview the first item in the spatial list.
```

Alternative:

```text
Preview the selected item if selected, otherwise first item.
```

But since arrows move selected items when selected, the no-selection case should simply start at the first spatial item.

## What to do when the camera changes

Spatial order is camera-relative, so it should update after camera movement.

Implementation options:

```text
Simple:
- recompute spatial ordering when an arrow navigation key is pressed

More advanced:
- recompute after camera control changes/debounced

Recommended:
- recompute on demand when needed for keyboard navigation
```

On-demand recomputation is fine and avoids unnecessary complexity.

## README tradeoff note

Document that spatial navigation is a camera-relative enhancement and not the primary accessible representation. The stable DOM list remains the dependable scene representation.

---

# Furniture in room panel behavior

The existing panel is good and should remain visible/collapsible.

## Keep stable order

Do not reorder the panel based on camera position.

Recommended order options:

```text
- insertion order
- user-defined order
- category/product order
```

Use whatever currently exists unless there is a reason to improve it.

README note:

```text
The “Furniture in room” panel uses stable logical order instead of camera-relative order so keyboard and screen reader users do not experience focus order changing unexpectedly as the camera moves.
```

## Keep normal DOM controls

If each furniture item is currently a button, that is acceptable.

Do not convert the list into a complex ARIA grid/listbox unless there is a strong reason. Normal buttons are easier to use and less likely to be implemented incorrectly.

For each item:

```text
Tab:
- moves through normal page controls

Enter / Space:
- selects item

Focus:
- previews corresponding mesh

Hover:
- previews corresponding mesh
```

## Accessible selected state

Review current markup.

Possible patterns:

### If each item is a toggle-like selection button

Use:

```tsx
<button aria-pressed={selectedItemId === item.id}>Sofa</button>
```

This communicates pressed/selected state.

### If each item navigates/activates the current item

Use:

```tsx
<button aria-current={selectedItemId === item.id ? 'true' : undefined}>
  Sofa
</button>
```

`aria-pressed` is usually better if the button represents “select this item” as a toggle state.

Avoid adding ARIA roles unnecessarily if semantic buttons already work.

## Panel preview from canvas keyboard navigation

When the user previews an item through 3D room view arrow navigation:

```text
- do not move DOM focus to the panel item
- do apply preview styling to the matching panel row/button
- optionally scroll the panel item into view if it is inside a scrollable list
```

Scrolling should be gentle and only if useful. Do not cause jarring layout shifts.

---

# Selected-item toolbar behavior, current and future

The app currently has a selected-item toolbar near the beginning of document order that is disabled when no item is selected.

This is acceptable temporarily if it does not interfere with the new keyboard model, but the intended future state is:

```text
- Toolbar exists only when an item is selected.
- Toolbar is visually floating near the selected object.
- Toolbar is logically placed after the 3D room view in DOM order.
- Toolbar participates in normal Tab order.
- Toolbar does not automatically receive focus when an item is selected.
```

## Current-pass handling

In this plan’s implementation pass:

```text
- Do not spend major effort converting the toolbar unless instructed.
- Ensure toolbar shortcuts/actions still operate on selectedItemId.
- Ensure disabled toolbar controls do not create confusing tab stops.
- Ensure Delete from toolbar uses confirmation.
- Ensure toolbar actions set selectedSource = 'toolbar' if they cause selection-related changes.
```

If the existing toolbar is disabled but focusable, fix that. Disabled controls should not create confusing keyboard stops. Prefer actual `disabled` buttons or conditional rendering.

## Future toolbar tab order

When implemented later:

```text
3D room view
→ Rotate counterclockwise
→ Rotate clockwise
→ Delete
→ Details panel inputs
→ next page control
```

If implemented as a semantic toolbar later, use the appropriate toolbar pattern only if needed. For this demo, normal buttons in logical order are acceptable and simpler.

---

# Selected-item details panel behavior, current and future

The app currently has a details panel that is always present, globally positioned, and not editable.

The intended future state is:

```text
- Details panel only appears when an item is selected.
- Details panel follows the selected-item toolbar in DOM order.
- Position and rotation fields are editable.
- Inputs suppress room-view shortcuts.
- Changes update the selected item.
- Changes are announced or reflected in accessible status where appropriate.
```

## Current-pass handling

In this plan’s implementation pass:

```text
- Do not fully implement editable details unless instructed.
- Ensure the future details panel is accounted for in shortcut scoping.
- Ensure text-entry detection includes future number/text inputs.
- Ensure announcements mention Tab can reach item actions/details after selection.
```

When details inputs are implemented later:

```text
- Arrow keys inside inputs should edit/caret/step the input, not move furniture.
- Escape inside inputs should not unexpectedly clear scene selection unless explicitly designed.
- Validation should be clear and accessible.
- Position/rotation changes should update selectedItemId’s item.
```

---

# Delete behavior

Delete and Backspace should no longer be global.

They should work when:

```text
- 3D room view is focused
- an item is selected
```

Optionally also when:

```text
- focus is on the selected item in the Furniture in room panel
- and the UI clearly documents that Delete removes the item
```

For simplicity and safety, prefer Delete only in the 3D room view and through visible Delete buttons/actions elsewhere.

Deletion should open a confirmation dialog.

Dialog behavior:

```text
- focus moves into the dialog when opened
- background controls are inert/unreachable
- Escape cancels/closes the dialog
- Cancel returns focus to the triggering context
- Confirm deletes the item
- after deletion, selection and preview state are cleared
- future toolbar/details disappear
- focus returns to a sensible place
```

Focus return suggestions:

```text
If deleted from 3D room view:
- return focus to 3D room view wrapper

If deleted from future selected-item toolbar:
- return focus to 3D room view wrapper, or to a stable nearby control if more appropriate

If deleted from panel action:
- return focus to next item in the panel if available
- otherwise previous item
- otherwise panel header/action or 3D room view
```

Screen reader announcement after deletion:

```text
Sofa removed from room.
```

---

# Camera controls

Keep the existing controls, but scope them to the focused 3D room view.

Current controls:

```text
W/A/S/D:
- orbit camera

Shift + W/A/S/D:
- pan camera

- / =:
- zoom out / zoom in
```

Recommended changes:

```text
- These should only work when the 3D room view has focus.
- They should not fire globally while the user is tabbing through page controls.
- They should not fire in text inputs/contenteditable.
- They should not fire in future editable details inputs.
- They should be documented in a keyboard shortcuts help UI.
```

Consider adding visible camera control buttons:

```text
- Orbit left
- Orbit right
- Zoom in
- Zoom out
- Reset view
```

These do not have to be extensive, but visible alternatives make the demo feel more consumer/commercial and less dependent on memorized shortcuts.

---

# Movement controls

Current selected item movement:

```text
Arrow keys:
- move selected item

Shift + Arrow keys:
- larger moves

Alt + Arrow keys:
- finer moves
```

Recommended:

```text
- Keep these mappings.
- Scope them to 3D room view focused + item selected.
- In no-selection mode, arrows are used for spatial item preview instead.
- Do not allow these shortcuts to fire inside future details inputs.
```

This creates a clean mode distinction:

```text
No selected item:
- Arrow keys browse/preview furniture in the 3D view

Selected item:
- Arrow keys move selected furniture
```

Announce mode changes.

After selection:

```text
Sofa selected. Use arrow keys to move it, comma and period to rotate it, Delete to remove it, or Tab for item actions and details.
```

After deselection:

```text
Selection cleared. Use arrow keys to preview furniture items.
```

---

# Rotation controls

Current:

```text
, and . rotate the selected item
```

Recommended:

```text
- Keep the mapping.
- Scope to 3D room view focused + item selected.
- Document in keyboard shortcut help.
- Future rotate toolbar buttons should use the same underlying command.
```

Announcements:

```text
Sofa rotated left.
Sofa rotated right.
```

As with movement, avoid overly noisy announcements if rotation happens repeatedly.

---

# Zoom controls

Current:

```text
- and = zoom out/in
```

Recommended:

```text
- Keep the mapping.
- Scope to 3D room view focused.
- Document in shortcut help.
- Consider visible zoom buttons.
```

Because these are single-character shortcuts, scoping them to a focused component is important.

---

# Shortcut help

Add a visible **Keyboard shortcuts** button or help affordance.

This can live near the 3D room view or in an app help/menu area.

It should open a dialog or popover listing active shortcuts.

Recommended content:

```text
3D room view shortcuts

When the 3D room view is focused:
- Arrow keys: preview furniture items
- Enter or Space: select the previewed item
- W/A/S/D: orbit the camera
- Shift + W/A/S/D: pan the camera
- - / =: zoom out / in
- Escape: clear preview or selection

When furniture is selected in the 3D room view:
- Arrow keys: move selected furniture
- Shift + Arrow keys: move farther
- Alt + Arrow keys: move precisely
- , / .: rotate selected furniture
- Delete or Backspace: remove selected furniture
- Tab: move to item actions and details
- Escape: deselect furniture
```

The help text should clarify that most shortcuts work only when the 3D room view is focused.

This is important for discoverability and accessibility.

---

# Announcements and live regions

Add a polite live region for state changes that happen inside the canvas interaction model.

Conceptual component:

```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {announcement}
</div>
```

Use this for interactions that are not otherwise communicated through native focused DOM controls.

## Announce these

Canvas keyboard preview:

```text
Previewing sofa. Press Enter to select.
```

Selection from canvas:

```text
Sofa selected. Use arrow keys to move it, comma and period to rotate it, Delete to remove it, or Tab for item actions and details.
```

Selection cleared:

```text
Selection cleared.
```

Deletion:

```text
Sofa removed from room.
```

Movement:

```text
Sofa moved forward.
Sofa moved left.
Sofa moved precisely right.
Sofa moved farther back.
```

Rotation:

```text
Sofa rotated left.
Sofa rotated right.
```

Camera changes, only if helpful and not noisy:

```text
Camera zoomed in.
Camera reset.
```

Avoid announcing every camera orbit step if it becomes noisy.

## Do not announce these

Do not announce simple pointer hover:

```text
- mesh hover
- panel hover
```

Do not duplicate announcements when a screen reader user tabs to a normal panel button and the button’s own name/state communicates enough.

## Announcement throttling

For repeated key presses, announcements can become noisy.

Suggested approach:

```text
- announce selection/preview immediately
- movement/rotation can use concise messages
- optionally debounce repeated movement announcements
- ensure the last movement is announced eventually if debounced
```

For a demo, simple concise announcements are acceptable.

---

# Focus management details

## Clicking inside the canvas

When the user clicks a mesh or empty canvas:

```text
roomViewRef.current?.focus()
```

Only do this when appropriate.

Do not steal focus:

```text
- while a modal dialog is open
- from a menu/popover
- from a form control overlay
```

## Canvas keyboard navigation

When the user presses arrows inside the focused 3D room view:

```text
- keep DOM focus on the 3D room view wrapper
- update previewItemId
- update previewSource = 'canvas-keyboard'
- update panel preview style
- update mesh preview outline
- update live region announcement
```

Do not focus the matching panel button.

## Panel keyboard navigation

When the user tabs through the “Furniture in room” panel:

```text
- DOM focus is on the actual item button
- previewItemId follows focus
- previewSource = 'panel-keyboard'
- mesh gets preview outline
```

## After selecting from panel

Focus should remain on the panel button. Do not force focus into the 3D room view after panel selection.

Rationale:

```text
The user chose the panel navigation path. Keep them there unless they explicitly move to the 3D room view.
```

## After selecting from canvas

Focus should be on the 3D room view.

Rationale:

```text
The user chose the canvas interaction path. Keep keyboard controls scoped to that path.
```

## After future toolbar/details appear

In this plan’s current pass:

```text
- Do not auto-focus toolbar/details when selection changes.
- Announce that Tab can reach item actions/details.
```

In a future toolbar/details pass, more nuanced focus behavior may be added, but the baseline should remain source-aware and predictable.

---

# Handling selected and previewed items at the same time

The app may have:

```text
selectedItemId = sofa
previewItemId = armchair
```

This is acceptable for pointer hover or panel focus.

Visuals:

```text
Sofa:
- yellow selected outline
- selected panel state

Armchair:
- blue preview outline
- preview panel state
```

But while the 3D room view has focus and an item is selected:

```text
- arrow keys should move the selected item
- arrow keys should not change preview to another item
```

To preview another item using canvas keyboard navigation:

```text
1. Press Escape to deselect.
2. Use arrow keys to browse items.
3. Press Enter/Space to select.
```

This keeps keyboard mode clear.

---

# Preventing event conflicts

Review event propagation in the R3F scene.

Important rules:

```text
- Mesh click should select the item and prevent the click from also being treated as empty canvas click.
- Empty canvas click should clear selection.
- Pointer enter/leave should set/clear preview with source checks.
- Clicks on UI overlays should not pass through to the canvas.
- Future floating toolbar clicks should not be treated as canvas clicks.
```

In React Three Fiber, this may involve:

```ts
event.stopPropagation()
```

on mesh interactions.

The implementation agent should inspect the existing event structure before changing behavior.

---

# Accessibility markup guidance

## 3D room view

Use a focusable region.

Recommended:

```tsx
<section
  tabIndex={0}
  role="region"
  aria-label="3D room view"
  aria-describedby="room-view-keyboard-help"
>
  ...
</section>
```

Do not overuse ARIA roles like `application` unless there is a very strong reason. `role="application"` can change screen reader behavior significantly and is often misused.

## Furniture in room panel

Keep semantic HTML where possible.

Recommended:

```tsx
<section aria-labelledby="furniture-in-room-heading">
  <h2 id="furniture-in-room-heading">Furniture in room</h2>
  <ul>
    <li>
      <button aria-pressed={isSelected}>Sofa</button>
    </li>
  </ul>
</section>
```

Depending on the existing UI design, the item might include:

```text
- product name
- item type
- selected status
- delete button
- rotate controls
- view details button
```

Make sure each control has a clear accessible name.

## Selected-item toolbar

For the current toolbar:

```text
- ensure buttons have accessible names
- ensure disabled controls are not confusing tab stops
- ensure delete opens confirmation
```

For the future floating toolbar:

```text
- conditionally render only when selected
- keep logical DOM order after 3D room view
- use normal buttons unless a true composite toolbar pattern is needed
- do not auto-focus on selection by default
- ensure visual floating placement does not affect logical tab order
```

## Selected-item details panel

For the current non-editable panel:

```text
- ensure empty/no-selection state is not noisy
- avoid making non-useful static content prominent in tab order
```

For the future editable panel:

```text
- conditionally render only when selected
- follow toolbar in DOM order
- use labeled inputs for position/rotation
- validate accessibly
- ensure input focus suppresses scene shortcuts
```

---

# Avoided approaches and rationale

## Do not create a hidden DOM scene graph

Avoid:

```html
<div class="sr-only">
  <button>Sofa</button>
  <button>Armchair</button>
  <button>Coffee table</button>
</div>
```

as a second keyboard navigation path if the visible “Furniture in room” panel already provides item access.

Rationale:

```text
- duplicates the visible accessible controls
- creates two DOM navigation paths to the same objects
- creates focus return edge cases
- can confuse users because focus appears to move through invisible controls
- increases maintenance cost
```

The internal canvas spatial navigation is fine because it is not a duplicate DOM graph. It is a scoped interaction mode inside one focusable region.

## Do not reorder the visible panel by camera position

Avoid camera-dependent DOM order.

Rationale:

```text
- focus order would change as the camera moves
- screen reader and keyboard users could lose predictability
- stable product/insertion order is better for the visible panel
```

## Do not leave single-character shortcuts global

Avoid global `w`, `a`, `s`, `d`, `,`, `.`, `-`, `=`, etc.

Rationale:

```text
- can interfere with assistive tech and user expectations
- can surprise users when focus is elsewhere
- scoped shortcuts are easier to explain and more accessible
- future editable details inputs need normal keyboard behavior
```

## Do not auto-focus selected-item toolbar by default

Avoid automatically moving focus to the contextual toolbar every time selection changes.

Rationale:

```text
- selection from canvas should keep the user in canvas interaction mode
- selection from panel should keep the user in panel navigation flow
- sudden focus movement can be disorienting
- Tab can naturally take the user to item actions/details
```

---

# Implementation phases

## Phase 1: Add app-shell interaction state and source metadata

Ground the new keyboard model in the existing app shell instead of expanding SceneReadModel for UI-only metadata.

Concrete work:

```text
- Add InteractionSource and related app-shell types in src/app/scene-interaction.types.ts if shared across files.
- Extend src/app/overlay/use-overlay-state.ts with selectedSource metadata and setters/reset helpers.
- Keep roomViewHasFocus in src/App.tsx (or a tiny app-only hook used there), not in scene state.
- Do not put selectedSource into src/scene/scene.types.ts SceneReadModel unless a later requirement proves the scene domain needs it.
```

Implementation notes:

```text
- selectedId remains scene-domain state.
- selectedSource is UI metadata used for focus return, announcements, and future toolbar/details behavior.
- preview-source conflict handling continues to live in usePreviewController.ts.
```

Deliverable:

```text
- selectedId remains driven by SceneRef / SceneReadModel
- selectedSource is available to App, handlers, and overlay logic
- roomViewHasFocus is tracked in the app shell
```

## Phase 2: Turn the existing App room section into the focusable 3D room view

The focusable room-view wrapper already conceptually exists in src/App.tsx. Upgrade that existing section instead of introducing a parallel wrapper elsewhere.

Concrete work in `src/App.tsx`:

```text
- Add roomViewRef and roomViewHasFocus state.
- Make the existing section around Canvas focusable with tabIndex=0.
- Keep the current aria-label / aria-describedby pattern and update the SR-only instructions text instead of duplicating it.
- Add visible focus styling to the wrapper.
- Focus the wrapper on canvas-origin pointer interaction without interfering with pointer capture.
- Keep future contextual controls after this region in DOM order.
```

Important integration points:

```text
- Empty-canvas selection clearing already happens in Canvas onPointerMissed in App.tsx.
- Mesh pointer selection starts in src/scene/internal/objects/interactive-furniture.tsx.
- Do not move pointer-capture logic out of interactive-furniture.tsx.
- Canvas-origin focus should be coordinated at App/Scene callback boundaries, not by rewriting drag handling.
```

Deliverable:

```text
- user can Tab to the room view
- room-view focus is visible and screen-reader-described
- canvas pointer interaction preserves pointer-to-keyboard continuity
```

## Phase 3: Rescope the existing keyboard hooks instead of replacing them

Keyboard behavior is currently split across two global listeners. Re-scope those hooks based on room-view focus and interaction context.

Concrete work:

```text
- Update src/app/keyboard/use-keyboard-shortcuts.ts to accept roomViewHasFocus and room-view selection/preview context.
- Update src/app/keyboard/use-camera-key-state.ts to stop feeding camera keys to the scene unless the room view is focused.
- Keep Ctrl/Cmd+Z, Ctrl/Cmd+Y, and Ctrl/Cmd+N global by default.
- Scope 1-4, F, W/A/S/D, Shift+W/A/S/D, Arrow keys, Shift+Arrow, Alt+Arrow, , / ., Delete / Backspace, and - / = to the room view.
- Keep Escape global, but apply the documented priority rules so dialogs/popovers and text entry still win first.
```

Deliverable:

```text
- standard command shortcuts remain editor-global
- room-manipulation keys stop firing outside the focused room view
- future editable details inputs will not accidentally move furniture
```

## Phase 4: Extend preview control and outliner rendering for room-view keyboard preview

Preview state already has a single controller. Extend that controller rather than introducing a second preview store.

Concrete work:

```text
- Extend src/app/use-preview-controller.ts with a room-view keyboard preview source.
- Preserve the current delayed-clear behavior for scene pointer preview.
- Pass previewedId through src/app/overlay/use-overlay-props.ts -> src/app/overlay/editor-overlay.tsx -> src/app/scene-panel/outliner.tsx.
- Update Outliner to render a preview style distinct from:
  - selected state
  - native DOM focus state
  - pointer hover state
```

Recommended visual behavior:

```text
- previewedId from outliner hover/focus or room-view keyboard shows the blue canvas outline
- previewedId also highlights the matching outliner row
- selected styling remains dominant over preview styling
- focus ring on the actual focused outliner button remains distinct from preview styling
```

Deliverable:

```text
- canvas keyboard preview uses the same preview pipeline as pointer and outliner preview
- outliner and canvas visuals stay synchronized both ways
```

## Phase 5: Add source-aware selection plumbing

Selection-source tracking needs explicit origin signals from the current UI surfaces.

Concrete work:

```text
- Update src/app/use-scene-handlers.ts so handleSelectById can accept a source parameter rather than only an id.
- Update src/app/overlay/use-overlay-props.ts and src/app/overlay/editor-overlay.tsx so Outliner can send source-aware selection events.
- In src/app/scene-panel/outliner.tsx, distinguish panel-pointer vs panel-keyboard activation instead of relying on click alone.
- Extend Scene/App callback plumbing so canvas pointer selection reports canvas-pointer source to the app shell.
- Room-view keyboard Enter/Space selection should set selectedSource = 'canvas-keyboard' before or alongside scene selection sync.
```

Recommended source set for this codebase:

```ts
type InteractionSource =
  | 'canvas-keyboard'
  | 'canvas-pointer'
  | 'panel-keyboard'
  | 'panel-pointer'
  | 'toolbar'
  | 'inspector'
  | null
```

Deliverable:

```text
- selectedSource is trustworthy enough to drive announcement wording and focus return
- canvas-pointer, canvas-keyboard, panel-pointer, and panel-keyboard selections are no longer conflated
```

## Phase 6: Keep spatial navigation logic in the scene layer and expose it through SceneRef

Do not try to compute camera-relative keyboard ordering from App.tsx using SceneReadModel alone. The scene layer already owns camera state and object refs.

Concrete work:

```text
- Add a pure camera-projection / ordering helper under src/lib/three/ (for example a scene-keyboard-navigation utility).
- Expose scene-owned keyboard navigation data through src/scene/scene.types.ts and src/scene/internal/use-scene-imperative-api.ts.
- Keep viewport projection, visibility checks, and ordering in the scene layer.
- Let App.tsx / use-keyboard-shortcuts.ts ask the scene for the current navigation snapshot/order rather than deriving it from SceneReadModel.
```

Recommended room-view behavior:

```text
- no selection: Arrow keys navigate preview order, Home/End jump, Enter/Space selects previewed item
- selection present: Arrow keys move the selected item, Shift/Alt modify step size
- DOM focus stays on the room-view wrapper during keyboard scene browsing
```

Deliverable:

```text
- room-view keyboard browsing is camera-relative
- ordering logic is reusable and testable without leaking scene internals into the overlay layer
```

## Phase 7: Make announcements source-aware by reusing the existing announcement system

This repository already has centralized live regions. Extend them; do not add a second announcer.

Concrete work:

```text
- Keep src/app/hooks/use-announcements.ts and src/app/scene-panel/announcer.tsx as the only live-region mechanism.
- Update src/app/hooks/use-scene-sync.ts so canvas-keyboard selection can suppress the default generic selection announcement.
- Use src/app/use-scene-handlers.ts for richer canvas-keyboard announcements such as:
  "Sofa selected. Use arrow keys to move it, comma and period to rotate it, Delete to remove it, or Tab for item actions and details."
- Add concise preview announcements for room-view keyboard preview changes.
- Keep movement announcements queued/debounced through the existing queueMovementAnnouncement path.
```

Implementation note:

```text
- The existing code already announces selection changes, deletion, undo/redo, rotation, movement, and startup flows.
- Update wording and suppression rules instead of duplicating those channels.
```

Deliverable:

```text
- canvas-only keyboard interactions are announced once
- selection announcements do not double-fire
- movement announcements remain concise and throttled
```

## Phase 8: Replace generic outliner focus handoff with source-aware focus return

The current codebase already has focus handoff machinery in useSceneSync.ts plus delete-time outliner focus requests in useSceneHandlers.ts. Those rules must be narrowed.

Concrete work:

```text
- Review src/app/hooks/use-scene-sync.ts default requestOutlinerFocus behavior.
- Keep automatic outliner focus handoff suppressed for canvas-origin selection and clear flows.
- Update src/app/use-scene-handlers.ts deletion flow so requestOutlinerFocusByIndex(...) is only used for outliner-origin delete behavior.
- For canvas-origin delete/clear, return focus to roomViewRef instead.
- Preserve modal behavior: dialogs still trap focus and Escape closes the dialog before selection clearing runs.
```

Deliverable:

```text
- focus returns to the same interaction surface the user was using
- delete/cancel behavior no longer contradicts canvas keyboard continuity
```

## Phase 9: Update existing help and docs, then validate the new model in existing tests

This repository already has visible shortcut help, engineering docs, README accessibility notes, and browser tests. Update those artifacts instead of creating parallel documentation.

Concrete documentation updates:

```text
- src/app/keyboard/keyboard-shortcuts-help.tsx
- README.md
- docs/editor-shortcuts-reference.md
- docs/keyboard-shortcuts.md
```

Concrete test updates to plan for:

```text
Unit / integration:
- src/app/keyboard/use-keyboard-shortcuts.test.tsx
- src/app/keyboard/use-camera-key-state.test.ts
- src/app/use-preview-controller.test.ts
- src/app/hooks/use-scene-sync.test.ts
- src/app/use-scene-handlers.test.ts
- src/app/scene-panel/outliner.test.tsx
- src/app/keyboard/keyboard-shortcuts-help.test.tsx
- new pure utility tests for any scene-keyboard-navigation helper in src/lib/three/

Browser / accessibility:
- e2e/editor-hotkeys.spec.ts
- e2e/editor-accessibility.spec.ts
- e2e/editor-accessibility-flows.spec.ts
- e2e/editor-dialogs.spec.ts
- e2e/editor-a11y-audits.spec.ts
```

Deliverable:

```text
- visible help explains room-view-scoped shortcuts
- README and engineering docs describe the actual interaction model in this repo
- automated coverage reflects the new focus and shortcut rules
```

---

# README guidance

Add a section like:

```md
## Accessibility and interaction model

The room is rendered with WebGL, so the app does not rely on the canvas alone as the accessibility surface. Placed furniture is also represented in a DOM-based “Furniture in room” panel. This gives keyboard and screen reader users a predictable way to review, focus, select, and manage products in the room.

The canvas remains the primary visual manipulation surface for sighted pointer users. Selection and preview state are shared between the canvas and the DOM controls: hovering or focusing a furniture item previews it in the 3D scene, and hovering a mesh previews the corresponding item in the panel.

The 3D room view is also keyboard focusable. When focused, it supports camera controls and camera-relative spatial navigation between visible furniture items. This canvas navigation is intentionally scoped to the focused 3D view rather than implemented as a second hidden DOM scene graph.

The “Furniture in room” panel uses stable logical order rather than camera-dependent spatial order. This avoids focus order changing unexpectedly as the camera moves. Camera-relative ordering is used only inside the focused 3D view as an enhancement for navigating the current visual scene.

Most keyboard shortcuts are active only when the 3D room view has focus. This avoids global single-character shortcuts interfering with normal page navigation, forms, or assistive technology.

When an item is selected, contextual item actions and details are available through the normal tab order. The visual placement of selected-item controls may be near the selected object, but their keyboard order remains logical and predictable.
```

Add a controls section like:

```md
## Keyboard controls

General:

- Tab / Shift+Tab: move through page controls
- Enter / Space: activate focused buttons
- Escape: close dialogs/menus first, otherwise clear the current selection

When the 3D room view is focused:

- Arrow keys: preview furniture items in the current camera view
- Home / End: preview the first or last visible furniture item
- Enter / Space: select the previewed furniture item
- W/A/S/D: orbit the camera
- Shift + W/A/S/D: pan the camera
- - / =: zoom out / in

When furniture is selected in the 3D room view:

- Arrow keys: move the selected item
- Shift + Arrow keys: move farther
- Alt + Arrow keys: move precisely
- , / .: rotate the selected item
- Delete / Backspace: remove the selected item after confirmation
- Tab: move to item actions and details
- Escape: deselect the item
```

Add a tradeoff section:

```md
## Interaction tradeoffs

This demo intentionally keeps the visible “Furniture in room” panel instead of replacing it with a hidden keyboard-only scene graph. In a consumer furniture planning experience, a visible list of placed products is useful for reviewing and managing room contents. It also provides a reliable DOM-based accessibility surface for a WebGL scene.

The 3D view still supports keyboard interaction, but that interaction is scoped to a single focusable region. Arrow-key spatial navigation updates internal preview state and announces changes without moving DOM focus through invisible controls. This keeps the canvas interaction powerful while avoiding duplicate hidden navigation paths.

Selected-item controls are treated as contextual actions rather than global disabled controls. The intended model is for item-specific actions and details to appear only when an item is selected and to participate in normal tab order after the 3D room view. This keeps the interface predictable while still allowing the toolbar to be visually positioned near the selected object.
```

---

# Acceptance checklist

The final implementation should satisfy these checks.

## Focus and keyboard

```text
[ ] User can Tab to the “Furniture in room” panel items.
[ ] User can Tab to the 3D room view.
[ ] 3D room view has visible focus styling.
[ ] WASD does not work when focus is outside the 3D room view.
[ ] Arrow movement does not work when focus is outside the 3D room view.
[ ] Delete/Backspace does not remove furniture globally.
[ ] Escape clears selection only after dialogs/menus/text inputs get priority.
[ ] Shortcut model anticipates future editable details inputs.
```

## Panel behavior

```text
[ ] Panel item hover previews mesh.
[ ] Panel item keyboard focus previews mesh.
[ ] Panel item activation selects mesh.
[ ] Panel item activation tracks selectedSource.
[ ] Selected panel item has clear selected style.
[ ] Previewed panel item has clear preview style.
[ ] Focus ring remains visible and distinct.
```

## Canvas behavior

```text
[ ] Mesh hover previews matching panel item.
[ ] Mesh click selects item.
[ ] Mesh click tracks selectedSource = 'canvas-pointer'.
[ ] Empty canvas click clears selection.
[ ] Clicking canvas focuses 3D room view where appropriate.
[ ] Canvas keyboard spatial navigation previews items.
[ ] Canvas keyboard selection selects previewed item.
[ ] Canvas keyboard selection tracks selectedSource = 'canvas-keyboard'.
[ ] DOM focus does not jump to panel items during canvas keyboard navigation.
[ ] DOM focus does not jump to toolbar/details after selection.
```

## Visual sync

```text
[ ] Selected mesh has yellow outline.
[ ] Previewed mesh has blue outline if not selected.
[ ] Selected state dominates preview state.
[ ] Canvas preview updates panel preview.
[ ] Panel preview updates canvas preview.
[ ] Pointer/focus source conflicts do not clear newer preview state.
```

## Announcements

```text
[ ] Canvas keyboard preview is announced.
[ ] Canvas keyboard selection is announced.
[ ] Selection announcement mentions Tab path to item actions/details.
[ ] Deselection is announced.
[ ] Deletion is announced.
[ ] Movement/rotation feedback is announced without becoming too noisy.
[ ] Pointer hover is not announced.
```

## Spatial navigation

```text
[ ] Spatial order is based on current camera projection.
[ ] Visible items are sorted top-to-bottom, then left-to-right.
[ ] ArrowRight/ArrowDown move to next item.
[ ] ArrowLeft/ArrowUp move to previous item.
[ ] Home/End work.
[ ] Spatial ordering does not reorder the visible panel.
```

## Toolbar/details compatibility

```text
[ ] Current toolbar does not create confusing focus stops when disabled.
[ ] Current toolbar actions still operate on selected item.
[ ] Current details panel does not interfere with shortcut scoping.
[ ] State model supports future selected-item toolbar/details behavior.
[ ] Future selected-item controls can be mounted after 3D room view in DOM order.
```

## Documentation

```text
[ ] README explains why the visible “Furniture in room” panel remains.
[ ] README explains why there is no duplicate hidden DOM scene graph.
[ ] README explains scoped keyboard shortcuts.
[ ] README lists keyboard controls.
[ ] README explains stable panel order vs camera-relative canvas navigation.
[ ] README explains selected-item controls as contextual actions/details.
[ ] README notes that visual floating placement should not break logical tab order.
```

---

# Summary of the intended final behavior

The final app should behave like this:

```text
A consumer user can manage furniture through the visible “Furniture in room” panel.

A keyboard user can Tab through normal controls and select furniture from the panel.

A keyboard user can also Tab to the 3D room view, use arrow keys to preview visible furniture spatially, and press Enter/Space to select.

Once an item is selected in the 3D view, arrow keys move it, comma/period rotate it, and Delete opens a confirmation.

Tab from the selected 3D room view can lead to item actions and details.

Mouse users can hover or click meshes directly.

All preview and selection state is synchronized between the canvas and the panel.

The app does not use a hidden duplicate DOM scene graph. It uses one visible DOM scene representation plus one focused canvas interaction mode.

The state model tracks how preview and selection happened so future contextual toolbar/details focus behavior can be implemented cleanly.
```

This is the recommended real-world accessible interaction model for the demo, with enough structure to support the future floating toolbar and editable selected-item details panel work.
