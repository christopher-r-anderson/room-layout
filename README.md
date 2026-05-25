# 3D Room Layout Demo

A minimal interactive 3D room layout built with React Three Fiber.

<https://christopher-r-anderson.github.io/room-layout/>

This project demonstrates core web 3D concepts relevant to retail and product experiences, including scene composition, camera controls, collision-aware object placement, history and selection tools, a room-contents panel plus selected-item actions/details, keyboard movement/rotation shortcuts, catalog-driven editor workflows, and a guarded startup asset-loading flow.

## 🏁 Goals

Current editor UI highlights include a visual furniture picker, history tools, a room-contents panel, selected-item actions/details, keyboard movement/rotation shortcuts, startup loading and retryable error overlays, and project/asset information dialogs.

## 🔋 Tech Stack

- React
- Three.js via @react-three/fiber
- @react-three/drei
- TypeScript
- Vite

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

pnpm test         # watch unit tests
pnpm test:run     # run unit tests

pnpm test:e2e:install # install the Chromium browser for Playwright
pnpm test:e2e         # run browser integration tests
pnpm test:e2e:headed  # run browser integration tests in headed mode
pnpm test:e2e:ui      # open the Playwright UI runner
pnpm test:browser:perf # run browser perf scenarios and collect artifacts
```

## 🤖 Browser Tests

The repository now uses Playwright for real-browser editor coverage and scripted browser perf scenarios.

- Use Vitest for pure utility, scene-state, and microbenchmark work.
- Use `pnpm test:e2e` for browser-accurate UI and canvas-adjacent workflows like startup loading, retry flows, and editor history.
- Use `pnpm test:browser:perf` for scripted Chromium interaction measurements that reuse the same harness helpers without acting as a strict correctness gate.
- Browser accessibility audits run through Playwright + axe in the chromium lane (baseline shell, catalog drawer, remove-item dialog, and room-contents/selected-item states).

## ✨ Accessibility

Accessibility is an explicit goal for this project, especially for no-mouse editor workflows.

- The editor supports keyboard-first interaction through room-contents selection, selected-item actions/details, global movement/rotation/history shortcuts, and canvas keyboard browse (spatial navigation when nothing is selected).
- Startup, dialog, and editor feedback flows include screen-reader announcement support and deterministic focus transitions for key operations like delete and selection reconciliation.
- All room-view-specific shortcuts (movement, rotation, deletion, and canvas browse) are scoped to the 3D room view's DOM focus, so keyboard navigation outside the canvas — for example, in the Furniture in room panel or selected-item details inputs — does not accidentally trigger object actions.
- Canvas keyboard browse uses spatial ordering (top-to-bottom, left-to-right by screen projection) so arrow keys follow visual layout rather than an internal list order that may differ from what users see. The visible Furniture in room panel deliberately uses its own stable alpha-by-name order to remain predictable as objects move.
- The Furniture in room panel is the primary accessible alternative to direct canvas interaction. It remains visible regardless of selection state so assistive technology users always have a stable text representation of the room contents.
- There is no duplicate hidden DOM scene graph; the Furniture in room panel represents the room for assistive technology.
- After canvas keyboard selection, announcements include a Tab hint to reach selected item actions and details, so screen reader users know what to do next.
- The current selected-item actions/details are transitional surfaces for a future contextual model. Even if those controls later float visually near the selected object, they should remain after the 3D room view in logical DOM/tab order.
- Automated accessibility checks run through Playwright + axe in Chromium and currently cover baseline shell/dialog states plus room-contents/selected-item states.
- Automated checks are necessary but not sufficient; manual assistive-technology verification remains an ongoing task.

First-time local setup:

```bash
pnpm test:e2e:install
```

Artifacts:

- HTML report: `playwright-report/`
- Raw traces, screenshots, and videos: `test-results/`

The Playwright config starts a local Vite server automatically, so browser tests do not require a separate manual `pnpm dev` session.

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

- [Editor Shortcuts Reference](docs/editor-shortcuts-reference.md): End-user shortcut map for camera, object, and scene actions.
- [Keyboard Shortcuts (Engineering)](docs/keyboard-shortcuts.md): Input architecture, matching/suppression/execution rules, and held-key camera behavior.

## 🖦 Usage

- Click a furniture item to select it, or Tab to the 3D room view and use Arrow keys to browse items spatially without selecting.
- Wait for the startup loading overlay to finish before interacting with the room.
- Drag selected furniture along the floor; movement stays within room bounds and avoids collisions.
- Rotate the selected item with `,` / `.` or the rotate buttons.
- Add another furniture instance from the bottom-centered `Add Furniture` trigger and modal picker.
- Remove the selected item from the selected item actions or with `Delete` / `Backspace`, then confirm the dialog.
- You can fully edit without canvas dragging via the Furniture in room panel and selected item details fields.
- Typed selected-item details commit on `Enter` or blur and cancel the local draft with `Escape`.
- Keyboard movement supports `Arrow` (0.5m), `Shift+Arrow` (1.0m), and `Alt+Arrow` (0.1m).
- With nothing selected, `Arrow` keys browse items in spatial order, `Home`/`End` jump to first/last, and `Enter` or `Space` selects the previewed item.
- Camera controls support held-key orbit/pan/zoom and press-based view presets. See [docs/editor-shortcuts-reference.md](docs/editor-shortcuts-reference.md).
- If a core furniture asset fails to load at startup, use the retry action from the startup error overlay.

## 📚 Catalog

The editor loads its furniture catalog from a runtime manifest (`public/catalog-manifest.json`), allowing catalog updates without rebuilding the app.
The same manifest also defines environment material options (floor texture sets and wall colors) used by the Environment panel.

### Manifest Updates

To add or modify furniture/environment options:

1. **Update the manifest**: Edit `public/catalog-manifest.json` to add collections, catalog entries, and environment finish options
2. **Prepare assets**:
   - Place GLTF model files in `public/models/`
   - Place preview images in `public/catalog-previews/`
3. **Validate**:
   - Node names in GLTF files must match the `nodeName` values in the catalog
   - All paths in the manifest must be relative (e.g., `"models/foo.glb"`)
   - Environment texture paths (`diffusePath`, `normalPath`) must also be relative and should point to `.ktx2` assets
   - Wall finish colors must use `#RRGGBB` format
   - Footprint dimensions must be positive numbers
   - Floor finishes must provide `tileSizeMeters` with positive `width` and `depth`

