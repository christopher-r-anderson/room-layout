# Architecture Policy (Agent Quick Reference)

Canonical source:

- `docs/architecture-boundaries.md`
- `eslint.config.js`

Layer intent:

- `src/app`: composition and shell wiring.
- `src/features`: feature-owned user-facing capability.
- `src/editor-state`: shared stores, actions, and contracts.
- `src/shared`: reusable runtime primitives and infra.
- `src/scene`: rendering and scene domain internals.
- `src/test`: test-only support.

Keep this document concise and move layer-local detail to the matching
`src/*/README.md` files.

Placement rules:

1. If consumed by multiple features, do not keep it in one feature folder.
2. If consumed by both app and features, do not keep it in app.
3. Keep scene internals in `src/scene/internal`.
4. Outside scene, import only approved scene contracts.
5. Do not import runtime code from `src/test`.
6. Keep `shared/ui` free of app/features/state/scene runtime dependencies.

Move/refactor guidance:

- Prefer separating broad structural reorganization from functional edits so
  reviewers can inspect behavior changes without move noise.
- Update imports, tests, and config in the same change set when they are part
  of the same ownership move.
- Treat ESLint boundary violations as architectural issues, not lint noise.
- When boundary intent changes, update `docs/architecture-boundaries.md`.
