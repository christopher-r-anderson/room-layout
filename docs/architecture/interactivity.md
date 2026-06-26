# Interactivity

How this app expresses "you can act on this" vs "you can't right now" across its
controls. This is the project's own convention layered on top of the platform —
which surfaces are toolbars, how disabled state is expressed, and where the
background is made inert. For the blocking/non-blocking overlay model these rules
build on, read `dialogs-and-overlays.md`.

## Toolbars are roving composites

Grouped controls are real Base UI `Toolbar.Root` composites with roving tabindex:
the group is one Tab stop and arrow keys move between its items.

These surfaces are toolbars:

- the **top header** — one `Toolbar.Root` spanning both rows; each
  `TopHeaderSurface` is a visual cluster, and `HistoryTools` renders a
  `Toolbar.Group` inside it. Roving covers the whole header.
- **camera** controls (`camera-tools.tsx`).
- the **selected-item** actions (`selected-item-tools.tsx`).

These are deliberately **not** toolbars: the **outliner** (a list), the
**selected-details panel** (a form), and **drawer/dialog contents** (e.g. the
More actions drawer — a vertical menu inside a dialog).

A toolbar item is a `Toolbar.Button`. `ToolButton` (`shared/ui/tool-button.tsx`)
is the standard one (icon + tooltip carrying label, shortcut, and disabled
reason); plain header buttons are wrapped as `<Toolbar.Button render={…}>`.

## Disabled state

- **Toolbar controls** use `ToolButton` / `Toolbar.Button` with the `disabled`
  prop. Base UI keeps the item focusable, marks it `aria-disabled`, and
  suppresses activation — so screen-reader and keyboard users still reach a
  disabled action and its tooltip explains why it is off. This focusable-disabled
  behavior is the reason these controls are toolbar items rather than bare
  buttons. `ToolButton` carries no hand-rolled disabled handling.
- **Form controls** (catalog radios and Add Item, selected-details inputs) use
  the native `disabled` attribute.
- `focusableWhenDisabled={false}` on a `Toolbar.Button` is the escape hatch for a
  disabled item whose absence is obvious from a neighbour; nothing needs it
  today.

Selection controls only carry one disabled condition — the editor loading
lockout — resolved in `selection-controls-interactivity.ts`. A blocking overlay
no longer factors in here; the inert seam (below) handles that.

## Background neutralization

A modal overlay neutralizes the chrome behind it — the modal owns this, the
chrome carries no `inert` of its own.

- **Blocking dialogs/drawers** trap focus, hide the background from the
  accessibility tree, and block its pointer events. Base UI dialogs do this out
  of the box. Vaul drawers (catalog, More actions) must set **`autoFocus`** so
  focus moves into the drawer on open and Radix's focus trap engages — Vaul
  defaults `autoFocus` off, which would leave focus on the trigger and let Tab
  walk the (merely `aria-hidden`) background, including a roving tabstop. With
  `autoFocus` the standard modal mechanism covers everything; no manual `inert`.
- **Non-blocking surfaces** (the Room panel) deliberately leave the chrome live.

The one hand-rolled `inert` in the app is the **startup** seam on the
editor-overlay wrapper (`editor-overlay.tsx`), where there is no modal to own it:

```text
<main>
  <section "Interactive 3D room editor">     ← canvas
  <EditorOverlay>
    <div inert={startupOverlayActive}>        ← the only seam
      TopHeader · FloatingSelectedItemSite · CameraTools · Outliner ·
      SelectedItemToolbar · SelectedDetailsPanel
    dialogs / drawers render in portals OUTSIDE this wrapper
```
