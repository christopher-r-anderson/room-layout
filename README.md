# 3D Room Layout Demo

A minimal interactive 3D room layout built with React Three Fiber.

<https://christopher-r-anderson.github.io/room-layout/>

This project demonstrates core web 3D concepts relevant to retail and product experiences, including scene composition, camera controls, collision-aware object placement, and catalog-driven editor workflows.

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
```

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

The editor UI includes a catalog-driven add/remove panel, keyboard rotation shortcuts, and an info dialog (ℹ) with a repository link and asset attribution details.

## 🎮 Usage

- Click a furniture item to select it.
- Drag selected furniture along the floor; movement stays within room bounds and avoids collisions.
- Rotate the selected item with `Q` / `E` or the rotate buttons.
- Add another furniture instance from the catalog panel in the top-left corner.
- Remove the selected item from the panel or with `Delete` / `Backspace`, then confirm the dialog.

## 🗺️ Project Plan

Current roadmap and progress checklist are tracked in [PLAN.md](./PLAN.md).

## 🛋️ Assets

- **Model**: Leather Couch
- **Source**: <https://sketchfab.com/3d-models/leather-couch-c2ac7a44144e4b80ab51f21b59c827f8>
- **Author**: <https://sketchfab.com/YouSaveTime>
- **License**: CC Attribution
- **Modifications and Info**: [./assets-source/leather-couch/leather-couch-source.txt](./assets-source/leather-couch/leather-couch-source.txt)

## 📄 License

This project source code is licensed under the MIT License. See [LICENSE](./LICENSE).

Third-party assets may use different licenses. In this repository, the leather couch model listed above remains under its original CC Attribution license.
