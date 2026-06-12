# app

Purpose

- Compose the editor runtime.
- Wire app-shell orchestration and providers.
- Host runtime test bridge wiring.

Contains

- `App.tsx`: composition root.
- `chrome/`: app-shell composition and connected orchestration.
- `controllers/`: app-level orchestration hooks that coordinate multiple domains.
- `hooks/`: app-level hooks used by composition or shell orchestration.
- `testing/`: runtime test harness hooks used by browser automation.

Should not contain

- Generic reusable primitives that belong in `src/shared`.
- Scene internals.
- Test-only infrastructure (put in `src/test`).

See also

- `docs/architecture-boundaries.md`
