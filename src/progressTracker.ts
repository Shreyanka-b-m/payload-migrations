export interface BackupProgressState {
  active: boolean
  type: 'export' | 'import' | 'idle'
  phase: string
  percent: number
  processedItems: number
  totalItems: number
  startTime?: number
  elapsedMs?: number
  itemsPerSecond?: number
}

let progressState: BackupProgressState = {
  active: false,
  type: 'idle',
  phase: '',
  percent: 0,
  processedItems: 0,
  totalItems: 0,
}

export function startBackupProgress(type: 'export' | 'import', initialPhase: string, totalItems: number = 100) {
  const now = Date.now()
  progressState = {
    active: true,
    type,
    phase: initialPhase,
    percent: 1,
    processedItems: 0,
    totalItems: Math.max(1, totalItems),
    startTime: now,
    elapsedMs: 0,
    itemsPerSecond: 0,
  }
}

export function updateBackupProgress(update: Partial<BackupProgressState>) {
  progressState = { ...progressState, ...update }
  const now = Date.now()
  if (progressState.startTime) {
    const elapsed = Math.max(1, now - progressState.startTime)
    progressState.elapsedMs = elapsed
    if (progressState.processedItems > 0) {
      progressState.itemsPerSecond = Number(((progressState.processedItems / elapsed) * 1000).toFixed(1))
    }
  }

  if (progressState.totalItems > 0 && update.processedItems !== undefined) {
    const calc = Math.floor((progressState.processedItems / progressState.totalItems) * 100)
    progressState.percent = Math.min(99, Math.max(1, calc))
  }
}

export function finishBackupProgress(phase: string = 'Completed successfully!') {
  const now = Date.now()
  const elapsed = progressState.startTime ? now - progressState.startTime : 0
  progressState = {
    active: false,
    type: 'idle',
    phase,
    percent: 100,
    processedItems: progressState.totalItems,
    totalItems: progressState.totalItems,
    elapsedMs: elapsed,
    itemsPerSecond: elapsed > 0 ? Number(((progressState.totalItems / elapsed) * 1000).toFixed(1)) : 0,
  }
}

export function resetBackupProgress() {
  progressState = {
    active: false,
    type: 'idle',
    phase: '',
    percent: 0,
    processedItems: 0,
    totalItems: 0,
  }
}

export function getBackupProgress(): BackupProgressState {
  return { ...progressState }
}
