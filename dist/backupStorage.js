import fs from 'fs';
import path from 'path';
export function ensureBackupDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
export function listBackups(dir) {
    ensureBackupDir(dir);
    return fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.zip'))
        .map((filename) => {
        const stats = fs.statSync(path.join(dir, filename));
        return {
            filename,
            sizeBytes: stats.size,
            createdAt: stats.birthtime.toISOString(),
        };
    })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function getBackupPath(dir, filename) {
    // basename() stops path traversal (e.g. "../../.env")
    const sanitized = path.basename(filename);
    if (!sanitized.endsWith('.zip'))
        return null;
    const filePath = path.join(ensureBackupDir(dir), sanitized);
    return fs.existsSync(filePath) ? filePath : null;
}
export function saveBackup(dir, filename, data) {
    const filePath = path.join(ensureBackupDir(dir), path.basename(filename));
    fs.writeFileSync(filePath, data);
    return filePath;
}
export function deleteBackup(dir, filename) {
    const filePath = getBackupPath(dir, filename);
    if (!filePath)
        return false;
    fs.unlinkSync(filePath);
    return true;
}