Floor textures tile from physical dimensions rather than hardcoded UV repeat values:

- `repeat.x = roomWidthMeters / tileSizeMeters.width`
- `repeat.y = roomDepthMeters / tileSizeMeters.depth`

### Floor Texture Pipeline (KTX2)

The editor is configured for KTX2 floor textures using Basis Universal compression:

- Diffuse/albedo: ETC1S at 2K (`*_diff_2k.ktx2`)
- Normal maps: UASTC at 1K with normal-map encoding (`*_nor_gl_1k.ktx2`)

Export textures with:

```bash
pnpm textures:export
```

Requirements for export:

- KTX-Software `toktx` (v4.4.2 or newer recommended)
- ImageMagick (`convert` or `magick`) for normal-map downscaling

Basis decoder files (`public/basis/`) are automatically copied into the project during `pnpm install` and again before `pnpm build`, so Vite can include them from `public/` even though the generated directory is gitignored.

For detailed manifest format and validation rules, see [public/catalog-manifest-schema.md](./public/catalog-manifest-schema.md).

### Manifest Requirement

The editor requires a successfully loaded manifest to function. If the manifest fails to fetch (network error or timeout), a startup error overlay is shown and the editor remains disabled until the user retries.

Because the manifest and all furniture assets are co-deployed as part of the same static build, a manifest fetch failure reflects a deployment problem rather than a recoverable data discrepancy. The editor intentionally has no built-in fallback catalog: silently substituting a different catalog would let users design against inventory that is unavailable or out of date.

### Performance

Asset preloading occurs in the background during startup. If an asset fails to preload, the app surfaces a recoverable error overlay with a retry action. Editor interactions remain disabled until the error is cleared and all assets are successfully loaded.

### URL Scene Sharing

The editor supports sharing a room layout via URL. Use the **Copy Scene URL** button in the toolbar to copy the current layout to the clipboard as a shareable link.

#### Query parameter format

The scene is encoded as a `?scene=` query parameter containing a URL-encoded JSON payload:

```text
?scene=%7B%22v%22%3A1%2C%22items%22%3A%5B%7B%22id%22%3A%22furniture-instance-1%22%2C%22catalogId%22%3A%22armchair-1%22%2C%22position%22%3A%5B0%2C0%2C0%5D%2C%22rotationY%22%3A0%7D%5D%2C%22floorFinishId%22%3A%22granite-tile%22%2C%22wallFinishId%22%3A%22sage-green%22%7D
```

| Field               | Type        | Description                                             |
| ------------------- | ----------- | ------------------------------------------------------- |
| `v`                 | `1`         | Schema version (currently only version 1)               |
| `items`             | array       | Ordered list of furniture instances                     |
| `items[].id`        | string      | Instance identifier (e.g. `furniture-instance-N`)       |
| `items[].catalogId` | string      | Catalog entry ID (must exist in the loaded catalog)     |
| `items[].position`  | `[x, y, z]` | World-space position, rounded to 3 decimal places       |
| `items[].rotationY` | number      | Y-axis rotation in radians, rounded to 3 decimal places |
| `floorFinishId`     | string      | Optional floor finish ID from the loaded environment    |
| `wallFinishId`      | string      | Optional wall finish ID from the loaded environment     |

