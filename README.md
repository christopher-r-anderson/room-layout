# Room Layout

Room Layout is a browser-based retail-style 3D planner for selecting catalog
furniture and exploring different combinations and arrangements in a
configurable room.
Users can enter room dimensions, choose finishes and lighting, add furniture
from a visual catalog, and arrange it with pointer, keyboard, or numeric
controls. Layouts are autosaved in the browser for recovery and shareable
through a URL.

[Live demo](https://christopher-r-anderson.github.io/room-layout/) ·
[Project write-up](https://christopheranderson.net/projects/room-layout)

![Selecting an armchair, dragging it across the floor, and rotating it from the floating toolbar, which tracks the selection throughout](docs/media/motion.gif)

## Contents

- [Using the editor](#using-the-editor)
- [Local development](#local-development)
- [Stack and architecture](#stack-and-architecture)
- [Testing and verification](#testing-and-verification)
- [Project documentation](#project-documentation)
- [Deployment](#deployment)
- [License and asset attribution](#license-and-asset-attribution)

## Using the editor

Set the room's dimensions, wall colors, flooring, and lighting, then add pieces
from the visual catalog. Furniture can be selected directly in the room or from
the `Furniture in room` panel and arranged using pointer controls, keyboard
controls, or exact distance and rotation fields. As individual pieces are
placed or moved, the editor prevents out-of-bounds and overlapping positions
and snaps them to nearby edges.

The browser keeps a recovery draft automatically. Use `Share` on desktop or the
mobile `More actions` menu to create a URL for the current layout.

For a complete walkthrough and shortcut map, see the [user
guide](docs/guide/user-guide.md) and [editor shortcuts
reference](docs/reference/editor-shortcuts-reference.md).

## Local development

### Requirements

- Node.js 24 (24.15 or newer) or 26+
- pnpm 11

### Setup

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite.

Install Chromium before the first browser-test run:

```bash
pnpm test:e2e:install
```

### Checks

```bash
pnpm lint         # ESLint
pnpm format       # Prettier check
pnpm typecheck    # TypeScript
pnpm test:run     # unit and integration tests
pnpm test:e2e     # browser tests against a production preview
pnpm build        # production build
pnpm preflight    # complete local gate
```

The complete gate also checks unused code, generated translation catalogs,
bundle budgets, and the production browser flows. Additional scripts for
coverage, bundle analysis, and asset export are listed in `package.json`.

## Stack and architecture

- React 19 and TypeScript
- Three.js through React Three Fiber and Drei
- Zustand stores
- Tailwind CSS 4 and repository-owned shadcn-derived components
- Lingui and the browser internationalization APIs
- Vite, Vitest, Playwright, and axe-core

The headless core owns the room document, undo history, selection, persistence,
shared editor operations, and ports for engine capabilities. Pure catalog,
geometry, collision, snapping, and placement logic lives in the dependency-free
domain layer. The Three.js scene renders the document and implements the
viewport-specific services. Furniture state changes only through the core.

Application composition and user-facing features sit above those layers.
Features do not import one another, and `eslint.config.js` enforces the major
dependency boundaries. See the [architecture
guide](docs/architecture/architecture.md) and [scene/core
boundary](docs/architecture/scene-and-core.md) for the complete model.

## Testing and verification

Vitest covers geometry, document operations, persistence, focus policy,
loading, and component behavior. Playwright exercises the production build
through pointer and keyboard workflows. Tests that specifically cover canvas
selection or dragging use a build-gated scene-state bridge to dispatch pointer
input at projected object targets and assert the resulting document state. The
production build omits that bridge.

Browser tests run axe across the main editor and transient states such as
dialogs and errors. A manual assistive-technology checklist covers focus changes
and live announcements that cannot be verified from DOM state alone. A
deterministic idle test also verifies that the React application and Scene
components stop rendering and that the selected-toolbar store receives no more
writes after camera and toolbar movement settle.

Pull-request CI runs linting, type checks, translation checks, and unit and
integration tests. Browser tests run on pushes to `main` and are included in the
local `pnpm preflight` gate. See the [testing
guide](docs/architecture/testing.md) for lane selection, determinism rules, and
artifact locations.

## Project documentation

- [User guide](docs/guide/user-guide.md)
- [Architecture](docs/architecture/architecture.md)
- [Testing guide](docs/architecture/testing.md)
- [Architecture decision records](docs/decisions/README.md)
- [Startup and asset loading](docs/architecture/startup-and-asset-loading.md)
- [Selected-toolbar placement](docs/architecture/selected-toolbar-placement.md)
- [Catalog and asset pipeline](docs/architecture/catalog-and-assets.md)
- [Asset attribution](docs/reference/assets-attribution.md)

Additional subsystem references live in `docs/architecture`. Each runtime layer
also has a local `README.md` under `src`.

## Deployment

After CI succeeds on `main`, GitHub Actions builds the corresponding commit and
deploys `dist/` to GitHub Pages. Production builds derive the base path from the
repository name. Local production builds default to `/room-layout/` and can
override it when needed:

```bash
VITE_BASE_PATH=/your-repo-name/ pnpm build
```

Browser storage is namespaced by deployment. See
[Configuration](docs/architecture/configuration.md) for the base-path and
storage-instance settings.

## License and asset attribution

The project source code is available under the [MIT License](LICENSE).
Third-party furniture assets retain their original CC Attribution 4.0 licenses,
and environment textures retain their original CC0 licenses. Complete sources
and licenses are listed in [asset
attribution](docs/reference/assets-attribution.md).
