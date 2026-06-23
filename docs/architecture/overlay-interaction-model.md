# Overlay Interaction Model

This editor uses two overlay classes.

Top-level overlays are orchestrated by the generic dialog-store active-surface
model and coordinated at the shell/feature layer.

## Blocking overlays

Blocking overlays suspend editor interaction while they are open.

Examples:

- Catalog drawer
- Delete confirmation
- Keyboard shortcuts dialog
- Project info dialog
- Start over confirmation
- Mobile More drawer

Behavior:

- Scene interaction is disabled.
- Preview visibility and preview clearing follow the blocking state.
- Outliner focus handoff is suspended.
- Keyboard shortcuts are blocked.
- Held camera-key state is cleared.

Downstream hooks consume this state as `isBlockingOverlayOpen`.

Blocking state is derived from dialog definition `kind: 'blocking'`, not from
dialog-specific booleans.

## Non-blocking overlays

Non-blocking overlays remain visible without suspending editor interaction.

Usage:

- Room surface

Desktop behavior:

- Opens as a right sidebar.
- Keeps the room visible.
- Does not close on outside scene interaction.
- Returns focus to the Room trigger when closed from the sidebar close button.

Mobile behavior:

- Opens directly from the mobile header.
- Uses the shared drawer with `modal={false}`.
- Keeps the room visible while the sheet is open.
- Returns focus to the mobile Room trigger when the sheet closes.

Behavior while a non-blocking overlay is open:

- Scene visibility remains unchanged.
- Pointer interaction outside the Room surface remains available.
- Keyboard shortcuts continue to work subject to the existing room-view focus and editing-target rules.
- Camera controls remain available.

## Mutual exclusion

The Room surface uses the non-blocking overlay policy and is mutually exclusive with every other top-level overlay.

Rule:

- Opening any blocking overlay while Room is open closes Room first, then opens the requested overlay.

This avoids mixed overlay stacks and keeps the top-level overlay model consistent.

This is enforced by the one-active-surface invariant in dialog-store.

## Breakpoint persistence

Room stays open across desktop/mobile layout transitions.

Behavior:

- Desktop sidebar swaps to the mobile Room sheet when the header enters mobile layout.
- Mobile Room sheet swaps back to the desktop sidebar when the header returns to desktop layout.
- The Room return-focus target remains the Room trigger across those transitions.

Blocking overlays such as the mobile More drawer use their own responsive close behavior.

## Focus return

Dialog-store is focus-agnostic; it stores no return-focus target. Focus return
is owned by the surface that opened the dialog:

- Blocking dialogs (keyboard shortcuts, project info, start over) rely on Base
  UI restoring focus to their opener on close.
- The top header returns focus explicitly through a module-level registry
  (`src/app/chrome/top-header/header-focus-registry.ts`) for cases where native
  restore is unreliable: the non-modal Room surface, and the mobile More drawer
  whose menu items unmount on close (focus returns to the More trigger).
- Confirming Start Over disables the Start Over button, so the header walks to
  the next enabled control instead of restoring to a disabled target.
