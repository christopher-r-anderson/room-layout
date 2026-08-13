# The selected toolbar has one placement model per form factor

Status: accepted, 2026-06-25

## Context

The selected-item toolbar holds the item's actions, and on desktop it floats
next to the selection. Floating is the point there: in a consumer-oriented
layout tool the actions belong next to the item the person just picked,
discoverable without hunting through panels, and research across commercial
planners (Homestyler, Planner 5D, IKEA's planners) showed the
floating-toolbar-plus-details-panel pairing as the common, though not universal,
pattern.

Floating placement can fail - panels and screen edges can crowd out every clean
position - and the original design treated that as a runtime condition to fall
back from. The first fallback docked the toolbar when floating failed. A dock
that appears on demand takes up layout space and re-triggers the very placement
that decided to show it - a feedback loop that locked the layout up - so the
shipped version reserved the dock's space permanently, spending screen area on
an empty slot and still moving the toolbar between two homes. The second
fallback hid the toolbar outright, made survivable by duplicating its actions
into the details panel. Hiding gave the space back and traded a moving toolbar
for a missing one: there at one camera angle, gone at the next, which read as
breakage.

The decision point was the placement model itself: what guarantees the toolbar
is present, close to the item, and in a stable order - on screen and in the tab
sequence - both on a large screen and on a phone.

## Decision

The toolbar has one placement model per form factor, chosen by a static
breakpoint before placement runs, and the model never changes in response to
placement's own outcome. On both form factors the toolbar is always present.

On desktop the toolbar floats. When no clean position survives, it takes a
clamped best-effort position instead: it may overlap the selected object, it
avoids the panels when its candidate positions allow that - a fully crowded
screen gets the least-overlapping of them - and it never leaves the screen.
Placement works on the object's projected points, so in the frames before the
scene has produced any, the toolbar stays hidden rather than guessing at a
position. The scenes with no
clean position are the ones where the selection fills the screen, and there the
choice is overlap or absence - a clamped toolbar keeps the actions next to the
item, which is what floating is for. Clamping also works where the dock could
not, because a clamped position occupies no layout space: nothing about the
fallback changes the inputs the placement was computed from, so there is no loop
to fix.

On a phone the toolbar is permanently docked above the details panel - the same
toolbar, in a fixed home. The mobile layout collapses to top controls, the open
room view, and bottom panels, so the dock sits directly under the room view,
about as close to the furniture as it can be without covering more of it. The
bottom third of the screen is also where a thumb already works during repeated
use. Floating earns its keep on desktop because the pointer operates in the open
room area, far from any panel; on a phone that distance doesn't exist, so
floating would buy nothing there.

Each model keeps one visual order and one tab order. That consistency is what
the failed fallbacks broke: switching models based on where the camera and the
selection happen to sit either reorders the tab sequence dynamically or lets tab
order and visual order disagree.

Committing to floating as the permanent desktop model also forced a decision on
the placement engine's accumulated complexity; the placement-engine decision
covers it.

## Alternatives considered

### Dock when floating fails

The original fallback. On its own it can't ship at all: the dock's layout space
re-triggers the placement that decided to show it, and the layout locks up -
stabilizing it means reserving the space, covered next. The deeper problems
don't depend on how often it fires. Switching to the dock moves the toolbar
between two visual orders - floating by the item versus lined up with the
panels - so the tab sequence either reorders dynamically or disagrees with
what's on screen, and a person has to re-find a control that just moved across
the screen.

### Always reserve space for the dock

Reserving the dock's space at all times is what made on-demand docking
shippable, and it only fixes the layout loop. The reserved slot spends screen
space even when empty, and every problem with the switch itself - the changed
visual order, the tab sequence, the re-finding - stays.

### Hide when floating fails

The fallback that shipped last before this decision. Hiding can't remove the
functionality, so every action was duplicated into the details panel for mouse
users, costing panel space and a second home to keep consistent. Where the dock
moved the toolbar, hiding removed it: presence depended on camera angle, which
read as breakage rather than adaptation, tab order changed with it, and a
keyboard shortcut that jumps to the toolbar has nothing to land on whenever it's
hidden.

### Float on mobile too

One model everywhere instead of one per form factor. On a small screen with
permanent top and bottom UI there is rarely a clean spot to float into, so the
toolbar would live in its fallback, and the dock position is already adjacent to
the room view. Floating on a phone pays all of the desktop model's costs and
buys none of its value.

## Consequences

- The dock-and-hide fallback machinery is gone, and removing it deleted more
  complexity than the clamped fallback added. The fallback can't re-trigger the
  placement it falls back from.
- Desktop fallback placements can overlap the selected object. Accepted by eye:
  in those scenes the choice was overlap or absence, and overlap keeps the
  actions where the person is looking.
- With presence guaranteed on both form factors, the duplicated actions left the
  details panel. The toolbar is the single home for item actions and the panel
  is purely numeric.
- The desktop model's quality rests on the floating placement engine, which
  became permanent infrastructure rather than optional polish; the
  placement-engine decision records what that forced.
