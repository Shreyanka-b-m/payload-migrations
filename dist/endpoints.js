import fs from 'fs';
import { Readable } from 'stream';
import { addDataAndFileToRequest } from 'payload';
import { deleteBackup, getBackupPath, listBackups } from './backupStorage.js';
import { createExportArchive } from './exportService.js';
import { restoreExportArchive } from './importService.js';
import { getMigrationProgress } from './progressTracker.js';
import { SITE_MIGRATIONS_SLUG } from './SiteMigrations.js';
import { isAdminUser, resolveBackupDir } from './types.js';
/** REST routes used by the dashboard, mounted under /api (e.g. /api/migration/export). */
export function createMigrationEndpoints(options = {}) {
    const access = options.access ?? isAdminUser;
    const backupDir = () => resolveBackupDir(options.backupDir);
    const serviceOptions = { backupDir: options.backupDir, excludeCollections: options.excludeCollections };
    const guarded = (handler) => async (req) => {
        if (!req.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (!(await access({ req }))) {
            return Response.json({ error: 'You are not allowed to manage site backups.' }, { status: 403 });
        }
        try {
            return await handler(req);
        }
        catch (err) {
            req.payload.logger.error({ err, msg: '[Migration] Request failed' });
            return Response.json({ error: err?.message || 'Internal server error' }, { status: 500 });
        }
    };
    return [
        {
            path: '/migration/progress',
            method: 'get',
            handler: guarded(async () => Response.json(getMigrationProgress())),
        },
        {
            path: '/migration/backups',
            method: 'get',
            handler: guarded(async () => Response.json({ backups: listBackups(backupDir()) })),
        },
        {
            path: '/migration/backups',
            method: 'delete',
            handler: guarded(async (req) => {
                const filename = req.searchParams.get('filename');
                if (!filename) {
                    return Response.json({ error: 'Missing "filename" query parameter.' }, { status: 400 });
                }
                if (!deleteBackup(backupDir(), filename)) {
                    return Response.json({ error: `Backup "${filename}" not found.` }, { status: 404 });
                }
                // Remove the matching log entry too, so the collection mirrors the files on disk.
                await req.payload.delete({
                    collection: SITE_MIGRATIONS_SLUG,
                    where: { filename: { equals: filename } },
                    overrideAccess: true,
                });
                return Response.json({ success: true });
            }),
        },
        {
            path: '/migration/download/:filename',
            method: 'get',
            handler: guarded(async (req) => {
                const filename = String(req.routeParams?.filename || '');
                const filePath = getBackupPath(backupDir(), filename);
                if (!filePath) {
                    return Response.json({ error: `Backup "${filename}" not found.` }, { status: 404 });
                }
                const stream = Readable.toWeb(fs.createReadStream(filePath));
                return new Response(stream, {
                    headers: {
                        'Content-Type': 'application/zip',
                        'Content-Length': String(fs.statSync(filePath).size),
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                    },
                });
            }),
        },
        {
            path: '/migration/export',
            method: 'post',
            handler: guarded(async (req) => {
                const { filename, buffer } = await createExportArchive(req.payload, serviceOptions);
                return Response.json({ success: true, filename, sizeBytes: buffer.length });
            }),
        },
        {
            // Accepts either multipart form data with a "file" field (uploaded .zip),
            // or JSON { filename } to restore a backup already stored on the server.
            path: '/migration/import',
            method: 'post',
            handler: guarded(async (req) => {
                await addDataAndFileToRequest(req);
                let zipBuffer = null;
                if (req.file) {
                    zipBuffer = req.file.tempFilePath ? fs.readFileSync(req.file.tempFilePath) : req.file.data;
                }
                else if (typeof req.data?.filename === 'string') {
                    const filePath = getBackupPath(backupDir(), req.data.filename);
                    if (!filePath) {
                        return Response.json({ error: `Backup "${req.data.filename}" not found.` }, { status: 404 });
                    }
                    zipBuffer = fs.readFileSync(filePath);
                }
                if (!zipBuffer || zipBuffer.length === 0) {
                    return Response.json({ error: 'No backup archive provided.' }, { status: 400 });
                }
                const result = await restoreExportArchive(req.payload, zipBuffer, serviceOptions);
                return Response.json(result);
            }),
        },
    ];
}
