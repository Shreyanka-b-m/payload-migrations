/**
 * @novel/payload-migrations: full-site backup, download and restore for Payload CMS v3.
 *
 * Admin UI: Collections → "Site Backups & Migrations".
 * REST API (admin users only): /api/migration/{export,import,backups,download/:filename,progress}
 * Setup and options: see README.md.
 */
import type { Plugin } from 'payload';
import type { PluginMigrationsOptions } from './types.js';
export declare const payloadMigrationsPlugin: (options?: PluginMigrationsOptions) => Plugin;
export type { PluginMigrationsOptions, MigrationServiceOptions } from './types.js';
export { isAdminUser } from './types.js';
export { SITE_MIGRATIONS_SLUG, createSiteMigrationsCollection } from './SiteMigrations.js';
export { createMigrationEndpoints } from './endpoints.js';
export { createExportArchive, type MigrationManifest } from './exportService.js';
export { restoreExportArchive, type ImportResult } from './importService.js';
export { getBackupCollections, getBackupGlobalSlugs } from './siteSchema.js';
export { startMigrationProgress, updateMigrationProgress, finishMigrationProgress, resetMigrationProgress, getMigrationProgress, type MigrationProgressState, } from './progressTracker.js';
export { listBackups, getBackupPath, saveBackup, deleteBackup, type BackupFileInfo } from './backupStorage.js';
