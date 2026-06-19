# features

Purpose

- Own user-facing editor capabilities.
- Keep feature behavior, UI, and local orchestration close together.

Contains

- Capability folders such as `catalog`, `selection`, `keyboard`, `startup`, and `url-scene`.
- Feature-local views, hooks, and helpers.
- Feature-owned dialog definition modules that declare per-feature guards, payloads, and default semantic return-focus access points.

Should not contain

- Cross-feature shared state ownership (use `src/editor-state`).
- Cross-feature generic primitives (use `src/shared`).
- Imports from `src/app` runtime modules.

Dialog guidance

- If a dialog represents a feature workflow, keep its `DialogDefinition` in the owning feature folder.
- Feature guards (`canOpen`) and payload derivation belong to the feature definition/controller path, not to app shell or editor-state internals.

Guideline

- If code is consumed by multiple features, move it to `src/shared` or `src/editor-state` depending on responsibility.

See also

- `docs/architecture-boundaries.md`
