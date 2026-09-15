# Shrinking the room never moves furniture

Status: accepted, 2026-07-13

## Context

Room size became a per-scene, user-settable value: width and depth from 2 to 20
meters, height from 2 to 5, in meters only, with a unit toggle left as its own
future feature. A room that can shrink can strand furniture outside its new
walls, and something has to happen to those items. Every option touches the
layout the person built: block the resize, delete the items, move them
automatically, or leave them where they are and show the situation. The same
question returns on load, because a shared URL or a saved draft can carry a
layout that no longer fits its stored size.

Additionally, research on comparable consumer planners showed that leaving
stranded items in place is the generally expected behavior.

## Decision

A shrink applies exactly as entered and never moves furniture. Items left
outside the walls stay where they are and get a warning outline in the scene,
and the Size tab reports the situation and offers the explicit fix: "Move items
inside", a single undoable history step that pulls each flagged item inside the
bounds.

The fix moves only the items that are outside and doesn't resolve any overlaps
it creates - the collision-resolving version of the fix is examined below. Items
with a footprint larger than the room can't be pulled inside at all, so they get
their own message, and the fix button only renders when a pull would actually
change something.

Restore follows the same rule. A payload restores exactly as saved, and when the
layout doesn't fit the stored room, a toast reports how many items sit outside
the walls - nothing gets moved. Out-of-range stored dimensions clamp silently to
the limits, and a payload without a room size gets the default.

Persistence is additive: an optional `roomSize` field on both the draft and the
share-URL payload, written only when the size differs from the default. Links
and drafts for default-sized rooms stay byte-identical to pre-feature payloads
in both directions, and the payload version stayed at 1, so there is no
migration to maintain.

## Alternatives considered

### Auto-clamp on shrink

Move the stranded items as part of the resize. The resize then silently rewrites
the layout the person built, and someone who shrinks the room just to try a size
has their arrangement changed by the attempt.

### Block the shrink until items fit

Refuse to apply a size that would strand items. Safe for the layout, but it
fights how the task actually goes - shrink first, then rearrange - and it can't
help on load, where the oversized layout already exists.

### Delete stranded items

Destroys the person's work through an action that reads as an adjustment.

### Resolve collisions in the fix action

Have "Move items inside" also move newly colliding items until everything fits.
Rejected for predictability and potential failure: a cascade moves items that
were never flagged and in a way that may still require the person to readjust to
their liking. In addition, given a crowded enough room, a possible solution
isn't even guaranteed.

## Consequences

- Allowing items to exist out of bounds requires maintaining the code to support
  that. The warning outline, the Size tab status, the restore toast, and the
  oversized-item message all exist because items are allowed to be outside the
  walls.
- The fix can create item-on-item overlaps, accepted as the visible,
  hand-fixable failure in exchange for a predictable action.
- Camera framing derives from the room size (the framing dimension is the
  largest of width, depth, and twice the height), so the presets track the size
  range instead of being tuned to one room.
- Default-sized scenes share and save byte-identically to before the feature, so
  old links keep working and there's nothing to migrate.
