# app

Purpose

- Compose the editor runtime.
- Wire app-shell orchestration and providers.
- Host runtime test bridge wiring.

Contains

- `App.tsx`: bootstrap and render — perf gate, startup bootstrap + the core
  readiness observer, dialog registry bootstrap, reconcilers, and the test bridge,
  composing the provider tree.
- `chrome/`: app-shell composition (editor body/overlay, top header, feedback)
  and the provider-composition root in `chrome/providers`.
- `commands/`: assembles the editor command map and the view-bound focus command
  impls. Command semantics live in `core`/features; this only wires them.
- `dialogs/`: app-owned dialog runtime context and registry bootstrap.
- `testing/`: runtime test harness hooks used by browser automation.

Should not contain

- Generic reusable primitives that belong in `src/shared`.
- Cross-cutting runtime operations (put them in `src/core/operations`).
- Scene internals.
- Test-only infrastructure (put in `src/test`).

Dialog architecture notes

- App triggers the dialog bootstrap once — composing `DialogRuntimeContext` and registering dialog definitions — before dialog consumers render.
- App may coordinate multi-domain dialog behavior, but feature-specific guards and payload derivation stay with owning features.

See also

- `docs/architecture/architecture.md`
