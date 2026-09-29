import type { Payload, SanitizedCollectionConfig } from 'payload';
/**
 * Collections included in a backup, derived from the live Payload config so the plugin
 * works in any project. Payload's internal collections (payload-*), this plugin's own
 * log collection and `exclude` are skipped.
 *
 * Order matters for restore: upload collections first (other docs reference them),
 * then auth collections, then everything else in config order.
 */
export declare function getBackupCollections(payload: Payload, exclude?: string[]): SanitizedCollectionConfig[];
export declare function getBackupGlobalSlugs(payload: Payload): string[];
/** Absolute folder where an upload collection stores its files on disk. */
export declare function getUploadDir(collection: SanitizedCollectionConfig): string | null;
