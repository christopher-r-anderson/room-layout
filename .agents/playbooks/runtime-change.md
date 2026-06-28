# Playbook: Runtime Behavior Change

Use when product behavior, state transitions, or runtime contracts change.

Checklist:

1. Identify behavior contract before editing.
2. Implement with layer ownership intact.
3. Add or update tests near the changed behavior.
4. Validate error and edge paths, not only happy path.
5. Update human docs only where behavior contract changed.
6. Move any impacted fixtures, mocks, or snapshots with the code they exercise.
7. Update user-facing docs when a public contract or workflow changes.

Validation:

- Required: `pnpm lint`, `pnpm typecheck`, `pnpm test:run`.
- Add `pnpm test:e2e` for browser-facing behavior.
- If frame-sensitive flow changed, check the e2e idle-churn gate (`e2e/selected-toolbar-idle.spec.ts`) and profile interactively for real frame-time.

Review focus:

- regressions in focus/keyboard/a11y behavior
- boundary contract drift across app/features/core/scene
- stale test fixtures after model or state-shape changes
