# features

Purpose

- Own user-facing editor capabilities.
- Keep feature behavior, UI, and local orchestration close together.

Contains

- Capability folders such as `catalog`, `selection`, `keyboard`, and `startup`.
- Feature-local views, hooks, and helpers.
- Feature-owned dialog definition modules that declare per-feature guards, payloads, and default semantic return-focus access points.

Should not contain

- Cross-feature shared state ownership (use `src/core`).
- Cross-feature generic primitives (use `src/shared`).
- Imports from `src/app` runtime modules.
- Imports from other features. `@/features/*` from within a feature is
  hard-banned in `eslint.config.js`; coordinate through a store, an
  `EditorCommand`, or a `core` operation instead.

Dialog guidance

- If a dialog represents a feature workflow, keep its `DialogDefinition` in the owning feature folder.
- Feature guards (`canOpen`) and payload derivation belong to the feature definition/action path, not to app shell or core internals.

Guideline

- If code is consumed by multiple features, move it to `src/shared` or `src/core` depending on responsibility.

See also

- `docs/architecture/architecture.md`
