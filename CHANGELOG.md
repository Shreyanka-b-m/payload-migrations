# Changelog

Every change to this plugin is logged here, newest first, with the date it was made (YYYY-MM-DD).
Changes not yet released in a version tag go under **Unreleased**. When you tag a release, rename that heading to the version and its date.

<!--
Template: copy for each change.

### YYYY-MM-DD: Short title
- What changed, in plain words.
- Why it changed.
- Anything sites must do after upgrading (reinstall, `generate:importmap`, `migrate:create`), or "Nothing".
-->

## Unreleased

Nothing yet.

## 2.0.0 (2026-09-29)

### 2026-09-29: Renamed to `@novel/payload-plugin-backups` (breaking)
- **Why:** in Payload, "migrations" means database structure changes (`src/migrations/`, `payload migrate`, the internal `payload-migrations` table). This plugin does backups and restores, so the old name was confusing. Payload's own plugins are named `plugin-…`.
- **What changed:**

  | Before | After |
  | --- | --- |
  | Package `@novel/payload-migrations` | `@novel/payload-plugin-backups` |
  | GitHub repo `Shreyanka-b-m/payload-migrations` | `Shreyanka-b-m/payload-plugin-backups` (old URL redirects) |
  | `payloadMigrationsPlugin()` | `backupsPlugin()` |
  | `PluginMigrationsOptions` / `MigrationServiceOptions` | `BackupsPluginOptions` / `BackupServiceOptions` |
  | `createExportArchive` / `restoreExportArchive` / `ImportResult` | `createBackupArchive` / `restoreBackupArchive` / `RestoreResult` |
  | `MigrationManifest` | `BackupManifest` |
  | `createSiteMigrationsCollection` / `SITE_MIGRATIONS_SLUG` | `createBackupsCollection` / `BACKUPS_COLLECTION_SLUG` |
  | `createMigrationEndpoints` | `createBackupEndpoints` |
  | `start/update/finish/reset/getMigrationProgress`, `MigrationProgressState` | `start/update/finish/reset/getBackupProgress`, `BackupProgressState` |
  | Admin component `MigrationDashboard` | `BackupDashboard` |
  | Admin section "Site Backups & Migrations" | "Site Backups" |
  | API `/api/migration/{export,import,backups,download,progress}` | `/api/site-backups/{create,restore,download,progress}`, list/delete at `/api/site-backups` |
- **Not changed, on purpose:** the collection slug stays `site-migrations`. It's the database table name; renaming it would need a database migration and would orphan existing backup entries. The `.zip` format is unchanged, so backups made with 1.x still restore.
- **Sites must do:**
  1. `pnpm remove @novel/payload-migrations`
  2. `pnpm add github:Shreyanka-b-m/payload-plugin-backups#v2.0.0`
  3. In `payload.config.ts`: `import { backupsPlugin } from '@novel/payload-plugin-backups'` and `plugins: [backupsPlugin()]`.
  4. `pnpm payload generate:importmap`
  5. If the site builds with npm (e.g. Docker): `npm install --package-lock-only`.
  - No database migration is needed.

### 2026-09-29: Documentation and dated change log
- Added [docs/REWORK.md](docs/REWORK.md): what the original plugin did, the issues found, what was changed and how it works now.
- Added dates to every changelog entry, and a template for new ones.
- Added the rule that every change is logged here with its date (see README and CLAUDE.md).
- Sites must do: nothing.

## 1.0.1 (2026-09-29)

### 2026-09-29: Renamed the package to `@novel/payload-migrations`
- The package was called `@codenet/payload-migrations`. The `@novel/` name matches the team.
- Sites must do:
  1. `pnpm remove @codenet/payload-migrations`
  2. `pnpm add github:Shreyanka-b-m/payload-migrations#v1.0.1`
  3. Change the import in `payload.config.ts` to `@novel/payload-migrations`.
  4. Run `pnpm payload generate:importmap`.
- No database migration is needed.

## 1.0.0 (2026-09-29)

### 2026-09-29: First standalone release
Extracted from NSH-Next into its own repo. Full details in [docs/REWORK.md](docs/REWORK.md).
- Admin dashboard to create, download, restore and delete full-site backups, with live progress and restore warnings.
- Backs up every collection, global and upload folder found in the Payload config.
- Restore keeps original IDs, matches existing documents by ID/slug/email/filename, and rewrites references when IDs differ.
- Only users of the admin user collection can use it by default (`access` option to customise).
- Options: `enabled`, `access`, `backupDir`, `excludeCollections`.
- Sites must do: install, add the plugin, `generate:importmap`, `migrate:create site_migrations` (see README).
