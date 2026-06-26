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

## One inert seam for the background

There is a single hand-rolled `inert` in the app, on the editor-overlay chrome
wrapper (`editor-overlay.tsx`):

```
inert = startupOverlayActive || isBlockingOverlayOpen
```

```
<main>
  <section "Interactive 3D room editor">   ← canvas (sibling, not inerted here)
  <EditorOverlay>
    <div inert={startup || blockingOverlay}>   ← THE SEAM
      TopHeader · FloatingSelectedItemSite · CameraTools · Outliner ·
      SelectedItemToolbar · SelectedDetailsPanel
    dialogs / drawers render in portals OUTSIDE this wrapper → stay interactive
```

When a blocking overlay (e.g. the catalog drawer) or startup is active, the whole
chrome becomes inert in one place; dialogs and drawers live in portals outside
the wrapper, so they remain interactive. Non-blocking surfaces (the Room panel)
leave the chrome live by design.

The seam owns background **focus** removal because it has to: the catalog drawer
(Vaul) hides the background from the accessibility tree and blocks pointer events,
but does not trap Tab away from a background roving tabstop. The single inert seam
covers that gap and keeps the rule uniform across every blocking overlay, so
individual controls carry no inert of their own.
