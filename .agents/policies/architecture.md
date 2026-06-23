# Architecture Policy (Agent Quick Reference)

Canonical source:

- `docs/architecture/architecture.md`
- `eslint.config.js`

Layer intent:

- `src/app`: composition and shell wiring.
- `src/features`: feature-owned user-facing capability.
- `src/core`: shared stores, actions, and contracts.
- `src/shared`: reusable runtime primitives and infra.
- `src/scene`: rendering and scene domain internals.
- `src/test`: test-only support.

Keep this document concise and move layer-local detail to the matching
`src/*/README.md` files.

Placement rules:

1. If consumed by multiple features, do not keep it in one feature folder.
2. If consumed by both app and features, do not keep it in app.
3. Cross-cutting operations (cross-feature stores, actions) live
   in `core`. App is composition-only.
4. Features must not import other features (`@/features/*` is hard-banned);
   coordinate via a store, an `EditorCommand`, or a `core` operation.
5. Keep scene internals in `src/scene/internal`.
6. Outside scene, import only approved scene contracts.
7. Do not import runtime code from `src/test`.
8. Keep `shared/ui` free of app/features/core/scene runtime dependencies.

Move/refactor guidance:

- Prefer separating broad structural reorganization from functional edits so
  reviewers can inspect behavior changes without move noise.
- Update imports, tests, and config in the same change set when they are part
  of the same ownership move.
- Treat ESLint boundary violations as architectural issues, not lint noise.
- When boundary intent changes, update `docs/architecture/architecture.md`.
