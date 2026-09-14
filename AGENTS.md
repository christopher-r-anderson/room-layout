# Room Layout - Agent Guide

Room Layout is a browser-based 3D room planner with a separate asset-processing
workspace. Application guidance lives in `apps/room-layout/AGENTS.md`.

## Commands and verification

- Install a fresh checkout with `pnpm install --frozen-lockfile`.
- `pnpm dev` starts the planner; root app commands forward to `room-layout`.
- `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` are the default checks.
- `pnpm preflight` is the full gate; run it before finalizing substantial changes.
- `pnpm models:export` and `pnpm textures:export` invoke the asset tool. App builds
  consume prepared assets and do not require export tools.
- Run lint/format fixes only on touched files or an intentional affected set.
  `pnpm fix` is a broad write-mode command, not a routine prerequisite. Full
  read-only checks remain required; avoid unrelated formatting changes.

## Workflow

Inspect substantial work, create or update a focused ticket when authorized,
agree on scope, then implement. Keep the ticket body current. Routine choices
and fixes within agreed scope need no renewed approval; return for discussion
when findings materially change behavior, compatibility, or scope.

Link the ticket from the PR and describe the implemented result, deviations,
and actual validation. Update overlapping current docs with code. Use an ADR
only for consequential decisions with credible alternatives and lasting rationale.

Commit, push, merge, deploy, tag, or rewrite history only with applicable explicit
authorization. Branch-push permission does not authorize deployment.

## Assets and compatibility

Preserve editable sources, original downloads, authors, source URLs, licenses,
modifications, and dependencies. Retain third-party terms and explicitly license
new contributions before publication. Use original design briefs; do not recreate
named products or use retailer imagery as source assets.

Treat saved layouts and shared URLs as user data. Preserve supported catalog IDs
and formats or agree on explicit migration/break handling. Application versions
and saved/catalog formats are separate contracts.

## Writing and commits

- Lead with what the software does. Use concise practical prose, short paragraphs,
  and useful tables. Ordinary docs describe current behavior; ADRs and changelogs
  intentionally retain history.
- Comments explain constraints code cannot express and stay as short as useful.
  Use `/** */` for warranted exported-symbol comments and `//` elsewhere.
- Use ASCII `-` and `->` in comments, docs, and commit text.
- Use conventional imperative commit subjects, preferably at most 50 characters
  (72 hard limit), referencing issues as `#<number>` when relevant. Optional bodies
  use succinct lowercase bullets wrapped at 72 columns. No bylines or trailers.

Keep shared guidance here and workspace-specific guidance with its owner. Do not
copy rules between files. `CLAUDE.md` imports the canonical AGENTS guidance.
