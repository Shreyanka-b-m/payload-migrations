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
