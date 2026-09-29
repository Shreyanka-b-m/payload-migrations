import type { Block, Field } from 'payload';
/** Per collection slug: archived document ID -> ID of the matching document on this site. */
export type IdMaps = Map<string, Map<string, number | string>>;
/**
 * Rewrites relationship/upload IDs inside `data` (in place) using `idMaps`, so documents keep
 * pointing at the right records when a referenced doc exists on this site under a different ID.
 */
export declare function remapReferences(fields: Field[], data: unknown, idMaps: IdMaps, blocks: Block[]): void;
