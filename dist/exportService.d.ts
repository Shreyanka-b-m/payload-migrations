import type { Payload } from 'payload';
import { type BackupServiceOptions } from './types.js';
export declare const ARCHIVE_FORMAT_VERSION = 2;
export interface BackupManifest {
    formatVersion?: number;
    exportedAt: string;
    collections: Record<string, number>;
    globals: string[];
    /** Files per upload collection, stored in the archive under uploads/<slug>/ */
    uploads?: Record<string, number>;
    mediaFilesCount: number;
}
export declare function createBackupArchive(payload: Payload, options?: BackupServiceOptions): Promise<{
    filename: string;
    buffer: Buffer;
}>;
