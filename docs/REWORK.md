# Plugin rework (2026-09-29)

What the site backup plugin was meant to do, what stopped it from working, what was changed, and how it works now.

> **Names:** this document records the rework as it happened, so older sections use the names from that time (`payload-migrations`, "Site Backups & Migrations", `/api/migration/…`). Since v2.0.0 (2026-09-29) the plugin is called `@novel/payload-plugin-backups`, the admin section is "Site Backups" and the API is under `/api/site-backups`. See the Timeline and [CHANGELOG.md](../CHANGELOG.md).

| | |
| --- | --- |
| **Package (current name)** | `@novel/payload-plugin-backups` |
| **Version after the rework** | v1.0.1 (current: see [CHANGELOG.md](../CHANGELOG.md)) |
| **First used in** | NSH-Next |
| **In the admin** | Collections → Site Backups |
| **Date** | 2026-09-29 |

Later changes are logged, with dates, in [CHANGELOG.md](../CHANGELOG.md).

## Contents

1. [What the original plugin was meant to do](#1-what-the-original-plugin-was-meant-to-do)
2. [Issues found, and what was changed](#2-issues-found-and-what-was-changed)
3. [What the plugin does now](#3-what-the-plugin-does-now)
4. [Related fixes in the NSH-Next site](#4-related-fixes-in-the-nsh-next-site)
5. [Using it in a site](#5-using-it-in-a-site)
6. [What it doesn't do (yet)](#6-what-it-doesnt-do-yet)
7. [Timeline](#7-timeline)

## 1. What the original plugin was meant to do

A teammate built a plugin to back up a whole Payload site and restore it later. The idea was sound, and most of it has been kept. The plan was:

- **Create a backup:** save the site's content, settings and uploaded images into one `.zip` file, stored on the server.
- **Restore a backup:** upload a `.zip`, or pick one already on the server, and put the site back to that state.
- **Manage backups:** list stored backups, download them, and delete old ones.
- **Show progress:** a progress bar while a backup or restore runs.
- **Keep a log:** record each backup in a new admin section called "Site Backups & Migrations".

It arrived on 2026-09-29 as a folder copied into NSH-Next's `packages/` directory and switched on in `payload.config.ts`.

## 2. Issues found, and what was changed

Several problems meant the plugin could not run at all. Others would only have shown up later, when someone relied on a backup.

### It could not run in the site

| Before | After |
| --- | --- |
| **The server side was missing.** The dashboard's buttons called web addresses (`/api/migration/…`) that didn't exist, so every button would fail. | Added all six: create backup, restore, list, download, delete, and progress. |
| **The dashboard never appeared.** It wasn't connected to the admin panel, and its table pieces pointed at a folder that doesn't exist in the project (`@/migration/…`). | The dashboard is now the Site Backups page itself, and all admin pieces are registered correctly. |
| **Setup errors.** The code had 4 TypeScript errors. It required an older Payload (3.86.0) than the site uses (3.89.0). The zip library wasn't installed properly. And its main file loaded a style file, which crashes Payload's command-line tools. | All errors fixed. The plugin now uses whichever Payload version the site has. Its dependencies install automatically, and the style file is only loaded by the admin page. |

### Backups would have missed things

| Before | After |
| --- | --- |
| **A fixed list from another site.** It backed up `pages`, `blogs`, `posts`, `categories`, `cf7-tracker` and the `header`/`footer`/`settings` globals, most of which don't exist in NSH-Next. It skipped forms and form submissions. | It reads the site's setup when it runs and backs up **everything** it finds. New sections added later are included automatically. |
| **No images in backups.** It looked for images in `public/media`, but NSH-Next keeps them in `/media`, so it found nothing to save. | It asks Payload where each upload folder is, so images are always found. |

### Risks to logins and content

| Before | After |
| --- | --- |
| **Restore reset every password.** Every restored user got the password `Payload123!`. Anyone who knew it could log in as them. | Existing users keep their current password. Users recreated from a backup keep their original one. |
| **No admin-only rule.** Anyone logged in could have used it. On a site with customer logins, a customer could download the whole database or overwrite the site. | Only admin users can use it (others get "not allowed"). Each site can set its own rule with the `access` option. |
| **No "are you sure?".** One click on Restore or Delete acted immediately. | Restore and delete both ask for confirmation first. |

### Restoring could break links between content

| Before | After |
| --- | --- |
| **Deleted items came back with new ID numbers**, so anything pointing at them broke. This happened during testing: a property lost its featured image after a restore. | Deleted items come back **under their original ID numbers**, so links keep working. The database's ID counter is updated so new items never clash. |
| **Images weren't matched by file name.** If an image already existed under a different ID, restore tried to create it again and failed ("field is invalid: filename"). | Images are also matched by file name. Links to them are rewritten to the ID they have on the site, including images inside lists, blocks and rich text. |
| **Duplicate image files.** Recreating a deleted image record saved a second copy of the file with `-1` added to its name. | Recreated images reuse the restored file and keep their original name. |

### The admin page

| Before | After |
| --- | --- |
| Fixed white colours broke dark mode. The "drag a file here" box didn't accept dropped files. Payload's default search bar and table still showed, half-hidden by a CSS trick. | Redesigned with Payload's own buttons, pop-ups and colours: works in light and dark mode and on phones. Drag and drop works. Shows backup count, total size and last backup time, a live progress panel, and a readable list of any restore warnings. |

### Sharing it with other sites

| Before | After |
| --- | --- |
| The only way to use it elsewhere was to copy the folder into each site and set up paths by hand. Every site would drift into its own version. | It's now a package in its own GitHub repo. Any site installs it with one command and upgrades by changing a version number. It has a README, a changelog and settings. |

## 3. What the plugin does now

- **One-click backup:** saves all content, site settings and uploaded images into one `.zip` on the server, with a live progress bar.
- **Restore:** from a stored backup or an uploaded `.zip`. Merges it into the site and lists any problems as readable warnings.
- **Manage backups:** see, download and delete stored backups, with the count, total size and time of the last backup.
- **Admins only:** only admin users can back up or restore. Every request is checked on the server, not just in the page.
- **Adapts to each site:** reads each site's setup when it runs, so new sections and image fields are included without code changes.
- **Settings:** change the backup folder, leave out chosen sections, or set a custom rule for who may use it.

### How a restore works, in plain terms

1. **Images first.** Image files from the backup are copied into the site's image folder. Files already there are left alone.
2. **Content next, in a safe order.** Images, then users, then everything else, so each item's links point at things that already exist.
3. **Match or recreate.** Each item is matched to an existing one by ID, then web address (slug), email or file name. Matches are updated; missing items are recreated under their original ID.
4. **Fix links.** If a match has a different ID on the site, links to it are updated to that ID.
5. **Report.** The page shows how many items, files and settings were restored. A problem with one item never stops the rest.

A restore **adds and updates** content. It doesn't delete things that were created after the backup.

## 4. Related fixes in the NSH-Next site

These came up while testing the plugin. They're changes to the NSH-Next site itself, not to this plugin.

| Problem | Fix |
| --- | --- |
| **Deleting an image that was in use broke it.** Payload removes the file first, then the database record. If a property required that image, the database refused, so the record stayed but the file was gone (`Potomac-1.webp`). | The file was put back. Media that is used anywhere now **can't be deleted**, and the message names where it's used, e.g. *This file is still used by Property "Woodland Heights #2" (Property Card Image).* This applies to future image fields too. |
| **Docker builds would have failed.** NSH-Next's Dockerfile installs with npm from `package-lock.json`, which wasn't updated when packages were added. | `package-lock.json` is updated. A test install worked without git, as in the Docker image. |
| **Production needs a database change** for the new backups section. Local development creates it automatically, but live sites don't. | Added the database migration `20260929_044605_site_migrations`. It runs automatically when the live site starts. |

## 5. Using it in a site

The full guide is in the [README](../README.md). In short:

1. Install the package:
   ```bash
   pnpm add github:Shreyanka-b-m/payload-plugin-backups#v2.0.0
   ```
2. Add it to `plugins` in `payload.config.ts`:
   ```ts
   import { backupsPlugin } from '@novel/payload-plugin-backups'
   // ...
   plugins: [backupsPlugin()],
   ```
3. Register the admin page, and create the database change for live sites:
   ```bash
   pnpm payload generate:importmap
   pnpm payload migrate:create site_backups
   ```
4. Add `/storage` to `.gitignore` so backup files are never committed.

## 6. What it doesn't do (yet)

It's built for sites set up like NSH-Next: images stored on the server's own disk, a normal server (not Vercel-style hosting), and one language.

- **Cloud image storage** (S3, Vercel Blob): images stored there are not included in backups.
- **Serverless hosting** (Vercel, Netlify): backups saved on the server are wiped, and big ones can time out.
- **Several languages:** only the default language is backed up.
- **Version history:** only the current version of each item is saved, not older versions or drafts.
- **Very large image libraries** (several GB): the zip is built in memory and could run the server out of memory.
- **Password hashes are in backups:** treat backup files as sensitive and don't share them.

## 7. Timeline

All of the rework happened on 2026-09-29, in NSH-Next first and then in this repo.

| Date | What happened |
| --- | --- |
| 2026-09-29 | Original plugin copied into NSH-Next's `packages/` folder and switched on. |
| 2026-09-29 | Made it run: added the missing server routes, connected the dashboard, fixed setup errors, backed up the site's real collections and image folder, removed the default password reset. |
| 2026-09-29 | Redesigned the admin page (dark mode, drag and drop, confirmations, progress, warnings). |
| 2026-09-29 | Restore fixes: original IDs kept, images matched by file name, links rewritten. NSH-Next also got protection against deleting media that's in use. |
| 2026-09-29 | Moved into its own repo as `@codenet/payload-migrations` v1.0.0: admin-only access, settings, README. Published to GitHub. |
| 2026-09-29 | Renamed to `@novel/payload-migrations` (v1.0.1). |
| 2026-09-29 | Added this document and dated change logging. |
| 2026-09-29 | Renamed to `@novel/payload-plugin-backups` (v2.0.0): Payload already uses "migrations" for database changes, so the old name was confusing. Plugin function is now `backupsPlugin()`, admin section "Site Backups", API under `/api/site-backups`. |
