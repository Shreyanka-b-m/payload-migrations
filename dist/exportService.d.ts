import type { Payload } from 'payload';
import { type MigrationServiceOptions } from './types.js';
export declare const ARCHIVE_FORMAT_VERSION = 2;
export interface MigrationManifest {
    formatVersion?: number;
    exportedAt: string;
    collections: Record<string, number>;
    globals: string[];
    /** Files per upload collection, stored in the archive under uploads/<slug>/ */
    uploads?: Record<string, number>;
    mediaFilesCount: number;
}
export declare function createExportArchive(payload: Payload, options?: MigrationServiceOptions): Promise<{
    filename: string;
    buffer: Buffer;
}>;
