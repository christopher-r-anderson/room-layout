# User Guide

Welcome to the Room Layout User Guide.

This walkthrough focuses on the main ways to build and adjust a room layout, from placing furniture to sharing your final setup.
If you need contributor-oriented reproduction steps, please use the [editor-workflow.md](../architecture/editor-workflow.md).

## Start a Layout

Once the editor opens, use `Add Furniture` to place an item in the room.

You can then select furniture in either of two ways:

- click it in the room
- choose it from the `Furniture in room` panel

The panel is often the easiest place to work when you want a text-first or more precise way to manage items.

## Arrange Furniture

After selecting an item, you can move it around the room and rotate it until it fits the layout you want.

- drag the item in the room to reposition it
- use the selected-item controls for actions such as rotation or removal
- use the keyboard for smaller, more precise adjustments

If an item cannot be placed in a location because it would go out of bounds or overlap another item, the editor keeps the layout in a valid state.

## Adjust the Room

Open `Room` to change the wall finish, the floor finish, the lighting mood, or the room's size.

The `Lighting` tab offers presets named after common home lighting - `Daylight`, `Cool White`, `Warm White`, and `Soft Lamplight` - so you can preview your furniture under lighting that resembles your own room.

The `Size` tab sets the room's width, depth, and wall height in meters, so the layout matches your real space. Resizing never moves your furniture: anything left outside the new walls is highlighted in the scene, and the tab offers `Move items inside` to pull everything back in (undoable in one step).

This lets you try different surface, lighting, and size combinations without leaving the editor, which is useful when you want to see how furniture reads in a different setting.

## Fine-Tune with the Panel

The `Furniture in room` panel is useful when you would rather work from a list than directly on the canvas.

Use it to:

- switch selection quickly
- review what is currently in the room
- update selected-item details with keyboard controls

This is also the best path if you prefer not to rely on drag interactions.

## Keyboard Shortcuts

You can use the editor without relying only on the mouse.

Common shortcut groups include:

- camera movement and saved views
- moving and rotating the selected item
- undo and redo
- starting over

For the full shortcut list, see [editor-shortcuts-reference.md](../reference/editor-shortcuts-reference.md).

## Share a Layout

Use `Share` on desktop or the mobile `More` menu to generate a link for the current room state.

That link restores the current arrangement when it is opened again.

For more detail about how scene sharing works, see [url-scene-sharing.md](url-scene-sharing.md).

## Accessibility Notes

The editor supports keyboard-first use across the main layout flows.

If working directly in the 3D view is not the best fit, the `Furniture in room` panel provides the main text alternative for selecting and managing items.
