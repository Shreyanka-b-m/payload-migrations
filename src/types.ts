import path from 'path'
import type { PayloadRequest } from 'payload'

export interface PluginMigrationsOptions {
  /** Set to false to remove the plugin (collection, admin view and API routes). Default: true */
  enabled?: boolean
  /**
   * Who may create, download, restore and delete backups.
   * Default: logged-in users of the admin user collection (`admin.user` in the Payload config).
   */
  access?: (args: { req: PayloadRequest }) => boolean | Promise<boolean>
  /**
   * Folder where backup archives are stored, absolute or relative to the working directory.
   * Default: the BACKUP_DIR env variable, else `storage/backups`.
   */
  backupDir?: string
  /** Collection slugs to leave out of backups and restores (Payload's internal collections are always skipped). */
  excludeCollections?: string[]
}

export interface MigrationServiceOptions {
  backupDir?: string
  excludeCollections?: string[]
}

export const isAdminUser: NonNullable<PluginMigrationsOptions['access']> = ({ req }) =>
  Boolean(req.user && req.user.collection === req.payload.config.admin.user)

export function resolveBackupDir(backupDir?: string): string {
  return path.resolve(process.cwd(), backupDir || process.env.BACKUP_DIR || 'storage/backups')
}
