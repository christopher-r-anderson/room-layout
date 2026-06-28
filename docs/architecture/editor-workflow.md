# Editor Workflow

This guide is a contributor-facing manual verification checklist.
Use it when validating behavior changes, reproducing reports, or reviewing test
coverage alongside [testing.md](testing.md) and the Playwright suite.

It intentionally focuses on verification targets rather than end-user how-to
guidance.

## Verification Flows

### Add and Select

- add an item from `Add Furniture`
- select it either in the scene or from the `Furniture in room` panel
- confirm selection state stays aligned between canvas, panel, and selected-item controls

### Move, Rotate, and Remove

- drag selected items along the floor plane
- verify movement stays in bounds and avoids collisions
- rotate from selected-item controls or keyboard shortcuts
- remove from selected-item controls or delete shortcuts

### Room Surface Editing

- open `Room` and change wall finishes, floor finishes, or the lighting mood
- confirm the editor remains interactive while the room surface is open

### Panel-Driven Editing

- use `Furniture in room` for text-first item access
- switch selection without using the canvas
- edit selected-item details and confirm typed changes commit on Enter or blur and cancel on Escape

### Keyboard-First Operation

- exercise camera movement and preset views
- verify focus-selected (`F`) reframes the camera on the selected item
- verify selection movement and rotation shortcuts
- verify undo, redo, and start-over flows
- confirm room-view shortcuts remain scoped to room-view focus
- exercise the pane-focus shortcuts (`Shift+I` inspector, `Shift+R` room view,
  `Shift+O` furniture-in-room, `Shift+T` selected-item actions)

### Startup and Recovery

- confirm editor controls stay blocked while required assets are still loading
- verify the startup error state provides a usable retry path
- verify retry returns the editor to an interactive ready state

### Dialog and Overlay Contracts

- verify key surfaces (catalog, room panel, confirmations, info) open and close predictably
- verify `Escape` close behavior and focus return to the opening control (native restore for blocking dialogs; explicit registry return for the Room surface and mobile More drawer)
- verify mutually exclusive top-level surfaces do not overlap in conflicting states
- verify non-blocking Room behavior does not block scene/camera shortcuts while open

### Sharing and URL Restore

- verify `Share` (or mobile `More`) creates a restorable room URL
- verify valid `?scene=` payloads restore items, room finishes, and lighting mood
- verify invalid or oversized payloads fail safely with clear state behavior
- verify restore is one-shot and does not reapply unexpectedly after retry/reload

## Accessibility Notes

- `Furniture in room` is the primary text alternative to direct canvas interaction
- keyboard-first editing is a core supported flow, not a fallback edge case
- focus and shortcut behavior should be checked together when editing overlay or dialog flows

## Out of Scope

- end-user onboarding or usage walkthroughs (see [user-guide.md](../guide/user-guide.md))
- deep implementation details of shortcut internals (see [keyboard.md](keyboard.md))

## Related References

- [testing.md](testing.md)
- [editor-shortcuts-reference.md](../reference/editor-shortcuts-reference.md)
- [dialogs-and-overlays.md](dialogs-and-overlays.md)
- [url-scene-sharing.md](../guide/url-scene-sharing.md)
