# Changelog

## 1.0.0

First standalone release, extracted from NSH-Next.

- Admin dashboard to create, download, restore and delete full-site backups, with live progress and restore warnings.
- Backs up every collection, global and upload folder found in the Payload config.
- Restore keeps original IDs, matches existing documents by ID/slug/email/filename and rewrites references when IDs differ.
- Only users of the admin user collection can use it by default (`access` option to customise).
- Options: `enabled`, `access`, `backupDir`, `excludeCollections`.
