'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button, ConfirmationModal, Gutter, SetStepNav, toast, useModal } from '@payloadcms/ui'
import './index.css'

interface BackupItem {
  filename: string
  sizeBytes: number
  createdAt: string
}

interface Progress {
  percent: number
  phase: string
  itemsPerSecond: number
  elapsedMs: number
}

type Task = 'export' | 'import' | null

type Result = {
  type: 'success' | 'warning' | 'error'
  title: string
  message: string
  details?: Array<{ collection?: string; id?: unknown; message: string }>
}

type PendingAction = { kind: 'restore-file' } | { kind: 'restore-stored' | 'delete'; filename: string }

const CONFIRM_RESTORE_SLUG = 'site-backups-confirm-restore'
const CONFIRM_DELETE_SLUG = 'site-backups-confirm-delete'
const EMPTY_PROGRESS: Progress = { percent: 0, phase: '', itemsPerSecond: 0, elapsedMs: 0 }

const baseClass = 'site-backups-dashboard'

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function formatRelative(iso: string) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSec) >= seconds) return rtf.format(Math.round(diffSec / seconds), unit)
  }
  return 'just now'
}

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

const Icon: React.FC<{ name: 'archive' | 'upload' | 'file' | 'check' | 'alert' | 'x' }> = ({ name }) => {
  const paths: Record<typeof name, React.ReactNode> = {
    archive: (
      <>
        <rect x="3" y="4" width="18" height="4" rx="1" />
        <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
      </>
    ),
    upload: <path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
    file: (
      <>
        <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" />
        <path d="M14 3v4h4" />
      </>
    ),
    check: <path d="m5 12 5 5L20 7" />,
    alert: <path d="M12 8v5m0 3.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
  }
  return (
    <svg
      aria-hidden="true"
      className={`${baseClass}__icon`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  )
}

export const BackupDashboard: React.FC = () => {
  const { openModal } = useModal()
  const [task, setTask] = useState<Task>(null)
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS)
  const [backups, setBackups] = useState<BackupItem[] | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isBusy = task !== null

  const loadBackups = async (): Promise<BackupItem[] | null> => {
    try {
      const res = await fetch('/api/site-backups', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        return data.backups || []
      }
    } catch (err) {
      console.error('Failed to fetch backups list:', err)
    }
    return null
  }

  const fetchBackups = async () => {
    const list = await loadBackups()
    if (list) setBackups(list)
  }

  useEffect(() => {
    let cancelled = false
    loadBackups().then((list) => {
      if (!cancelled) setBackups(list || [])
    })
    return () => {
      cancelled = true
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [])

  const startTask = (type: Exclude<Task, null>) => {
    setTask(type)
    setResult(null)
    setProgress({ ...EMPTY_PROGRESS, percent: 1, phase: 'Starting…' })
    if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    progressTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/site-backups/progress', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        if (data.active) {
          setProgress({
            percent: data.percent || 1,
            phase: data.phase || '',
            itemsPerSecond: data.itemsPerSecond || 0,
            elapsedMs: data.elapsedMs || 0,
          })
        }
      } catch {
        // Polling is best-effort; the main request reports the real outcome.
      }
    }, 400)
  }

  const endTask = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current)
      progressTimerRef.current = null
    }
    setTask(null)
    setProgress(EMPTY_PROGRESS)
  }

  const handleExport = async () => {
    startTask('export')
    try {
      const res = await fetch('/api/site-backups/create', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Export failed')

      setResult({
        type: 'success',
        title: 'Backup created',
        message: `${data.filename} (${formatBytes(data.sizeBytes)}) is ready to download.`,
      })
      await fetchBackups()
    } catch (err: any) {
      setResult({ type: 'error', title: 'Backup failed', message: err.message || 'Failed to create backup.' })
    } finally {
      endTask()
    }
  }

  const runRestore = async (label: string, init: RequestInit) => {
    startTask('import')
    try {
      const res = await fetch('/api/site-backups/restore', { method: 'POST', credentials: 'include', ...init })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Restore failed')

      const errors = data.stats?.errors || []
      const docCount = Object.values<number>(data.stats?.collectionsRestored || {}).reduce((a, b) => a + b, 0)
      const summary = `${docCount} documents, ${data.stats?.mediaRestored || 0} files and ${data.stats?.globalsRestored || 0} globals restored from ${label}.`
      setResult(
        errors.length > 0
          ? {
              type: 'warning',
              title: `Restore finished with ${errors.length} warning${errors.length === 1 ? '' : 's'}`,
              message: summary,
              details: errors,
            }
          : { type: 'success', title: 'Restore complete', message: summary },
      )
      await fetchBackups()
      return true
    } catch (err: any) {
      setResult({ type: 'error', title: 'Restore failed', message: err.message || 'Failed to restore backup.' })
      return false
    } finally {
      endTask()
    }
  }

  const confirmRestore = async () => {
    if (!pending) return
    if (pending.kind === 'restore-file' && selectedFile) {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const ok = await runRestore(selectedFile.name, { body: formData })
      if (ok) clearSelectedFile()
    } else if (pending.kind === 'restore-stored') {
      await runRestore(pending.filename, {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: pending.filename }),
      })
    }
    setPending(null)
  }

  const confirmDelete = async () => {
    if (pending?.kind !== 'delete') return
    const { filename } = pending
    setPending(null)
    try {
      const res = await fetch(`/api/site-backups?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      toast.success(`Deleted ${filename}`)
      await fetchBackups()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete backup.')
    }
  }

  const selectFile = (file: File | null | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Please choose a .zip backup archive.')
      return
    }
    setSelectedFile(file)
  }

  const clearSelectedFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const totalSize = (backups || []).reduce((sum, b) => sum + b.sizeBytes, 0)
  const latest = backups?.[0]

  return (
    <Gutter className={baseClass}>
      <SetStepNav nav={[{ label: 'Site Backups' }]} />
      <header className={`${baseClass}__header`}>
        <div>
          <h1 className={`${baseClass}__title`}>Backups &amp; restore</h1>
          <p className={`${baseClass}__subtitle`}>
            Save the whole site (content, settings and uploaded files) into one .zip archive, or roll the site
            back to an earlier backup.
          </p>
        </div>
        <dl className={`${baseClass}__stats`}>
          <div className={`${baseClass}__stat`}>
            <dt>Stored backups</dt>
            <dd>{backups ? backups.length : '–'}</dd>
          </div>
          <div className={`${baseClass}__stat`}>
            <dt>Total size</dt>
            <dd>{backups ? formatBytes(totalSize) : '–'}</dd>
          </div>
          <div className={`${baseClass}__stat`}>
            <dt>Last backup</dt>
            <dd title={latest ? new Date(latest.createdAt).toLocaleString() : undefined}>
              {latest ? formatRelative(latest.createdAt) : 'Never'}
            </dd>
          </div>
        </dl>
      </header>

      {task && (
        <section aria-live="polite" className={`${baseClass}__progress`}>
          <div className={`${baseClass}__progress-head`}>
            <strong>{task === 'export' ? 'Creating backup…' : 'Restoring site…'}</strong>
            <span className={`${baseClass}__progress-percent`}>{progress.percent}%</span>
          </div>
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress.percent}
            className={`${baseClass}__progress-track`}
            role="progressbar"
          >
            <div className={`${baseClass}__progress-fill`} style={{ width: `${progress.percent}%` }} />
          </div>
          <div className={`${baseClass}__progress-meta`}>
            <span className={`${baseClass}__progress-phase`}>{progress.phase}</span>
            <span>
              {progress.elapsedMs > 0 && formatDuration(progress.elapsedMs)}
              {progress.itemsPerSecond > 0 && ` · ${progress.itemsPerSecond} items/s`}
            </span>
          </div>
          <p className={`${baseClass}__progress-note`}>Keep this tab open until it finishes.</p>
        </section>
      )}

      {result && (
        <section className={`${baseClass}__result ${baseClass}__result--${result.type}`} role="status">
          <Icon name={result.type === 'success' ? 'check' : 'alert'} />
          <div className={`${baseClass}__result-body`}>
            <strong>{result.title}</strong>
            <p>{result.message}</p>
            {result.details && result.details.length > 0 && (
              <details className={`${baseClass}__result-details`}>
                <summary>Show warnings</summary>
                <ul>
                  {result.details.map((d, i) => (
                    <li key={i}>
                      {d.collection && <code>{d.collection}</code>}
                      {d.id !== undefined && d.id !== null && <code>#{String(d.id)}</code>} {d.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <button
            aria-label="Dismiss"
            className={`${baseClass}__dismiss`}
            onClick={() => setResult(null)}
            type="button"
          >
            <Icon name="x" />
          </button>
        </section>
      )}

      <div className={`${baseClass}__grid`}>
        <section className={`${baseClass}__card`}>
          <div className={`${baseClass}__card-icon`}>
            <Icon name="archive" />
          </div>
          <h3>Create a backup</h3>
          <p>Saves a complete copy of the site to the server. You can download it or restore from it later.</p>
          <ul className={`${baseClass}__includes`}>
            <li>
              <Icon name="check" />
              Every collection and its documents
            </li>
            <li>
              <Icon name="check" />
              Global settings
            </li>
            <li>
              <Icon name="check" />
              Uploaded media files
            </li>
          </ul>
          <div className={`${baseClass}__card-actions`}>
            <Button buttonStyle="primary" disabled={isBusy} margin={false} onClick={handleExport} size="medium">
              {task === 'export' ? 'Creating backup…' : 'Create backup'}
            </Button>
          </div>
        </section>

        <section className={`${baseClass}__card`}>
          <div className={`${baseClass}__card-icon`}>
            <Icon name="upload" />
          </div>
          <h3>Restore from a file</h3>
          <p>Upload a backup archive to overwrite this site&apos;s content with the content it contains.</p>

          {selectedFile ? (
            <div className={`${baseClass}__file`}>
              <Icon name="file" />
              <div className={`${baseClass}__file-info`}>
                <span className={`${baseClass}__file-name`}>{selectedFile.name}</span>
                <span className={`${baseClass}__muted`}>{formatBytes(selectedFile.size)}</span>
              </div>
              <button
                aria-label="Remove selected file"
                className={`${baseClass}__dismiss`}
                disabled={isBusy}
                onClick={clearSelectedFile}
                type="button"
              >
                <Icon name="x" />
              </button>
            </div>
          ) : (
            <button
              className={`${baseClass}__dropzone${isDragging ? ` ${baseClass}__dropzone--active` : ''}`}
              disabled={isBusy}
              onClick={() => fileInputRef.current?.click()}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                selectFile(e.dataTransfer.files?.[0])
              }}
              type="button"
            >
              <Icon name="upload" />
              <span>
                <strong>Choose a .zip file</strong> or drag it here
              </span>
            </button>
          )}
          <input
            accept=".zip,application/zip"
            hidden
            onChange={(e) => selectFile(e.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />

          <div className={`${baseClass}__card-actions`}>
            <Button
              buttonStyle="secondary"
              disabled={!selectedFile || isBusy}
              margin={false}
              onClick={() => {
                setPending({ kind: 'restore-file' })
                openModal(CONFIRM_RESTORE_SLUG)
              }}
              size="medium"
            >
              {task === 'import' ? 'Restoring…' : 'Restore from file'}
            </Button>
          </div>
        </section>
      </div>

      <section className={`${baseClass}__card ${baseClass}__card--table`}>
        <div className={`${baseClass}__table-head`}>
          <h3>Stored backups</h3>
          {backups && backups.length > 0 && (
            <span className={`${baseClass}__muted`}>Newest first</span>
          )}
        </div>

        {backups === null ? (
          <p className={`${baseClass}__empty`}>Loading backups…</p>
        ) : backups.length === 0 ? (
          <div className={`${baseClass}__empty`}>
            <Icon name="archive" />
            <strong>No backups yet</strong>
            <span>Create your first backup above. It will appear here.</span>
          </div>
        ) : (
          <table className={`${baseClass}__table`}>
            <thead>
              <tr>
                <th>File</th>
                <th>Created</th>
                <th>Size</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={b.filename}>
                  <td data-label="File">
                    <span className={`${baseClass}__filename`}>{b.filename}</span>
                    {i === 0 && <span className={`${baseClass}__badge`}>Latest</span>}
                  </td>
                  <td data-label="Created" title={new Date(b.createdAt).toLocaleString()}>
                    {formatRelative(b.createdAt)}
                  </td>
                  <td data-label="Size">{formatBytes(b.sizeBytes)}</td>
                  <td className={`${baseClass}__row-actions`}>
                    <Button
                      buttonStyle="secondary"
                      disabled={isBusy}
                      el="anchor"
                      margin={false}
                      size="small"
                      url={`/api/site-backups/download/${encodeURIComponent(b.filename)}`}
                    >
                      Download
                    </Button>
                    <Button
                      buttonStyle="secondary"
                      disabled={isBusy}
                      margin={false}
                      onClick={() => {
                        setPending({ kind: 'restore-stored', filename: b.filename })
                        openModal(CONFIRM_RESTORE_SLUG)
                      }}
                      size="small"
                    >
                      Restore
                    </Button>
                    <Button
                      buttonStyle="secondary"
                      className={`${baseClass}__danger`}
                      disabled={isBusy}
                      margin={false}
                      onClick={() => {
                        setPending({ kind: 'delete', filename: b.filename })
                        openModal(CONFIRM_DELETE_SLUG)
                      }}
                      size="small"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <ConfirmationModal
        body={
          <p>
            Content in <strong>{pending?.kind === 'restore-file' ? selectedFile?.name : pending?.kind === 'restore-stored' ? pending.filename : ''}</strong>{' '}
            will overwrite matching documents, settings and files on this site. Consider creating a backup first.
          </p>
        }
        confirmingLabel="Starting…"
        confirmLabel="Restore"
        heading="Restore this backup?"
        modalSlug={CONFIRM_RESTORE_SLUG}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          // Close the modal right away; progress is shown on the dashboard.
          void confirmRestore()
        }}
      />
      <ConfirmationModal
        body={
          <p>
            <strong>{pending?.kind === 'delete' ? pending.filename : ''}</strong> will be permanently removed from the
            server. This cannot be undone.
          </p>
        }
        confirmingLabel="Deleting…"
        confirmLabel="Delete"
        heading="Delete this backup?"
        modalSlug={CONFIRM_DELETE_SLUG}
        onCancel={() => setPending(null)}
        onConfirm={confirmDelete}
      />
    </Gutter>
  )
}

export default BackupDashboard
