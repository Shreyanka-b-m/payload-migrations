export interface MigrationProgressState {
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
export declare function startMigrationProgress(type: 'export' | 'import', initialPhase: string, totalItems?: number): void;
export declare function updateMigrationProgress(update: Partial<MigrationProgressState>): void;
export declare function finishMigrationProgress(phase?: string): void;
export declare function resetMigrationProgress(): void;
export declare function getMigrationProgress(): MigrationProgressState;
