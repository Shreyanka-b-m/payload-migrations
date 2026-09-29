/**
 * @novel/payload-plugin-backups: full-site backup, download and restore for Payload CMS v3.
 *
 * Admin UI: Collections → "Site Backups".
 * REST API (admin users only): /api/site-backups (list, delete), /api/site-backups/{create,restore,download/:filename,progress}
 * Setup and options: see README.md.
 */

import type { Config, Plugin } from 'payload'
import { createBackupEndpoints } from './endpoints.js'
import { createBackupsCollection, BACKUPS_COLLECTION_SLUG } from './backupsCollection.js'
import type { BackupsPluginOptions } from './types.js'

export const backupsPlugin = (options: BackupsPluginOptions = {}): Plugin => {
  return (incomingConfig: Config): Config => {
    if (options.enabled === false) return incomingConfig
    const config = { ...incomingConfig }
    if (!config.collections?.some((c) => c.slug === BACKUPS_COLLECTION_SLUG)) {
      config.collections = [...(config.collections || []), createBackupsCollection(options.access)]
    }
    config.endpoints = [...(config.endpoints || []), ...createBackupEndpoints(options)]
    return config
  }
}

export type { BackupsPluginOptions, BackupServiceOptions } from './types.js'
export { isAdminUser } from './types.js'
export { BACKUPS_COLLECTION_SLUG, createBackupsCollection } from './backupsCollection.js'
export { createBackupEndpoints } from './endpoints.js'
export { createBackupArchive, type BackupManifest } from './exportService.js'
export { restoreBackupArchive, type RestoreResult } from './importService.js'
export { getBackupCollections, getBackupGlobalSlugs } from './siteSchema.js'
export {
  startBackupProgress,
  updateBackupProgress,
  finishBackupProgress,
  resetBackupProgress,
  getBackupProgress,
  type BackupProgressState,
} from './progressTracker.js'
export { listBackups, getBackupPath, saveBackup, deleteBackup, type BackupFileInfo } from './backupStorage.js'
