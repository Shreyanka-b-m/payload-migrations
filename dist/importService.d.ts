import type { Payload } from 'payload';
import type { BackupManifest } from './exportService.js';
import type { BackupServiceOptions } from './types.js';
export interface RestoreResult {
    success: boolean;
    message: string;
    manifest?: BackupManifest;
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
export declare function restoreBackupArchive(payload: Payload, zipBuffer: Buffer, options?: BackupServiceOptions): Promise<RestoreResult>;
