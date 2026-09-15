# Interactivity

How this app expresses "you can act on this" vs "you can't right now" across its
controls. This is the project's own convention layered on top of the platform -
which surfaces are toolbars, how disabled state is expressed, and where the
background is made inert. For the blocking/non-blocking overlay model these rules
build on, read `dialogs-and-overlays.md`.

## Toolbars are roving composites

Grouped controls are real Base UI `Toolbar.Root` composites with roving tabindex:
the group is one Tab stop and arrow keys move between its items.

These surfaces are toolbars:

- the **top header** - one `Toolbar.Root` per layout: desktop spans both rows,
  with each `TopHeaderSurface` a visual cluster and `HistoryTools` a
  `Toolbar.Group` inside it; mobile is a single row. Roving covers the whole
  header.
- **camera** controls (`camera-tools.tsx`).
- the **selected-item** actions (`selected-item-tools.tsx`).

These are deliberately **not** toolbars: the **outliner** (a list), the
**selected-details panel** (a form), and **drawer/dialog contents** (e.g. the
More actions drawer - a vertical menu inside a dialog).

A toolbar item is a `Toolbar.Button`. `ToolbarCommandButton` and
`ToolbarPopupButton` (`shared/ui/toolbar-button.tsx`) are the standard items -
both render an icon+label button with a tooltip. The command variant acts now
and carries the shortcut and disabled-reason wiring; the popup variant opens or
toggles another surface and carries `aria-controls`/`aria-expanded` (plus
`aria-haspopup` for dialogs and drawers). Already-composed shared buttons (Add
Furniture, Share) are enrolled with a bare `<Toolbar.Button render={...}>`; the
tooltip/toolbar/button nesting is never hand-built at a call site. Outside a
`Toolbar.Root`, use `Button` directly.

## Disabled state

- **Toolbar controls** use `ToolbarCommandButton` / `Toolbar.Button` with the `disabled`
  prop. Base UI keeps the item focusable, marks it `aria-disabled`, and
  suppresses activation - so screen-reader and keyboard users still reach a
  disabled action and its tooltip explains why it is off. This focusable-disabled
  behavior is the reason these controls are toolbar items rather than bare
  buttons. `ToolbarCommandButton` carries no hand-rolled disabled handling.
- **Drawer/menu rows** - the More actions **Start Over** row uses Base UI's
  `focusableWhenDisabled` (styled via `ariaDisabledButtonClasses`) with a
  visible reason line under the row, wired as its `aria-describedby`. A drawer
  has no hover-tooltip channel on touch, so the reason is shown inline instead.
- **Form controls** - the catalog uses the native `disabled` attribute: the
  **Add Item** button (nothing picked, the picked collection unavailable, or an
  add already in flight) and the radios (collection unavailable, or an add
  already in flight). The selected-details inputs carry no disabled handling.
- For a disabled item whose absence is obvious from a neighbour, the escape hatch
  is Base UI's `focusableWhenDisabled={false}` on the underlying `Toolbar.Button`
  (would need forwarding through `ToolbarCommandButton`); nothing needs it today.

Disabled state encodes a capability gap - no history to undo, no selection to
act on, a scene already at defaults, nothing picked to add - or a briefly
unavailable action: a share or add already in flight, and the outliner rows
while a blocking overlay is open. It never encodes "the editor isn't ready
yet": startup readiness is a background concern handled by deferring the chrome
and the canvas inert seam (next section), so no control carries a
loading-disabled state.

## Background neutralization

A modal overlay neutralizes the chrome behind it - the modal owns this, the
chrome carries no `inert` of its own.

- **Blocking dialogs/drawers** trap focus, hide the background from the
  accessibility tree, and block its pointer events. Base UI dialogs do this out
  of the box. Vaul drawers (catalog, More actions) must set **`autoFocus`** so
  focus moves into the drawer on open and Radix's focus trap engages - Vaul
  defaults `autoFocus` off, which would leave focus on the trigger and let Tab
  walk the (merely `aria-hidden`) background, including a roving tabstop. With
  `autoFocus` the standard modal mechanism covers everything; no manual `inert`.
- **Non-blocking surfaces** (the Room panel) deliberately leave the chrome live.

During startup the editor chrome is **not mounted at all**: `EditorHeader` and
`EditorPanels` are code-split and rendered only once the editor is ready
(`editor-body.tsx`), so there is no chrome to neutralize while assets load.
What _is_ mounted during loading is the canvas - it drives the asset load - so
it carries the one hand-rolled `inert` seam in the app, where there is no modal
to own it:

```text
<div>                                  <- shell column: header and panels share one flow
  <header>                             <- banner landmark, first in tab order
    {chromeMounted && <EditorHeader>}  <- TopHeader toolbar, mounted only when ready
  <main>
    <section "Interactive 3D room editor" inert={startupOverlayActive}>  <- canvas, the only seam
      <SceneCanvas>
    {chromeMounted && <EditorPanels>}  <- RoomSidebar / CameraTools / Outliner /
                                          panels / toolbars, mounted only when ready
    <InitializationProgress> / <InitializationError>   <- shell-level loading UI
      dialogs / drawers render in portals
```

`inert` covers pointer events, focus, and the accessibility tree - but not
window-level keyboard listeners. Those are gated separately:
`useKeyboardShortcuts` and `useCameraKeyState` take a readiness-tied `enabled`
flag.
