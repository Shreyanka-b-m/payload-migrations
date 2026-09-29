import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import { remapReferences } from './remapReferences.js';
import { getBackupCollections, getBackupGlobalSlugs, getUploadDir } from './siteSchema.js';
import { startBackupProgress, updateBackupProgress, finishBackupProgress, } from './progressTracker.js';
// Auth bookkeeping that must never be copied between sites/sessions.
const AUTH_SESSION_FIELDS = [
    'password',
    'sessions',
    'resetPasswordToken',
    'resetPasswordExpiration',
    'loginAttempts',
    'lockUntil',
    '_verificationToken',
];
function sanitizeDocData(doc, isTopLevel = true) {
    if (!doc || typeof doc !== 'object')
        return doc;
    if (Array.isArray(doc)) {
        return doc.map((item) => sanitizeDocData(item, false));
    }
    // A populated relationship slipped through: reduce it back to its ID.
    if (!isTopLevel && doc.id !== undefined && (doc.createdAt || doc.updatedAt || doc.globalType)) {
        return doc.id;
    }
    const clean = {};
    for (const [key, value] of Object.entries(doc)) {
        if (['createdAt', 'updatedAt', 'globalType'].includes(key))
            continue;
        clean[key] = value && typeof value === 'object' ? sanitizeDocData(value, false) : value;
    }
    return clean;
}
/** Writes archived upload files to disk, skipping files that already exist. */
async function restoreUploadFolder(folder, prefix, targetDir, onFile) {
    fs.mkdirSync(targetDir, { recursive: true });
    const entries = Object.values(folder.files).filter((f) => !f.dir && f.name.startsWith(prefix));
    let restored = 0;
    const BATCH_SIZE = 50;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        await Promise.all(entries.slice(i, i + BATCH_SIZE).map(async (entry) => {
            // basename() guards against path traversal from a crafted archive.
            const targetPath = path.join(targetDir, path.basename(entry.name));
            const exists = fs.existsSync(targetPath) && fs.statSync(targetPath).size > 0;
            if (!exists) {
                fs.writeFileSync(targetPath, await entry.async('nodebuffer'));
            }
            restored++;
            onFile();
        }));
    }
    return restored;
}
export async function restoreBackupArchive(payload, zipBuffer, options = {}) {
    const startTime = Date.now();
    const zip = await JSZip.loadAsync(zipBuffer);
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
        throw new Error('Invalid backup archive: manifest.json is missing.');
    }
    const manifest = JSON.parse(await manifestFile.async('text'));
    const collections = getBackupCollections(payload, options.excludeCollections);
    const siteGlobals = getBackupGlobalSlugs(payload);
    const totalDocs = Object.values(manifest.collections || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const grandTotal = Math.max(1, (manifest.mediaFilesCount || 0) + totalDocs + (manifest.globals || []).length);
    startBackupProgress('import', 'Verifying backup archive manifest...', grandTotal);
    let processedCount = 0;
    const tick = (phase) => {
        processedCount++;
        updateBackupProgress({ phase, processedItems: processedCount });
    };
    const stats = {
        collectionsRestored: {},
        globalsRestored: 0,
        mediaRestored: 0,
        errors: [],
    };
    try {
        // 1. Upload files (must exist on disk before their docs are restored)
        for (const collection of collections) {
            const dir = getUploadDir(collection);
            if (!dir)
                continue;
            const phase = `Unpacking ${collection.slug} files...`;
            stats.mediaRestored += await restoreUploadFolder(zip, `uploads/${collection.slug}/`, dir, () => tick(phase));
            // Archives from the first version of this plugin stored media files under media/
            if (collection.slug === 'media') {
                stats.mediaRestored += await restoreUploadFolder(zip, 'media/', dir, () => tick(phase));
            }
        }
        // 2. Collection documents
        const siteSlugs = new Set(collections.map((c) => c.slug));
        for (const slug of Object.keys(manifest.collections || {})) {
            if (!siteSlugs.has(slug)) {
                stats.errors.push({
                    collection: slug,
                    message: `Collection "${slug}" does not exist on this site; skipped.`,
                });
            }
        }
        const idMaps = new Map();
        // Let the database accept the archived IDs when documents are recreated.
        const allowIDOnCreate = payload.db.allowIDOnCreate;
        payload.db.allowIDOnCreate = true;
        try {
            for (const collection of collections) {
                const file = zip.file(`collections/${collection.slug}.json`);
                if (!file)
                    continue;
                let docs;
                try {
                    docs = JSON.parse(await file.async('text'));
                }
                catch (parseErr) {
                    stats.errors.push({
                        collection: collection.slug,
                        message: `Failed to parse ${collection.slug}.json: ${parseErr?.message}`,
                    });
                    continue;
                }
                stats.collectionsRestored[collection.slug] = await restoreCollection(payload, collection, docs, stats, idMaps, () => tick(`Restoring ${collection.slug} (${processedCount}/${grandTotal})...`));
            }
        }
        finally {
            payload.db.allowIDOnCreate = allowIDOnCreate;
        }
        // 3. Globals
        for (const slug of manifest.globals || []) {
            const file = zip.file(`globals/${slug}.json`);
            if (!file)
                continue;
            try {
                if (!siteGlobals.includes(slug)) {
                    throw new Error(`Global "${slug}" does not exist on this site; skipped.`);
                }
                const rawGlobal = JSON.parse(await file.async('text'));
                if (rawGlobal && Object.keys(rawGlobal).length > 0) {
                    const data = sanitizeDocData(rawGlobal);
                    delete data.id;
                    await payload.updateGlobal({
                        slug,
                        data,
                        overrideAccess: true,
                        context: { disableRevalidate: true },
                    });
                    stats.globalsRestored++;
                }
            }
            catch (gErr) {
                stats.errors.push({ collection: `global:${slug}`, message: gErr?.message || String(gErr) });
            }
            finally {
                tick(`Restoring global "${slug}"...`);
            }
        }
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
        const message = `Site backup restored successfully in ${elapsedSeconds}s.`;
        finishBackupProgress(message);
        return { success: true, message, manifest, stats };
    }
    catch (importErr) {
        finishBackupProgress('Import failed due to server error.');
        throw importErr;
    }
}
async function restoreCollection(payload, collection, docs, stats, idMaps, onDoc) {
    const slug = collection.slug;
    const hasSlugField = collection.flattenedFields.some((f) => f.name === 'slug');
    const blocks = payload.config.blocks || [];
    // Match archived docs to existing ones by ID, then slug, email or (uploads) filename.
    const existingById = new Set();
    const existingByKey = new Map();
    const keysOf = (doc) => [
        hasSlugField && doc.slug ? `slug:${doc.slug}` : null,
        collection.auth && doc.email ? `email:${doc.email}` : null,
        collection.upload && doc.filename ? `filename:${doc.filename}` : null,
    ].filter((k) => Boolean(k));
    let page = 1;
    let hasNextPage = true;
    while (hasNextPage) {
        const res = await payload.find({
            collection: slug,
            limit: 1000,
            page,
            depth: 0,
            overrideAccess: true,
        });
        for (const doc of res.docs) {
            existingById.add(String(doc.id));
            for (const key of keysOf(doc))
                existingByKey.set(key, doc.id);
        }
        hasNextPage = Boolean(res.hasNextPage) && res.docs.length > 0;
        page++;
    }
    const idMap = idMaps.get(slug) ?? new Map();
    idMaps.set(slug, idMap);
    let restoredCount = 0;
    let createdWithId = false;
    const BATCH_SIZE = 10;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        await Promise.all(docs.slice(i, i + BATCH_SIZE).map(async (rawDoc) => {
            if (!rawDoc)
                return;
            const docId = rawDoc.id;
            try {
                const data = sanitizeDocData(rawDoc);
                delete data.id;
                for (const key of AUTH_SESSION_FIELDS)
                    delete data[key];
                // Point relationships at the IDs these docs have on this site.
                remapReferences(collection.fields, data, idMaps, blocks);
                let existingId;
                if (docId !== undefined && docId !== null && existingById.has(String(docId))) {
                    existingId = docId;
                }
                else {
                    existingId = keysOf(data)
                        .map((k) => existingByKey.get(k))
                        .find((id) => id !== undefined);
                }
                if (existingId !== undefined) {
                    if (String(existingId) !== String(docId))
                        idMap.set(String(docId), existingId);
                    // Keep the current password of users that already exist on this site.
                    delete data.hash;
                    delete data.salt;
                    await payload.update({
                        collection: slug,
                        id: existingId,
                        data,
                        overrideAccess: true,
                        context: { disableRevalidate: true },
                    });
                }
                else {
                    // Recreate under its original ID so other documents' references stay valid.
                    if (docId !== undefined && docId !== null)
                        data.id = docId;
                    if (collection.upload || collection.auth) {
                        // Write straight to the database so upload docs keep their original filenames
                        // (their files were already restored above) and users keep their password hash.
                        await payload.db.create({ collection: slug, data });
                    }
                    else {
                        await payload.create({
                            collection: slug,
                            data,
                            overrideAccess: true,
                            context: { disableRevalidate: true },
                        });
                    }
                    createdWithId = true;
                }
                restoredCount++;
            }
            catch (docErr) {
                console.warn(`[Import] Warning restoring ${slug} ID ${docId}:`, docErr?.message || docErr);
                stats.errors.push({ collection: slug, id: docId, message: describeError(docErr) });
            }
            finally {
                onDoc();
            }
        }));
    }
    if (createdWithId)
        await syncIdSequence(payload, slug);
    return restoredCount;
}
/** Database errors wrap the useful part (e.g. a foreign key violation) in `cause`. */
function describeError(err) {
    const cause = err?.cause?.message || err?.cause?.detail;
    const message = err?.message || String(err);
    return cause && !message.includes(cause)
        ? `${message.split(' params:')[0]} (${cause})`
        : message.split(' params:')[0];
}
/**
 * Postgres: after inserting rows with explicit IDs, move the ID sequence past them so later
 * inserts don't collide. Never moves it backwards. Other adapters don't need this.
 */
async function syncIdSequence(payload, slug) {
    const db = payload.db;
    if (db.name !== 'postgres' || typeof db.execute !== 'function' || !db.tableNameMap)
        return;
    const table = db.tableNameMap.get(slug.replace(/-/g, '_'));
    if (!table)
        return;
    const qualified = `"${db.schemaName || 'public'}"."${table}"`;
    const seq = `pg_get_serial_sequence('${qualified}', 'id')`;
    try {
        await db.execute({
            drizzle: db.drizzle,
            raw: `SELECT setval(${seq}, GREATEST((SELECT COALESCE(MAX(id), 1) FROM ${qualified}), COALESCE(pg_sequence_last_value(${seq}::regclass), 1))) WHERE ${seq} IS NOT NULL`,
        });
    }
    catch (err) {
        payload.logger.warn({ err, msg: `[Import] Could not sync ID sequence for ${slug}` });
    }
}
