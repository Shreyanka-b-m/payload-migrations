import type { Payload } from 'payload';
import type { MigrationManifest } from './exportService.js';
import type { MigrationServiceOptions } from './types.js';
export interface ImportResult {
    success: boolean;
    message: string;
    manifest?: MigrationManifest;
    stats: {
        collectionsRestored: Record<string, number>;
        globalsRestored: number;
        mediaRestored: number;
        errors: Array<{
            collection?: string;
            id?: any;
            message: string;
        }>;
    };
}
export declare function restoreExportArchive(payload: Payload, zipBuffer: Buffer, options?: MigrationServiceOptions): Promise<ImportResult>;
