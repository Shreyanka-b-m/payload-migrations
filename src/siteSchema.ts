import path from 'path'
import type { Payload, SanitizedCollectionConfig } from 'payload'
import { BACKUPS_COLLECTION_SLUG } from './backupsCollection.js'

/**
 * Collections included in a backup, derived from the live Payload config so the plugin
 * works in any project. Payload's internal collections (payload-*), this plugin's own
 * log collection and `exclude` are skipped.
 *
 * Order matters for restore: upload collections first (other docs reference them),
 * then auth collections, then everything else in config order.
 */
export function getBackupCollections(payload: Payload, exclude: string[] = []): SanitizedCollectionConfig[] {
  const collections = payload.config.collections.filter(
    (c) => !c.slug.startsWith('payload-') && c.slug !== BACKUPS_COLLECTION_SLUG && !exclude.includes(c.slug),
  )
  const rank = (c: SanitizedCollectionConfig) => (c.upload ? 0 : c.auth ? 1 : 2)
  return [...collections].sort((a, b) => rank(a) - rank(b))
}

export function getBackupGlobalSlugs(payload: Payload): string[] {
  return (payload.config.globals || []).map((g) => g.slug)
}

/** Absolute folder where an upload collection stores its files on disk. */
export function getUploadDir(collection: SanitizedCollectionConfig): string | null {
  if (!collection.upload) return null
  const staticDir = collection.upload.staticDir || collection.slug
  return path.resolve(process.cwd(), staticDir)
}
