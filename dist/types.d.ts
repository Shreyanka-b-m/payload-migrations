import type { PayloadRequest } from 'payload';
export interface BackupsPluginOptions {
    /** Set to false to remove the plugin (collection, admin view and API routes). Default: true */
    enabled?: boolean;
    /**
     * Who may create, download, restore and delete backups.
     * Default: logged-in users of the admin user collection (`admin.user` in the Payload config).
     */
    access?: (args: {
        req: PayloadRequest;
    }) => boolean | Promise<boolean>;
    /**
     * Folder where backup archives are stored, absolute or relative to the working directory.
     * Default: the BACKUP_DIR env variable, else `storage/backups`.
     */
    backupDir?: string;
    /** Collection slugs to leave out of backups and restores (Payload's internal collections are always skipped). */
    excludeCollections?: string[];
}
export interface BackupServiceOptions {
    backupDir?: string;
    excludeCollections?: string[];
}
export declare const isAdminUser: NonNullable<BackupsPluginOptions['access']>;
export declare function resolveBackupDir(backupDir?: string): string;
