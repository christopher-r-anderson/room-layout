# shared

Purpose

- Hold reusable runtime primitives and infra used across layers.

Contains

- `ui/`: shared UI primitives.
- `lib/`: reusable utilities.
- `hooks/`: reusable non-feature hooks.
- `layout/`: shared layout-level utilities and context contracts.
- `providers/`: reusable provider/context wiring.
- `messages/`: shared message constants.
- `debug/`: runtime instrumentation.
- `env/`: build/runtime environment flags.

Should not contain

- App-specific composition logic.
- Feature-owned domain behavior.

See also

- `docs/architecture/architecture.md`
