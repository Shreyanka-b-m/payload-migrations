# @novel/payload-migrations

Payload CMS v3 plugin for full-site backup and restore. Setup and options: `README.md`. Background: `docs/REWORK.md`.

## Document every change, with its date

In the same change as any edit to this repo (code, styles, options, build, docs):

- Add an entry at the top of the **Unreleased** section of `CHANGELOG.md`, using the template in that file:
  a `### YYYY-MM-DD: title` heading, what changed in plain words, why, and what sites must do after upgrading.
- When releasing, rename **Unreleased** to `## x.y.z (YYYY-MM-DD)`, bump `version` in `package.json`, and add a line to the Timeline in `docs/REWORK.md` if it's a notable change.
- Update `README.md` if setup, options or behaviour changed.

## Building and releasing

- `src/` is the source. `dist/` is compiled output and **is committed**, because sites install straight from GitHub without building.
- Run `pnpm build` before committing any source change, so `dist/` matches `src/`.
- Release: build, bump the version, update `CHANGELOG.md`, commit including `dist/`, then `git tag vX.Y.Z` and push with tags.
- Relative imports in `src/` use `.js` extensions (needed for Node ESM in Payload's CLI).
- Client components are exported from `src/exports/client.ts` and referenced as `@novel/payload-migrations/client#Name`. Keep them out of `src/index.ts`, which is loaded by the Payload config on the server.
