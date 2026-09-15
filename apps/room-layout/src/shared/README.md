# shared

Purpose

- Hold reusable runtime primitives and infra used across layers.

Contains

- `ui/`: shared UI primitives.
- `lib/`: framework-agnostic utilities - React imports are lint-banned here.
- `hooks/`: reusable non-feature hooks.
- `layout/`: shared layout-level hooks (header layout mode, the rect registry).
- `messages/`: shared message descriptors and brand/identity constants.
- `i18n/`: the Lingui i18n runtime - the global `i18n` instance, locale
  resolution/activation, and memoized `Intl` formatters. See
  `docs/architecture/i18n.md`.
- `debug/`: runtime instrumentation.
- `env/`: build/runtime environment flags.

Should not contain

- App-specific composition logic.
- Feature-owned domain behavior.

See also

- `docs/architecture/architecture.md`
