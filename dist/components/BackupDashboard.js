'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Button, ConfirmationModal, Gutter, SetStepNav, toast, useModal } from '@payloadcms/ui';
import './index.css';
const CONFIRM_RESTORE_SLUG = 'site-backups-confirm-restore';
const CONFIRM_DELETE_SLUG = 'site-backups-confirm-delete';
const EMPTY_PROGRESS = { percent: 0, phase: '', itemsPerSecond: 0, elapsedMs: 0 };
const baseClass = 'site-backups-dashboard';
function formatBytes(bytes) {
    if (!bytes)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
function formatRelative(iso) {
    const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['week', 604800],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];
    for (const [unit, seconds] of units) {
        if (Math.abs(diffSec) >= seconds)
            return rtf.format(Math.round(diffSec / seconds), unit);
    }
    return 'just now';
}
function formatDuration(ms) {
    const s = Math.floor(ms / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}
const Icon = ({ name }) => {
    const paths = {
        archive: (_jsxs(_Fragment, { children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "4", rx: "1" }), _jsx("path", { d: "M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" })] })),
        upload: _jsx("path", { d: "M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" }),
        file: (_jsxs(_Fragment, { children: [_jsx("path", { d: "M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z" }), _jsx("path", { d: "M14 3v4h4" })] })),
        check: _jsx("path", { d: "m5 12 5 5L20 7" }),
        alert: _jsx("path", { d: "M12 8v5m0 3.5v.5M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" }),
        x: _jsx("path", { d: "M6 6l12 12M18 6 6 18" }),
    };
    return (_jsx("svg", { "aria-hidden": "true", className: `${baseClass}__icon`, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.75, viewBox: "0 0 24 24", children: paths[name] }));
};
export const BackupDashboard = () => {
    const { openModal } = useModal();
    const [task, setTask] = useState(null);
    const [progress, setProgress] = useState(EMPTY_PROGRESS);
    const [backups, setBackups] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [result, setResult] = useState(null);
    const [pending, setPending] = useState(null);
    const fileInputRef = useRef(null);
    const progressTimerRef = useRef(null);
    const isBusy = task !== null;
    const loadBackups = async () => {
        try {
            const res = await fetch('/api/site-backups', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                return data.backups || [];
            }
        }
        catch (err) {
            console.error('Failed to fetch backups list:', err);
        }
        return null;
    };
    const fetchBackups = async () => {
        const list = await loadBackups();
        if (list)
            setBackups(list);
    };
    useEffect(() => {
        let cancelled = false;
        loadBackups().then((list) => {
            if (!cancelled)
                setBackups(list || []);
        });
        return () => {
            cancelled = true;
            if (progressTimerRef.current)
                clearInterval(progressTimerRef.current);
        };
    }, []);
    const startTask = (type) => {
        setTask(type);
        setResult(null);
        setProgress({ ...EMPTY_PROGRESS, percent: 1, phase: 'Starting…' });
        if (progressTimerRef.current)
            clearInterval(progressTimerRef.current);
        progressTimerRef.current = setInterval(async () => {
            try {
                const res = await fetch('/api/site-backups/progress', { credentials: 'include' });
                if (!res.ok)
                    return;
                const data = await res.json();
                if (data.active) {
                    setProgress({
                        percent: data.percent || 1,
                        phase: data.phase || '',
                        itemsPerSecond: data.itemsPerSecond || 0,
                        elapsedMs: data.elapsedMs || 0,
                    });
                }
            }
            catch {
                // Polling is best-effort; the main request reports the real outcome.
            }
        }, 400);
    };
    const endTask = () => {
        if (progressTimerRef.current) {
            clearInterval(progressTimerRef.current);
            progressTimerRef.current = null;
        }
        setTask(null);
        setProgress(EMPTY_PROGRESS);
    };
    const handleExport = async () => {
        startTask('export');
        try {
            const res = await fetch('/api/site-backups/create', { method: 'POST', credentials: 'include' });
            const data = await res.json();
            if (!res.ok || data.error)
                throw new Error(data.error || 'Export failed');
            setResult({
                type: 'success',
                title: 'Backup created',
                message: `${data.filename} (${formatBytes(data.sizeBytes)}) is ready to download.`,
            });
            await fetchBackups();
        }
        catch (err) {
            setResult({ type: 'error', title: 'Backup failed', message: err.message || 'Failed to create backup.' });
        }
        finally {
            endTask();
        }
    };
    const runRestore = async (label, init) => {
        startTask('import');
        try {
            const res = await fetch('/api/site-backups/restore', { method: 'POST', credentials: 'include', ...init });
            const data = await res.json();
            if (!res.ok || data.error)
                throw new Error(data.error || 'Restore failed');
            const errors = data.stats?.errors || [];
            const docCount = Object.values(data.stats?.collectionsRestored || {}).reduce((a, b) => a + b, 0);
            const summary = `${docCount} documents, ${data.stats?.mediaRestored || 0} files and ${data.stats?.globalsRestored || 0} globals restored from ${label}.`;
            setResult(errors.length > 0
                ? {
                    type: 'warning',
                    title: `Restore finished with ${errors.length} warning${errors.length === 1 ? '' : 's'}`,
                    message: summary,
                    details: errors,
                }
                : { type: 'success', title: 'Restore complete', message: summary });
            await fetchBackups();
            return true;
        }
        catch (err) {
            setResult({ type: 'error', title: 'Restore failed', message: err.message || 'Failed to restore backup.' });
            return false;
        }
        finally {
            endTask();
        }
    };
    const confirmRestore = async () => {
        if (!pending)
            return;
        if (pending.kind === 'restore-file' && selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            const ok = await runRestore(selectedFile.name, { body: formData });
            if (ok)
                clearSelectedFile();
        }
        else if (pending.kind === 'restore-stored') {
            await runRestore(pending.filename, {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: pending.filename }),
            });
        }
        setPending(null);
    };
    const confirmDelete = async () => {
        if (pending?.kind !== 'delete')
            return;
        const { filename } = pending;
        setPending(null);
        try {
            const res = await fetch(`/api/site-backups?filename=${encodeURIComponent(filename)}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Delete failed');
            }
            toast.success(`Deleted ${filename}`);
            await fetchBackups();
        }
        catch (err) {
            toast.error(err.message || 'Failed to delete backup.');
        }
    };
    const selectFile = (file) => {
        if (!file)
            return;
        if (!file.name.toLowerCase().endsWith('.zip')) {
            toast.error('Please choose a .zip backup archive.');
            return;
        }
        setSelectedFile(file);
    };
    const clearSelectedFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current)
            fileInputRef.current.value = '';
    };
    const totalSize = (backups || []).reduce((sum, b) => sum + b.sizeBytes, 0);
    const latest = backups?.[0];
    return (_jsxs(Gutter, { className: baseClass, children: [_jsx(SetStepNav, { nav: [{ label: 'Site Backups' }] }), _jsxs("header", { className: `${baseClass}__header`, children: [_jsxs("div", { children: [_jsx("h1", { className: `${baseClass}__title`, children: "Backups & restore" }), _jsx("p", { className: `${baseClass}__subtitle`, children: "Save the whole site (content, settings and uploaded files) into one .zip archive, or roll the site back to an earlier backup." })] }), _jsxs("dl", { className: `${baseClass}__stats`, children: [_jsxs("div", { className: `${baseClass}__stat`, children: [_jsx("dt", { children: "Stored backups" }), _jsx("dd", { children: backups ? backups.length : '–' })] }), _jsxs("div", { className: `${baseClass}__stat`, children: [_jsx("dt", { children: "Total size" }), _jsx("dd", { children: backups ? formatBytes(totalSize) : '–' })] }), _jsxs("div", { className: `${baseClass}__stat`, children: [_jsx("dt", { children: "Last backup" }), _jsx("dd", { title: latest ? new Date(latest.createdAt).toLocaleString() : undefined, children: latest ? formatRelative(latest.createdAt) : 'Never' })] })] })] }), task && (_jsxs("section", { "aria-live": "polite", className: `${baseClass}__progress`, children: [_jsxs("div", { className: `${baseClass}__progress-head`, children: [_jsx("strong", { children: task === 'export' ? 'Creating backup…' : 'Restoring site…' }), _jsxs("span", { className: `${baseClass}__progress-percent`, children: [progress.percent, "%"] })] }), _jsx("div", { "aria-valuemax": 100, "aria-valuemin": 0, "aria-valuenow": progress.percent, className: `${baseClass}__progress-track`, role: "progressbar", children: _jsx("div", { className: `${baseClass}__progress-fill`, style: { width: `${progress.percent}%` } }) }), _jsxs("div", { className: `${baseClass}__progress-meta`, children: [_jsx("span", { className: `${baseClass}__progress-phase`, children: progress.phase }), _jsxs("span", { children: [progress.elapsedMs > 0 && formatDuration(progress.elapsedMs), progress.itemsPerSecond > 0 && ` · ${progress.itemsPerSecond} items/s`] })] }), _jsx("p", { className: `${baseClass}__progress-note`, children: "Keep this tab open until it finishes." })] })), result && (_jsxs("section", { className: `${baseClass}__result ${baseClass}__result--${result.type}`, role: "status", children: [_jsx(Icon, { name: result.type === 'success' ? 'check' : 'alert' }), _jsxs("div", { className: `${baseClass}__result-body`, children: [_jsx("strong", { children: result.title }), _jsx("p", { children: result.message }), result.details && result.details.length > 0 && (_jsxs("details", { className: `${baseClass}__result-details`, children: [_jsx("summary", { children: "Show warnings" }), _jsx("ul", { children: result.details.map((d, i) => (_jsxs("li", { children: [d.collection && _jsx("code", { children: d.collection }), d.id !== undefined && d.id !== null && _jsxs("code", { children: ["#", String(d.id)] }), " ", d.message] }, i))) })] }))] }), _jsx("button", { "aria-label": "Dismiss", className: `${baseClass}__dismiss`, onClick: () => setResult(null), type: "button", children: _jsx(Icon, { name: "x" }) })] })), _jsxs("div", { className: `${baseClass}__grid`, children: [_jsxs("section", { className: `${baseClass}__card`, children: [_jsx("div", { className: `${baseClass}__card-icon`, children: _jsx(Icon, { name: "archive" }) }), _jsx("h3", { children: "Create a backup" }), _jsx("p", { children: "Saves a complete copy of the site to the server. You can download it or restore from it later." }), _jsxs("ul", { className: `${baseClass}__includes`, children: [_jsxs("li", { children: [_jsx(Icon, { name: "check" }), "Every collection and its documents"] }), _jsxs("li", { children: [_jsx(Icon, { name: "check" }), "Global settings"] }), _jsxs("li", { children: [_jsx(Icon, { name: "check" }), "Uploaded media files"] })] }), _jsx("div", { className: `${baseClass}__card-actions`, children: _jsx(Button, { buttonStyle: "primary", disabled: isBusy, margin: false, onClick: handleExport, size: "medium", children: task === 'export' ? 'Creating backup…' : 'Create backup' }) })] }), _jsxs("section", { className: `${baseClass}__card`, children: [_jsx("div", { className: `${baseClass}__card-icon`, children: _jsx(Icon, { name: "upload" }) }), _jsx("h3", { children: "Restore from a file" }), _jsx("p", { children: "Upload a backup archive to overwrite this site's content with the content it contains." }), selectedFile ? (_jsxs("div", { className: `${baseClass}__file`, children: [_jsx(Icon, { name: "file" }), _jsxs("div", { className: `${baseClass}__file-info`, children: [_jsx("span", { className: `${baseClass}__file-name`, children: selectedFile.name }), _jsx("span", { className: `${baseClass}__muted`, children: formatBytes(selectedFile.size) })] }), _jsx("button", { "aria-label": "Remove selected file", className: `${baseClass}__dismiss`, disabled: isBusy, onClick: clearSelectedFile, type: "button", children: _jsx(Icon, { name: "x" }) })] })) : (_jsxs("button", { className: `${baseClass}__dropzone${isDragging ? ` ${baseClass}__dropzone--active` : ''}`, disabled: isBusy, onClick: () => fileInputRef.current?.click(), onDragLeave: () => setIsDragging(false), onDragOver: (e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }, onDrop: (e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    selectFile(e.dataTransfer.files?.[0]);
                                }, type: "button", children: [_jsx(Icon, { name: "upload" }), _jsxs("span", { children: [_jsx("strong", { children: "Choose a .zip file" }), " or drag it here"] })] })), _jsx("input", { accept: ".zip,application/zip", hidden: true, onChange: (e) => selectFile(e.target.files?.[0]), ref: fileInputRef, type: "file" }), _jsx("div", { className: `${baseClass}__card-actions`, children: _jsx(Button, { buttonStyle: "secondary", disabled: !selectedFile || isBusy, margin: false, onClick: () => {
                                        setPending({ kind: 'restore-file' });
                                        openModal(CONFIRM_RESTORE_SLUG);
                                    }, size: "medium", children: task === 'import' ? 'Restoring…' : 'Restore from file' }) })] })] }), _jsxs("section", { className: `${baseClass}__card ${baseClass}__card--table`, children: [_jsxs("div", { className: `${baseClass}__table-head`, children: [_jsx("h3", { children: "Stored backups" }), backups && backups.length > 0 && (_jsx("span", { className: `${baseClass}__muted`, children: "Newest first" }))] }), backups === null ? (_jsx("p", { className: `${baseClass}__empty`, children: "Loading backups\u2026" })) : backups.length === 0 ? (_jsxs("div", { className: `${baseClass}__empty`, children: [_jsx(Icon, { name: "archive" }), _jsx("strong", { children: "No backups yet" }), _jsx("span", { children: "Create your first backup above. It will appear here." })] })) : (_jsxs("table", { className: `${baseClass}__table`, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "File" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Size" }), _jsx("th", { "aria-label": "Actions" })] }) }), _jsx("tbody", { children: backups.map((b, i) => (_jsxs("tr", { children: [_jsxs("td", { "data-label": "File", children: [_jsx("span", { className: `${baseClass}__filename`, children: b.filename }), i === 0 && _jsx("span", { className: `${baseClass}__badge`, children: "Latest" })] }), _jsx("td", { "data-label": "Created", title: new Date(b.createdAt).toLocaleString(), children: formatRelative(b.createdAt) }), _jsx("td", { "data-label": "Size", children: formatBytes(b.sizeBytes) }), _jsxs("td", { className: `${baseClass}__row-actions`, children: [_jsx(Button, { buttonStyle: "secondary", disabled: isBusy, el: "anchor", margin: false, size: "small", url: `/api/site-backups/download/${encodeURIComponent(b.filename)}`, children: "Download" }), _jsx(Button, { buttonStyle: "secondary", disabled: isBusy, margin: false, onClick: () => {
                                                        setPending({ kind: 'restore-stored', filename: b.filename });
                                                        openModal(CONFIRM_RESTORE_SLUG);
                                                    }, size: "small", children: "Restore" }), _jsx(Button, { buttonStyle: "secondary", className: `${baseClass}__danger`, disabled: isBusy, margin: false, onClick: () => {
                                                        setPending({ kind: 'delete', filename: b.filename });
                                                        openModal(CONFIRM_DELETE_SLUG);
                                                    }, size: "small", children: "Delete" })] })] }, b.filename))) })] }))] }), _jsx(ConfirmationModal, { body: _jsxs("p", { children: ["Content in ", _jsx("strong", { children: pending?.kind === 'restore-file' ? selectedFile?.name : pending?.kind === 'restore-stored' ? pending.filename : '' }), ' ', "will overwrite matching documents, settings and files on this site. Consider creating a backup first."] }), confirmingLabel: "Starting\u2026", confirmLabel: "Restore", heading: "Restore this backup?", modalSlug: CONFIRM_RESTORE_SLUG, onCancel: () => setPending(null), onConfirm: () => {
                    // Close the modal right away; progress is shown on the dashboard.
                    void confirmRestore();
                } }), _jsx(ConfirmationModal, { body: _jsxs("p", { children: [_jsx("strong", { children: pending?.kind === 'delete' ? pending.filename : '' }), " will be permanently removed from the server. This cannot be undone."] }), confirmingLabel: "Deleting\u2026", confirmLabel: "Delete", heading: "Delete this backup?", modalSlug: CONFIRM_DELETE_SLUG, onCancel: () => setPending(null), onConfirm: confirmDelete })] }));
};
export default BackupDashboard;
