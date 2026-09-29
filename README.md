# @novel/payload-plugin-backups

Full-site **backup, download and restore** for Payload CMS v3 sites. One click saves every collection, global and uploaded file into a single `.zip`; restoring puts the site back to that state.

A Payload **plugin** that adds a **Site Backups** page to the admin panel:

- create a backup (with live progress)
- list, download, restore and delete stored backups
- restore from an uploaded `.zip`
- follows the admin theme (light/dark) and works on phones

How this plugin came to be, the issues fixed in the original version, and how it works: [docs/REWORK.md](docs/REWORK.md). Every change since is in [CHANGELOG.md](CHANGELOG.md), with dates.

## When to use it

It's built for sites set up like NSH-Next:

| Works with | Not supported (yet) |
| --- | --- |
| Payload `^3.0.0` on Next.js | Payload v2 |
| Postgres, SQLite or MongoDB | |
| Uploads stored on the server's disk (`upload: true`, the default) | Cloud storage adapters (S3, Vercel Blob, …): files are **not** backed up |
| A normal server or VPS with a persistent disk | Serverless hosting (Vercel, Netlify): backups are lost and large ones time out |
| One language | Localization: only the default locale is backed up |

Also note:

- Backups include user password hashes. Treat the `.zip` files as sensitive.
- Only the current version of each document is saved, not version history or drafts.
- The archive is built in memory, so media libraries of several GB may run the server out of memory.
- The progress bar assumes the site runs as a single server process.

## Install

```bash
pnpm add github:Shreyanka-b-m/payload-plugin-backups#v2.0.0
```

The version after `#` is a Git tag, so every site stays on the version it was tested with. The package ships compiled code in `dist/`, so there is no build step on install.

