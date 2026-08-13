# URL Scene Sharing

This guide documents the shared URL scene payload used by the editor.

## Summary

The editor can encode room layouts in a `?scene=` query parameter and restore
that layout on startup. The payload codec (field shape, rounding, validation)
is `src/core/persistence/scene-payload.ts`; `src/core/persistence/scene-url.ts`
adds the `v: 1` envelope, the query parameter, and the length limit.

## Payload Shape

- `v`: schema version (`1`)
- `items`: ordered list of furniture instances
- `items[].id`: instance ID
- `items[].catalogId`: manifest catalog entry ID
- `items[].position`: `[x, y, z]` rounded to 3 decimals
- `items[].rotationY`: radians rounded to 3 decimals
- `floorFinishId` and `wallFinishId`: optional environment finish IDs
- `lightingMoodId`: optional lighting mood ID
- `roomSize`: optional `{ width, depth, height }` in meters, rounded to 3
  decimals; omitted at the default size (6 x 6 x 2.5). Out-of-limits values
  are clamped on load; furniture is restored verbatim even when it falls
  outside the room, with a warning.

Optional environment fields are additive: a payload that omits them, or an older
client that does not recognize one, still loads (unknown fields are ignored and
missing ones fall back to manifest defaults). New optional fields keep `v: 1`.

## Constraints

- encoded payload length must be <= 4000 chars
- duplicate `scene` query params are invalid
- duplicate `items[].id` values are invalid
- unknown `catalogId` values fail restore closed
- items are sorted by `id` before encoding for determinism

## Restore Behavior

On startup, a valid `?scene=` is restored before editor interaction begins,
and the parameter is then removed from the address bar. An invalid or
unrestorable link recovers the local draft when a valid one exists, with a
warning; without one, the scene starts empty and an error message is shown.

## User Entry Points

Use desktop Share action or mobile More actions menu Share action. The app
uses native share where available and clipboard fallback otherwise. Share URLs
carry only the `scene` parameter; a `?lang=` override is not propagated.

## Related Docs

- `README.md`
- `docs/architecture/catalog-and-assets.md`
