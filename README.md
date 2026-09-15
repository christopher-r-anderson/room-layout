# Room Layout

Room Layout is a browser-based 3D planner for choosing catalog furniture and
arranging it in a configurable room. Layouts recover from browser storage and
can be shared through URLs.

[Live demo](https://christopher-r-anderson.github.io/room-layout/) ·
[Planner guide](apps/room-layout/README.md)

## Workspaces

| Workspace                                       | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| [room-layout](apps/room-layout/)                | React/three.js planner, prepared public assets, app docs and tests |
| [@room-layout/asset-tool](packages/asset-tool/) | Model/texture export scripts, editable sources and provenance      |

## Development

Use Node.js 24.15+ (24.x) or 26+ and pnpm 11. The repository pins the pnpm version
and shares one lockfile.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm preflight
```

Root app commands forward to `room-layout`; use `pnpm --filter room-layout <command>`
for direct workspace execution. Root lint, formatting, and Knip checks cover the
repository and its workspaces. Install Chromium with `pnpm test:e2e:install`.
See the [testing guide](apps/room-layout/docs/architecture/testing.md) for lanes.

`pnpm models:export` and `pnpm textures:export` forward to the asset tool.
The [export guide](packages/asset-tool/docs/exporting.md) documents external tools
and disposable output paths. Building the planner uses committed prepared assets
and does not run asset exports.

## Documentation and licensing

Shared contributor guidance is in [AGENTS.md](AGENTS.md). Planner docs live with
the app; export docs live with the asset tool. See the [changelog](CHANGELOG.md)
for named milestones.

Source code uses the [MIT License](LICENSE). Third-party furniture and textures
retain their own licenses; see [asset attribution](apps/room-layout/docs/reference/assets-attribution.md).
