/**
 * @codenet/payload-migrations: full-site backup, download and restore for Payload CMS v3.
 *
 * Admin UI: Collections → "Site Backups & Migrations".
 * REST API (admin users only): /api/migration/{export,import,backups,download/:filename,progress}
 * Setup and options: see README.md.
 */

import type { Config, Plugin } from 'payload'
import { createMigrationEndpoints } from './endpoints.js'
import { createSiteMigrationsCollection, SITE_MIGRATIONS_SLUG } from './SiteMigrations.js'
import type { PluginMigrationsOptions } from './types.js'

export const payloadMigrationsPlugin = (options: PluginMigrationsOptions = {}): Plugin => {
  return (incomingConfig: Config): Config => {
    if (options.enabled === false) return incomingConfig
    const config = { ...incomingConfig }
    if (!config.collections?.some((c) => c.slug === SITE_MIGRATIONS_SLUG)) {
      config.collections = [...(config.collections || []), createSiteMigrationsCollection(options.access)]
    }
    config.endpoints = [...(config.endpoints || []), ...createMigrationEndpoints(options)]
    return config
  }
}

export type { PluginMigrationsOptions, MigrationServiceOptions } from './types.js'
export { isAdminUser } from './types.js'
export { SITE_MIGRATIONS_SLUG, createSiteMigrationsCollection } from './SiteMigrations.js'
export { createMigrationEndpoints } from './endpoints.js'
export { createExportArchive, type MigrationManifest } from './exportService.js'
export { restoreExportArchive, type ImportResult } from './importService.js'
export { getBackupCollections, getBackupGlobalSlugs } from './siteSchema.js'
export {
  startMigrationProgress,
  updateMigrationProgress,
  finishMigrationProgress,
  resetMigrationProgress,
  getMigrationProgress,
  type MigrationProgressState,
} from './progressTracker.js'
export { listBackups, getBackupPath, saveBackup, deleteBackup, type BackupFileInfo } from './backupStorage.js'
