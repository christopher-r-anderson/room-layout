# Releases

The planner version lives in `apps/room-layout/package.json`. During 0.x, use
minor versions for new capabilities or declared breaking changes and patches for
compatible fixes. Catalog/scene formats and future asset-tool releases have
independent versions. The private root has no public release version.

## Version and changelog

A changelog entry describes what a version contains, not whether a deployment
has finished. Keep work-in-progress status and proposed release grouping in the
PR or issue. Before integrating work selected for a release, finalize its version
and dated changelog entry together. Describe changes directly without pending
or deployed status labels, and do not carry substantive notes under Unreleased
into main.

Several PRs can contribute to one version. A PR does not require its own release
or version bump; choose the grouping before integration. The manifest version
identifies the selected milestone, while the commit identifies the exact build.
Merging starts the deployment workflow; successful deployment is verified
separately. Version numbers and changelog entries do not prove deployment success.

## Build identity

Each production build emits `build-info.json` alongside `index.html`, containing
the planner `version`, full Git `commit`, and `dirty` working-tree flag. The SHA
comes from the checked-out revision, including in CI.

`dirty` covers the whole repository, including the asset-tool workspace. It is
true for staged, unstaged, or untracked changes and false when Git reports none.
Ignored files do not count. Without Git identity, `commit` and `dirty` are null.
This flag qualifies a local build's commit label; it does not guarantee
reproducibility. Ignored environment files, tool versions, and other external
inputs can still affect a build with `dirty: false`.

A release build must have a known commit and `dirty: false`. This is a verification
requirement; the metadata code does not block builds or deploy them. Read metadata
under the deployment base path, for example `/room-layout/build-info.json`.

## Verification and publication

1. Finalize the version and changelog for the selected release. Run
   `pnpm preflight` in a fresh installed checkout and review saved-format
   compatibility. Confirm the exact commit and clean working tree.
2. Obtain authorization for main integration and deployment. Successful main CI
   triggers the Pages workflow, which checks out that CI run's SHA.
   Manual workflow dispatch is a deployment and needs its own authorization.
3. Verify the Pages artifact and live site against that SHA. Check build metadata,
   asset requests, loading, interaction, recovery, and sharing at the deployed
   base path.
4. With tagging authorization, tag that verified commit, for example
   `git tag -a room-layout-v<version> <verified-sha> -m 'Room Layout <version>'`,
   then push the explicit tag. Never move a published tag. GitHub release
   publication is separate and requires authorization.

## Rebuild and rollback

To inspect or rebuild a prior revision, create a detached worktree at its SHA or
immutable tag, install with its frozen lockfile, and use that revision's documented
build command, output path, and Node/pnpm versions. Prepared assets are included
in those revisions. The planner's production default is `/room-layout/`; use
`VITE_BASE_PATH` only when building for a different base. Workspace builds produce
`apps/room-layout/dist/`.

Before rollback, check whether drafts or shared links written by newer versions
remain readable. Preserve recoverable data if a migration is needed; never reset
it silently. With explicit rollback authorization, create and push a rollback
branch at the chosen revision, then dispatch its Pages workflow with
`gh workflow run deploy-pages.yml --ref <rollback-branch>`. Check the actual
workflow/configuration at that revision first. Verify the deployed SHA and live
site again. Coordinate subsequent main deployments so they do not unintentionally
replace the rollback.
