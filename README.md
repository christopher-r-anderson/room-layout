# 3D Room Layout Editor

An interactive 3D furniture arrangement and room configuration tool built with React and Three.js.

<https://christopher-r-anderson.github.io/room-layout/>

Pick furniture from a visual catalog, arrange items in real time, adjust room surfaces without leaving the layout, and share your setup via URL.

## Design Highlights

- **Collision-aware placement**: Furniture stays in valid positions; bounds and collision checks keep layouts safe and predictable
- **Keyboard-first workflows**: Canvas interaction, item selection via outliner, and details editing all work without drag
- **Accessible dialog contracts**: Focus management, Escape behavior, and role semantics across overlays and confirmations
- **Non-modal room editing**: Adjust wall and floor finishes while viewing the result in context, no mode-switching overhead
- **Smart toolbar placement**: Selection-oriented controls use viewport-relative positioning with deterministic fallback tiers
- **Asset resilience**: Loading state gates editor controls; failures show a recovery path instead of a broken state

## ⚡ Quick Start

```bash
pnpm install
pnpm dev
```

Open the app at the local URL shown by Vite.

## 🖦 Using the Editor

For a user-facing walkthrough, see [docs/user-guide.md](docs/user-guide.md).

- Add furniture from `Add Furniture`, then select items in the room or from the
  `Furniture in room` panel.
- Move and rotate selected items with direct manipulation, selected-item
  controls, or keyboard shortcuts.
- Open `Room` to change floor and wall finishes without leaving the editor.
- Use `Share` on desktop or the mobile `More` menu to generate a shareable room
  URL.

Shortcut details are documented in
[docs/editor-shortcuts-reference.md](docs/editor-shortcuts-reference.md).

## 🧑‍💻 Development

```bash
pnpm dev          # start dev server
pnpm build        # typecheck + production build
pnpm preview      # preview production build

pnpm typecheck    # run TypeScript checks

pnpm lint         # run ESLint
pnpm lint:fix     # fix lint issues

pnpm format       # check formatting
pnpm format:write # apply formatting
pnpm fix          # lint + format fixes

pnpm knip         # check for unused files and exports
pnpm knip:fix     # remove unused files and exports

pnpm test         # watch unit tests
pnpm test:run     # run unit tests

pnpm test:e2e:install # install the Chromium browser for Playwright
pnpm test:e2e         # run browser integration tests
pnpm test:e2e:headed  # run browser integration tests in headed mode
pnpm test:e2e:ui      # open the Playwright UI runner
pnpm test:browser:perf # run browser perf scenarios and collect artifacts
```

For current UI component policy and the temporary knip export exception, see
`docs/ui-components.md`.

## 🤖 Testing

Use lane-specific tests based on the change scope:

- `pnpm test:run`: unit and integration checks
- `pnpm test:e2e`: browser workflow coverage
- `pnpm test:browser:perf`: scripted performance scenarios
- `pnpm bench`: utility microbenchmarks

Detailed testing workflow guidance lives in `docs/testing.md`.
It also includes first-time Playwright setup and test artifact locations.

## ✨ Accessibility

Accessibility is an explicit goal for this project, especially for no-mouse editor workflows.

- Keyboard-first workflows are a primary product requirement.
- Room-view shortcuts are scoped to room-view focus.
- Furniture-in-room panel acts as the primary text alternative to direct canvas interaction.
- Accessibility checks run through Playwright + axe in Chromium, plus manual assistive-tech verification.

The Playwright config starts a local Vite server automatically, so browser
tests do not require a separate manual `pnpm dev` session.

## 🌐 Deployment

This repository deploys automatically to GitHub Pages via GitHub Actions.

- Trigger: push to `main` (or manual workflow dispatch)
- Workflow: `.github/workflows/deploy-pages.yml`
- Publish target: `dist/` output from `pnpm build`
- Base path: set automatically in CI as `/${repository-name}/`

Production builds in GitHub Actions derive the base path from the repository name, which keeps forks and renamed repositories portable.

For local production builds, the default fallback remains `/room-layout/`. If needed, override it explicitly:

```bash
VITE_BASE_PATH=/your-repo-name/ pnpm build
```

Current deployment URL:

<https://christopher-r-anderson.github.io/room-layout/>

## 📝 Documentation

In addition to this README, project-specific guides are available:

### Architecture

- [Architecture Boundaries](docs/architecture-boundaries.md): Layer map, placement rules, current exceptions, and planned boundary improvements.
- [Editor State Architecture](docs/editor-state-architecture.md): Current Phase 1 boundary between app shell state, shared editor-state stores, and scene-owned behavior.

### Contributor Workflows

- [Testing Guide](docs/testing.md): Contributor test lane selection and browser test workflow guidance.
- [Catalog and Assets](docs/catalog-and-assets.md): Manifest editing, validation, texture pipeline, and asset contract notes.
- [Catalog Manifest Schema](docs/catalog-manifest-schema.md): Full catalog manifest field reference and validation constraints.
- [UI Components Policy](docs/ui-components.md): shadcn ownership model and knip export exception.

### Feature and Behavior References

- [User Guide](docs/user-guide.md): End-user workflows and controls overview.
- [Editor Workflow Reference](docs/editor-workflow-reference.md): Contributor-oriented manual workflow map for development and testing.
- [URL Scene Sharing](docs/url-scene-sharing.md): Shared URL payload and restore behavior.
- [Assets Attribution](docs/assets-attribution.md): third-party asset source and license attribution.
- [Editor Shortcuts Reference](docs/editor-shortcuts-reference.md): End-user shortcut map for camera, object, and scene actions.
- [Keyboard Shortcuts (Engineering)](docs/keyboard-shortcuts.md): Input architecture, matching/suppression/execution rules, and held-key camera behavior.
- [Overlay Interaction Model](docs/overlay-interaction-model.md): Blocking overlays vs the non-blocking Room surface, including focus and breakpoint behavior.
- [Selected Toolbar Placement](docs/selected-toolbar-placement.md): Bounds source order, viewport-space placement, floating candidate scoring, and docked fallback behavior.

### Automation

- [AGENTS.md](AGENTS.md): Agent contract and routing to modular policy files.

Local architecture notes are also available in:

- `src/app/README.md`
- `src/features/README.md`
- `src/editor-state/README.md`
- `src/shared/README.md`
- `src/scene/README.md`
- `src/test/README.md`

## 📚 Catalog

The editor is catalog-driven through `public/catalog-manifest.json`.

For manifest updates, validation rules, texture export requirements, and asset
pipeline details, see `docs/catalog-and-assets.md`.

For schema details, see `docs/catalog-manifest-schema.md`.

### URL Scene Sharing

The editor supports sharing a room layout via URL (`?scene=`). Use the desktop
Share action or mobile More menu to invoke native share or clipboard fallback.

For payload schema, constraints, and restore behavior details, see
`docs/url-scene-sharing.md`.

## 🛋️ Assets

See `docs/assets-attribution.md` for full third-party attribution details.

## 📄 License

This project source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party furniture assets in this repository remain under their
original CC Attribution 4.0 licenses.

Third-party environment texture assets in this repository remain under
their original CC0 licenses.
