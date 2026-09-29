import path from 'path';
export const isAdminUser = ({ req }) => Boolean(req.user && req.user.collection === req.payload.config.admin.user);
export function resolveBackupDir(backupDir) {
    return path.resolve(process.cwd(), backupDir || process.env.BACKUP_DIR || 'storage/backups');
}
