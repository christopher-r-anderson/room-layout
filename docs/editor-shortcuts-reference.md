# Editor Shortcuts Reference

This is the end-user shortcut reference for room editor interactions.

For implementation details and architecture, see [Keyboard Shortcuts](./keyboard-shortcuts.md).

## Camera

| Action      | Shortcut      | Mode  |
| ----------- | ------------- | ----- |
| Orbit       | W / A / S / D | Hold  |
| Pan         | Shift+W/A/S/D | Hold  |
| Zoom        | = / -         | Hold  |
| Focus       | F             | Press |
| Corner view | 1             | Press |
| Front view  | 2             | Press |
| Side view   | 3             | Press |
| Top view    | 4             | Press |

## Canvas Browse (no selection)

| Action             | Shortcut         | Mode  |
| ------------------ | ---------------- | ----- |
| Preview next item  | Arrow Right/Down | Press |
| Preview prev item  | Arrow Left/Up    | Press |
| Preview first item | Home             | Press |
| Preview last item  | End              | Press |
| Select previewed   | Enter / Space    | Press |

## Selected Item

| Action             | Shortcut               | Mode  |
| ------------------ | ---------------------- | ----- |
| Move               | Arrow keys             | Press |
| Move (large)       | Shift+Arrow            | Press |
| Move (fine)        | Alt+Arrow              | Press |
| Rotate             | , (comma) / . (period) | Press |
| Remove item        | Delete / Backspace     | Press |
| Clear selection    | Escape                 | Press |
| Apply typed detail | Enter                  | Press |
| Cancel typed draft | Escape                 | Press |

## Scene and History

| Action     | Shortcut                                    | Mode  |
| ---------- | ------------------------------------------- | ----- |
| Undo       | Ctrl+Z / Cmd+Z                              | Press |
| Redo       | Ctrl+Shift+Z / Ctrl+Y / Cmd+Shift+Z / Cmd+Y | Press |
| Start Over | Ctrl+Alt+N / Cmd+Option+N                   | Press |

## Notes

- Camera motion shortcuts are continuous while held.
- Most room-view shortcuts only work while the 3D room view has DOM focus.
- Add Furniture and Environment are toolbar actions without dedicated keyboard shortcuts; reach them through the normal tab order.
- On common alternate keyboard layouts where number-row digits require Shift, camera presets also work with Shift+1/2/3/4 on the same physical number-row keys.
- Selected-item actions require an active selection.
- Typed selected-item details commit on Enter or blur and cancel the local draft on Escape.
- The Placement panel shows wall clearance from the furniture footprint edge to the left and back walls, rather than signed offsets from room center or distances to the furniture pivot.
- The Placement panel shows rotation as clockwise-positive degrees from `0` to `359`, even though the scene engine keeps its internal counterclockwise radian convention.
- The current selected-item actions/details are stepping stones toward future contextual controls; even if those surfaces float visually later, they should remain after the 3D room view in logical tab order.
- Some browser-native combos are intentionally intercepted when the app can safely do so.
