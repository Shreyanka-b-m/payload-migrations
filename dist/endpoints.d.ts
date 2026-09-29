import { type Endpoint } from 'payload';
import { type PluginMigrationsOptions } from './types.js';
/** REST routes used by the dashboard, mounted under /api (e.g. /api/migration/export). */
export declare function createMigrationEndpoints(options?: PluginMigrationsOptions): Endpoint[];
