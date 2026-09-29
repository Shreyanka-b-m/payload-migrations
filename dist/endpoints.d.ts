import { type Endpoint } from 'payload';
import { type BackupsPluginOptions } from './types.js';
/** REST routes used by the dashboard, mounted under /api (e.g. /api/site-backups/create). */
export declare function createBackupEndpoints(options?: BackupsPluginOptions): Endpoint[];