If the repository is **private**, every machine and build that installs it needs read access to it, including Docker builds and CI. See [Private repository](#private-repository).

## Setup

**1. Add the plugin** in `payload.config.ts`:

```ts
import { backupsPlugin } from '@novel/payload-plugin-backups'

export default buildConfig({
  // ...
  plugins: [backupsPlugin()],
})
```

**2. Regenerate the admin import map** so the dashboard component is registered:

```bash
pnpm payload generate:importmap
```

**3. Create a database migration** for the plugin's backup log collection (Postgres/SQLite). Its internal name is `site-migrations`; that's the plugin's original name, kept so existing sites' data stays in place. `next dev` creates the table automatically, but production needs the migration:

```bash
pnpm payload migrate:create site_backups
```

MongoDB sites skip this step.

**4. Keep backups out of Git.** Add this to `.gitignore`:

```gitignore
/storage
```

**5. (Optional) Regenerate types:** `pnpm payload generate:types`.

Open **Collections → Site Backups** in the admin panel.

## Options

```ts
backupsPlugin({
  enabled: true,
  backupDir: 'storage/backups',
  excludeCollections: ['form-submissions'],
  access: ({ req }) => req.user?.collection === 'users' && req.user?.role === 'admin',
})
```

| Option | Default | Description |
| --- | --- | --- |
| `enabled` | `true` | `false` removes the plugin completely (collection, admin page, API routes). |
| `access` | Logged-in users of the admin user collection (`admin.user`) | Who may create, download, restore and delete backups. Applies to the API routes and the admin page. |
| `backupDir` | `BACKUP_DIR` env variable, else `storage/backups` | Where `.zip` files are stored. Absolute, or relative to the working directory. Must be a persistent disk. |
| `excludeCollections` | `[]` | Collection slugs to leave out of backups and restores. Payload's internal `payload-*` collections are always skipped. |

## What gets backed up

The plugin reads the Payload config when it runs, so new collections, globals and upload fields are included automatically:

- every collection except Payload's internal ones and `excludeCollections`
- every global
- the files in each upload collection's folder (its `staticDir`), including resized image variants

Archive layout: `manifest.json`, `collections/<slug>.json`, `globals/<slug>.json`, `uploads/<slug>/<file>`.

## How restore works

Restore **merges** the backup into the site. Documents in the backup overwrite matching documents; documents that only exist on the site are left alone.

1. Uploaded files are written to disk. Files that already exist are kept.
2. Collections are restored in dependency order: upload collections, then auth collections, then the rest.
3. Each document is matched to an existing one by ID, then by `slug`, `email` (auth collections) or `filename` (upload collections).
   - **Match found:** the existing document is updated. Existing users keep their current password.
   - **No match:** the document is recreated **under its original ID**, so other documents that reference it stay valid. Postgres ID sequences are moved past restored IDs.
4. If a document matches one with a *different* ID (for example, a file that was re-uploaded), relationships and uploads in later documents are rewritten to point at the site's ID. This covers arrays, blocks, groups, tabs and rich text.
5. Globals are updated.

Problems with single documents don't stop the restore. They're listed as warnings in the dashboard.

## REST API

All routes are under `/api` and require a user allowed by `access`.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/site-backups/create` | Create a backup. Returns `{ filename, sizeBytes }`. |
| `GET` | `/site-backups` | List stored backups. |
| `GET` | `/site-backups/download/:filename` | Download a backup. |
| `DELETE` | `/site-backups?filename=` | Delete a backup and its log entry. |
| `POST` | `/site-backups/restore` | Restore from multipart `file` (upload) or JSON `{ "filename" }` (stored backup). |
| `GET` | `/site-backups/progress` | Progress of the running backup or restore. |

The functions behind them are exported too: `createBackupArchive(payload, options)`, `restoreBackupArchive(payload, zipBuffer, options)`, `listBackups(dir)` and more. Use them in scripts run with `payload run`.

## Private repository

Installing from a private GitHub repo needs credentials wherever `pnpm install` / `npm ci` runs:

- **Developer machines:** being logged in to GitHub with access to the repo is enough (SSH key or `gh auth login`).
- **Docker / CI:** the build needs `git` and a GitHub token with read access, e.g. in the Dockerfile's install stage:

  ```dockerfile
  RUN apt-get update && apt-get install -y --no-install-recommends git
  RUN --mount=type=secret,id=github_token \
      git config --global url."https://$(cat /run/secrets/github_token)@github.com/".insteadOf "https://github.com/" \
      && npm ci
  ```

  Build with `docker build --secret id=github_token,env=GITHUB_TOKEN .`

A public repository needs none of this.

## Developing the plugin

### Document every change

Every change to this repo, however small, gets a dated entry in [CHANGELOG.md](CHANGELOG.md) **in the same commit**. Add it under **Unreleased** using the template at the top of that file: the date (YYYY-MM-DD), what changed in plain words, why, and what sites must do after upgrading. Also update this README when setup, options or behaviour change.

### Commands

```bash
pnpm install
pnpm build       # compile to dist/ (TypeScript + SCSS → CSS)
pnpm dev         # recompile TypeScript on change
pnpm typecheck
```

To try changes in a site before releasing, install from the local folder:

```bash
# in the site
pnpm add file:../payload-plugin-backups
```

Re-run `pnpm build` in the plugin, then `pnpm install` in the site, after each change. Switch the site back to the GitHub version before committing.

### Releasing a new version

`dist/` is committed so sites can install without building.

1. Make the change, then run `pnpm build`.
2. Bump `version` in `package.json`. In `CHANGELOG.md`, rename **Unreleased** to `## x.y.z (YYYY-MM-DD)` with today's date.
3. Commit **including `dist/`**, then tag and push:

   ```bash
   git tag v2.1.0 && git push && git push --tags
   ```

4. In each site: `pnpm add github:Shreyanka-b-m/payload-plugin-backups#v2.1.0`, test, and commit the lockfile.

If a release adds or changes fields of the backup log collection (`site-migrations`), sites also need `pnpm payload migrate:create`.
