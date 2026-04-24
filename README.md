# 3D Room Layout Demo

A minimal interactive 3D room layout built with React Three Fiber.

<https://christopher-r-anderson.github.io/room-layout/>

This project demonstrates core web 3D concepts relevant to retail and product experiences, including scene composition, camera controls, collision-aware object placement, catalog-driven editor workflows, and a guarded startup asset-loading flow.

---

## ✨ Goals

- Establish a clean 3D scene with real-world scale
- Demonstrate camera interaction patterns
- Provide a foundation for object placement and manipulation
- Keep scope intentionally small and focused

---

## 🧱 Tech Stack

- React
- Three.js via @react-three/fiber
- @react-three/drei
- TypeScript
- Vite

---

## 🚀 Development

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

## Browser Tests

The repository now uses Playwright for real-browser editor coverage and scripted browser perf scenarios.

- Use Vitest for pure utility, scene-state, and microbenchmark work.
- Use `pnpm test:e2e` for browser-accurate UI and canvas-adjacent workflows like startup loading, retry flows, and editor history.
- Use `pnpm test:browser:perf` for scripted Chromium interaction measurements that reuse the same harness helpers without acting as a strict correctness gate.

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

## 📝 Notes

This project is intentionally focused on spatial interaction and rendering fundamentals rather than backend integration or full product features.

The editor UI includes a bottom-centered Add Furniture trigger that opens a modal visual picker, top-left history and selection controls, keyboard rotation shortcuts, a blocking startup loading overlay with asset progress, retryable startup asset error handling, and an info dialog (ℹ) with a repository link and asset attribution details.

## 🎮 Usage

- Click a furniture item to select it.
- Wait for the startup loading overlay to finish before interacting with the room.
- Drag selected furniture along the floor; movement stays within room bounds and avoids collisions.
- Rotate the selected item with `Q` / `E` or the rotate buttons.
- Add another furniture instance from the bottom-centered `Add Furniture` trigger and modal picker.
- Remove the selected item from the selection controls or with `Delete` / `Backspace`, then confirm the dialog.
- If a core furniture asset fails to load at startup, use the retry action from the startup error overlay.

## 🗺️ Project Plan

Current roadmap and progress checklist are tracked in [PLAN.md](./PLAN.md).

## 🛋️ Assets

- **Leather Couch / Leather Armchair**: Source <https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8>, author <https://sketchfab.com/YouSaveTime>, license CC Attribution 4.0, local details in [./assets-source/leather-couch/leather-couch-source.txt](./assets-source/leather-couch/leather-couch-source.txt)
- **End Table**: Source <https://sketchfab.com/3d-models/end-table-d0032d49ca214200929d4151d733f828>, author <https://sketchfab.com/cirax-we>, license CC Attribution 4.0, local details in [./assets-source/cirax-we-end-table/end-table.txt](./assets-source/cirax-we-end-table/end-table.txt)
- **Modern Coffee Table**: Source <https://sketchfab.com/3d-models/coffee-table-91872709bf054d8994be323599e23107>, author <https://sketchfab.com/zeerkad>, license CC Attribution 4.0, local details in [./assets-source/zeerkad-coffee-table/coffee-table.txt](./assets-source/zeerkad-coffee-table/coffee-table.txt)
- **Classic Coffee Table**: Source <https://sketchfab.com/3d-models/coffee-table-living-room-aa5b9a41c90245e8992ba93de6dde8c8>, author <https://sketchfab.com/maurib98>, license CC Attribution 4.0, local details in [./assets-source/machine-meza-coffee-table-living-room/coffee-table-living-room.txt](./assets-source/machine-meza-coffee-table-living-room/coffee-table-living-room.txt)

## 📄 License

This project source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party furniture assets in this repository remain under their
original CC Attribution 4.0 licenses.
