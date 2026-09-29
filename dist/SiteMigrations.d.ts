import type { CollectionConfig } from 'payload';
import { type PluginMigrationsOptions } from './types.js';
export declare const SITE_MIGRATIONS_SLUG = "site-migrations";
/** Log of created backups. Its admin list view is replaced by the backup dashboard. */
export declare function createSiteMigrationsCollection(access?: NonNullable<PluginMigrationsOptions['access']>): CollectionConfig;
