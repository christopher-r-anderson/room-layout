# Playbook: Refactor/Move-Only Change

Use when the intent is broad structural reorganization, not behavior changes.

Checklist:

1. Separate the structural move from unrelated functional edits when that makes
   the result easier to review.
2. Keep any logic changes narrowly tied to the reorganization if they are
   required to keep the build green.
3. Move path-based tests, mocks, and fixtures with the code they cover.
4. Update boundary config when ownership or layering changes.
5. Update only overlapping docs (`docs/architecture-boundaries.md`,
   `src/*/README.md`, root `README.md` pointers).

Validation:

- Required: `pnpm lint`, `pnpm typecheck`.
- Recommended: `pnpm test:run` when path rewiring is broad.
- Optional: targeted e2e when refactor touches interaction wiring.

Commit guidance:

- Use `refactor(...)` scope.
- State explicitly when there are no functional runtime changes.
- Summarize end-state architecture, not intermediate steps.
