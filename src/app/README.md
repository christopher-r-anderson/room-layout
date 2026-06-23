# app

Purpose

- Compose the editor runtime.
- Wire app-shell orchestration and providers.
- Host runtime test bridge wiring.

Contains

- `App.tsx`: composition root.
- `chrome/`: app-shell composition and connected orchestration.
- `controllers/`: thin shell-composition hooks (e.g. canvas-keyboard, share,
  request-outliner-focus). Cross-cutting operations live in `core/operations`,
  not here.
- `dialogs/`: app-owned dialog runtime context builder and registry bootstrap composition.
- `testing/`: runtime test harness hooks used by browser automation.

Should not contain

- Generic reusable primitives that belong in `src/shared`.
- Cross-cutting runtime operations (put them in `src/core/operations`).
- Scene internals.
- Test-only infrastructure (put in `src/test`).

Dialog architecture notes

- App composes `DialogRuntimeContext` and bootstraps dialog definitions before dialog consumers render.
- App may coordinate multi-domain dialog behavior, but feature-specific guards and payload derivation stay with owning features.

See also

- `docs/architecture/architecture.md`
