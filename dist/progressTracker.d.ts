export interface BackupProgressState {
    active: boolean;
    type: 'export' | 'import' | 'idle';
    phase: string;
    percent: number;
    processedItems: number;
    totalItems: number;
    startTime?: number;
    elapsedMs?: number;
    itemsPerSecond?: number;
}
export declare function startBackupProgress(type: 'export' | 'import', initialPhase: string, totalItems?: number): void;
export declare function updateBackupProgress(update: Partial<BackupProgressState>): void;
export declare function finishBackupProgress(phase?: string): void;
export declare function resetBackupProgress(): void;
export declare function getBackupProgress(): BackupProgressState;
