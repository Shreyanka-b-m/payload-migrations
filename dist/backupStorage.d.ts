export interface BackupFileInfo {
    filename: string;
    sizeBytes: number;
    createdAt: string;
}
export declare function ensureBackupDir(dir: string): string;
export declare function listBackups(dir: string): BackupFileInfo[];
export declare function getBackupPath(dir: string, filename: string): string | null;
export declare function saveBackup(dir: string, filename: string, data: Buffer): string;
export declare function deleteBackup(dir: string, filename: string): boolean;
