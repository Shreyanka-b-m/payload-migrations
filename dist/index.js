/**
 * @novel/payload-plugin-backups: full-site backup, download and restore for Payload CMS v3.
 *
 * Admin UI: Collections → "Site Backups".
 * REST API (admin users only): /api/site-backups (list, delete), /api/site-backups/{create,restore,download/:filename,progress}
 * Setup and options: see README.md.
 */
import { createBackupEndpoints } from './endpoints.js';
import { createBackupsCollection, BACKUPS_COLLECTION_SLUG } from './backupsCollection.js';
export const backupsPlugin = (options = {}) => {
    return (incomingConfig) => {
        if (options.enabled === false)
            return incomingConfig;
        const config = { ...incomingConfig };
        if (!config.collections?.some((c) => c.slug === BACKUPS_COLLECTION_SLUG)) {
            config.collections = [...(config.collections || []), createBackupsCollection(options.access)];
        }
        config.endpoints = [...(config.endpoints || []), ...createBackupEndpoints(options)];
        return config;
    };
};
export { isAdminUser } from './types.js';
export { BACKUPS_COLLECTION_SLUG, createBackupsCollection } from './backupsCollection.js';
export { createBackupEndpoints } from './endpoints.js';
export { createBackupArchive } from './exportService.js';
export { restoreBackupArchive } from './importService.js';
export { getBackupCollections, getBackupGlobalSlugs } from './siteSchema.js';
export { startBackupProgress, updateBackupProgress, finishBackupProgress, resetBackupProgress, getBackupProgress, } from './progressTracker.js';
export { listBackups, getBackupPath, saveBackup, deleteBackup } from './backupStorage.js';