**Constraints:**

- Encoded payload must not exceed 4000 characters (the button shows an error if the layout is too large to share).
- Duplicate `?scene=` parameters are rejected as invalid.
- All `catalogId` values must reference entries in the currently loaded catalog; unknown IDs cause the restore to fail closed (empty scene + error message).
- Items are sorted by `id` for determinism before encoding.

#### Restore behavior

On startup, if a valid `?scene=` param is present, the editor restores the saved layout **before** the editor becomes interactive. This includes furniture instances and, when provided, wall/floor finish IDs that exist in the loaded environment options.

If the param is invalid (malformed JSON, schema violation, or unknown catalog references), the editor starts empty and displays an error message. The message clears on the next user action (add, move, rotate, delete, undo, redo, select, copy URL).

## 🗺️ Project Plan

Current roadmap and progress checklist are tracked in [PLAN.md](./PLAN.md).

## 🛋️ Assets

- **Leather Couch / Leather Armchair**: Source <https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8>, author <https://sketchfab.com/YouSaveTime>, license CC Attribution 4.0, local details in [./assets-source/leather-couch/leather-couch-source.txt](./assets-source/leather-couch/leather-couch-source.txt)
- **End Table**: Source <https://sketchfab.com/3d-models/end-table-d0032d49ca214200929d4151d733f828>, author <https://sketchfab.com/cirax-we>, license CC Attribution 4.0, local details in [./assets-source/cirax-we-end-table/end-table.txt](./assets-source/cirax-we-end-table/end-table.txt)
- **Modern Coffee Table**: Source <https://sketchfab.com/3d-models/coffee-table-91872709bf054d8994be323599e23107>, author <https://sketchfab.com/zeerkad>, license CC Attribution 4.0, local details in [./assets-source/zeerkad-coffee-table/coffee-table.txt](./assets-source/zeerkad-coffee-table/coffee-table.txt)
- **Classic Coffee Table**: Source <https://sketchfab.com/3d-models/coffee-table-living-room-aa5b9a41c90245e8992ba93de6dde8c8>, author <https://sketchfab.com/maurib98>, license CC Attribution 4.0, local details in [./assets-source/machine-meza-coffee-table-living-room/coffee-table-living-room.txt](./assets-source/machine-meza-coffee-table-living-room/coffee-table-living-room.txt)
- **Wood Floor Texture Set**: Source <https://polyhaven.com/a/wood_floor>, author <https://polyhaven.com/all?a=Dimitrios%20Savva>, license CC0, local details in [./assets-source/environment/textures/polyhaven-dimitrios-savva-wood-floor/polyhaven-dimitrios-savva-wood-floor.txt](./assets-source/environment/textures/polyhaven-dimitrios-savva-wood-floor/polyhaven-dimitrios-savva-wood-floor.txt)
- **Laminate Floor Texture Set**: Source <https://polyhaven.com/a/laminate_floor_02>, photographer <https://www.artstation.com/wyrine>, processing <https://polyhaven.com/all?a=Dario%20Barresi>, license CC0, local details in [./assets-source/environment/textures/polyhaven-charlotte-baglioni-laminate-floor-02/polyhaven-charlotte-baglioni-laminate-floor-02.txt](./assets-source/environment/textures/polyhaven-charlotte-baglioni-laminate-floor-02/polyhaven-charlotte-baglioni-laminate-floor-02.txt)
- **Granite Tile Texture Set**: Source <https://polyhaven.com/a/granite_tile_04>, author <https://www.artstation.com/amalbubble>, license CC0, local details in [./assets-source/environment/textures/polyhaven-amal-kumar-granite-tile-04/polyhaven-amal-kumar-granite-tile-04.txt](./assets-source/environment/textures/polyhaven-amal-kumar-granite-tile-04/polyhaven-amal-kumar-granite-tile-04.txt)
- **Painted Concrete Texture Set**: Source <https://polyhaven.com/a/painted_concrete_02>, author <https://www.artstation.com/tuytel>, license CC0, local details in [./assets-source/environment/textures/polyhaven-rob-tuytel-painted-concrete-02/polyhaven-rob-tuytel-painted-concrete-02.txt](./assets-source/environment/textures/polyhaven-rob-tuytel-painted-concrete-02/polyhaven-rob-tuytel-painted-concrete-02.txt)

## 📄 License

This project source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party furniture assets in this repository remain under their
original CC Attribution 4.0 licenses.

Third-party environment texture assets in this repository remain under
their original CC0 licenses.
