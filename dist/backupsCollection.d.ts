import type { CollectionConfig } from 'payload';
import { type BackupsPluginOptions } from './types.js';
export declare const BACKUPS_COLLECTION_SLUG = "site-migrations";
/** Log of created backups. Its admin list view is replaced by the backup dashboard. */
export declare function createBackupsCollection(access?: NonNullable<BackupsPluginOptions['access']>): CollectionConfig;
