/**
 * @novel/payload-migrations: full-site backup, download and restore for Payload CMS v3.
 *
 * Admin UI: Collections → "Site Backups & Migrations".
 * REST API (admin users only): /api/migration/{export,import,backups,download/:filename,progress}
 * Setup and options: see README.md.
 */
import { createMigrationEndpoints } from './endpoints.js';
import { createSiteMigrationsCollection, SITE_MIGRATIONS_SLUG } from './SiteMigrations.js';
export const payloadMigrationsPlugin = (options = {}) => {
    return (incomingConfig) => {
        if (options.enabled === false)
            return incomingConfig;
        const config = { ...incomingConfig };
        if (!config.collections?.some((c) => c.slug === SITE_MIGRATIONS_SLUG)) {
            config.collections = [...(config.collections || []), createSiteMigrationsCollection(options.access)];
        }
        config.endpoints = [...(config.endpoints || []), ...createMigrationEndpoints(options)];
        return config;
    };
};
export { isAdminUser } from './types.js';
export { SITE_MIGRATIONS_SLUG, createSiteMigrationsCollection } from './SiteMigrations.js';
export { createMigrationEndpoints } from './endpoints.js';
export { createExportArchive } from './exportService.js';
export { restoreExportArchive } from './importService.js';
export { getBackupCollections, getBackupGlobalSlugs } from './siteSchema.js';
export { startMigrationProgress, updateMigrationProgress, finishMigrationProgress, resetMigrationProgress, getMigrationProgress, } from './progressTracker.js';
export { listBackups, getBackupPath, saveBackup, deleteBackup } from './backupStorage.js';
