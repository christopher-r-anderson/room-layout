# Room Layout - Agent Guide

Browser-based 3D room-layout editor: React 19 + TypeScript, three.js via
react-three-fiber, zustand stores, Tailwind CSS 4, Base UI + shadcn-derived
components, Lingui i18n, Vite, pnpm.

## Commands

- `pnpm dev` - start the dev server
- `pnpm lint` / `pnpm typecheck` / `pnpm test:run` - default validation set
- `pnpm test:e2e` - Playwright lane (Chromium); first run needs
  `pnpm test:e2e:install`
- `pnpm fix` - apply lint and format fixes; run before finalizing edits
- `pnpm preflight` - the full gate (see `package.json` for the steps); run
  before finalizing a substantial change

Fresh clones and worktrees need `pnpm install` first.

## Architecture

`docs/architecture/architecture.md` is the placement-policy source of truth;
`eslint.config.js` is the executable boundary contract. Layers under `src/`:

- `app` - composition root: chrome, dialogs, command wiring
- `features` - user-facing capabilities; features never import each other
- `core` - headless editor engine: stores, operations, commands, persistence
- `scene` - 3D rendering; internals stay inside `scene/internal`
- `domain` - pure model: catalog, furniture, geometry; imports no other layer
- `shared` - reusable UI/lib/hooks with no editor knowledge
- `src/test` - test-only helpers; runtime code never imports them

Use the `@/` alias for imports unless a local relative import is more
appropriate within the same module area.

## Testing

- Browser-facing behavior changes: add `pnpm test:e2e` to the default set.
- Frame-time-sensitive changes: the idle-churn gate
  (`e2e/selected-toolbar-idle.spec.ts`) is the CI fence; profile on a real GPU
  for actual frame time.
- Lane selection, determinism rules, and a11y lanes:
  `docs/architecture/testing.md`.

## Commits

- Conventional commits: `type(scope): subject`, subject <=50 chars (hard limit
  72), reference issues/PRs as `#<number>` when relevant.
- Body is a succinct lowercase bullet list describing the final state - no
  prose.
- Never add `Co-Authored-By` or other trailers.
- Never force-push, amend pushed commits, or rewrite history unless explicitly
  asked; fix problems in new commits.

## Style

- Comments are sparing: only constraints the code cannot express, in one or
  two lines - never paragraphs.
- The test for any comment: would it be written when writing this code from
  scratch? Content that surfaced during a change earns its place only when it
  is a genuine trip-hazard for a fresh reader.
- A warranted comment on an exported symbol or interface member uses
  `/** */` (editors surface it at call sites); everything else uses `//`.
  Being exported is never by itself a reason to comment.
- Plain wording: no filler openers ("Here,", "Safely,") and no rhetorical
  emphasis patterns ("not just X, but Y").
- Docs, comments, and commit text state current reality only - no journey
  notes, legacy references, or status markers.
- Use ASCII `-` and `->` for dashes and arrows in comments, docs, and commits;
  no em dashes or unicode arrows (a `-` or `;` covers the em dash's job).
- When a change alters behavior or structure, update the overlapping docs
  (`docs/`, `src/*/README.md`, `README.md`) in the same change.

## Docs Map

- `docs/architecture/` - canonical per-subsystem docs (architecture, core,
  scene, focus, feedback, keyboard, i18n, startup, testing, ...)
- `src/*/README.md` - layer-local intent, one per layer
- `docs/guide/` - end-user guides; `docs/reference/` - schema, shortcut, and
  attribution references
- UI components are shadcn-bootstrapped but repo-owned:
  `docs/architecture/ui-components.md`
