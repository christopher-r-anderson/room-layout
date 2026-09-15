# Runtime validation is hand-rolled; no schema library

Status: accepted, 2026-06-26

## Context

The app takes in JSON it cannot trust from three places: the catalog manifest
fetched at startup, the scene payload carried in a share URL, and drafts
restored from `localStorage`. Each surface has a different audience when
validation fails. The manifest is a developer-authored file, so a failure should
say exactly which entry and field is wrong. The share URL and the draft arrive
from an address bar or from storage, where the right response to a bad payload
is a working default with no message at all.

Given that a schema library is the standard approach to runtime validation,
skipping one is the choice that needs a rationale.

## Decision

Each surface validates with hand-written code that lives next to its one
consumer, and each validator's shape follows from its required failure posture.
The manifest validator (`src/core/operations/catalog-manifest.ts`) throws
messages labeled with the offending entry, aimed at the developer editing the
file. The share URL and draft codecs (`src/core/persistence`) are required to
fall back silently on a bad payload, which is why they validate through
boolean type guards (`(value) => value is T`), and preference storage accepts
an optional validator predicate of the same shape.

Taken together, validation here needs five things:

- primitive checks (a string, a finite number, an array)
- entry-labeled failure messages for a developer
  (`catalog[3] ("couch-1"): "id" must be a non-empty string`)
- transforms during validation (hex color strings to numbers)
- cross-entry checks (unique ids, default references that must name an existing
  entry, safe asset paths)
- two failure postures: throw rich for the manifest, fall back silently for the
  URL and draft

A schema library covers the first well, adds inferred static types, and produces
index paths rather than entry labels. The rest is hand-written under any
library, and the cross-entry checks in particular become refinement hooks
hosting the same logic.

While bundle size was considered, it isn't a motivating factor: Valibot and Zod
Mini tree-shake to a few kilobytes, noise next to the three.js stack the app
already ships.

## Alternatives considered

### Zod

The default choice, but its value concentrates where this app's needs diverge
from its defaults. Inferred types and composed object schemas are real benefits,
but the paths its errors carry would still be translated into the entry-labeled
messages the manifest needs through custom error maps, and the cross-entry
checks would live in `superRefine` as the same hand-written logic. On the silent
surfaces `safeParse` fits cleanly, but the boolean guards there are small enough
that it has little to replace.

### Valibot

The candidate that most aligns with the current patterns. Not adopted because
the current surfaces don't need what it would add. If the manifest ever grows
versioned migrations or a much wider set of nested entry types and the
hand-written checks start to sprawl, this would be the top choice.

## Consequences

- The primitive checks repeat across surfaces. They could be extracted, but the
  manifest's checks throw with entry context while the payload guards return
  booleans, so a shared kernel would save little beyond the `typeof` lines while
  adding a layer both shapes have to fit.
- Alignment between the types and the runtime checks is held by the type checker
  at use sites and by each surface's malformed-payload tests, rather than
  derived from schemas. The `value is T` signature ties a guard to its type, but
  nothing generates one from the other. Of everything a library offers, the
  inferred types are the benefit this decision actually gives up.
- The project doesn't benefit from common library idioms.
- Each surface's failure behavior exactly fits its audience: the manifest fails
  loudly toward a developer, the URL and the draft fail quietly toward a working
  scene.
