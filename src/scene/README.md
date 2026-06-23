# scene

Purpose

- Own scene rendering and scene-domain internals.

Contains

- Scene component composition.
- Scene internal interaction/math/rendering helpers.
- Scene-facing contract types and command surfaces.

Should not contain

- Imports from `src/app` or `src/features`.
- Direct usage of core modules outside approved scene contracts.

Guideline

- Treat scene internals as private implementation details.

See also

- `docs/architecture-boundaries.md`
