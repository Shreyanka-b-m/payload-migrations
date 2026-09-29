import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { saveBackup } from './backupStorage.js';
import { BACKUPS_COLLECTION_SLUG } from './backupsCollection.js';
import { getBackupCollections, getBackupGlobalSlugs, getUploadDir } from './siteSchema.js';
import { resolveBackupDir } from './types.js';
import { startBackupProgress, updateBackupProgress, finishBackupProgress, } from './progressTracker.js';
export const ARCHIVE_FORMAT_VERSION = 2;
function listFiles(dir) {
    if (!fs.existsSync(dir))
        return [];
    return fs.readdirSync(dir).filter((f) => {
        try {
            return fs.statSync(path.join(dir, f)).isFile();
        }
        catch {
            return false;
        }
    });
}
export async function createBackupArchive(payload, options = {}) {
    const collections = getBackupCollections(payload, options.excludeCollections);
    const globalSlugs = getBackupGlobalSlugs(payload);
    const uploadFiles = collections.flatMap((c) => {
        const dir = getUploadDir(c);
        return dir ? [{ slug: c.slug, dir, files: listFiles(dir) }] : [];
    });
    const totalFiles = uploadFiles.reduce((sum, u) => sum + u.files.length, 0);
    const totalSteps = collections.length + globalSlugs.length + totalFiles + 1;
    startBackupProgress('export', 'Counting database collections & files...', Math.max(1, totalSteps));
    let processedCount = 0;
    const zip = new JSZip();
    const manifest = {
        formatVersion: ARCHIVE_FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        collections: {},
        globals: [],
        uploads: {},
        mediaFilesCount: 0,
    };
    try {
        const collectionsFolder = zip.folder('collections');
        for (const collection of collections) {
            const slug = collection.slug;
            updateBackupProgress({
                phase: `Exporting database collection "${slug}"...`,
                processedItems: processedCount,
            });
            const docs = [];
            let page = 1;
            let hasNextPage = true;
            while (hasNextPage) {
                const result = await payload.find({
                    collection: slug,
                    limit: 500,
                    page,
                    depth: 0,
                    overrideAccess: true,
                    // Include hidden fields (e.g. password hash/salt) so restored users can still log in.
                    showHiddenFields: true,
                });
                docs.push(...result.docs);
                hasNextPage = Boolean(result.hasNextPage) && result.docs.length > 0;
                page++;
            }
            manifest.collections[slug] = docs.length;
            collectionsFolder.file(`${slug}.json`, JSON.stringify(docs, null, 2), { compression: 'DEFLATE' });
            processedCount++;
            updateBackupProgress({ processedItems: processedCount });
        }
        const globalsFolder = zip.folder('globals');
        for (const slug of globalSlugs) {
            updateBackupProgress({
                phase: `Exporting global settings "${slug}"...`,
                processedItems: processedCount,
            });
            const globalDoc = await payload.findGlobal({
                slug,
                depth: 0,
                overrideAccess: true,
            });
            manifest.globals.push(slug);
            globalsFolder.file(`${slug}.json`, JSON.stringify(globalDoc || {}, null, 2), { compression: 'DEFLATE' });
            processedCount++;
            updateBackupProgress({ processedItems: processedCount });
        }
        let mediaCount = 0;
        for (const { slug, dir, files } of uploadFiles) {
            const folder = zip.folder(`uploads/${slug}`);
            let count = 0;
            for (const file of files) {
                try {
                    // Images are already compressed, so store them as-is.
                    folder.file(file, fs.readFileSync(path.join(dir, file)), { compression: 'STORE' });
                    count++;
                }
                catch (fileErr) {
                    console.warn(`[Export] Error archiving ${slug} file ${file}:`, fileErr);
                }
                processedCount++;
                updateBackupProgress({
                    phase: `Archiving ${slug} file (${mediaCount + count}/${totalFiles}): ${file}`,
                    processedItems: processedCount,
                });
            }
            manifest.uploads[slug] = count;
            mediaCount += count;
        }
        manifest.mediaFilesCount = mediaCount;
        zip.file('manifest.json', JSON.stringify(manifest, null, 2), { compression: 'DEFLATE' });
        updateBackupProgress({
            phase: 'Compressing archive & saving to server storage...',
            processedItems: processedCount,
        });
        const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `site-backup-${timestamp}.zip`;
        saveBackup(resolveBackupDir(options.backupDir), filename, buffer);
        try {
            await payload.create({
                collection: BACKUPS_COLLECTION_SLUG,
                data: {
                    name: filename,
                    filename,
                    sizeBytes: buffer.length,
                    notes: `Site backup created on ${new Date().toLocaleString()}`,
                },
                overrideAccess: true,
            });
        }
        catch (dbErr) {
            console.warn('[Export] Could not log backup entry in DB:', dbErr);
        }
        finishBackupProgress('Backup archive created successfully!');
        return { filename, buffer };
    }
    catch (exportErr) {
        finishBackupProgress('Export failed due to server error.');
        throw exportErr;
    }
}
