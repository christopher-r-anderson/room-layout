# Configuration

Where configurable values live, ordered by when they become fixed, and how
localStorage keys are namespaced.

## Tiers

| Tier             | Fixed at      | Lives in                        | Examples                                     |
| ---------------- | ------------- | ------------------------------- | -------------------------------------------- |
| code defaults    | authoring     | constants in source             | room dimensions, camera presets, meter units |
| build config     | `vite build`  | `VITE_*` env vars               | `VITE_BASE_PATH`, `VITE_STORAGE_INSTANCE`    |
| deploy config    | startup fetch | `public/catalog-manifest.json`  | catalog, floor/wall finishes, lighting moods |
| user preferences | runtime       | localStorage                    | `outliner-expanded`, `locale`                |
| user data        | runtime       | localStorage, versioned payload | `scene-draft`                                |

The locale is the one value resolved across tiers: transient `?lang=` override
-> stored preference -> browser language -> `en`
(`docs/architecture/i18n.md`). Only an explicit user choice is persisted;
resolved defaults are never written back.

## Storage instance key

Every localStorage key is shaped `room-layout[:<instance>]:<key>`
(`shared/lib/ui/storage.ts`). The instance segment keeps deployments that
share an origin out of each other's drafts and preferences.

`shared/env/storage-instance.ts` resolves the segment at build time:

1. `VITE_STORAGE_INSTANCE`, verbatim (trimmed; blank falls through)
2. otherwise the base path with its surrounding slashes trimmed:
   `/room-layout/` -> `room-layout`, `/shop/planner/` -> `shop/planner`, `/`
   -> no segment (dev servers and root deploys keep unsegmented keys)

Neither value is slugged or sanitized - localStorage keys have no charset
restrictions, and any lossy rewrite would let distinct base paths collide.
Same-origin deployments necessarily differ in base path, so the derived
default already separates them; the env var covers same-build cases the path
cannot distinguish. The e2e lane pins it to `e2e` (`playwright.config.ts`) so
specs can assert exact keys.

The segment comes from build-time inputs because keys are read before first
render (the locale preference), ahead of any fetched config.
